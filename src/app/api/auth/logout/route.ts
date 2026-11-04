import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { COOKIE, adminCookieOptions, hashToken, sameOrigin, jsonError } from '@/lib/security';

export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return jsonError('Invalid origin', 403);
  try {
    const token = req.cookies.get(COOKIE)?.value;
    if (token && token.length <= 2048) {
      await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
    }
    const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(COOKIE, '', { ...adminCookieOptions, maxAge: 0 });
    return response;
  } catch {
    return jsonError('Unable to sign out. Please try again.', 500);
  }
}
