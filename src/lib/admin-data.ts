import { prisma } from './db';
import { listAdminRecords } from './admin-records';
import { parseAdminQuery } from './admin-query';
import { locationOrderBy } from './location-names';
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
      return prisma.location.findMany({ orderBy: [...locationOrderBy] });
    case 'faqs':
      return prisma.faq.findMany({ orderBy: { sortOrder: 'asc' } });
    case 'testimonials':
      return prisma.testimonial.findMany({ orderBy: { createdAt: 'desc' } });
    case 'bookings':
      return (await listAdminRecords('bookings', parseAdminQuery(new URLSearchParams()))).rows;
    case 'settings':
      return prisma.siteSettings.findMany();
    case 'users':
      return prisma.adminUser.findMany({
        select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      });
    case 'audits':
      return (await listAdminRecords('audits', parseAdminQuery(new URLSearchParams()))).rows;
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
