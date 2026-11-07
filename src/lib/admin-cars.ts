import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type { z } from 'zod';
import { prisma } from './db';
import { carSlugFromName, suggestCarSlug } from './car-slugs';
import type { carSchema } from './validation';

function isSlugCollision(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002')
    return false;
  const target = error.meta?.target;
  return Array.isArray(target)
    ? target.includes('slug')
    : target === 'slug' || target === 'Car_slug_key';
}

export async function createCarWithUniqueSlug(data: z.infer<typeof carSchema>, userId: string) {
  const base = carSlugFromName(data.name) || `car-${randomUUID().slice(0, 8)}`;
  const existing = await prisma.car.findMany({
    where: { OR: [{ slug: base }, { slug: { startsWith: `${base}-` } }] },
    select: { slug: true },
  });
  const used = new Set(existing.map((car) => car.slug));

  // The unique index arbitrates concurrent inserts. Retry only slug collisions,
  // and use a random suffix on the last attempt to avoid a busy numeric sequence.
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 4 ? `${base}-${randomUUID().slice(0, 8)}` : suggestCarSlug(base, used);
    try {
      // A PostgreSQL unique violation aborts its transaction. Retry the whole
      // create-and-audit transaction rather than reusing an aborted one.
      return await prisma.$transaction(async (tx) => {
        const car = await tx.car.create({ data: { ...data, slug } });
        await tx.auditLog.create({
          data: { userId, action: 'CREATE', resource: 'cars', resourceId: car.id },
        });
        return car;
      });
    } catch (error) {
      if (!isSlugCollision(error)) throw error;
      used.add(slug);
    }
  }
  throw new Error('Could not allocate a unique car URL');
}
