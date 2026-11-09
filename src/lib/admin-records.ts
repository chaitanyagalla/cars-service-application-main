import { prisma } from './db';
import { auditWhere, leadWhere, type AdminQuery, type PageInfo } from './admin-query';
import type { Resource } from './admin-data';
import { locationOrderBy } from './location-names';

export async function listAdminRecords(resource: Resource, query: AdminQuery) {
  return prisma.$transaction(
    async (tx) => {
      const counts = {
        cars: () => tx.car.count(),
        locations: () => tx.location.count(),
        faqs: () => tx.faq.count(),
        testimonials: () => tx.testimonial.count(),
        settings: () => tx.siteSettings.count(),
        users: () => tx.adminUser.count(),
        bookings: () => tx.bookingIntent.count({ where: leadWhere(query) }),
        audits: () => tx.auditLog.count({ where: auditWhere(query) }),
      };
      const total = await counts[resource]();
      const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
      const page = Math.min(query.page, totalPages);
      const pagination: PageInfo = { page, pageSize: query.pageSize, total, totalPages };
      const options = {
        orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
        skip: (page - 1) * query.pageSize,
        take: query.pageSize,
      };
      // A unique ID breaks ordering ties so every record remains reachable across pages.
      const lists = {
        cars: () =>
          tx.car.findMany({
            ...options,
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }],
          }),
        locations: () => tx.location.findMany({ ...options, orderBy: [...locationOrderBy] }),
        faqs: () => tx.faq.findMany({ ...options, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }),
        testimonials: () => tx.testimonial.findMany(options),
        settings: () => tx.siteSettings.findMany({ ...options, orderBy: { id: 'asc' } }),
        users: () =>
          tx.adminUser.findMany({
            ...options,
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              active: true,
              createdAt: true,
            },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          }),
        bookings: () =>
          tx.bookingIntent.findMany({
            ...options,
            where: leadWhere(query),
            include: { car: { select: { name: true } } },
          }),
        audits: () =>
          tx.auditLog.findMany({
            ...options,
            where: auditWhere(query),
            include: { user: { select: { email: true } } },
          }),
      };
      const rows = await lists[resource]();
      return { ...pagination, rows };
    },
    { isolationLevel: 'RepeatableRead' },
  );
}
