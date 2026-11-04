import { Prisma, type Car } from '@prisma/client';
import { prisma } from '@/lib/db';

export type RatedCar = Car & { ratingCount: number };

export async function withCarRatings(cars: Car[]): Promise<RatedCar[]> {
  if (!cars.length) return [];
  // Aggregate in PostgreSQL, without downloading every individual rating.
  // The car is derived from the booking, never from a customer-supplied car ID.
  const rows = await prisma.$queryRaw<
    Array<{ carId: string; rating: number; ratingCount: number }>
  >(Prisma.sql`
    SELECT b."carId", AVG(r."score")::double precision AS "rating", COUNT(*)::int AS "ratingCount"
    FROM "CarRating" r JOIN "BookingIntent" b ON b."id" = r."bookingId"
    WHERE b."carId" IN (${Prisma.join(cars.map((car) => car.id))})
    GROUP BY b."carId"
  `);
  const ratings = new Map(rows.map((row) => [row.carId, row]));
  // Ignore the legacy, manually editable Car.rating column.
  return cars.map((car) => ({
    ...car,
    rating: ratings.get(car.id)?.rating ?? null,
    ratingCount: ratings.get(car.id)?.ratingCount ?? 0,
  }));
}
