import Link from 'next/link';
import { requireAdmin } from '@/lib/security';
import { prisma } from '@/lib/db';
export default async function AdminDashboard() {
  await requireAdmin();
  const [cars, live, locations, leads, open, reviews] = await Promise.all([
    prisma.car.count(),
    prisma.car.count({ where: { available: true, published: true } }),
    prisma.location.count({ where: { active: true } }),
    prisma.bookingIntent.count(),
    prisma.bookingIntent.count({ where: { status: 'NEW' } }),
    prisma.testimonial.count({ where: { published: true } }),
  ]);
  const stats = [
    ['Cars', cars, 'cars'],
    ['Available Cars', live, 'cars'],
    ['Service Areas', locations, 'locations'],
    ['Enquiries', leads, 'bookings'],
    ['New Leads', open, 'bookings?status=NEW'],
    ['Published Reviews', reviews, 'testimonials'],
  ];
  const recent = await prisma.bookingIntent.findMany({
    include: { car: { select: { name: true } } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 8,
  });
  return (
    <>
      <h1 className="display admin-page-title admin-dashboard-title">Admin Dashboard</h1>
      <p className="muted">Manage your live fleet, bookings and website content.</p>
      <div className="feature-grid admin-stats" style={{ margin: '28px 0' }}>
        {stats.map(([name, count, where]) => (
          <Link
            href={`/admin/${where}`}
            key={name}
            className="panel admin-stat"
            style={{ padding: 25 }}
          >
            <div className="price" style={{ textAlign: 'left' }}>
              {count}
            </div>
            <strong>{name}</strong>
          </Link>
        ))}
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 13 }}>Latest Enquiries</h2>
      <div className="panel admin-record-panel" style={{ overflowX: 'auto' }}>
        <table
          className="admin-table admin-record-table"
          role="table"
          aria-label="Latest enquiries"
        >
          <thead role="rowgroup">
            <tr role="row">
              <th>Customer</th>
              <th>Car</th>
              <th>Phone</th>
              <th>Location</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {recent.length === 0 && (
              <tr role="row">
                <td role="cell" colSpan={6} className="admin-empty-records">
                  No enquiries yet.
                </td>
              </tr>
            )}
            {recent.map((r) => (
              <tr key={r.id} role="row">
                <td role="cell" data-label="Customer">
                  <Link className="small-btn" href={`/admin/bookings/${encodeURIComponent(r.id)}`}>
                    {r.customerName}
                  </Link>
                </td>
                <td role="cell" data-label="Car">
                  <span>{r.car.name}</span>
                </td>
                <td role="cell" data-label="Phone">
                  <span>{r.customerPhone}</span>
                </td>
                <td role="cell" data-label="Location">
                  <span>{r.pickupLocation}</span>
                </td>
                <td role="cell" data-label="Status">
                  <span>{r.status}</span>
                </td>
                <td role="cell" data-label="Date">
                  <span>
                    {r.createdAt.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
