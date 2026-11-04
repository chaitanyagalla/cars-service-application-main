import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/store';
import { whatsAppUrl } from '@/lib/whatsapp';
export const dynamic = 'force-dynamic';
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [car, settings] = await Promise.all([
    prisma.car.findUnique({ where: { slug } }),
    getSettings(),
  ]);
  if (!car || !car.published || !car.available)
    return new Response('Car currently unavailable', {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    });
  const res = NextResponse.redirect(whatsAppUrl(settings.whatsappNumber, car), 302);
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
