'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, toast } from '@heroui/react';
import type { Resource } from '@/lib/admin-data';
import { formatLocationName } from '@/lib/location-names';
import { queryHref, type PageInfo } from '@/lib/admin-query';
import { useFeedback } from '@/components/app-feedback';
import {
  fetchAdminRows,
  sendAdminMutation,
  sessionExpiredMessage,
  type MutationResult,
} from '@/lib/admin-requests';

type Field = {
  key: string;
  label: string;
  kind?: 'text' | 'textarea' | 'number' | 'checkbox' | 'select' | 'password' | 'email';
  options?: string[];
  required?: boolean;
  wide?: boolean;
  help?: string;
};
const carFields: Field[] = [
  { key: 'name', label: 'Car name', required: true },
  {
    key: 'category',
    label: 'Category',
    kind: 'select',
    options: ['HATCHBACK', 'SEDAN', 'MPV', 'SUV'],
  },
  {
    key: 'featured',
    label: 'Show Popular badge',
    kind: 'checkbox',
    wide: true,
    help: 'Adds the ★ Popular badge to this car on the home page and car listings. Save Changes to apply.',
  },
  { key: 'description', label: 'Description', kind: 'textarea', wide: true },
  {
    key: 'imageUrl',
    label: 'Cover image URL (/cars/name.webp or HTTPS)',
    required: true,
    wide: true,
  },
  {
    key: 'gallery',
    label: 'Gallery images — one HTTPS or /cars/ URL per line',
    kind: 'textarea',
    wide: true,
  },
  { key: 'seats', label: 'Seats', kind: 'number' },
  { key: 'fuel', label: 'Fuel' },
  { key: 'transmission', label: 'Transmission' },
  { key: 'mileage', label: 'Mileage' },
  { key: 'bootSpace', label: 'Boot space' },
  { key: 'engine', label: 'Engine' },
  { key: 'price12h', label: '12-hour price ₹', kind: 'number' },
  { key: 'priceDay', label: '24-hour price ₹', kind: 'number', required: true },
  { key: 'price3Days', label: '3-day price ₹', kind: 'number' },
  { key: 'priceWeek', label: 'Weekly price ₹', kind: 'number' },
  { key: 'extraKmRate', label: 'Extra km charge ₹', kind: 'number' },
  { key: 'extraHourRate', label: 'Extra hour charge ₹', kind: 'number' },
  { key: 'includedKm', label: 'Included km', kind: 'number' },
  { key: 'deposit', label: 'Security deposit ₹', kind: 'number' },
  { key: 'sortOrder', label: 'Sort order', kind: 'number' },
  { key: 'available', label: 'Accepting enquiries', kind: 'checkbox' },
  { key: 'published', label: 'Visible on website', kind: 'checkbox' },
];
const fields: Record<Resource, Field[]> = {
  cars: carFields,
  locations: [
    {
      key: 'name',
      label: 'Area name',
      required: true,
      help: 'Names are capitalized automatically. An existing name cannot be added again with different capitalization or extra spaces.',
    },
    { key: 'subtitle', label: 'Subtitle' },
    { key: 'description', label: 'Description', kind: 'textarea', wide: true },
    {
      key: 'sortOrder',
      label: 'Display position',
      kind: 'number',
      required: true,
      help: '1 is first. New areas go last by default. Choosing a position shifts the other areas automatically. Inactive areas keep their position but are hidden on the website.',
    },
    { key: 'active', label: 'Active', kind: 'checkbox' },
  ],
  faqs: [
    { key: 'question', label: 'Question', required: true, wide: true },
    { key: 'answer', label: 'Answer', kind: 'textarea', required: true, wide: true },
    { key: 'sortOrder', label: 'Display order', kind: 'number' },
    { key: 'published', label: 'Published', kind: 'checkbox' },
  ],
  testimonials: [
    { key: 'name', label: 'Customer name', required: true },
    { key: 'area', label: 'Area' },
    { key: 'carName', label: 'Car rented' },
    { key: 'text', label: 'Review text', kind: 'textarea', required: true, wide: true },
    { key: 'rating', label: 'Rating 1–5', kind: 'number' },
    { key: 'verified', label: 'Actually verified by staff', kind: 'checkbox' },
    { key: 'published', label: 'Publish (permission required)', kind: 'checkbox' },
  ],
  bookings: [
    {
      key: 'status',
      label: 'Lead status',
      kind: 'select',
      options: ['NEW', 'CONTACTED', 'CONFIRMED', 'COMPLETED', 'CLOSED', 'CANCELLED'],
    },
  ],
  settings: [
    { key: 'businessName', label: 'Business name', required: true },
    { key: 'whatsappNumber', label: 'WhatsApp number with country code', required: true },
    { key: 'phoneNumber', label: 'Display phone number', required: true },
    { key: 'contactEmail', label: 'Contact email', kind: 'email', required: true },
    { key: 'address', label: 'Office / display address', required: true, wide: true },
    { key: 'mapsUrl', label: 'Google Maps URL (HTTPS)', required: true, wide: true },
    { key: 'headline', label: 'Hero headline', required: true, wide: true },
    {
      key: 'description',
      label: 'Business description',
      kind: 'textarea',
      required: true,
      wide: true,
    },
  ],
  users: [
    { key: 'name', label: 'Name', required: true },
    { key: 'email', label: 'Email', kind: 'email', required: true },
    { key: 'password', label: 'Password (12+ chars; blank keeps existing)', kind: 'password' },
    { key: 'active', label: 'Can sign in', kind: 'checkbox' },
  ],
  audits: [],
};
const newDefaults: Record<string, unknown> = {
  category: 'HATCHBACK',
  imageUrl: '/cars/placeholder.svg',
  gallery: [],
  rating: null,
  seats: 5,
  fuel: 'Petrol',
  transmission: 'Manual',
  price12h: 0,
  priceDay: 999,
  price3Days: 0,
  priceWeek: 0,
  extraKmRate: 6,
  extraHourRate: 200,
  includedKm: 350,
  deposit: 0,
  sortOrder: 0,
  featured: false,
  available: true,
  published: true,
  active: true,
  verified: false,
  role: 'ADMIN',
  status: 'NEW',
  mileage: '',
  bootSpace: '',
  engine: '',
  description: '',
  subtitle: '',
  area: '',
  carName: '',
  notes: '',
};
export default function AdminManager({
  resource,
  initialRows,
  ownId,
  listQuery = '',
  initialPagination,
  leadDetails = false,
  filterControls,
}: {
  resource: Resource;
  initialRows: Record<string, any>[];
  ownId: string;
  listQuery?: string;
  initialPagination?: PageInfo;
  leadDetails?: boolean;
  filterControls?: React.ReactNode;
}) {
  const { confirmAction, requestLeave, registerLeaveGuard } = useFeedback();
  const [rows, setRows] = useState(initialRows);
  const [pagination, setPagination] = useState(initialPagination);
  const [exporting, setExporting] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [originalForm, setOriginalForm] = useState<Record<string, any>>({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [lastChangeConfirmed, setLastChangeConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState('');
  const [stale, setStale] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const mutationInFlight = useRef(false);
  const refreshInFlight = useRef(false);
  const leaveApproved = useRef(false);
  const dirty = editing !== null && JSON.stringify(form) !== JSON.stringify(originalForm);
  const locked = busy || uploading || refreshing;
  const writesBlocked = locked || stale || sessionExpired || uncertain;
  const editable = resource !== 'audits';
  const canCreate = !['bookings', 'settings', 'audits'].includes(resource);
  async function begin(row?: Record<string, any>) {
    if (writesBlocked || !(await allowDiscard())) return;
    const next = row
      ? { ...row, password: '', gallery: row.gallery || [] }
      : {
          ...newDefaults,
          ...(resource === 'testimonials' ? { rating: 5 } : {}),
          ...(resource === 'locations' ? { sortOrder: rows.length } : {}),
        };
    setEditing(row?.id || 'new');
    setForm(next);
    setOriginalForm(next);
    setError('');
    setMessage('');
  }
  async function allowDiscard() {
    return (
      !dirty ||
      (await confirmAction({
        title: 'Discard unsaved changes?',
        description:
          'Your changes have not been saved. Keep editing to retain them, or discard them to continue.',
        action: 'Discard changes',
        destructive: true,
      }))
    );
  }
  async function closeEditor() {
    if (busy || uploading || !(await allowDiscard())) return;
    setEditing(null);
    setForm({});
    setOriginalForm({});
    setError('');
  }
  const reload = useCallback(async () => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    setRefreshing(true);
    const result = await fetchAdminRows(resource, listQuery);
    if (result.kind === 'loaded') {
      // Refresh only the table. Never replace an open editor's draft.
      setRows(result.rows);
      if (result.pagination && !leadDetails) setPagination(result.pagination);
      setLastUpdated(new Date().toISOString());
      setStale(false);
      setSessionExpired(false);
      setRefreshError('');
      setError((previous) => (previous === sessionExpiredMessage ? '' : previous));
      if (uncertain) {
        setUncertain(false);
        setError('');
        setMessage(
          'List refreshed. Check whether your previous change was saved before trying again. Your open form has been kept.',
        );
        toast.info('List refreshed', {
          description:
            'Check the record before repeating your previous change. Your draft has been kept.',
          timeout: 8000,
        });
      }
    } else {
      setStale(true);
      if (result.kind === 'expired') {
        setSessionExpired(true);
        setRefreshError(sessionExpiredMessage);
      } else setRefreshError(result.message);
    }
    setRefreshing(false);
    refreshInFlight.current = false;
  }, [resource, uncertain, listQuery, leadDetails]);

  useEffect(() => {
    if (error)
      toast.danger(
        sessionExpired
          ? 'Sign in required'
          : uncertain
            ? 'Outcome unconfirmed'
            : 'Request could not complete',
        { description: error, timeout: 8000 },
      );
  }, [error, sessionExpired, uncertain]);
  useEffect(() => {
    if (refreshError)
      toast.warning('List could not refresh', { description: refreshError, timeout: 8000 });
  }, [refreshError]);

  useEffect(() => {
    setLastUpdated(new Date().toISOString());
  }, []);

  useEffect(() => {
    if (!dirty && !busy && !uploading && !uncertain) return;
    const warning =
      busy || uploading
        ? 'A request is still running. Leave this page? Check the record before repeating the action.'
        : uncertain
          ? 'Your last request has an unconfirmed outcome. Leave this page? Check the record before repeating the action.'
          : 'Discard your unsaved changes and leave this page?';
    const unregister = registerLeaveGuard({
      check: async () => {
        const approved = await confirmAction({
          title: 'Leave this page?',
          description: warning,
          action: 'Leave page',
        });
        leaveApproved.current = approved;
        return approved;
      },
      reset: () => {
        leaveApproved.current = false;
      },
    });
    function beforeUnload(event: BeforeUnloadEvent) {
      if (leaveApproved.current) return;
      event.preventDefault();
      event.returnValue = '';
    }
    async function beforeNavigate(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const target = event.target instanceof Element ? event.target.closest('a') : null;
      if (!target) return;
      if (target instanceof HTMLAnchorElement) {
        if (target.target === '_blank' || target.hasAttribute('download')) return;
        const destination = new URL(target.href);
        if (!['http:', 'https:'].includes(destination.protocol)) return;
        if (
          destination.origin === window.location.origin &&
          destination.pathname === window.location.pathname &&
          destination.search === window.location.search
        )
          return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (await requestLeave()) window.location.assign((target as HTMLAnchorElement).href);
    }
    async function beforeFilterSubmit(event: SubmitEvent) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || !form.classList.contains('admin-filters')) return;
      event.preventDefault();
      event.stopPropagation();
      if (await requestLeave()) HTMLFormElement.prototype.submit.call(form);
    }
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', beforeNavigate, true);
    document.addEventListener('submit', beforeFilterSubmit, true);
    return () => {
      unregister();
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', beforeNavigate, true);
      document.removeEventListener('submit', beforeFilterSubmit, true);
    };
  }, [dirty, busy, uploading, uncertain, confirmAction, requestLeave, registerLeaveGuard]);

  useEffect(() => {
    if (
      resource !== 'bookings' ||
      leadDetails ||
      editing !== null ||
      locked ||
      stale ||
      sessionExpired ||
      uncertain
    )
      return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !mutationInFlight.current) void reload();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [resource, leadDetails, editing, locked, stale, sessionExpired, uncertain, reload]);

  function mutationFailed(result: Exclude<MutationResult, { kind: 'saved' }>) {
    if (result.kind === 'expired') {
      setSessionExpired(true);
      setError(sessionExpiredMessage);
    } else {
      setError(result.message);
      if (result.kind === 'unknown') {
        setUncertain(true);
        setStale(true);
      }
    }
  }
  async function refreshAfterChange(success: string) {
    setLastChangeConfirmed(true);
    setMessage(success);
    toast.success(success);
    await reload();
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || writesBlocked || mutationInFlight.current || refreshInFlight.current) return;
    mutationInFlight.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    setLastChangeConfirmed(false);
    const payload: Record<string, any> = {};
    for (const f of fields[resource]) {
      const value = form[f.key];
      if (f.key === 'gallery')
        payload.gallery = Array.isArray(value)
          ? value
          : value
            ? String(value)
                .split(/[\n,]/)
                .map((s) => s.trim())
                .filter(Boolean)
            : [];
      else if (f.key === 'rating')
        payload.rating =
          value === '' || value === null || value === undefined ? null : Number(value);
      else if (f.kind === 'number') payload[f.key] = Number(value ?? 0);
      else if (f.kind === 'checkbox') payload[f.key] = Boolean(value);
      else if (f.key === 'password' && editing !== 'new' && !value) payload[f.key] = undefined;
      else payload[f.key] = value ?? '';
    }
    try {
      const creation = editing === 'new';
      const url = creation ? `/api/admin/${resource}` : `/api/admin/${resource}/${editing}`;
      const result = await sendAdminMutation(url, {
        method: creation ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (result.kind !== 'saved') {
        mutationFailed(result);
        return;
      }
      setEditing(null);
      setForm({});
      setOriginalForm({});
      await refreshAfterChange(
        resource === 'cars'
          ? creation
            ? 'Car created successfully.'
            : 'Car updated successfully.'
          : 'Changes saved successfully.',
      );
    } finally {
      mutationInFlight.current = false;
      setBusy(false);
    }
  }
  async function uploadImage(file: File) {
    if (writesBlocked || !editing) return;
    setUploading(true);
    setError('');
    setMessage('');
    const uploadToast = toast('Uploading image...', { isLoading: true, timeout: 0 });
    try {
      const data = new FormData();
      data.append('file', file);
      const res = await fetch('/api/admin/uploads', { method: 'POST', body: data });
      if (res.status === 401) {
        setSessionExpired(true);
        throw new Error(sessionExpiredMessage);
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      setForm((old) => ({ ...old, imageUrl: json.url }));
      toast.update(uploadToast, 'Image uploaded successfully.', {
        variant: 'success',
        isLoading: false,
        description: 'Save the car to apply this image.',
        timeout: 5000,
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Upload failed';
      toast.update(uploadToast, 'Image upload failed', {
        variant: 'danger',
        isLoading: false,
        description: error,
        timeout: 8000,
      });
    } finally {
      setUploading(false);
    }
  }
  async function remove(id: string) {
    if (
      writesBlocked ||
      mutationInFlight.current ||
      refreshInFlight.current ||
      !(await confirmAction({
        title: 'Delete this record?',
        description:
          'This permanently deletes the record. Cars linked to enquiries cannot be deleted; unpublish them instead.' +
          (editing === id && dirty ? ' Your unsaved edits will also be discarded.' : ''),
        action: 'Delete record',
        destructive: true,
      }))
    )
      return;
    mutationInFlight.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    setLastChangeConfirmed(false);
    try {
      const result = await sendAdminMutation(`/api/admin/${resource}/${id}`, { method: 'DELETE' });
      if (result.kind !== 'saved') {
        mutationFailed(result);
        return;
      }
      if (editing === id) {
        setEditing(null);
        setForm({});
        setOriginalForm({});
      }
      await refreshAfterChange(
        resource === 'cars' ? 'Car deleted successfully.' : 'Record deleted.',
      );
    } finally {
      mutationInFlight.current = false;
      setBusy(false);
    }
  }
  async function exportLeads() {
    if (exporting) return;
    setExporting(true);
    try {
      const response = await fetch(
        `/api/admin/bookings/export${listQuery ? `?${listQuery}` : ''}`,
        { cache: 'no-store', signal: AbortSignal.timeout(30_000) },
      );
      if (response.status === 401) {
        setSessionExpired(true);
        throw new Error(sessionExpiredMessage);
      }
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Could not export enquiries. Please try again.');
      }
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = 'booking-leads.csv';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(href), 1000);
      toast.success('CSV download started');
    } catch (error) {
      toast.danger('Export failed', {
        description: error instanceof Error ? error.message : 'Please try again.',
        timeout: 8000,
      });
    } finally {
      setExporting(false);
    }
  }
  const columns =
    resource === 'cars'
      ? ['name', 'page', 'category', 'priceDay', 'featured', 'available', 'published']
      : resource === 'bookings'
        ? leadDetails
          ? ['status']
          : [
              'id',
              'customerName',
              'customerPhone',
              'car',
              'pickupLocation',
              'pickupDate',
              'returnDate',
              'notes',
              'status',
              'createdAt',
            ]
        : resource === 'users'
          ? ['name', 'email', 'role', 'active', 'createdAt']
          : resource === 'audits'
            ? ['user', 'action', 'resource', 'resourceId', 'createdAt']
            : resource === 'settings'
              ? ['businessName', 'whatsappNumber', 'contactEmail', 'address']
              : resource === 'testimonials'
                ? ['name', 'rating', 'text', 'verified', 'published']
                : resource === 'locations'
                  ? ['sortOrder', 'name', 'subtitle', 'active']
                  : ['question', 'answer', 'published', 'sortOrder'];
  function display(row: Record<string, any>, k: string) {
    const v = row[k];
    if (resource === 'locations' && k === 'sortOrder') return Number(v) + 1;
    if (v === null || v === undefined) return '—';
    if (k === 'featured') return v ? '★ Popular' : 'No';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (k === 'car') return row.car?.name || '—';
    if (k === 'user') return row.user?.email || 'Deleted user';
    if (k.endsWith('At') || k.endsWith('Date'))
      return v ? new Date(v).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—';
    return String(v).slice(0, 170);
  }
  const Heading = leadDetails ? 'h2' : 'h1';
  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
          marginBottom: 26,
        }}
      >
        <div>
          <Heading className="serif" style={{ fontSize: leadDetails ? 26 : 39, marginBottom: 5 }}>
            {leadDetails
              ? 'Enquiry status'
              : (
                  {
                    cars: 'Cars & Prices',
                    locations: 'Service Areas',
                    faqs: 'FAQs',
                    testimonials: 'Testimonials',
                    bookings: 'Booking Leads',
                    settings: 'Site Settings',
                    users: 'Staff Users',
                    audits: 'Audit Trail',
                  } as Record<string, string>
                )[resource]}
          </Heading>
          <p className="note">
            {resource === 'bookings'
              ? 'Only saved enquiry forms appear here. Status changes are manual and do not reserve a vehicle or collect payment. Direct WhatsApp clicks are not tracked.'
              : resource === 'testimonials'
                ? 'Only publish reviews with genuine customer permission and verification.'
                : 'Changes to published content appear on the public website.'}
          </p>
          {resource === 'locations' && (
            <p className="note">
              Display position: 1 is first. Edit an area to move it; other areas shift
              automatically. New areas are added at the end. Only active areas appear on the
              website.
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn btn-outline"
            disabled={locked}
            onClick={() => {
              if (!mutationInFlight.current && !uploading) void reload();
            }}
          >
            {refreshing ? 'Refreshing...' : 'Refresh list'}
          </button>
          {resource === 'bookings' && !leadDetails && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={exportLeads}
              disabled={exporting || locked}
            >
              {exporting ? 'Exporting...' : 'Export filtered CSV'}
            </button>
          )}
          {canCreate && (
            <button className="btn btn-gold" onClick={() => begin()} disabled={writesBlocked}>
              + Add new
            </button>
          )}
        </div>
      </div>
      {filterControls}
      <p className="note" style={{ marginBottom: 14 }}>
        {lastUpdated
          ? `Last loaded: ${new Date(lastUpdated).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (India time)`
          : 'List loaded with this page.'}
        {resource === 'bookings' &&
          !leadDetails &&
          ' Checks for new enquiries every 30 seconds while this tab is visible and no editor is open.'}
      </p>
      {(stale || refreshError || sessionExpired) && (
        <div role="status" style={{ color: '#ffcb78', marginBottom: 14 }}>
          {refreshError ||
            (sessionExpired
              ? sessionExpiredMessage
              : 'The list may be out of date. Refresh it before making further changes.')}
          {refreshError && message && lastChangeConfirmed && (
            <p>The confirmed change above was saved. Refresh the list rather than repeating it.</p>
          )}
          {sessionExpired && (
            <p>
              <a
                className="small-btn"
                href="/admin/login"
                target="_blank"
                rel="noopener noreferrer"
              >
                Sign in in a new tab
              </a>{' '}
              Then return here and select Refresh list.
            </p>
          )}
        </div>
      )}
      {editable && editing !== null && (
        <div className="panel" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 24px 0' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>
              {editing === 'new' ? 'Create new' : 'Edit record'}
            </h2>
            <button
              className="small-btn"
              disabled={busy || uploading}
              onClick={closeEditor}
              aria-label="Close editor"
            >
              ✕
            </button>
          </div>
          <form className="admin-form" onSubmit={save}>
            <fieldset disabled={busy || uploading} style={{ display: 'contents' }}>
              {fields[resource].map((f) => (
                <label
                  className={`field ${f.wide ? 'wide' : ''} ${f.key === 'featured' ? 'admin-popular-field' : ''}`}
                  key={f.key}
                >
                  <span className="form-label">{f.label}</span>
                  {f.kind === 'checkbox' ? (
                    <input
                      type="checkbox"
                      checked={Boolean(form[f.key])}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })}
                      style={{ height: 20, width: 20, accentColor: '#ffb300' }}
                    />
                  ) : f.kind === 'select' ? (
                    <select
                      className="input"
                      value={String(form[f.key] || f.options?.[0])}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    >
                      {f.options?.map((v) => (
                        <option value={v} key={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  ) : f.kind === 'textarea' ? (
                    <textarea
                      rows={4}
                      className="input"
                      value={
                        f.key === 'gallery'
                          ? Array.isArray(form.gallery)
                            ? form.gallery.join('\n')
                            : String(form.gallery || '')
                          : String(form[f.key] ?? '')
                      }
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      required={f.required}
                    />
                  ) : (
                    <input
                      className="input"
                      type={
                        f.kind === 'number'
                          ? 'number'
                          : f.kind === 'password'
                            ? 'password'
                            : f.kind === 'email'
                              ? 'email'
                              : 'text'
                      }
                      step={f.key === 'rating' ? '0.1' : f.kind === 'number' ? '1' : undefined}
                      min={
                        f.kind === 'number'
                          ? resource === 'locations' && f.key === 'sortOrder'
                            ? 1
                            : 0
                          : undefined
                      }
                      max={
                        resource === 'locations' && f.key === 'sortOrder'
                          ? rows.length + (editing === 'new' ? 1 : 0)
                          : undefined
                      }
                      value={
                        resource === 'locations' && f.key === 'sortOrder' && form[f.key] !== ''
                          ? Number(form[f.key]) + 1
                          : String(form[f.key] ?? '')
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          [f.key]:
                            resource === 'locations' &&
                            f.key === 'sortOrder' &&
                            e.target.value !== ''
                              ? Number(e.target.value) - 1
                              : e.target.value,
                        })
                      }
                      onBlur={
                        resource === 'locations' && f.key === 'name'
                          ? () =>
                              setForm((current) => ({
                                ...current,
                                name: formatLocationName(String(current.name ?? '')),
                              }))
                          : undefined
                      }
                      required={f.required}
                      autoComplete={f.kind === 'password' ? 'new-password' : undefined}
                    />
                  )}
                  {f.help && <span className="note">{f.help}</span>}
                </label>
              ))}
              {resource === 'cars' && (
                <div className="wide">
                  <label className="form-label" htmlFor="admin-image-upload">
                    Optional image upload (Cloudinary must be configured)
                  </label>
                  <input
                    id="admin-image-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={writesBlocked}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadImage(file);
                      e.currentTarget.value = '';
                    }}
                  />
                  {uploading && <p className="note">Uploading image...</p>}
                  {form.imageUrl && (
                    <div style={{ marginTop: 10 }}>
                      <img
                        src={String(form.imageUrl)}
                        alt="Cover preview"
                        style={{ width: 240, height: 135, objectFit: 'cover', borderRadius: 10 }}
                      />
                    </div>
                  )}
                </div>
              )}
              <div className="wide" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Button
                  type="submit"
                  isPending={busy}
                  isDisabled={writesBlocked}
                  className="hero-ui-btn"
                >
                  {busy ? 'Saving...' : uploading ? 'Uploading image...' : 'Save Changes'}
                </Button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={closeEditor}
                  disabled={busy || uploading}
                >
                  Cancel
                </button>
                {dirty && <span className="note">Unsaved changes</span>}
              </div>
            </fieldset>
          </form>
        </div>
      )}
      <div className="panel" style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c}>
                  {resource === 'locations'
                    ? {
                        sortOrder: 'Display position',
                        name: 'Area name',
                        subtitle: 'Subtitle',
                        active: 'Active',
                      }[c] || c
                    : c === 'page'
                      ? 'Car page'
                      : c === 'featured'
                        ? 'Popular'
                        : c}
                </th>
              ))}
              {editable && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1}>No records yet.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  {columns.map((c) => (
                    <td key={c}>
                      {c === 'page' ? (
                        row.published ? (
                          <a
                            className="small-btn"
                            href={`/cars/${encodeURIComponent(row.slug)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View car
                          </a>
                        ) : (
                          <span className="note">Unpublished</span>
                        )
                      ) : (
                        display(row, c)
                      )}
                    </td>
                  ))}
                  {editable && (
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {resource === 'bookings' && !leadDetails ? (
                        <a
                          className="small-btn"
                          href={`/admin/bookings/${encodeURIComponent(row.id)}`}
                        >
                          View enquiry
                        </a>
                      ) : (
                        <button
                          className="small-btn"
                          onClick={() => begin(row)}
                          disabled={writesBlocked}
                        >
                          {leadDetails ? 'Update status' : 'Edit'}
                        </button>
                      )}
                      {!['settings', 'bookings'].includes(resource) && row.id !== ownId && (
                        <button
                          className="small-btn"
                          disabled={writesBlocked}
                          onClick={() => remove(row.id)}
                          style={{ color: '#f88' }}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pagination && !leadDetails && (
        <nav className="admin-pagination" aria-label="Record pages">
          {pagination.page > 1 && (
            <a
              className="btn btn-outline"
              href={queryHref(`/admin/${resource}`, listQuery, pagination.page - 1)}
            >
              Previous
            </a>
          )}
          <span>
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} matching records
          </span>
          {pagination.page < pagination.totalPages && (
            <a
              className="btn btn-outline"
              href={queryHref(`/admin/${resource}`, listQuery, pagination.page + 1)}
            >
              Next
            </a>
          )}
        </nav>
      )}
      <p className="note" style={{ marginTop: 17 }}>
        {rows.length} record(s) shown
        {resource === 'bookings'
          ? '. CSV exports include up to 10,000 matching enquiries; narrow the filters for larger results. Date filters use India time; CSV timestamps use UTC.'
          : resource === 'audits'
            ? '. Filters apply to the full audit history.'
            : resource === 'locations'
              ? '. Display positions include inactive areas. Names ignore capitalization and extra spaces when checking for duplicates.'
              : '. Images must use a /cars/ public asset path or an HTTPS image URL. Avoid unlicensed imagery.'}
      </p>
    </>
  );
}
