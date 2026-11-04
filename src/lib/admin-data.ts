import { prisma } from './db';
import {
  carSchema,
  locationSchema,
  faqSchema,
  testimonialSchema,
  settingSchema,
  userCreateSchema,
  userUpdateSchema,
  statusSchema,
} from './validation';
export const resources = [
  'cars',
  'locations',
  'faqs',
  'testimonials',
  'bookings',
  'settings',
  'users',
  'audits',
] as const;
export type Resource = (typeof resources)[number];
export function isResource(v: string): v is Resource {
  return (resources as readonly string[]).includes(v);
}
export const labels: Record<Resource, string> = {
  cars: 'Cars & Pricing',
  locations: 'Service Areas',
  faqs: 'Frequently Asked Questions',
  testimonials: 'Testimonials',
  bookings: 'Booking Enquiries',
  settings: 'Website Settings',
  users: 'Staff Users',
  audits: 'Audit Log',
};
export async function listResource(resource: Resource) {
  switch (resource) {
    case 'cars':
      return prisma.car.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] });
    case 'locations':
      return prisma.location.findMany({ orderBy: { sortOrder: 'asc' } });
    case 'faqs':
      return prisma.faq.findMany({ orderBy: { sortOrder: 'asc' } });
    case 'testimonials':
      return prisma.testimonial.findMany({ orderBy: { createdAt: 'desc' } });
    case 'bookings':
      return prisma.bookingIntent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 300,
        include: { car: { select: { name: true } } },
      });
    case 'settings':
      return prisma.siteSettings.findMany();
    case 'users':
      return prisma.adminUser.findMany({
        select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      });
    case 'audits':
      return prisma.auditLog.findMany({
        include: { user: { select: { email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 300,
      });
  }
}
export const validators = {
  cars: carSchema,
  locations: locationSchema,
  faqs: faqSchema,
  testimonials: testimonialSchema,
  settings: settingSchema,
  users: userCreateSchema,
  bookings: statusSchema,
  audits: statusSchema,
};
export const updateUserValidator = userUpdateSchema;
