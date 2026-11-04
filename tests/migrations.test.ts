import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import type { Car } from '@prisma/client';
import { expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('@/lib/db', () => ({ prisma: { $queryRaw: mocks.query } }));
import { withCarRatings } from '../src/lib/car-ratings';

it('migrates existing staff and enquiries, enforces rating constraints, and computes real averages', async () => {
  // A fresh in-memory PostgreSQL engine: no access to the configured Neon database.
  const db = new PGlite();
  try {
    await db.exec(await readFile('prisma/migrations/20261102000000_initial/migration.sql', 'utf8'));
    await db.exec(`
      INSERT INTO "AdminUser" (id, email, name, "passwordHash", role) VALUES
        ('admin-1', 'admin@example.com', 'Admin', 'hash', 'ADMIN'),
        ('admin-2', 'owner@example.com', 'Owner', 'hash', 'SUPER_ADMIN');
      INSERT INTO "Car" (id, slug, name, category, "priceDay", "updatedAt", rating)
        VALUES ('car-1', 'swift', 'Swift', 'HATCHBACK', 1999, NOW(), 4.9);
      INSERT INTO "BookingIntent" (id, "carId", "customerName", "customerPhone", "pickupLocation", status)
        VALUES ('legacy-booking', 'car-1', 'Old Customer', '9700093666', 'Hyderabad', 'CLOSED');
    `);
    await db.exec(
      await readFile(
        'prisma/migrations/20261102010000_customer_google_auth_ratings/migration.sql',
        'utf8',
      ),
    );
    await db.exec(
      await readFile('prisma/migrations/20261102020000_single_admin_role/migration.sql', 'utf8'),
    );
    expect((await db.query('SELECT id, role FROM "AdminUser" ORDER BY id')).rows).toEqual([
      { id: 'admin-1', role: 'ADMIN' },
      { id: 'admin-2', role: 'ADMIN' },
    ]);
    expect(
      (await db.query('SELECT "customerId" FROM "BookingIntent" WHERE id = $1', ['legacy-booking']))
        .rows,
    ).toEqual([{ customerId: null }]);
    await expect(
      db.query(
        `INSERT INTO "AdminUser" (id, email, name, "passwordHash", role) VALUES ('bad', 'bad@example.com', 'Bad', 'hash', 'SUPER_ADMIN')`,
      ),
    ).rejects.toThrow();
    await db.exec(`
      INSERT INTO "Customer" (id, "googleId", email, name, "updatedAt") VALUES ('customer-1', 'google-1', 'customer@example.com', 'Customer', NOW());
      INSERT INTO "BookingIntent" (id, "carId", "customerId", "customerName", "customerPhone", "pickupLocation", status) VALUES
        ('booking-1', 'car-1', 'customer-1', 'Customer', '9700093666', 'Hyderabad', 'COMPLETED'),
        ('booking-2', 'car-1', 'customer-1', 'Customer', '9700093666', 'Hyderabad', 'COMPLETED');
      INSERT INTO "CarRating" ("bookingId", score) VALUES ('booking-1', 1);
    `);
    await expect(
      db.query('INSERT INTO "CarRating" ("bookingId", score) VALUES ($1, $2)', ['booking-1', 5]),
    ).rejects.toThrow();
    for (const score of [0, 6])
      await expect(
        db.query('INSERT INTO "CarRating" ("bookingId", score) VALUES ($1, $2)', [
          'booking-2',
          score,
        ]),
      ).rejects.toThrow();
    await expect(
      db.query('INSERT INTO "CarRating" ("bookingId", score) VALUES ($1, $2)', ['missing', 5]),
    ).rejects.toThrow();
    await db.query('INSERT INTO "CarRating" ("bookingId", score) VALUES ($1, $2)', [
      'booking-2',
      5,
    ]);
    mocks.query.mockImplementation(
      async (query: { text: string; values: unknown[] }) =>
        (await db.query(query.text, query.values)).rows,
    );
    const cars = await withCarRatings([
      { id: 'car-1', rating: 4.9 } as Car,
      { id: 'car-without-ratings', rating: 5 } as Car,
    ]);
    expect(cars[0]).toMatchObject({ rating: 3, ratingCount: 2 });
    expect(cars[1]).toMatchObject({ rating: null, ratingCount: 0 });
  } finally {
    await db.close();
  }
}, 60_000);
