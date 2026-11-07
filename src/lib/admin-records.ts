import { prisma } from './db';
import { auditWhere, leadWhere, type AdminQuery, type PageInfo } from './admin-query';

export async function listAdminRecords(resource: 'bookings' | 'audits', query: AdminQuery) {
  return prisma.$transaction(
    async (tx) => {
      const total =
        resource === 'bookings'
          ? await tx.bookingIntent.count({ where: leadWhere(query) })
          : await tx.auditLog.count({ where: auditWhere(query) });
      const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
      const page = Math.min(query.page, totalPages);
      const pagination: PageInfo = { page, pageSize: query.pageSize, total, totalPages };
      const options = {
        orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
        skip: (page - 1) * query.pageSize,
        take: query.pageSize,
      };
      const rows =
        resource === 'bookings'
          ? await tx.bookingIntent.findMany({
              ...options,
              where: leadWhere(query),
              include: { car: { select: { name: true } } },
            })
          : await tx.auditLog.findMany({
              ...options,
              where: auditWhere(query),
              include: { user: { select: { email: true } } },
            });
      return { ...pagination, rows };
    },
    { isolationLevel: 'RepeatableRead' },
  );
}
