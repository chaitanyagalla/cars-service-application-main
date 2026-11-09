import { prisma } from '@/lib/db';
import {
  currentAdmin,
  sameOrigin,
  jsonError,
  readJsonBody,
  RequestInputError,
} from '@/lib/security';
import { isResource, validators } from '@/lib/admin-data';
import { createCarWithUniqueSlug } from '@/lib/admin-cars';
import { LocationConflictError, saveLocation } from '@/lib/admin-locations';
import { hashPassword } from '@/lib/passwords';
import { Prisma } from '@prisma/client';
import { listAdminRecords } from '@/lib/admin-records';
import { AdminQueryError, parseAdminQuery } from '@/lib/admin-query';
export const runtime = 'nodejs';
function failure(error: unknown) {
  if (error instanceof LocationConflictError) return jsonError(error.message, 409);
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return jsonError('A record with that unique name or email already exists', 409);
  }
  console.error('Admin mutation failed');
  return jsonError('Could not save changes', 500);
}
export async function GET(_req: Request, { params }: { params: Promise<{ resource: string }> }) {
  const u = await currentAdmin();
  if (!u) return jsonError('Unauthorized', 401);
  const { resource } = await params;
  if (!isResource(resource)) return jsonError('Unknown resource', 404);
  try {
    const page = await listAdminRecords(resource, parseAdminQuery(new URL(_req.url).searchParams));
    return Response.json(page, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof AdminQueryError) return jsonError(error.message, 422);
    console.error('Admin list failed');
    return jsonError('Could not load records', 500);
  }
}
export async function POST(req: Request, { params }: { params: Promise<{ resource: string }> }) {
  if (!sameOrigin(req)) return jsonError('Invalid origin', 403);
  const u = await currentAdmin();
  if (!u) return jsonError('Unauthorized', 401);
  const { resource } = await params;
  if (!isResource(resource) || ['audits', 'bookings', 'settings'].includes(resource))
    return jsonError('Not supported', 404);
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
  const result = validators[resource].safeParse(input);
  if (!result.success)
    return jsonError(
      'Invalid fields: ' +
        result.error.issues.map((e) => e.path.join('.') + ': ' + e.message).join('; '),
      422,
    );
  try {
    const userData = resource === 'users' ? validators.users.parse(input) : null;
    const passwordHash = userData ? await hashPassword(userData.password) : '';
    const row =
      resource === 'cars'
        ? await createCarWithUniqueSlug(validators.cars.parse(input), u.id)
        : await prisma.$transaction(async (tx) => {
            let created: { id: string };
            switch (resource) {
              case 'locations':
                created = await saveLocation(tx, validators.locations.parse(input));
                break;
              case 'faqs':
                created = await tx.faq.create({ data: validators.faqs.parse(input) });
                break;
              case 'testimonials':
                created = await tx.testimonial.create({
                  data: validators.testimonials.parse(input),
                });
                break;
              case 'users': {
                const { password: _password, ...rest } = userData!;
                created = await tx.adminUser.create({
                  data: { ...rest, email: rest.email.toLowerCase(), passwordHash },
                });
                break;
              }
              default:
                throw new Error('Unsupported admin resource');
            }
            await tx.auditLog.create({
              data: { userId: u.id, action: 'CREATE', resource, resourceId: created.id },
            });
            return created;
          });
    return Response.json({ id: row.id, ok: true }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
