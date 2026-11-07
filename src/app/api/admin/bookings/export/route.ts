import { currentAdmin, jsonError } from '@/lib/security';
import { prisma } from '@/lib/db';
import { AdminQueryError, leadWhere, parseAdminQuery } from '@/lib/admin-query';
export const runtime = 'nodejs';
const csvCell = (v: unknown) =>
  `"${String(v ?? '')
    .replace(/^[\s]*[=+@-]/, "'$&")
    .replace(/"/g, '""')}"`;
export async function GET(req: Request) {
  if (!(await currentAdmin())) return jsonError('Unauthorized', 401);
  try {
    const query = parseAdminQuery(new URL(req.url).searchParams);
    const where = leadWhere(query);
    const rows = await prisma.$transaction(
      async (tx) => {
        if ((await tx.bookingIntent.count({ where })) > 10000) return null;
        return tx.bookingIntent.findMany({
          where,
          include: { car: { select: { name: true } } },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 10000,
        });
      },
      { isolationLevel: 'RepeatableRead' },
    );
    if (!rows)
      return jsonError(
        'More than 10,000 enquiries match these filters. Narrow the date range or other filters and export again. No partial file was downloaded.',
        422,
      );
    const matrix = [
      [
        'Enquiry reference',
        'Created (UTC)',
        'Customer',
        'Phone',
        'Car',
        'Pickup area',
        'Pickup (UTC)',
        'Return (UTC)',
        'Notes',
        'Status',
      ],
      ...rows.map((b) => [
        b.id,
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
  } catch (error) {
    if (error instanceof AdminQueryError) return jsonError(error.message, 422);
    console.error('Enquiry export failed');
    return jsonError('Could not export enquiries. Please try again.', 500);
  }
}
