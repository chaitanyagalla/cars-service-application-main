import { prisma } from '@/lib/db';
import {
  currentAdmin,
  sameOrigin,
  jsonError,
  readJsonBody,
  RequestInputError,
} from '@/lib/security';
import { isResource, listResource, validators } from '@/lib/admin-data';
import { hashPassword } from '@/lib/passwords';
import { Prisma } from '@prisma/client';
export const runtime = 'nodejs';
function failure(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
    return jsonError('A record with that unique name/email/slug already exists', 409);
  console.error('Admin mutation failed');
  return jsonError('Could not save changes', 500);
}
export async function GET(_req: Request, { params }: { params: Promise<{ resource: string }> }) {
  const u = await currentAdmin();
  if (!u) return jsonError('Unauthorized', 401);
  const { resource } = await params;
  if (!isResource(resource)) return jsonError('Unknown resource', 404);
  const rows = await listResource(resource);
  return Response.json(rows, { headers: { 'Cache-Control': 'no-store' } });
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
    let row: { id: string };
    switch (resource) {
      case 'cars':
        row = await prisma.car.create({ data: validators.cars.parse(input) });
        break;
      case 'locations':
        row = await prisma.location.create({ data: validators.locations.parse(input) });
        break;
      case 'faqs':
        row = await prisma.faq.create({ data: validators.faqs.parse(input) });
        break;
      case 'testimonials':
        row = await prisma.testimonial.create({ data: validators.testimonials.parse(input) });
        break;
      case 'users': {
        const data = validators.users.parse(input);
        const { password, ...rest } = data;
        row = await prisma.adminUser.create({
          data: {
            ...rest,
            email: rest.email.toLowerCase(),
            passwordHash: await hashPassword(password),
          },
        });
        break;
      }
      default:
        return jsonError('Not supported', 404);
    }
    await prisma.auditLog.create({
      data: { userId: u.id, action: 'CREATE', resource, resourceId: row.id },
    });
    return Response.json({ id: row.id, ok: true }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
