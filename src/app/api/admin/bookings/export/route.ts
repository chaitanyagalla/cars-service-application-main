import { currentAdmin, jsonError } from '@/lib/security';
import { prisma } from '@/lib/db';
export const runtime = 'nodejs';
const csvCell = (v: unknown) =>
  `"${String(v ?? '')
    .replace(/^[\s]*[=+@-]/, "'$&")
    .replace(/"/g, '""')}"`;
export async function GET() {
  if (!(await currentAdmin())) return jsonError('Unauthorized', 401);
  const rows = await prisma.bookingIntent.findMany({
    include: { car: true },
    orderBy: { createdAt: 'desc' },
    take: 10000,
  });
  const matrix = [
    ['Created', 'Customer', 'Phone', 'Car', 'Pickup area', 'Pickup', 'Return', 'Notes', 'Status'],
    ...rows.map((b) => [
      b.createdAt.toISOString(),
      b.customerName,
      b.customerPhone,
      b.car.name,
      b.pickupLocation,
      b.pickupDate?.toISOString() ?? '',
      b.returnDate?.toISOString() ?? '',
      b.notes,
      b.status,
    ]),
  ];
  return new Response('\ufeff' + matrix.map((r) => r.map(csvCell).join(',')).join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="booking-leads.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
