import { createHash, createHmac } from 'node:crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { verifyAdminToken } from '@/lib/admin-jwt';

export const COOKIE =
  process.env.NODE_ENV === 'production'
    ? '__Host-universal_admin_session'
    : 'universal_admin_session';
export const adminCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function currentAdmin() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const claims = await verifyAdminToken(token);
  if (!claims) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  // Check the verified JWT role AND the live database role on every protected request.
  // The session lookup also makes logout and password resets take effect immediately.
  if (
    !session ||
    session.expiresAt <= new Date() ||
    !session.user.active ||
    session.userId !== claims.adminId ||
    session.user.id !== claims.adminId ||
    session.user.role !== 'ADMIN'
  )
    return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  };
}
export async function requireAdmin() {
  const admin = await currentAdmin();
  if (!admin) redirect('/admin/login');
  return admin;
}
// Explicit origin check on ALL cookie-authenticated writes (prevents cross-site form POSTs).
export function sameOrigin(req: Request) {
  if (req.headers.get('sec-fetch-site') === 'cross-site') return false;
  const origin = req.headers.get('origin');
  if (!origin) return false;
  try {
    // Behind a production proxy, Next.js may see an internal URL.
    const expected =
      process.env.NODE_ENV === 'production'
        ? process.env.NEXT_PUBLIC_SITE_URL
        : new URL(req.url).origin;
    return Boolean(expected) && new URL(origin).origin === new URL(expected!).origin;
  } catch {
    return false;
  }
}
export class RequestInputError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function readJsonBody(req: Request, maxBytes: number): Promise<unknown> {
  const type = req.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (type !== 'application/json') throw new RequestInputError('Expected JSON', 415);
  if (Number(req.headers.get('content-length') || 0) > maxBytes)
    throw new RequestInputError('Request too large', 413);
  const reader = req.body?.getReader();
  if (!reader) throw new RequestInputError('Invalid JSON');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new RequestInputError('Request too large', 413);
      }
      chunks.push(chunk.value);
    }
    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      throw new RequestInputError('Invalid JSON');
    }
  } finally {
    reader.releaseLock();
  }
}
export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}
export const safeSlug = (s: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
export function safeImageUrl(url: string) {
  if (url.startsWith('/cars/') && !url.includes('..') && /^\/cars\/[\w./-]+$/.test(url))
    return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}
export function clientFingerprint(req: Request) {
  // Set RATE_LIMIT_SECRET and ensure your hosting proxy overwrites x-forwarded-for.
  const ip =
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32)
    throw new Error('Set a secure RATE_LIMIT_SECRET (32+ chars) in .env');
  return createHmac('sha256', secret).update(ip).digest('hex');
}
export async function consumeRateLimit(
  key: string,
  limit: number,
  seconds: number,
): Promise<boolean> {
  const cutoff = new Date(Date.now() + seconds * 1000);
  // Atomic UPSERT across multiple serverless instances; no in-memory rate limiter.
  const rows = await prisma.$queryRaw<Array<{ attempts: number }>>`
    INSERT INTO "LoginThrottle" ("id", "attempts", "resetAt")
    VALUES (${key}, 1, ${cutoff})
    ON CONFLICT ("id") DO UPDATE SET
      "attempts" = CASE WHEN "LoginThrottle"."resetAt" < NOW() THEN 1 ELSE "LoginThrottle"."attempts" + 1 END,
      "resetAt" = CASE WHEN "LoginThrottle"."resetAt" < NOW() THEN ${cutoff} ELSE "LoginThrottle"."resetAt" END
    RETURNING "attempts"`;
  return rows[0].attempts <= limit;
}
