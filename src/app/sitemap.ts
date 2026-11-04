import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const cars = await prisma.car.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true },
  });
  return ['', '/cars', '/locations', '/about', '/faqs']
    .map((path) => ({ url: base + path, lastModified: new Date() }))
    .concat(cars.map((c) => ({ url: `${base}/cars/${c.slug}`, lastModified: c.updatedAt })));
}
