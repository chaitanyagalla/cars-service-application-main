import Link from 'next/link';
import { currentAdmin } from '@/lib/security';
import { LogoutButton } from '@/components/logout-button';
export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentAdmin();
  if (!user) return children;
  const nav = [
    ['Dashboard', '/admin'],
    ['Cars & Prices', '/admin/cars'],
    ['Locations', '/admin/locations'],
    ['FAQs', '/admin/faqs'],
    ['Testimonials', '/admin/testimonials'],
    ['Booking Leads', '/admin/bookings'],
    ['Website Settings', '/admin/settings'],
    ['Staff Users', '/admin/users'],
    ['Audit Trail', '/admin/audits'],
  ];
  return (
    <div className="admin-layout">
      <aside className="admin-aside">
        <Link href="/" style={{ color: '#ffbb00', fontWeight: 800 }}>
          UNIVERSAL
        </Link>
        <p className="note">
          {user.name}
          <br />
          {user.role.replace('_', ' ')}
        </p>
        <div className="divider" style={{ margin: '15px 0' }} />
        {nav.map(([t, href]) => (
          <Link key={href} href={href}>
            {t}
          </Link>
        ))}
        <div style={{ marginTop: 22 }}>
          <LogoutButton />
        </div>
      </aside>
      <main className="admin-content">{children}</main>
    </div>
  );
}
