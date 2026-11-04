import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { ADMIN_SESSION_SECONDS, createAdminToken } from '@/lib/admin-jwt';
import { verifyPassword } from '@/lib/passwords';
import {
  COOKIE,
  adminCookieOptions,
  hashToken,
  sameOrigin,
  clientFingerprint,
  consumeRateLimit,
  jsonError,
  readJsonBody,
  RequestInputError,
} from '@/lib/security';

export const runtime = 'nodejs';
const credentials = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email().max(255)),
    password: z.string().min(1).max(128),
  })
  .strict();

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return jsonError('Invalid origin', 403);
  try {
    if (!(await consumeRateLimit(`login:${clientFingerprint(req)}`, 8, 900))) {
      return jsonError('Too many attempts. Try again in 15 minutes.', 429);
    }
    const parsed = credentials.safeParse(await readJsonBody(req, 3000));
    if (!parsed.success) return jsonError('Invalid email or password', 401);
    const { email, password } = parsed.data;
    if (!(await consumeRateLimit(`account:${hashToken(email)}`, 12, 900))) {
      return jsonError('Too many attempts. Try again in 15 minutes.', 429);
    }
    const user = await prisma.adminUser.findUnique({ where: { email } });
    const valid = await verifyPassword(password, user?.passwordHash);
    if (!user || !user.active || user.role !== 'ADMIN' || !valid) {
      return jsonError('Invalid email or password', 401);
    }
    const { token, expiresAt } = await createAdminToken(user.id);
    const oldToken = req.cookies.get(COOKIE)?.value;
    await prisma.$transaction(async (tx) => {
      // Serialize sign-in with password resets and account deactivation.
      await tx.$queryRaw`SELECT "id" FROM "AdminUser" WHERE "id" = ${user.id} FOR UPDATE`;
      const fresh = await tx.adminUser.findUnique({ where: { id: user.id } });
      if (
        !fresh ||
        !fresh.active ||
        fresh.role !== 'ADMIN' ||
        fresh.passwordHash !== user.passwordHash
      ) {
        throw new RequestInputError('Invalid email or password', 401);
      }
      if (oldToken && oldToken.length <= 2048)
        await tx.session.deleteMany({ where: { tokenHash: hashToken(oldToken) } });
      await tx.session.create({
        data: { userId: user.id, tokenHash: hashToken(token), expiresAt },
      });
      await tx.auditLog.create({
        data: { userId: user.id, action: 'LOGIN', resource: 'auth', resourceId: user.id },
      });
    });
    const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(COOKIE, token, { ...adminCookieOptions, maxAge: ADMIN_SESSION_SECONDS });
    return response;
  } catch (error) {
    if (error instanceof RequestInputError) return jsonError(error.message, error.status);
    console.error('Admin login failed');
    return jsonError('Unable to sign in. Please try again later.', 500);
  }
}
