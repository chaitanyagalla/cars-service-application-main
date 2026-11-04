import { redirect } from 'next/navigation';
import { currentAdmin } from '@/lib/security';
import { AdminLogin } from '@/components/admin-login';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin Login', robots: { index: false, follow: false } };
export default async function Login() {
  if (await currentAdmin()) redirect('/admin');
  return (
    <main className="container">
      <AdminLogin />
    </main>
  );
}
