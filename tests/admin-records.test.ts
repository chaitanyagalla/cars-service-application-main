import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ db: {}, currentAdmin: vi.fn() }));
vi.mock('@/lib/db', () => ({ prisma: mocks.db }));
vi.mock('@/lib/security', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/security')>()),
  currentAdmin: mocks.currentAdmin,
}));
import { GET as list } from '../src/app/api/admin/[resource]/route';
import { GET as exportLeads } from '../src/app/api/admin/bookings/export/route';
import { parseAdminQuery, leadWhere, queryHref } from '../src/lib/admin-query';
import { leadContactNumber } from '../src/lib/lead-contact';

let db: PGlite;
type Sql = Pick<PGlite, 'query'>;
type Where = Record<string, any>;

// Execute the read subset used by these routes against isolated PostgreSQL.
// Prisma's filters are translated here; transactions and SQL filtering/paging
// execute in the engine rather than using a pre-truncated mocked row array.
function adapter(sql: Sql) {
  function delegate(table: 'BookingIntent' | 'AuditLog') {
    function condition(
      where: Where = {},
      values: unknown[] = [],
    ): { text: string; values: unknown[] } {
      const clauses = Object.entries(where).map(([field, value]) => {
        if (field === 'OR')
          return `(${value.map((part: Where) => condition(part, values).text).join(' OR ')})`;
        if (field === 'user') {
          values.push(`%${value.is.email.contains}%`);
          return `EXISTS (SELECT 1 FROM "AdminUser" u WHERE u.id = t."userId" AND u.email ILIKE $${values.length})`;
        }
        if (field === 'createdAt')
          return Object.entries(value)
            .map(([operator, date]) => {
              values.push(date);
              return `t."createdAt" ${operator === 'gte' ? '>=' : '<'} $${values.length}`;
            })
            .join(' AND ');
        if (value && typeof value === 'object' && 'contains' in value) {
          values.push(`%${value.contains}%`);
          return `t."${field}" ILIKE $${values.length}`;
        }
        values.push(value);
        return `t."${field}" = $${values.length}`;
      });
      return { text: clauses.join(' AND ') || 'TRUE', values };
    }
    return {
      async count({ where }: { where?: Where }) {
        const filter = condition(where);
        return (
          await sql.query<{ count: number }>(
            `SELECT count(*)::int AS count FROM "${table}" t WHERE ${filter.text}`,
            filter.values,
          )
        ).rows[0].count;
      },
      async findMany({ where, skip = 0, take }: { where?: Where; skip?: number; take: number }) {
        const filter = condition(where);
        const rows = (
          await sql.query<Record<string, any>>(
            `SELECT t.* FROM "${table}" t WHERE ${filter.text} ORDER BY t."createdAt" DESC, t.id DESC LIMIT $${filter.values.length + 1} OFFSET $${filter.values.length + 2}`,
            [...filter.values, take, skip],
          )
        ).rows;
        for (const row of rows) {
          if (table === 'BookingIntent')
            row.car = (
              await sql.query('SELECT name FROM "Car" WHERE id = $1', [row.carId])
            ).rows[0];
          else
            row.user = row.userId
              ? (await sql.query('SELECT email FROM "AdminUser" WHERE id = $1', [row.userId]))
                  .rows[0]
              : null;
        }
        return rows;
      },
    };
  }
  return { bookingIntent: delegate('BookingIntent'), auditLog: delegate('AuditLog') };
}

beforeAll(async () => {
  db = new PGlite();
  for (const migration of [
    '20261102000000_initial',
    '20261102010000_customer_google_auth_ratings',
    '20261102020000_single_admin_role',
  ])
    await db.exec(await readFile(`prisma/migrations/${migration}/migration.sql`, 'utf8'));
  Object.assign(mocks.db, adapter(db), {
    $transaction: (fn: (tx: ReturnType<typeof adapter>) => Promise<unknown>) =>
      db.transaction((tx) => fn(adapter(tx))),
  });
}, 60_000);
afterAll(async () => {
  await db?.close();
});

beforeEach(async () => {
  mocks.currentAdmin.mockResolvedValue({ id: 'owner' });
  await db.exec(`
    TRUNCATE "AdminUser", "Car" CASCADE;
    INSERT INTO "AdminUser" (id, name, email, "passwordHash") VALUES ('owner', 'Owner', 'owner@example.com', 'hash');
    INSERT INTO "Car" (id, slug, name, category, "priceDay", "updatedAt") VALUES
      ('car-a', 'car-a', 'Car A', 'HATCHBACK', 1000, NOW()), ('car-b', 'car-b', 'Car B', 'SUV', 2000, NOW());
    INSERT INTO "BookingIntent" (id, "carId", "customerName", "customerPhone", "pickupLocation", notes, status, "createdAt")
    SELECT 'lead-' || lpad(i::text, 4, '0'), CASE WHEN i % 2 = 0 THEN 'car-a' ELSE 'car-b' END,
      'Customer ' || i, '9700093666', 'Hyderabad', repeat('n', 500),
      CASE WHEN i % 3 = 0 THEN 'NEW' ELSE 'CONTACTED' END::"BookingStatus", '2026-11-01 12:00:00'
    FROM generate_series(0, 350) AS i;
    INSERT INTO "AuditLog" (id, "userId", action, resource, "resourceId", "createdAt")
    SELECT 'audit-' || lpad(i::text, 4, '0'), 'owner', CASE WHEN i % 2 = 0 THEN 'UPDATE' ELSE 'CREATE' END,
      CASE WHEN i % 2 = 0 THEN 'cars' ELSE 'bookings' END, 'record', '2026-11-01 12:00:00'
    FROM generate_series(0, 350) AS i;
  `);
});

function read(resource: string, query = '') {
  return list(new Request(`http://localhost:3000/api/admin/${resource}?${query}`), {
    params: Promise.resolve({ resource }),
  });
}
function csv(query = '') {
  return exportLeads(new Request(`http://localhost:3000/api/admin/bookings/export?${query}`));
}

describe('complete enquiry and audit access', () => {
  it.each(['bookings', 'audits'])(
    'reaches every one of 351 %s with tied timestamps, without duplicates',
    async (resource) => {
      const ids: string[] = [];
      for (let page = 1; page <= 15; page++) {
        const response = await read(resource, `page=${page}`);
        expect(response.status).toBe(200);
        const result = await response.json();
        expect(result).toMatchObject({ total: 351, totalPages: 15, page });
        ids.push(...result.rows.map((row: { id: string }) => row.id));
      }
      expect(ids).toHaveLength(351);
      expect(new Set(ids).size).toBe(351);
      expect(ids.at(-1)).toBe(resource === 'bookings' ? 'lead-0000' : 'audit-0000');
    },
  );

  it('filters before pagination and keeps full notes in the lead result', async () => {
    const result = await (
      await read('bookings', 'status=NEW&carId=car-a&page=2&pageSize=25')
    ).json();
    expect(result.total).toBe(59);
    expect(result.rows).toHaveLength(25);
    for (const row of result.rows) {
      expect(row.status).toBe('NEW');
      expect(row.carId).toBe('car-a');
      expect(row.notes).toHaveLength(500);
    }
    const exact = await (await read('bookings', 'q=lead-0000')).json();
    expect(exact.total).toBe(1);
    expect(exact.rows[0].id).toBe('lead-0000');
  });
  it('refreshes a detail view by exact ID even if another customer name contains that reference', async () => {
    await db.query('UPDATE "BookingIntent" SET "customerName" = $1 WHERE id = $2', [
      'lead-0000',
      'lead-0001',
    ]);
    const result = await (await read('bookings', 'id=lead-0000')).json();
    expect(result.total).toBe(1);
    expect(result.rows.map((row: { id: string }) => row.id)).toEqual(['lead-0000']);
  });

  it('applies actor, action and resource filters to the full audit history', async () => {
    const result = await (
      await read('audits', 'actor=OWNER%40example.com&action=update&entity=cars&page=7')
    ).json();
    expect(result).toMatchObject({ total: 176, totalPages: 8, page: 7 });
    expect(
      result.rows.every(
        (row: { action: string; resource: string }) =>
          row.action === 'UPDATE' && row.resource === 'cars',
      ),
    ).toBe(true);
  });

  it('clamps pages after filtering to keep the last records reachable', async () => {
    expect(await (await read('bookings', 'q=lead-0000&page=999')).json()).toMatchObject({
      page: 1,
      total: 1,
    });
  });

  it.each([
    'page=0',
    'pageSize=100000',
    'status=PAID',
    'from=2026-02-30',
    'from=2026-11-07&to=2026-11-01',
  ])('rejects invalid filters: %s', async (query) => {
    expect((await read('bookings', query)).status).toBe(422);
    expect((await csv(query)).status).toBe(422);
  });

  it('uses inclusive India-calendar dates with an exclusive next-day boundary', () => {
    const where = leadWhere(parseAdminQuery(new URLSearchParams('from=2026-11-01&to=2026-11-01')));
    expect(where.createdAt).toEqual({
      gte: new Date('2026-10-31T18:30:00Z'),
      lt: new Date('2026-11-01T18:30:00Z'),
    });
  });

  it('exports all filtered matches, independently of the viewed page, with references and safe CSV cells', async () => {
    await db.query('UPDATE "BookingIntent" SET "customerName" = $1, notes = $2 WHERE id = $3', [
      '=HYPERLINK("bad")',
      'line one\nline two',
      'lead-0000',
    ]);
    const response = await csv('status=NEW&carId=car-a&page=3');
    expect(response.status).toBe(200);
    const content = await response.text();
    expect(content).toContain('"Enquiry reference","Created (UTC)"');
    expect(content).toContain('"lead-0000"');
    expect(content).toContain('"\'=HYPERLINK(""bad"")"');
    expect(content).toContain('"line one\nline two"');
    expect(content.match(/"lead-\d{4}"/g)).toHaveLength(59);
  });

  it('refuses an oversized export explicitly instead of silently truncating it', async () => {
    await db.exec(`INSERT INTO "BookingIntent" (id, "carId", "customerName", "customerPhone", "pickupLocation")
      SELECT 'extra-' || i, 'car-a', 'Extra', '9700093666', 'Hyderabad' FROM generate_series(1, 10001) i`);
    const response = await csv();
    expect(response.status).toBe(422);
    expect((await response.json()).error).toContain('10,000');
    expect(response.headers.get('content-disposition')).toBeNull();
  });

  it('requires authentication for lists and filtered exports', async () => {
    mocks.currentAdmin.mockResolvedValue(null);
    expect((await read('bookings')).status).toBe(401);
    expect((await read('audits')).status).toBe(401);
    expect((await csv('q=customer')).status).toBe(401);
  });

  it('preserves filters in page links', () => {
    const href = queryHref('/admin/bookings', 'q=Customer&status=NEW&page=1', 3);
    expect(href).toBe('/admin/bookings?q=Customer&status=NEW&page=3');
  });

  it.each([
    ['9700093666', '919700093666'],
    ['+91 (97000) 93666', '919700093666'],
    ['09700093666', '919700093666'],
    ['00919700093666', '919700093666'],
    ['123', null],
  ])('normalizes customer contact %s', (phone, expected) => {
    expect(leadContactNumber(phone!)).toBe(expected);
  });
});
