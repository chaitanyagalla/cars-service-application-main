import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/store';
import { whatsAppUrl } from '@/lib/whatsapp';
import { bookingSchema } from '@/lib/validation';
import {
  sameOrigin,
  jsonError,
  clientFingerprint,
  consumeRateLimit,
  readJsonBody,
  RequestInputError,
} from '@/lib/security';
export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return jsonError('Invalid origin', 403);
  if (!(req.headers.get('content-type') || '').includes('application/json'))
    return jsonError('Expected JSON', 415);
  if (Number(req.headers.get('content-length') || 0) > 5000)
    return jsonError('Payload too large', 413);
  try {
    if (!(await consumeRateLimit(`booking:${clientFingerprint(req)}`, 8, 3600)))
      return jsonError('Too many booking enquiries. Please contact us by phone.', 429);
    const parsed = bookingSchema.safeParse(await readJsonBody(req, 5000));
    if (!parsed.success) return jsonError('Check your booking form details.', 422);
    const { carId, customerName, customerPhone, pickupLocation, pickupDate, returnDate, notes } =
      parsed.data;
    if (pickupDate && new Date(pickupDate) < new Date(Date.now() - 60_000))
      return jsonError('Pickup cannot be in the past', 422);
    const [car, settings] = await Promise.all([
      prisma.car.findUnique({ where: { id: carId } }),
      getSettings(),
    ]);
    if (!car || !car.published || !car.available)
      return jsonError('Car is not currently accepting enquiries', 404);
    await prisma.bookingIntent.create({
      data: {
        carId,
        customerName,
        customerPhone,
        pickupLocation,
        notes,
        pickupDate: pickupDate ? new Date(pickupDate) : null,
        returnDate: returnDate ? new Date(returnDate) : null,
      },
    });
    return Response.json(
      {
        url: whatsAppUrl(settings.whatsappNumber, car, {
          customerName,
          customerPhone,
          pickupLocation,
          pickupDate: pickupDate || undefined,
          returnDate: returnDate || undefined,
          notes,
        }),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (error instanceof RequestInputError) return jsonError(error.message, error.status);
    console.error('Booking intent failed');
    return jsonError('Unable to create enquiry at this time', 500);
  }
}
