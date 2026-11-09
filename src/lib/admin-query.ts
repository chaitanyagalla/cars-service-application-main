import { z } from 'zod';
import type { Prisma } from '@prisma/client';

export const leadStatuses = [
  'NEW',
  'CONTACTED',
  'CONFIRMED',
  'COMPLETED',
  'CLOSED',
  'CANCELLED',
] as const;
export type PageInfo = { page: number; pageSize: number; total: number; totalPages: number };
export type AdminPage<T> = PageInfo & { rows: T[] };
const optionalText = (max: number) => z.string().trim().max(max).default('');
const querySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(1_000_000).default(1),
    pageSize: z.literal('10').default('10').transform(Number),
    q: optionalText(120),
    id: optionalText(60),
    status: z.union([z.enum(leadStatuses), z.literal('')]).default(''),
    carId: optionalText(60),
    actor: optionalText(120),
    action: optionalText(40),
    entity: optionalText(40),
    from: z.union([z.iso.date(), z.literal('')]).default(''),
    to: z.union([z.iso.date(), z.literal('')]).default(''),
  })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: 'The end date must be on or after the start date.',
    path: ['to'],
  });
export type AdminQuery = z.infer<typeof querySchema>;
export class AdminQueryError extends Error {}
export function parseAdminQuery(params: URLSearchParams): AdminQuery {
  const result = querySchema.safeParse(Object.fromEntries(params));
  if (!result.success)
    throw new AdminQueryError(
      result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
    );
  return result.data;
}

// Submitted-date filters use India calendar days, independent of host timezone.
function submittedRange(query: AdminQuery) {
  if (!query.from && !query.to) return undefined;
  return {
    ...(query.from ? { gte: new Date(`${query.from}T00:00:00+05:30`) } : {}),
    ...(query.to ? { lt: new Date(Date.parse(`${query.to}T00:00:00+05:30`) + 86_400_000) } : {}),
  };
}
export function leadWhere(query: AdminQuery): Prisma.BookingIntentWhereInput {
  return {
    ...(query.id ? { id: query.id } : {}),
    ...(query.q
      ? {
          OR: [
            { id: { contains: query.q, mode: 'insensitive' as const } },
            { customerName: { contains: query.q, mode: 'insensitive' as const } },
            { customerPhone: { contains: query.q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.carId ? { carId: query.carId } : {}),
    ...(submittedRange(query) ? { createdAt: submittedRange(query) } : {}),
  };
}
export function auditWhere(query: AdminQuery): Prisma.AuditLogWhereInput {
  return {
    ...(query.actor
      ? {
          OR: [
            { userId: query.actor },
            { user: { is: { email: { contains: query.actor, mode: 'insensitive' as const } } } },
          ],
        }
      : {}),
    ...(query.action ? { action: query.action.toUpperCase() } : {}),
    ...(query.entity ? { resource: query.entity } : {}),
    ...(submittedRange(query) ? { createdAt: submittedRange(query) } : {}),
  };
}
export function queryHref(path: string, query: string, page: number) {
  const params = new URLSearchParams(query);
  params.set('page', String(page));
  return `${path}?${params}`;
}
