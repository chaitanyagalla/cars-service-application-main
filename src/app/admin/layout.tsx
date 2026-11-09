import { currentAdmin } from '@/lib/security';
import { AdminSidebar } from '@/components/admin-sidebar';
import './admin.css';
export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentAdmin();
  if (!user) return children;
  return (
    <div className="admin-layout admin-workspace">
      <AdminSidebar name={user.name} role={user.role} />
      <main className="admin-content">{children}</main>
    </div>
  );
}
