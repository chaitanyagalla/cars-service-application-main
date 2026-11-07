export type AdminRow = Record<string, any>;
import type { PageInfo } from './admin-query';

export type MutationResult =
  | { kind: 'saved' }
  | { kind: 'expired' }
  | { kind: 'rejected'; message: string }
  | { kind: 'unknown'; message: string };

export type RefreshResult =
  | { kind: 'loaded'; rows: AdminRow[]; pagination?: PageInfo }
  | { kind: 'expired' }
  | { kind: 'failed'; message: string };

export const sessionExpiredMessage =
  'Your session has expired. Sign in in a new tab, then refresh this list to continue. Your open form is still here.';

const unknownOutcomeMessage =
  'The server did not confirm the outcome. Your change may have been saved. Refresh the list and check the record before trying again.';

function errorMessage(data: unknown) {
  return data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
    ? data.error
    : null;
}

export async function sendAdminMutation(url: string, init: RequestInit): Promise<MutationResult> {
  try {
    const response = await fetch(url, {
      ...init,
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
    });
    // Check status before parsing: an expired session may have a non-JSON body.
    if (response.status === 401) return { kind: 'expired' };
    const data: unknown = await response.json().catch(() => null);
    if (response.ok && data && typeof data === 'object' && 'ok' in data && data.ok === true)
      return { kind: 'saved' };
    const message = errorMessage(data);
    if (!response.ok && message) return { kind: 'rejected', message };
    // A lost/invalid receipt does not prove that the database transaction failed.
    return { kind: 'unknown', message: unknownOutcomeMessage };
  } catch {
    return { kind: 'unknown', message: unknownOutcomeMessage };
  }
}

export async function fetchAdminRows(resource: string, query = ''): Promise<RefreshResult> {
  try {
    const response = await fetch(`/api/admin/${resource}${query ? `?${query}` : ''}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
    });
    if (response.status === 401) return { kind: 'expired' };
    if (!response.ok)
      return { kind: 'failed', message: 'Could not refresh the list. Try Refresh list again.' };
    const data: unknown = await response.json();
    const page =
      data && typeof data === 'object' && !Array.isArray(data) && 'rows' in data
        ? (data as Record<string, unknown>)
        : null;
    const rows: unknown = page ? page.rows : data;
    if (
      !Array.isArray(rows) ||
      rows.some((row) => !row || typeof row !== 'object' || typeof row.id !== 'string')
    )
      return {
        kind: 'failed',
        message: 'The server returned an invalid list. Try Refresh list again.',
      };
    if (page) {
      if (
        !['page', 'pageSize', 'total', 'totalPages'].every((key) =>
          Number.isSafeInteger(page[key]),
        ) ||
        Number(page.page) < 1 ||
        Number(page.pageSize) < 1 ||
        Number(page.total) < 0 ||
        Number(page.totalPages) < 1 ||
        Number(page.page) > Number(page.totalPages)
      )
        return {
          kind: 'failed',
          message: 'The server returned invalid pagination. Try Refresh list again.',
        };
      return {
        kind: 'loaded',
        rows,
        pagination: {
          page: Number(page.page),
          pageSize: Number(page.pageSize),
          total: Number(page.total),
          totalPages: Number(page.totalPages),
        },
      };
    }
    return { kind: 'loaded', rows };
  } catch {
    return {
      kind: 'failed',
      message: 'Could not refresh the list. Check your connection and try Refresh list again.',
    };
  }
}
