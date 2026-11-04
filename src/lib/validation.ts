import { z } from 'zod';
import { validNewPassword } from './passwords';
const text = (max = 255) => z.string().trim().min(1).max(max);
const optional = (max = 255) => z.string().trim().max(max).default('');
const bool = z.boolean();
const money = z.number().int().min(0).max(10000000);
const number = z.number().int().min(0).max(1000000);
const image = z
  .string()
  .max(2048)
  .refine(
    (v) => (v.startsWith('/cars/') && !v.includes('..')) || /^https:\/\/[^\s@]+$/i.test(v),
    'Image must be a /cars/ asset or HTTPS URL',
  );
export const carSchema = z.object({
  name: text(120),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  category: z.enum(['HATCHBACK', 'SEDAN', 'MPV', 'SUV']),
  description: optional(4000),
  seats: z.number().int().min(1).max(20),
  fuel: text(50),
  transmission: text(50),
  mileage: optional(50),
  bootSpace: optional(50),
  engine: optional(80),
  imageUrl: image,
  gallery: z.array(image).max(15),
  price12h: money,
  priceDay: money,
  price3Days: money,
  priceWeek: money,
  extraKmRate: money,
  extraHourRate: money,
  includedKm: number,
  deposit: money,
  featured: bool,
  available: bool,
  published: bool,
  sortOrder: number,
});
export const locationSchema = z.object({
  name: text(100),
  subtitle: optional(100),
  description: optional(500),
  active: bool,
  sortOrder: number,
});
export const faqSchema = z.object({
  question: text(250),
  answer: text(3000),
  published: bool,
  sortOrder: number,
});
export const testimonialSchema = z.object({
  name: text(100),
  area: optional(150),
  carName: optional(100),
  text: text(2000),
  rating: z.number().int().min(1).max(5),
  verified: bool,
  published: bool,
});
export const settingSchema = z.object({
  businessName: text(100),
  whatsappNumber: z.string().regex(/^\+?\d{10,15}$/),
  phoneNumber: text(30),
  contactEmail: z.email().max(255),
  address: text(300),
  mapsUrl: z.url().refine((v) => v.startsWith('https://')),
  headline: text(120),
  description: text(500),
});
export const bookingSchema = z
  .object({
    carId: text(60),
    customerName: text(100),
    customerPhone: z.string().regex(/^\+?[\d\s()-]{10,20}$/),
    pickupLocation: text(120),
    pickupDate: z.iso.datetime().nullable(),
    returnDate: z.iso.datetime().nullable(),
    notes: optional(500),
  })
  .refine(
    (v) => !v.pickupDate || !v.returnDate || new Date(v.returnDate) > new Date(v.pickupDate),
    { message: 'Return must be later than pickup' },
  );
const password = z
  .string()
  .min(12)
  .max(72)
  .refine(validNewPassword, 'Use 12+ characters and at most 72 UTF-8 bytes');
export const userCreateSchema = z.object({
  name: text(100),
  email: z.email().max(255),
  password,
  role: z.literal('ADMIN').default('ADMIN'),
  active: bool,
});
export const userUpdateSchema = z.object({
  name: text(100),
  email: z.email().max(255),
  password: z.union([password, z.literal('')]).optional(),
  role: z.literal('ADMIN').default('ADMIN'),
  active: bool,
});
export const statusSchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'CONFIRMED', 'COMPLETED', 'CLOSED', 'CANCELLED']),
});
