import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SignJWT } from 'jose';
import {
  createAdminToken,
  verifyAdminToken,
  ADMIN_JWT_ISSUER,
  ADMIN_JWT_AUDIENCE,
  ADMIN_SESSION_SECONDS,
} from '../src/lib/admin-jwt';
import { hashPassword, validNewPassword, verifyPassword } from '../src/lib/passwords';

beforeEach(() => {
  vi.stubEnv('ADMIN_JWT_SECRET', 'a'.repeat(64));
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('admin JWT verification', () => {
  async function signed(overrides: Record<string, unknown> = {}, algorithm = 'HS256') {
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({
      sub: 'admin-1',
      role: 'ADMIN',
      jti: 'b'.repeat(64),
      iat: now,
      exp: now + ADMIN_SESSION_SECONDS,
      iss: ADMIN_JWT_ISSUER,
      aud: ADMIN_JWT_AUDIENCE,
      ...overrides,
    })
      .setProtectedHeader({ alg: algorithm, typ: 'JWT' })
      .sign(Buffer.from(process.env.ADMIN_JWT_SECRET!, 'hex'));
  }
  it('issues a one-hour JWT and validates its signature and claims', async () => {
    const { token, expiresAt } = await createAdminToken('admin-1');
    expect(await verifyAdminToken(token)).toEqual({ adminId: 'admin-1', role: 'ADMIN' });
    expect(expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(ADMIN_SESSION_SECONDS * 1000);
    expect(expiresAt.getTime() - Date.now()).toBeGreaterThan((ADMIN_SESSION_SECONDS - 2) * 1000);
    expect((await createAdminToken('admin-1')).token).not.toBe(token);
  });
  it('rejects tampering, opaque legacy cookies and unsigned tokens', async () => {
    const { token } = await createAdminToken('admin-1');
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    payload.sub = 'different-admin';
    parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64url');
    expect(await verifyAdminToken(parts.join('.'))).toBeNull();
    expect(await verifyAdminToken('f'.repeat(64))).toBeNull();
    expect(
      await verifyAdminToken(`${Buffer.from('{"alg":"none"}').toString('base64url')}.${parts[1]}.`),
    ).toBeNull();
  });
  it.each([
    { role: 'CUSTOMER' },
    { sub: '' },
    { jti: '' },
    { iss: 'other-app' },
    { aud: 'other-service' },
    { exp: 1 },
    { exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS * 2 },
    { iat: Math.floor(Date.now() / 1000) + 600 },
  ])('rejects invalid claims: %s', async (claims) => {
    expect(await verifyAdminToken(await signed(claims))).toBeNull();
  });
  it('pins the algorithm and rejects tokens signed with another key', async () => {
    expect(await verifyAdminToken(await signed({}, 'HS512'))).toBeNull();
    const token = await signed();
    vi.stubEnv('ADMIN_JWT_SECRET', 'b'.repeat(64));
    expect(await verifyAdminToken(token)).toBeNull();
  });
  it('fails closed when signing configuration is missing or weak', async () => {
    for (const key of ['', 'short', 'x'.repeat(64)]) {
      vi.stubEnv('ADMIN_JWT_SECRET', key);
      await expect(createAdminToken('admin-1')).rejects.toThrow('ADMIN_JWT_SECRET');
    }
  });
});

describe('password hashing', () => {
  it('stores bcrypt hashes and verifies the supplied password', async () => {
    const password = 'an-owner-assigned-password';
    const hash = await hashPassword(password);
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
    expect(hash).not.toContain(password);
    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword('wrong-password', hash)).toBe(false);
    expect(await verifyPassword('anything')).toBe(false);
  });
  it('prevents bcrypt truncation, including multi-byte passwords', () => {
    expect(validNewPassword('a'.repeat(72))).toBe(true);
    expect(validNewPassword('a'.repeat(73))).toBe(false);
    expect(validNewPassword('short')).toBe(false);
    expect(validNewPassword('é'.repeat(37))).toBe(false);
  });
});
