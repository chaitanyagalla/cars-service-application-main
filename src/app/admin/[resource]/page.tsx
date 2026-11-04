import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/security';
import { isResource, listResource } from '@/lib/admin-data';
import AdminManager from '@/components/admin-manager';
export const dynamic = 'force-dynamic';
export default async function AdminResourcePage({
  params,
}: {
  params: Promise<{ resource: string }>;
}) {
  const u = await requireAdmin();
  const { resource } = await params;
  if (!isResource(resource)) notFound();
  const rows = await listResource(resource);
  const serial = JSON.parse(JSON.stringify(rows)) as Record<string, any>[];
  return <AdminManager key={resource} resource={resource} initialRows={serial} ownId={u.id} />;
}
