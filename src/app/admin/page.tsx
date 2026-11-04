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
    ['New Leads', open, 'bookings'],
    ['Published Reviews', reviews, 'testimonials'],
  ];
  const recent = await prisma.bookingIntent.findMany({
    include: { car: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 8,
  });
  return (
    <>
      <h1 className="serif" style={{ fontSize: 43 }}>
        Admin Dashboard
      </h1>
      <p className="muted">Manage your live fleet, bookings and website content.</p>
      <div className="feature-grid" style={{ margin: '28px 0' }}>
        {stats.map(([name, count, where]) => (
          <Link href={`/admin/${where}`} key={name} className="panel" style={{ padding: 25 }}>
            <div className="price" style={{ textAlign: 'left' }}>
              {count}
            </div>
            <strong>{name}</strong>
          </Link>
        ))}
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 13 }}>Latest Enquiries</h2>
      <div className="panel" style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Car</th>
              <th>Phone</th>
              <th>Location</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((r) => (
              <tr key={r.id}>
                <td>{r.customerName}</td>
                <td>{r.car.name}</td>
                <td>{r.customerPhone}</td>
                <td>{r.pickupLocation}</td>
                <td>{r.status}</td>
                <td>{r.createdAt.toLocaleDateString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
