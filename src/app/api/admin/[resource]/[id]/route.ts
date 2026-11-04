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
export const runtime = 'nodejs';
function failure(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return jsonError('Duplicate slug, name or email', 409);
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
    if (resource === 'users') {
      const parsed = updateUserValidator.parse(input);
      if (u.id === id && !parsed.active)
        return jsonError('You cannot deactivate your own admin account', 403);
      const { password, ...rest } = parsed;
      const passwordHash = password ? await hashPassword(password) : undefined;
      await prisma.$transaction(async (tx) => {
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
        if (password || !parsed.active || before?.email !== rest.email.toLowerCase())
          await tx.session.deleteMany({ where: { userId: id } });
      });
    } else if (resource === 'cars')
      await prisma.car.update({ where: { id }, data: validators.cars.parse(input) });
    else if (resource === 'locations')
      await prisma.location.update({ where: { id }, data: validators.locations.parse(input) });
    else if (resource === 'faqs')
      await prisma.faq.update({ where: { id }, data: validators.faqs.parse(input) });
    else if (resource === 'testimonials')
      await prisma.testimonial.update({
        where: { id },
        data: validators.testimonials.parse(input),
      });
    else if (resource === 'bookings') {
      const { status } = validators.bookings.parse(input);
      const error = await prisma.$transaction(async (tx) => {
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
        return null;
      });
      if (error) return error;
    } else if (resource === 'settings')
      await prisma.siteSettings.update({
        where: { id: 'main' },
        data: validators.settings.parse(input),
      });
    await prisma.auditLog.create({
      data: { userId: u.id, action: 'UPDATE', resource, resourceId: id },
    });
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
    if (resource === 'users') {
      const target = await prisma.adminUser.findUnique({ where: { id } });
      if (!target) return jsonError('User not found', 404);
      if (target.active && (await prisma.adminUser.count({ where: { active: true } })) <= 1)
        return jsonError('Cannot delete the last active admin', 403);
      await prisma.adminUser.delete({ where: { id } });
    } else if (resource === 'cars') await prisma.car.delete({ where: { id } });
    else if (resource === 'locations') await prisma.location.delete({ where: { id } });
    else if (resource === 'faqs') await prisma.faq.delete({ where: { id } });
    else if (resource === 'testimonials') await prisma.testimonial.delete({ where: { id } });
    await prisma.auditLog.create({
      data: { userId: u.id, action: 'DELETE', resource, resourceId: id },
    });
    return Response.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
