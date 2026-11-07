import { prisma } from '@/lib/db';
import {
  currentAdmin,
  sameOrigin,
  jsonError,
  readJsonBody,
  RequestInputError,
} from '@/lib/security';
import { isResource, validators, updateUserValidator } from '@/lib/admin-data';
import { hashPassword } from '@/lib/passwords';
import { Prisma } from '@prisma/client';
import { deleteLocation, LocationConflictError, saveLocation } from '@/lib/admin-locations';
export const runtime = 'nodejs';
function failure(error: unknown) {
  if (error instanceof LocationConflictError) return jsonError(error.message, 409);
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return jsonError('Duplicate name or email', 409);
    }
    if (error.code === 'P2003')
      return jsonError(
        'Cannot remove a car linked to customer enquiries. Unpublish it instead.',
        409,
      );
    if (error.code === 'P2025') return jsonError('Record not found', 404);
  }
  console.error('Admin mutation failed');
  return jsonError('Unable to save the requested change', 500);
}
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ resource: string; id: string }> },
) {
  if (!sameOrigin(req)) return jsonError('Invalid origin', 403);
  const u = await currentAdmin();
  if (!u) return jsonError('Unauthorized', 401);
  const { resource, id } = await params;
  if (!isResource(resource) || resource === 'audits') return jsonError('Not found', 404);
  if (!(req.headers.get('content-type') || '').includes('application/json'))
    return jsonError('Expected JSON', 415);
  if (Number(req.headers.get('content-length') || 0) > 20000)
    return jsonError('Request too large', 413);
  let input: unknown;
  try {
    input = await readJsonBody(req, 20000);
  } catch (error) {
    return error instanceof RequestInputError
      ? jsonError(error.message, error.status)
      : jsonError('Invalid JSON');
  }
  const schema = resource === 'users' ? updateUserValidator : validators[resource];
  const result = schema.safeParse(input);
  if (!result.success)
    return jsonError(
      'Invalid fields: ' +
        result.error.issues.map((e) => e.path.join('.') + ': ' + e.message).join('; '),
      422,
    );
  try {
    const userData = resource === 'users' ? updateUserValidator.parse(input) : null;
    if (userData && u.id === id && !userData.active)
      return jsonError('You cannot deactivate your own admin account', 403);
    const passwordHash = userData?.password ? await hashPassword(userData.password) : undefined;
    const error = await prisma.$transaction(async (tx) => {
      if (userData) {
        const { password, ...rest } = userData;
        await tx.$queryRaw`SELECT "id" FROM "AdminUser" WHERE "id" = ${id} FOR UPDATE`;
        const before = await tx.adminUser.findUnique({ where: { id }, select: { email: true } });
        await tx.adminUser.update({
          where: { id },
          data: {
            ...rest,
            email: rest.email.toLowerCase(),
            ...(passwordHash ? { passwordHash } : {}),
          },
        });
        if (password || !userData.active || before?.email !== rest.email.toLowerCase())
          await tx.session.deleteMany({ where: { userId: id } });
      } else if (resource === 'cars') {
        const data = validators.cars.parse(input);
        await tx.car.update({ where: { id }, data });
      } else if (resource === 'locations')
        await saveLocation(tx, validators.locations.parse(input), id);
      else if (resource === 'faqs')
        await tx.faq.update({ where: { id }, data: validators.faqs.parse(input) });
      else if (resource === 'testimonials')
        await tx.testimonial.update({
          where: { id },
          data: validators.testimonials.parse(input),
        });
      else if (resource === 'bookings') {
        const { status } = validators.bookings.parse(input);
        await tx.$queryRaw`SELECT "id" FROM "BookingIntent" WHERE "id" = ${id} FOR UPDATE`;
        const booking = await tx.bookingIntent.findUnique({
          where: { id },
          include: { rating: true },
        });
        if (!booking) return jsonError('Booking not found', 404);
        if (booking.rating && status !== 'COMPLETED')
          return jsonError(
            'A rated, completed booking cannot be reopened. Create a new enquiry for a new rental.',
            409,
          );
        if (status === 'COMPLETED') {
          if (!['CONFIRMED', 'COMPLETED'].includes(booking.status))
            return jsonError('Confirm the booking before marking the rental completed.', 422);
          if (booking.returnDate && booking.returnDate > new Date())
            return jsonError('A rental cannot be completed before its scheduled return time.', 422);
        }
        await tx.bookingIntent.update({ where: { id }, data: { status } });
      } else if (resource === 'settings')
        await tx.siteSettings.update({
          where: { id: 'main' },
          data: validators.settings.parse(input),
        });
      await tx.auditLog.create({
        data: {
          userId: u.id,
          action: 'UPDATE',
          resource,
          resourceId: resource === 'settings' ? 'main' : id,
        },
      });
      return null;
    });
    if (error) return error;
    return Response.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ resource: string; id: string }> },
) {
  if (!sameOrigin(req)) return jsonError('Invalid origin', 403);
  const u = await currentAdmin();
  if (!u) return jsonError('Unauthorized', 401);
  const { resource, id } = await params;
  if (!isResource(resource) || ['settings', 'audits', 'bookings'].includes(resource))
    return jsonError('Deletion not allowed', 403);
  if (resource === 'users' && u.id === id) return jsonError('Cannot delete your own account', 403);
  try {
    const error = await prisma.$transaction(async (tx) => {
      if (resource === 'users') {
        const target = await tx.adminUser.findUnique({ where: { id } });
        if (!target) return jsonError('User not found', 404);
        if (target.active && (await tx.adminUser.count({ where: { active: true } })) <= 1)
          return jsonError('Cannot delete the last active admin', 403);
        await tx.adminUser.delete({ where: { id } });
      } else if (resource === 'cars') await tx.car.delete({ where: { id } });
      else if (resource === 'locations') await deleteLocation(tx, id);
      else if (resource === 'faqs') await tx.faq.delete({ where: { id } });
      else if (resource === 'testimonials') await tx.testimonial.delete({ where: { id } });
      await tx.auditLog.create({
        data: { userId: u.id, action: 'DELETE', resource, resourceId: id },
      });
      return null;
    });
    if (error) return error;
    return Response.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
