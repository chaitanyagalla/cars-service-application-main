import { randomBytes } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';

export const ADMIN_SESSION_SECONDS = 60 * 60;
export const ADMIN_JWT_ISSUER = 'universal-selfdrive';
export const ADMIN_JWT_AUDIENCE = 'universal-admin';

function signingKey() {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret || !/^[a-f0-9]{64}$/i.test(secret)) {
    throw new Error(
      'ADMIN_JWT_SECRET must be 32 random bytes encoded as 64 hexadecimal characters',
    );
  }
  return Buffer.from(secret, 'hex');
}

export async function createAdminToken(adminId: string) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + ADMIN_SESSION_SECONDS;
  const token = await new SignJWT({ role: 'ADMIN' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(adminId)
    .setJti(randomBytes(32).toString('hex'))
    .setIssuer(ADMIN_JWT_ISSUER)
    .setAudience(ADMIN_JWT_AUDIENCE)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .sign(signingKey());
  return { token, expiresAt: new Date(expiresAt * 1000) };
}

export async function verifyAdminToken(token: string) {
  if (token.length > 2048 || token.split('.').length !== 3) return null;
  try {
    const { payload } = await jwtVerify(token, signingKey(), {
      algorithms: ['HS256'],
      typ: 'JWT',
      issuer: ADMIN_JWT_ISSUER,
      audience: ADMIN_JWT_AUDIENCE,
      requiredClaims: ['sub', 'jti', 'iat', 'exp', 'role'],
      maxTokenAge: ADMIN_SESSION_SECONDS,
    });
    if (
      payload.role !== 'ADMIN' ||
      !payload.sub ||
      payload.sub.length > 128 ||
      !payload.jti ||
      !/^[a-f0-9]{64}$/.test(payload.jti) ||
      !Number.isInteger(payload.iat) ||
      !Number.isInteger(payload.exp) ||
      payload.exp! - payload.iat! > ADMIN_SESSION_SECONDS
    )
      return null;
    return { adminId: payload.sub, role: 'ADMIN' as const };
  } catch {
    return null;
  }
}
