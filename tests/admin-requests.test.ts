import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAdminRows, sendAdminMutation } from '../src/lib/admin-requests';

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe('admin mutation receipts', () => {
  it.each(['POST', 'PATCH', 'DELETE'])(
    'recognizes a confirmed %s without issuing a refresh or retry',
    async (method) => {
      fetchMock.mockResolvedValue(
        Response.json({ ok: true, id: 'faq-1' }, { status: method === 'POST' ? 201 : 200 }),
      );
      expect(await sendAdminMutation('/api/admin/faqs/faq-1', { method })).toEqual({
        kind: 'saved',
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/faqs/faq-1',
        expect.objectContaining({ method, cache: 'no-store', signal: expect.any(AbortSignal) }),
      );
    },
  );

  it.each([403, 404, 409, 422, 500])(
    'preserves a server rejection (%s) for the editor',
    async (status) => {
      fetchMock.mockResolvedValue(
        Response.json({ error: 'Change rejected by the server' }, { status }),
      );
      expect(await sendAdminMutation('/api/admin/faqs/faq-1', { method: 'PATCH' })).toEqual({
        kind: 'rejected',
        message: 'Change rejected by the server',
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it('recognizes session expiry before trying to decode a non-JSON body', async () => {
    fetchMock.mockResolvedValue(new Response('Sign in', { status: 401 }));
    expect(await sendAdminMutation('/api/admin/faqs', { method: 'POST' })).toEqual({
      kind: 'expired',
    });
  });

  it.each([
    ['lost connection', () => Promise.reject(new TypeError('Failed to fetch'))],
    ['timeout', () => Promise.reject(new DOMException('Timed out', 'TimeoutError'))],
    ['lost JSON body', () => Promise.resolve(new Response('{', { status: 200 }))],
    ['unexpected success body', () => Promise.resolve(Response.json({ error: 'Unexpected' }))],
    ['proxy error page', () => Promise.resolve(new Response('Bad gateway', { status: 502 }))],
  ])(
    'reports an unknown outcome after %s and never retries the mutation',
    async (_label, response) => {
      fetchMock.mockImplementation(response);
      expect(await sendAdminMutation('/api/admin/faqs', { method: 'POST' })).toMatchObject({
        kind: 'unknown',
        message: expect.stringContaining('may have been saved'),
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );
});

describe('admin list refreshes', () => {
  it('retains active filters while refreshing paginated lists', async () => {
    const page = { rows: [{ id: 'old-lead' }], page: 2, pageSize: 25, total: 26, totalPages: 2 };
    fetchMock.mockResolvedValue(Response.json(page));
    expect(await fetchAdminRows('bookings', 'status=NEW&page=2')).toEqual({
      kind: 'loaded',
      rows: page.rows,
      pagination: { page: 2, pageSize: 25, total: 26, totalPages: 2 },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/bookings?status=NEW&page=2',
      expect.anything(),
    );
  });
  it('rejects malformed pagination without replacing the current list', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ rows: [], page: -1, pageSize: 25, total: 1, totalPages: 1 }),
    );
    expect(await fetchAdminRows('bookings')).toMatchObject({ kind: 'failed' });
  });
  it('loads authenticated rows without caching', async () => {
    const rows = [{ id: 'faq-1', question: 'Saved question?' }];
    fetchMock.mockResolvedValue(Response.json(rows));
    expect(await fetchAdminRows('faqs')).toEqual({ kind: 'loaded', rows });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/faqs',
      expect.objectContaining({ cache: 'no-store', signal: expect.any(AbortSignal) }),
    );
  });

  it('recognizes expired sessions even when the list response is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('Sign in', { status: 401 }));
    expect(await fetchAdminRows('bookings')).toEqual({ kind: 'expired' });
  });

  it.each([{ rows: [] }, { rows: [{ id: 'old' }, { id: 'new' }] }])(
    'accepts valid empty and nonempty lists',
    async ({ rows }) => {
      fetchMock.mockResolvedValue(Response.json(rows));
      expect(await fetchAdminRows('bookings')).toEqual({ kind: 'loaded', rows });
    },
  );

  it.each(
    [null, { error: 'not a list' }, [null], [{ question: 'Missing ID' }], [42]].map((rows) => ({
      rows,
    })),
  )('rejects malformed list data %j', async ({ rows }) => {
    fetchMock.mockResolvedValue(Response.json(rows));
    expect(await fetchAdminRows('faqs')).toMatchObject({ kind: 'failed' });
  });

  it('keeps refresh failure separate from a confirmed save', async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ ok: true }))
      .mockResolvedValueOnce(Response.json({ error: 'Unavailable' }, { status: 500 }));
    expect(await sendAdminMutation('/api/admin/faqs/faq-1', { method: 'PATCH' })).toEqual({
      kind: 'saved',
    });
    expect(await fetchAdminRows('faqs')).toMatchObject({ kind: 'failed' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps refresh session expiry separate from a confirmed save', async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ ok: true }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    expect(await sendAdminMutation('/api/admin/users/owner', { method: 'PATCH' })).toEqual({
      kind: 'saved',
    });
    expect(await fetchAdminRows('users')).toEqual({ kind: 'expired' });
  });

  it.each([
    ['network rejection', () => Promise.reject(new TypeError('Failed to fetch'))],
    ['invalid JSON', () => Promise.resolve(new Response('{', { status: 200 }))],
  ])('returns a recoverable refresh error for %s', async (_label, response) => {
    fetchMock.mockImplementation(response);
    expect(await fetchAdminRows('faqs')).toMatchObject({ kind: 'failed' });
  });
});
