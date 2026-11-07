import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { Prisma } from '@prisma/client';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ db: {}, currentAdmin: vi.fn() }));
vi.mock('@/lib/db', () => ({ prisma: mocks.db }));
vi.mock('@/lib/security', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/security')>()),
  currentAdmin: mocks.currentAdmin,
}));

import { POST } from '../src/app/api/admin/[resource]/route';
import { DELETE, PATCH } from '../src/app/api/admin/[resource]/[id]/route';

const tables = {
  cars: 'Car',
  locations: 'Location',
  faqs: 'Faq',
  testimonials: 'Testimonial',
  users: 'AdminUser',
  bookings: 'BookingIntent',
  settings: 'SiteSettings',
} as const;
type Resource = keyof typeof tables;
type Row = Record<string, unknown>;
type SqlClient = Pick<PGlite, 'query'>;
let db: PGlite;

// Adapt only the Prisma methods exercised by these routes to an isolated
// PostgreSQL engine. Transactions, constraint failures and cascades are real;
// this suite never loads the configured database client or contacts Neon.
function client(sql: SqlClient) {
  function model(table: string) {
    const quoted = `"${table}"`;
    return {
      async create({ data }: { data: Row }) {
        const values = {
          id: randomUUID(),
          ...(table === 'Car' ? { updatedAt: new Date() } : {}),
          ...data,
        };
        const columns = Object.keys(values)
          .map((key) => `"${key}"`)
          .join(', ');
        try {
          const result = await sql.query<Row>(
            `INSERT INTO ${quoted} (${columns})
             SELECT ${columns} FROM jsonb_populate_record(NULL::${quoted}, $1::jsonb)
             RETURNING *`,
            [JSON.stringify(values)],
          );
          return result.rows[0];
        } catch (error) {
          // Match Prisma's unique-error shape for the real slug retry path.
          if ((error as { code?: string }).code === '23505')
            throw new Prisma.PrismaClientKnownRequestError('Unique constraint', {
              code: 'P2002',
              clientVersion: '6.19.3',
              meta: {
                target: [
                  (error as { constraint?: string }).constraint === 'Car_slug_key' ? 'slug' : 'id',
                ],
              },
            });
          throw error;
        }
      },
      async update({ where, data }: { where: { id: string }; data: Row }) {
        const assignments = Object.keys(data)
          .map((key) => `"${key}" = incoming."${key}"`)
          .join(', ');
        const result = await sql.query<Row>(
          `UPDATE ${quoted} AS target SET ${assignments}
           FROM jsonb_populate_record(NULL::${quoted}, $1::jsonb) AS incoming
           WHERE target.id = $2 RETURNING target.*`,
          [JSON.stringify(data), where.id],
        );
        if (!result.rows.length) throw new Error('Missing test record');
        return result.rows[0];
      },
      async delete({ where }: { where: { id: string } }) {
        const result = await sql.query<Row>(`DELETE FROM ${quoted} WHERE id = $1 RETURNING *`, [
          where.id,
        ]);
        if (!result.rows.length) throw new Error('Missing test record');
        return result.rows[0];
      },
      async findUnique({
        where,
        include,
      }: {
        where: { id: string };
        include?: { rating: boolean };
      }) {
        const result = await sql.query<Row>(`SELECT * FROM ${quoted} WHERE id = $1`, [where.id]);
        const row = result.rows[0] ?? null;
        if (row && include?.rating)
          row.rating =
            (await sql.query('SELECT * FROM "CarRating" WHERE "bookingId" = $1', [where.id]))
              .rows[0] ?? null;
        return row;
      },
      async findMany({ orderBy = [] }: { orderBy?: Record<string, string>[] } = {}) {
        const order = orderBy.length
          ? ' ORDER BY ' +
            orderBy
              .map((item) => {
                const [column, direction] = Object.entries(item)[0];
                if (!['sortOrder', 'name', 'id'].includes(column) || direction !== 'asc')
                  throw new Error('Unsupported test ordering');
                return `"${column}" ASC`;
              })
              .join(', ')
          : '';
        return (await sql.query<Row>(`SELECT * FROM ${quoted}${order}`)).rows;
      },
      async count() {
        return (
          await sql.query<{ count: number }>(
            `SELECT count(*)::int AS count FROM ${quoted} WHERE active`,
          )
        ).rows[0].count;
      },
    };
  }
  return {
    car: model('Car'),
    location: model('Location'),
    faq: model('Faq'),
    testimonial: model('Testimonial'),
    adminUser: model('AdminUser'),
    bookingIntent: model('BookingIntent'),
    siteSettings: model('SiteSettings'),
    auditLog: model('AuditLog'),
    session: {
      async deleteMany({ where }: { where: { userId: string } }) {
        await sql.query('DELETE FROM "Session" WHERE "userId" = $1', [where.userId]);
      },
    },
    async $queryRaw(strings: TemplateStringsArray, ...values: unknown[]) {
      const query = strings.reduce(
        (text, part, index) => text + (index ? `$${index}` : '') + part,
        '',
      );
      return (await sql.query(query, values)).rows;
    },
    async $executeRaw(strings: TemplateStringsArray) {
      await sql.query(strings.join(''));
      return 0;
    },
  };
}

const inputs: Record<Resource, Row> = {
  cars: {
    name: 'Swift',
    category: 'HATCHBACK',
    seats: 5,
    fuel: 'Petrol',
    transmission: 'Manual',
    imageUrl: '/cars/placeholder.svg',
    gallery: [],
    price12h: 0,
    priceDay: 1999,
    price3Days: 0,
    priceWeek: 0,
    extraKmRate: 6,
    extraHourRate: 200,
    includedKm: 350,
    deposit: 0,
    featured: false,
    available: true,
    published: true,
    sortOrder: 0,
  },
  locations: { name: 'Hyderabad', active: true, sortOrder: 0 },
  faqs: { question: 'Can I enquire?', answer: 'Yes.', published: true, sortOrder: 0 },
  testimonials: {
    name: 'Customer',
    text: 'Good service.',
    rating: 5,
    verified: false,
    published: false,
  },
  users: {
    name: 'Other Admin',
    email: 'other@example.com',
    password: 'new-owner-password',
    active: true,
  },
  bookings: { status: 'CONTACTED' },
  settings: {
    businessName: 'Updated Business',
    whatsappNumber: '919700093666',
    phoneNumber: '9700093666',
    contactEmail: 'owner@example.com',
    address: 'Hyderabad',
    mapsUrl: 'https://example.com/map',
    headline: 'Enquire about a car',
    description: 'Contact us for details.',
  },
};

beforeAll(async () => {
  db = new PGlite();
  for (const migration of [
    '20261102000000_initial',
    '20261102010000_customer_google_auth_ratings',
    '20261102020000_single_admin_role',
    '20261107000000_location_names_and_positions',
  ])
    await db.exec(await readFile(`prisma/migrations/${migration}/migration.sql`, 'utf8'));
  Object.assign(mocks.db, client(db), {
    $transaction: (fn: (tx: ReturnType<typeof client>) => Promise<unknown>) =>
      db.transaction((tx) => fn(client(tx))),
  });
}, 60_000);

beforeEach(async () => {
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000');
  mocks.currentAdmin.mockResolvedValue({ id: 'owner' });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  await db.exec(`
    ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS test_audit_failure;
    TRUNCATE "AdminUser", "Car", "Location", "LocationDuplicateArchive", "Faq", "Testimonial", "SiteSettings" CASCADE;
    INSERT INTO "AdminUser" (id, name, email, "passwordHash") VALUES
      ('owner', 'Owner', 'owner@example.com', 'original-owner-hash'),
      ('users', 'Old Admin', 'old@example.com', 'original-other-hash');
    INSERT INTO "Session" (id, "tokenHash", "userId", "expiresAt") VALUES
      ('existing-session', 'token-hash', 'users', NOW() + INTERVAL '1 hour');
    INSERT INTO "AuditLog" (id, "userId", action, resource, "resourceId") VALUES
      ('historical-audit', 'users', 'LOGIN', 'users', 'users');
    INSERT INTO "Car" (id, slug, name, category, "priceDay", "updatedAt") VALUES
      ('cars', 'swift', 'Old Swift', 'HATCHBACK', 1000, NOW()),
      ('enquiry-car', 'enquiry-car', 'Enquiry Car', 'HATCHBACK', 1000, NOW());
    INSERT INTO "Location" (id, name) VALUES ('locations', 'Old Location');
    INSERT INTO "Faq" (id, question, answer) VALUES ('faqs', 'Old question?', 'Old answer.');
    INSERT INTO "Testimonial" (id, name, text) VALUES ('testimonials', 'Old Customer', 'Old review.');
    INSERT INTO "SiteSettings" (id) VALUES ('main');
    INSERT INTO "BookingIntent" (id, "carId", "customerName", "customerPhone", "pickupLocation")
      VALUES ('bookings', 'enquiry-car', 'Private Customer', '9700093666', 'Hyderabad');
  `);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
afterAll(async () => {
  await db?.close();
});

async function snapshot() {
  const result: Record<string, Row[]> = {};
  for (const table of [...Object.values(tables), 'Session', 'AuditLog'])
    result[table] = (await db.query<Row>(`SELECT * FROM "${table}" ORDER BY id`)).rows;
  return result;
}

function mutate(method: 'POST' | 'PATCH' | 'DELETE', resource: Resource, data = inputs[resource]) {
  const id = resource === 'settings' ? 'main' : resource;
  const req = new Request(`http://localhost:3000/api/admin/${resource}/${id}`, {
    method,
    headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' },
    ...(method !== 'DELETE' ? { body: JSON.stringify(data) } : {}),
  });
  const params = { params: Promise.resolve({ resource, id }) };
  return method === 'POST'
    ? POST(req, params)
    : method === 'PATCH'
      ? PATCH(req, params)
      : DELETE(req, params);
}

const creates = ['cars', 'locations', 'faqs', 'testimonials', 'users'] as const;
const updates = Object.keys(tables) as Resource[];
const cases = [
  ...creates.map((resource) => ({ method: 'POST' as const, resource })),
  ...updates.map((resource) => ({ method: 'PATCH' as const, resource })),
  ...creates.map((resource) => ({ method: 'DELETE' as const, resource })),
];

describe('atomic admin mutations', () => {
  it.each(['old location', 'OLD LOCATION', '  Old   Location  ', 'Old\tLocation'])(
    'rejects duplicate area %j on creation and renaming without changing rows or audits',
    async (name) => {
      await db.query('INSERT INTO "Location" (id, name, "sortOrder") VALUES ($1, $2, $3)', [
        'another-area',
        'Another Area',
        1,
      ]);
      const before = await snapshot();
      const create = await mutate('POST', 'locations', { ...inputs.locations, name });
      expect(create.status).toBe(409);
      expect(await create.json()).toMatchObject({
        error: expect.stringContaining('already exists'),
      });
      // Change the existing target to the other area's name with different casing/spacing.
      const update = await mutate('PATCH', 'locations', {
        ...inputs.locations,
        name: '  another   AREA ',
      });
      expect(update.status).toBe(409);
      expect(await snapshot()).toEqual(before);
    },
  );

  it('capitalizes names, preserves acronyms, and appends when no position is supplied', async () => {
    for (const name of ['secunderabad', 'RGI   Airport', 'ECIL']) {
      const response = await mutate('POST', 'locations', { name, active: true });
      expect(response.status).toBe(201);
    }
    expect(
      (await db.query('SELECT name, "sortOrder" FROM "Location" ORDER BY "sortOrder"')).rows,
    ).toEqual([
      { name: 'Old Location', sortOrder: 0 },
      { name: 'Secunderabad', sortOrder: 1 },
      { name: 'RGI Airport', sortOrder: 2 },
      { name: 'ECIL', sortOrder: 3 },
    ]);
  });

  it('shifts positions on insertion, moves in both directions, and closes gaps after deletion', async () => {
    await mutate('POST', 'locations', { name: 'Last', active: false });
    await mutate('POST', 'locations', { name: 'Middle', active: true, sortOrder: 1 });
    const names = async () =>
      (
        await db.query<{ name: string; sortOrder: number }>(
          'SELECT name, "sortOrder" FROM "Location" ORDER BY "sortOrder"',
        )
      ).rows;
    expect(await names()).toEqual([
      { name: 'Old Location', sortOrder: 0 },
      { name: 'Middle', sortOrder: 1 },
      { name: 'Last', sortOrder: 2 },
    ]);
    expect(
      (
        await mutate('PATCH', 'locations', {
          ...inputs.locations,
          name: 'Old Location',
          sortOrder: 2,
        })
      ).status,
    ).toBe(200);
    expect((await names()).map((row) => row.name)).toEqual(['Middle', 'Last', 'Old Location']);
    expect(
      (
        await mutate('PATCH', 'locations', {
          ...inputs.locations,
          name: 'old location',
          sortOrder: 0,
        })
      ).status,
    ).toBe(200);
    expect((await names()).map((row) => row.name)).toEqual(['Old Location', 'Middle', 'Last']);
    expect((await mutate('DELETE', 'locations')).status).toBe(200);
    expect(await names()).toEqual([
      { name: 'Middle', sortOrder: 0 },
      { name: 'Last', sortOrder: 1 },
    ]);
  });

  it('rolls back shifted positions as well as the area when its audit fails', async () => {
    await mutate('POST', 'locations', { name: 'Second', active: true });
    const before = await snapshot();
    await db.exec(
      'ALTER TABLE "AuditLog" ADD CONSTRAINT test_audit_failure CHECK (false) NOT VALID',
    );
    expect(
      (await mutate('POST', 'locations', { name: 'First', active: true, sortOrder: 0 })).status,
    ).toBe(500);
    expect(await snapshot()).toEqual(before);
  });

  it.each(cases)(
    '$method $resource rolls back when the audit insert fails',
    async ({ method, resource }) => {
      const before = await snapshot();
      // NOT VALID preserves historical entries while forcing every new INSERT to fail.
      await db.exec(
        'ALTER TABLE "AuditLog" ADD CONSTRAINT test_audit_failure CHECK (false) NOT VALID',
      );
      const response = await mutate(method, resource);
      expect(response.status).toBe(500);
      expect(await snapshot()).toEqual(before);
    },
  );

  it.each(cases)(
    '$method $resource commits the change and exactly one audit together',
    async ({ method, resource }) => {
      const before = await snapshot();
      const response = await mutate(method, resource);
      expect(response.status).toBe(method === 'POST' ? 201 : 200);
      const body = await response.json();
      expect(body.ok).toBe(true);
      const after = await snapshot();
      expect(after[tables[resource]]).not.toEqual(before[tables[resource]]);
      const events = after.AuditLog.filter((row) => row.id !== 'historical-audit');
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        userId: 'owner',
        action: { POST: 'CREATE', PATCH: 'UPDATE', DELETE: 'DELETE' }[method],
        resource,
        resourceId: method === 'POST' ? body.id : resource === 'settings' ? 'main' : resource,
      });
      expect(Object.keys(events[0]).sort()).toEqual(
        ['id', 'userId', 'action', 'resource', 'resourceId', 'createdAt'].sort(),
      );
      if (resource === 'users' && method !== 'POST') expect(after.Session).toEqual([]);
    },
  );

  it('retries a real slug collision in a fresh transaction and writes only one audit', async () => {
    const root = mocks.db as ReturnType<typeof client>;
    // Simulate a stale availability query: the first INSERT hits the actual unique index.
    vi.spyOn(root.car, 'findMany').mockResolvedValueOnce([]);
    const response = await mutate('POST', 'cars');
    expect(response.status).toBe(201);
    const { id } = await response.json();
    expect((await db.query('SELECT slug FROM "Car" WHERE id = $1', [id])).rows).toEqual([
      { slug: 'swift-2' },
    ]);
    expect(
      (await db.query('SELECT id FROM "AuditLog" WHERE "resourceId" = $1', [id])).rows,
    ).toHaveLength(1);
  });

  it('does not write an audit when the resource mutation fails', async () => {
    const before = await snapshot();
    const response = await mutate('POST', 'locations', {
      ...inputs.locations,
      name: 'Old Location',
    });
    expect(response.status).toBe(409);
    expect(await snapshot()).toEqual(before);
  });

  it('does not change a lead or write an audit when a status rule rejects the update', async () => {
    const before = await snapshot();
    expect((await mutate('PATCH', 'bookings', { status: 'COMPLETED' })).status).toBe(422);
    expect(await snapshot()).toEqual(before);
  });

  it('leaves records and audits untouched when the session has expired', async () => {
    mocks.currentAdmin.mockResolvedValue(null);
    const before = await snapshot();
    for (const method of ['POST', 'PATCH', 'DELETE'] as const)
      expect((await mutate(method, 'faqs')).status).toBe(401);
    expect(await snapshot()).toEqual(before);
  });
});
