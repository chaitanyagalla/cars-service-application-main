import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/security';
import { isResource } from '@/lib/admin-data';
import AdminManager from '@/components/admin-manager';
import { AdminRecordFilters } from '@/components/admin-record-filters';
import { RequestNotice } from '@/components/request-notice';
import { AdminQueryError, parseAdminQuery } from '@/lib/admin-query';
import { listAdminRecords } from '@/lib/admin-records';
import { prisma } from '@/lib/db';
export const dynamic = 'force-dynamic';
export default async function AdminResourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ resource: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const u = await requireAdmin();
  const { resource } = await params;
  if (!isResource(resource)) notFound();
  const values = await searchParams;
  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(values))
    if (typeof value === 'string') queryParams.set(key, value);
  try {
    const query = parseAdminQuery(queryParams);
    const page = await listAdminRecords(resource, query);
    const { rows: pageRows, ...pagination } = page;
    const cars =
      resource === 'bookings'
        ? await prisma.car.findMany({
            select: { id: true, name: true },
            orderBy: [{ name: 'asc' }, { id: 'asc' }],
          })
        : [];
    return (
      <>
        <AdminManager
          key={`${resource}:${queryParams}`}
          resource={resource}
          initialRows={JSON.parse(JSON.stringify(pageRows))}
          ownId={u.id}
          listQuery={queryParams.toString()}
          initialPagination={pagination}
          filterControls={
            resource === 'bookings' || resource === 'audits' ? (
              <AdminRecordFilters resource={resource} query={query} cars={cars} />
            ) : undefined
          }
        />
      </>
    );
  } catch (error) {
    if (!(error instanceof AdminQueryError)) throw error;
    return (
      <>
        <RequestNotice message={error.message} />
        <a className="btn btn-outline" href={`/admin/${resource}`}>
          Reset filters
        </a>
      </>
    );
  }
}
