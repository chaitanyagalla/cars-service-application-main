import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

const mocks = vi.hoisted(() => ({
  cookies: new Map<string, string>(),
  db: {
    session: { findUnique: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
    adminUser: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    auditLog: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    bookingIntent: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    car: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  },
}));
vi.mock('@/lib/db', () => ({ prisma: mocks.db }));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      mocks.cookies.has(name) ? { value: mocks.cookies.get(name) } : undefined,
  }),
}));
vi.mock('@/lib/store', () => ({ getSettings: async () => ({ whatsappNumber: '919700093666' }) }));

import { POST as login } from '../src/app/api/auth/login/route';
import { POST as logout } from '../src/app/api/auth/logout/route';
import { POST as book } from '../src/app/api/booking-intents/route';
import { GET as adminList, POST as adminCreate } from '../src/app/api/admin/[resource]/route';
import { PATCH as adminUpdate } from '../src/app/api/admin/[resource]/[id]/route';
import { GET as exportBookings } from '../src/app/api/admin/bookings/export/route';
import { POST as upload } from '../src/app/api/admin/uploads/route';
import { COOKIE, currentAdmin, hashToken, sameOrigin, readJsonBody } from '../src/lib/security';
import { createAdminToken, verifyAdminToken } from '../src/lib/admin-jwt';
import { carSlugFromName, suggestCarSlug } from '../src/lib/car-slugs';

const password = 'assigned-by-the-business';
let passwordHash: string;
let admin: {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: string;
  active: boolean;
};
beforeAll(async () => {
  passwordHash = await bcrypt.hash(password, 12);
});
beforeEach(() => {
  vi.resetAllMocks();
  mocks.cookies.clear();
  vi.stubEnv('ADMIN_JWT_SECRET', 'a'.repeat(64));
  vi.stubEnv('RATE_LIMIT_SECRET', 'b'.repeat(64));
  admin = {
    id: 'admin-1',
    email: 'admin@example.com',
    name: 'Admin',
    passwordHash,
    role: 'ADMIN',
    active: true,
  };
  mocks.db.$queryRaw.mockResolvedValue([{ attempts: 1 }]);
  mocks.db.$transaction.mockImplementation(async (fn: (tx: typeof mocks.db) => unknown) =>
    fn(mocks.db),
  );
  mocks.db.adminUser.findUnique.mockImplementation(
    async ({ where }: { where: { id?: string; email?: string } }) =>
      where.id === admin.id || where.email === admin.email ? admin : null,
  );
  mocks.db.session.create.mockResolvedValue({ id: 'session-1' });
  mocks.db.adminUser.create.mockResolvedValue({ id: 'admin-2' });
  mocks.db.adminUser.findMany.mockResolvedValue([]);
  mocks.db.adminUser.count.mockResolvedValue(0);
  mocks.db.auditLog.findMany.mockResolvedValue([]);
  mocks.db.auditLog.count.mockResolvedValue(0);
});
afterEach(() => {
  vi.unstubAllEnvs();
});
function req(path: string, body: unknown, origin = 'http://localhost:3000') {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: 'POST',
    headers: { origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
async function signedIn() {
  const { token, expiresAt } = await createAdminToken(admin.id);
  mocks.cookies.set(COOKIE, token);
  mocks.db.session.findUnique.mockResolvedValue({ userId: admin.id, user: admin, expiresAt });
  return token;
}
function cookie(response: Response) {
  if (!(response instanceof NextResponse)) throw new Error('Expected NextResponse');
  return response.cookies.get(COOKIE)?.value;
}

describe('admin email/password login', () => {
  it('verifies the hash and returns a JWT only through an HttpOnly cookie', async () => {
    const response = await login(
      req('/api/auth/login', { email: '  ADMIN@EXAMPLE.COM ', password }),
    );
    expect(response.status).toBe(200);
    const token = cookie(response)!;
    expect(await verifyAdminToken(token)).toEqual({ adminId: admin.id, role: 'ADMIN' });
    expect(mocks.db.session.create.mock.calls[0][0].data).toMatchObject({
      userId: admin.id,
      tokenHash: hashToken(token),
    });
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('set-cookie')).toContain('SameSite=strict');
    expect(response.headers.get('set-cookie')).toContain('Max-Age=3600');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(mocks.db.auditLog.create.mock.calls[0][0].data.action).toBe('LOGIN');
  });
  it('returns the same error for wrong passwords, unknown email and inactive admins', async () => {
    const wrong = await login(
      req('/api/auth/login', { email: admin.email, password: 'wrong-password' }),
    );
    const missing = await login(req('/api/auth/login', { email: 'missing@example.com', password }));
    admin.active = false;
    const inactive = await login(req('/api/auth/login', { email: admin.email, password }));
    expect([wrong.status, missing.status, inactive.status]).toEqual([401, 401, 401]);
    expect(await wrong.json()).toEqual(await missing.json());
    expect(await inactive.json()).toEqual({ error: 'Invalid email or password' });
    expect(mocks.db.session.create).not.toHaveBeenCalled();
  });
  it('rejects non-ADMIN accounts and client-supplied role fields', async () => {
    admin.role = 'CUSTOMER';
    expect((await login(req('/api/auth/login', { email: admin.email, password }))).status).toBe(
      401,
    );
    admin.role = 'ADMIN';
    expect(
      (await login(req('/api/auth/login', { email: admin.email, password, role: 'ADMIN' }))).status,
    ).toBe(401);
    expect(mocks.db.session.create).not.toHaveBeenCalled();
  });
  it('applies both IP and account throttles before password verification', async () => {
    mocks.db.$queryRaw.mockResolvedValueOnce([{ attempts: 9 }]);
    expect((await login(req('/api/auth/login', { email: admin.email, password }))).status).toBe(
      429,
    );
    expect(mocks.db.adminUser.findUnique).not.toHaveBeenCalled();
    mocks.db.$queryRaw
      .mockResolvedValueOnce([{ attempts: 1 }])
      .mockResolvedValueOnce([{ attempts: 13 }]);
    expect((await login(req('/api/auth/login', { email: admin.email, password }))).status).toBe(
      429,
    );
    expect(mocks.db.adminUser.findUnique).not.toHaveBeenCalled();
  });
  it('rejects a reset/deactivation that races with login', async () => {
    mocks.db.adminUser.findUnique
      .mockResolvedValueOnce(admin)
      .mockResolvedValueOnce({ ...admin, active: false });
    expect((await login(req('/api/auth/login', { email: admin.email, password }))).status).toBe(
      401,
    );
    expect(mocks.db.session.create).not.toHaveBeenCalled();
  });
  it('uses Secure cookies in production', async () => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://rental.example');
    const production = await import('../src/app/api/auth/login/route');
    const response = await production.POST(
      new NextRequest('https://rental.example/api/auth/login', {
        method: 'POST',
        headers: { origin: 'https://rental.example', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: admin.email, password }),
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('__Host-universal_admin_session=');
    expect(response.headers.get('set-cookie')).toContain('Secure');
  });
});

describe('server-side admin RBAC and session revocation', () => {
  it('requires a verified token and a matching live ADMIN session', async () => {
    expect(await currentAdmin()).toBeNull();
    const token = await signedIn();
    expect(await currentAdmin()).toMatchObject({ id: admin.id, role: 'ADMIN' });
    expect(mocks.db.session.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    mocks.db.session.findUnique.mockResolvedValueOnce(null);
    expect(await currentAdmin()).toBeNull();
    mocks.db.session.findUnique.mockResolvedValueOnce({
      userId: admin.id,
      user: admin,
      expiresAt: new Date(0),
    });
    expect(await currentAdmin()).toBeNull();
    for (const change of [{ active: false }, { role: 'CUSTOMER' }, { id: 'admin-other' }]) {
      mocks.db.session.findUnique.mockResolvedValueOnce({
        userId: admin.id,
        user: { ...admin, ...change },
        expiresAt: new Date(Date.now() + 60_000),
      });
      expect(await currentAdmin()).toBeNull();
    }
  });
  it('blocks all private API families without a valid session', async () => {
    for (const resource of [
      'cars',
      'locations',
      'faqs',
      'testimonials',
      'bookings',
      'settings',
      'users',
      'audits',
    ]) {
      expect(
        (
          await adminList(new Request(`http://localhost:3000/api/admin/${resource}`), {
            params: Promise.resolve({ resource }),
          })
        ).status,
      ).toBe(401);
    }
    expect(
      (await exportBookings(new Request('http://localhost:3000/api/admin/bookings/export'))).status,
    ).toBe(401);
    expect((await upload(req('/api/admin/uploads', {}))).status).toBe(401);
  });
  it('allows ADMIN to read staff users and audits', async () => {
    await signedIn();
    for (const resource of ['users', 'audits'])
      expect(
        (
          await adminList(new Request(`http://localhost:3000/api/admin/${resource}`), {
            params: Promise.resolve({ resource }),
          })
        ).status,
      ).toBe(200);
  });
  it('stores only hashes when an admin provisions another account', async () => {
    await signedIn();
    const response = await adminCreate(
      req('/api/admin/users', {
        name: 'Other Admin',
        email: 'other@example.com',
        password,
        active: true,
      }),
      { params: Promise.resolve({ resource: 'users' }) },
    );
    expect(response.status).toBe(201);
    const stored = mocks.db.adminUser.create.mock.calls[0][0].data;
    expect(stored.role).toBe('ADMIN');
    expect(stored.password).toBeUndefined();
    expect(await bcrypt.compare(password, stored.passwordHash)).toBe(true);
  });
  it('resets the hash and revokes every session after a password change', async () => {
    await signedIn();
    const response = await adminUpdate(
      req('/api/admin/users/admin-2', {
        name: 'Other Admin',
        email: 'other@example.com',
        password: 'new-assigned-password',
        active: true,
      }),
      { params: Promise.resolve({ resource: 'users', id: 'admin-2' }) },
    );
    expect(response.status).toBe(200);
    expect(mocks.db.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'admin-2' } });
    const stored = mocks.db.adminUser.update.mock.calls[0][0].data;
    expect(await bcrypt.compare('new-assigned-password', stored.passwordHash)).toBe(true);
  });
  it('rejects self-deactivation', async () => {
    await signedIn();
    expect(
      (
        await adminUpdate(
          req('/api/admin/users/admin-1', { name: admin.name, email: admin.email, active: false }),
          { params: Promise.resolve({ resource: 'users', id: admin.id }) },
        )
      ).status,
    ).toBe(403);
    expect(mocks.db.adminUser.update).not.toHaveBeenCalled();
  });
  it('logout deletes the server session and expires the cookie', async () => {
    const token = await signedIn();
    const response = await logout(
      new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: { origin: 'http://localhost:3000', cookie: `${COOKIE}=${token}` },
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.db.session.deleteMany).toHaveBeenCalledWith({
      where: { tokenHash: hashToken(token) },
    });
    expect(cookie(response)).toBe('');
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
    mocks.db.session.findUnique.mockResolvedValue(null);
    expect(await currentAdmin()).toBeNull();
  });
});

describe('automatic car URLs', () => {
  const carInput = {
    name: 'Maruti Swift',
    category: 'HATCHBACK',
    seats: 5,
    fuel: 'Petrol',
    transmission: 'Manual',
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/swift.webp',
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
  };
  const createParams = () => ({ params: Promise.resolve({ resource: 'cars' }) });
  const updateParams = () => ({ params: Promise.resolve({ resource: 'cars', id: 'car-1' }) });

  beforeEach(() => {
    mocks.db.car.findMany.mockResolvedValue([]);
    mocks.db.car.create.mockResolvedValue({ id: 'new-car' });
  });

  function slugCollision() {
    return new Prisma.PrismaClientKnownRequestError('Duplicate car slug', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target: ['slug'] },
    });
  }

  it('creates a car without a submitted slug and retains its uploaded cover URL', async () => {
    await signedIn();
    const response = await adminCreate(req('/api/admin/cars', carInput), createParams());
    expect(response.status).toBe(201);
    expect(mocks.db.car.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ slug: 'maruti-swift', imageUrl: carInput.imageUrl }),
    });
    expect(mocks.db.auditLog.create).toHaveBeenCalledWith({
      data: { userId: admin.id, action: 'CREATE', resource: 'cars', resourceId: 'new-car' },
    });
  });

  it('saves gallery photos with the cover and can remove gallery photos on edit', async () => {
    await signedIn();
    const gallery = [
      'https://res.cloudinary.com/demo/image/upload/interior.jpg',
      'https://res.cloudinary.com/demo/image/upload/rear.jpg',
    ];
    expect(
      (await adminCreate(req('/api/admin/cars', { ...carInput, gallery }), createParams())).status,
    ).toBe(201);
    expect(mocks.db.car.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ imageUrl: carInput.imageUrl, gallery }),
    });
    expect(
      (
        await adminUpdate(
          req('/api/admin/cars/car-1', { ...carInput, gallery: [] }),
          updateParams(),
        )
      ).status,
    ).toBe(200);
    expect(mocks.db.car.update).toHaveBeenCalledWith({
      where: { id: 'car-1' },
      data: expect.objectContaining({ imageUrl: carInput.imageUrl, gallery: [] }),
    });
  });
  it('chooses the next free suffix when cars already have the same name', async () => {
    await signedIn();
    mocks.db.car.findMany.mockResolvedValue([{ slug: 'maruti-swift' }, { slug: 'maruti-swift-2' }]);
    const response = await adminCreate(req('/api/admin/cars', carInput), createParams());
    expect(response.status).toBe(201);
    expect(mocks.db.car.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ slug: 'maruti-swift-3' }),
    });
  });

  it('does not let a client choose the generated URL', async () => {
    await signedIn();
    const response = await adminCreate(
      req('/api/admin/cars', { ...carInput, slug: 'client-chosen-url' }),
      createParams(),
    );
    expect(response.status).toBe(201);
    expect(mocks.db.car.create.mock.calls[0][0].data.slug).toBe('maruti-swift');
  });

  it('keeps the stored URL when renaming a car, even if the client submits a slug', async () => {
    await signedIn();
    const response = await adminUpdate(
      req('/api/admin/cars/car-1', { ...carInput, name: 'Renamed Swift', slug: 'replace-old-url' }),
      updateParams(),
    );
    expect(response.status).toBe(200);
    const update = mocks.db.car.update.mock.calls[0][0];
    expect(update.where).toEqual({ id: 'car-1' });
    expect(update.data.name).toBe('Renamed Swift');
    expect(update.data).not.toHaveProperty('slug');
    expect(mocks.db.car.create).not.toHaveBeenCalled();
  });

  it('recovers when another request inserts a slug after the availability query', async () => {
    await signedIn();
    mocks.db.car.create
      .mockRejectedValueOnce(slugCollision())
      .mockResolvedValueOnce({ id: 'new-car' });
    const response = await adminCreate(req('/api/admin/cars', carInput), createParams());
    expect(response.status).toBe(201);
    expect(mocks.db.car.create.mock.calls.map(([arg]) => arg.data.slug)).toEqual([
      'maruti-swift',
      'maruti-swift-2',
    ]);
    expect(mocks.db.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it('creates distinct URLs for simultaneous same-name requests', async () => {
    await signedIn();
    const inserted = new Set<string>();
    mocks.db.car.create.mockImplementation(async ({ data }: { data: { slug: string } }) => {
      if (inserted.has(data.slug)) throw slugCollision();
      inserted.add(data.slug);
      return { id: data.slug };
    });
    const responses = await Promise.all([
      adminCreate(req('/api/admin/cars', carInput), createParams()),
      adminCreate(req('/api/admin/cars', carInput), createParams()),
    ]);
    expect(responses.map((response) => response.status)).toEqual([201, 201]);
    expect([...inserted]).toEqual(['maruti-swift', 'maruti-swift-2']);
    expect(mocks.db.auditLog.create).toHaveBeenCalledTimes(2);
  });

  it('uses a generated fallback when the name has no Latin letters or digits', async () => {
    await signedIn();
    const response = await adminCreate(
      req('/api/admin/cars', { ...carInput, name: '🚗🚙' }),
      createParams(),
    );
    expect(response.status).toBe(201);
    expect(mocks.db.car.create.mock.calls[0][0].data.slug).toMatch(/^car-[a-f0-9]{8}$/);
  });

  it('bounds collision retries and returns a useful error instead of asking for a slug', async () => {
    await signedIn();
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      mocks.db.car.create.mockRejectedValue(slugCollision());
      const response = await adminCreate(req('/api/admin/cars', carInput), createParams());
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'Could not save changes' });
      expect(mocks.db.car.create).toHaveBeenCalledTimes(5);
      expect(mocks.db.car.create.mock.calls[4][0].data.slug).toMatch(/^maruti-swift-[a-f0-9]{8}$/);
      expect(mocks.db.auditLog.create).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });

  it('does not retry unique constraint errors on another field', async () => {
    await signedIn();
    mocks.db.car.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Duplicate id', {
        code: 'P2002',
        clientVersion: '6.19.3',
        meta: { target: ['id'] },
      }),
    );
    const response = await adminCreate(req('/api/admin/cars', carInput), createParams());
    expect(response.status).toBe(409);
    expect(mocks.db.car.create).toHaveBeenCalledTimes(1);
    expect(mocks.db.auditLog.create).not.toHaveBeenCalled();
  });

  it.each([
    ['  Maruti Swift Automatic  ', 'maruti-swift-automatic'],
    ['Škoda & Citroën / 2026', 'skoda-citroen-2026'],
    ['Swift---VXI!!!', 'swift-vxi'],
    ['Swift 2026', 'swift-2026'],
    ['🚗🚙', ''],
  ])('normalizes %s to %s', (name, expected) => {
    expect(carSlugFromName(name)).toBe(expected);
  });

  it('suggests an unused suffix without rewriting meaningful numbers in the slug', () => {
    expect(suggestCarSlug('maruti-swift', ['maruti-swift', 'maruti-swift-2'])).toBe(
      'maruti-swift-3',
    );
    expect(suggestCarSlug('swift-2026', ['swift-2026'])).toBe('swift-2026-2');
  });
});

describe('request protection and public enquiries', () => {
  it('rejects foreign origins, missing origins and cross-site browser requests', async () => {
    expect((await login(req('/api/auth/login', {}, 'https://evil.example'))).status).toBe(403);
    expect(sameOrigin(new Request('http://localhost:3000/api/auth/login'))).toBe(false);
    expect(
      sameOrigin(
        new Request('http://localhost:3000/api/auth/login', {
          headers: { origin: 'http://localhost:3000', 'sec-fetch-site': 'cross-site' },
        }),
      ),
    ).toBe(false);
    expect((await logout(req('/api/auth/logout', {}, 'https://evil.example'))).status).toBe(403);
  });
  it('uses a fixed configured production origin behind a proxy', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://rental.example');
    expect(
      sameOrigin(
        new Request('http://internal:3000/api/auth/login', {
          headers: { origin: 'https://rental.example' },
        }),
      ),
    ).toBe(true);
    expect(
      sameOrigin(
        new Request('http://internal:3000/api/auth/login', {
          headers: { origin: 'https://evil.example' },
        }),
      ),
    ).toBe(false);
  });
  it('limits actual JSON bytes even without a Content-Length header', async () => {
    await expect(
      readJsonBody(req('/api/auth/login', { value: 'a'.repeat(4000) }), 3000),
    ).rejects.toMatchObject({ status: 413 });
    expect(
      (
        await login(
          new NextRequest('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
            body: '{invalid',
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await login(
          new NextRequest('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { origin: 'http://localhost:3000', 'Content-Type': 'text/plain' },
            body: '{}',
          }),
        )
      ).status,
    ).toBe(415);
  });
  it('accepts guest enquiries and ignores forged customer/account ownership fields', async () => {
    mocks.db.car.findUnique.mockResolvedValue({
      id: 'car-1',
      name: 'Swift',
      category: 'HATCHBACK',
      published: true,
      available: true,
      priceDay: 1999,
    });
    const response = await book(
      req('/api/booking-intents', {
        carId: 'car-1',
        customerId: 'forged-id',
        customerName: 'Guest Customer',
        customerPhone: '9700093666',
        pickupLocation: 'Hyderabad',
        pickupDate: null,
        returnDate: null,
        notes: '',
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.db.bookingIntent.create.mock.calls[0][0].data.customerId).toBeUndefined();
    expect(mocks.db.session.findUnique).not.toHaveBeenCalled();
  });
});
