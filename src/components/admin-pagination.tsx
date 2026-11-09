import { ChevronLeft, ChevronRight } from 'lucide-react';
import { queryHref, type PageInfo } from '@/lib/admin-query';

export function AdminPagination({
  pagination,
  path,
  query,
}: {
  pagination: PageInfo;
  path: string;
  query: string;
}) {
  const { page, pageSize, total, totalPages } = pagination;
  return (
    <nav className="admin-pagination" aria-label="Record pages">
      <span className="admin-pagination-summary" role="status">
        Showing{' '}
        <strong>
          {total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)}
        </strong>{' '}
        of <strong>{total}</strong> entries
      </span>
      <div className="admin-pagination-controls">
        {page > 1 ? (
          <a className="admin-page-button" href={queryHref(path, query, page - 1)} rel="prev">
            <ChevronLeft size={16} aria-hidden="true" />
            Previous
          </a>
        ) : (
          <span className="admin-page-button" aria-disabled="true">
            <ChevronLeft size={16} aria-hidden="true" />
            Previous
          </span>
        )}
        <span className="admin-page-position">
          Page <strong>{page}</strong> of {totalPages}
        </span>
        {page < totalPages ? (
          <a className="admin-page-button" href={queryHref(path, query, page + 1)} rel="next">
            Next
            <ChevronRight size={16} aria-hidden="true" />
          </a>
        ) : (
          <span className="admin-page-button" aria-disabled="true">
            Next
            <ChevronRight size={16} aria-hidden="true" />
          </span>
        )}
      </div>
    </nav>
  );
}
