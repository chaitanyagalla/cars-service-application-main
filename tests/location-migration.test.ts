import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { expect, it } from 'vitest';

it('archives case/space duplicates, keeps the original capitalized area, and enforces normalized uniqueness', async () => {
  const db = new PGlite();
  try {
    await db.exec(await readFile('prisma/migrations/20261102000000_initial/migration.sql', 'utf8'));
    await db.exec(`
      INSERT INTO "Location" (id, name, subtitle, "sortOrder") VALUES
        ('original', 'Secunderabad', 'Twin City', 4),
        ('duplicate', 'secunderabad', 'Test content', 0),
        ('spaces', ' Secunderabad  ', '', 0),
        ('typo', 'secuderabad', '', 0),
        ('airport', 'RGI Airport', 'Airport', 1);
    `);
    await db.exec(
      await readFile(
        'prisma/migrations/20261107000000_location_names_and_positions/migration.sql',
        'utf8',
      ),
    );
    expect(
      (await db.query('SELECT name, subtitle, "sortOrder" FROM "Location" ORDER BY "sortOrder"'))
        .rows,
    ).toEqual([
      { name: 'secuderabad', subtitle: '', sortOrder: 0 },
      { name: 'RGI Airport', subtitle: 'Airport', sortOrder: 1 },
      { name: 'Secunderabad', subtitle: 'Twin City', sortOrder: 2 },
    ]);
    const archived = (
      await db.query<{ original: { name: string; subtitle: string }; keptLocationId: string }>(
        'SELECT original, "keptLocationId" FROM "LocationDuplicateArchive" ORDER BY id',
      )
    ).rows;
    expect(archived).toHaveLength(2);
    expect(archived[0]).toMatchObject({
      keptLocationId: 'original',
      original: { name: 'secunderabad', subtitle: 'Test content' },
    });
    for (const name of [
      'SECUNDERABAD',
      ' secunderabad ',
      '\tSecunderabad\n',
      'RGI   AIRPORT',
      'RGI\tAirport',
    ])
      await expect(
        db.query('INSERT INTO "Location" (id, name) VALUES ($1, $2)', [name, name]),
      ).rejects.toThrow();
    await expect(
      db.query('UPDATE "Location" SET name = $1 WHERE id = $2', ['SECUNDERABAD', 'typo']),
    ).rejects.toThrow();
  } finally {
    await db.close();
  }
}, 60_000);
