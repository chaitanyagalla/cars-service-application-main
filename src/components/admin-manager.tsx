'use client';
import { useState } from 'react';
import { Button } from '@heroui/react';
import type { Resource } from '@/lib/admin-data';

type Field = {
  key: string;
  label: string;
  kind?: 'text' | 'textarea' | 'number' | 'checkbox' | 'select' | 'password' | 'email';
  options?: string[];
  required?: boolean;
  wide?: boolean;
};
const carFields: Field[] = [
  { key: 'name', label: 'Car name', required: true },
  { key: 'slug', label: 'URL slug (unique, lowercase-hyphens)', required: true },
  {
    key: 'category',
    label: 'Category',
    kind: 'select',
    options: ['HATCHBACK', 'SEDAN', 'MPV', 'SUV'],
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
  { key: 'featured', label: 'Featured badge', kind: 'checkbox' },
  { key: 'available', label: 'Accepting enquiries', kind: 'checkbox' },
  { key: 'published', label: 'Visible on website', kind: 'checkbox' },
];
const fields: Record<Resource, Field[]> = {
  cars: carFields,
  locations: [
    { key: 'name', label: 'Area name', required: true },
    { key: 'subtitle', label: 'Subtitle' },
    { key: 'description', label: 'Description', kind: 'textarea', wide: true },
    { key: 'sortOrder', label: 'Display order', kind: 'number' },
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
}: {
  resource: Resource;
  initialRows: Record<string, any>[];
  ownId: string;
}) {
  const [rows, setRows] = useState(initialRows);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const editable = resource !== 'audits';
  const canCreate = !['bookings', 'settings', 'audits'].includes(resource);
  function begin(row?: Record<string, any>) {
    setEditing(row?.id || 'new');
    setForm(
      row
        ? { ...row, password: '', gallery: row.gallery || [] }
        : { ...newDefaults, ...(resource === 'testimonials' ? { rating: 5 } : {}) },
    );
    setError('');
    setMessage('');
  }
  async function reload() {
    const result = await fetch(`/api/admin/${resource}`, { cache: 'no-store' });
    if (result.ok) setRows(await result.json());
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || busy) return;
    setBusy(true);
    setError('');
    setMessage('');
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
      const res = await fetch(url, {
        method: creation ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save');
      await reload();
      setEditing(null);
      setMessage('Changes saved successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save');
    } finally {
      setBusy(false);
    }
  }
  async function uploadImage(file: File) {
    setUploading(true);
    setError('');
    try {
      const data = new FormData();
      data.append('file', file);
      const res = await fetch('/api/admin/uploads', { method: 'POST', body: data });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      setForm((old) => ({ ...old, imageUrl: json.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }
  async function remove(id: string) {
    if (
      busy ||
      !confirm(
        'Permanently delete this record? Cars with enquiries cannot be deleted; unpublish them instead.',
      )
    )
      return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`/api/admin/${resource}/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      await reload();
      setMessage('Record deleted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  }
  const columns =
    resource === 'cars'
      ? ['name', 'slug', 'category', 'priceDay', 'available', 'published']
      : resource === 'bookings'
        ? [
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
                  ? ['name', 'subtitle', 'active', 'sortOrder']
                  : ['question', 'answer', 'published', 'sortOrder'];
  function display(row: Record<string, any>, k: string) {
    const v = row[k];
    if (v === null || v === undefined) return '—';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (k === 'car') return row.car?.name || '—';
    if (k === 'user') return row.user?.email || 'Deleted user';
    if (k.endsWith('At') || k.endsWith('Date'))
      return v ? new Date(v).toLocaleString('en-IN') : '—';
    return String(v).slice(0, 170);
  }
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
          <h1 className="serif" style={{ fontSize: 39, marginBottom: 5 }}>
            {
              (
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
              )[resource]
            }
          </h1>
          <p className="note">
            {resource === 'bookings'
              ? 'Only saved enquiry forms appear here. After the car is returned, change CONFIRMED to COMPLETED. Direct WhatsApp clicks are not tracked.'
              : resource === 'testimonials'
                ? 'Only publish reviews with genuine customer permission and verification.'
                : 'Changes to published content appear on the public website.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {resource === 'bookings' && (
            <a className="btn btn-outline" href="/api/admin/bookings/export">
              Export CSV
            </a>
          )}
          {canCreate && (
            <button className="btn btn-gold" onClick={() => begin()}>
              + Add new
            </button>
          )}
        </div>
      </div>
      {message && (
        <p role="status" style={{ color: '#22d57b', marginBottom: 14 }}>
          {message}
        </p>
      )}
      {error && (
        <p role="alert" style={{ color: '#ff9c9c', marginBottom: 14 }}>
          {error}
        </p>
      )}
      {editable && editing !== null && (
        <div className="panel" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 24px 0' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>
              {editing === 'new' ? 'Create new' : 'Edit record'}
            </h2>
            <button
              className="small-btn"
              onClick={() => {
                setEditing(null);
                setError('');
              }}
              aria-label="Close editor"
            >
              ✕
            </button>
          </div>
          <form className="admin-form" onSubmit={save}>
            {fields[resource].map((f) => (
              <label className={`field ${f.wide ? 'wide' : ''}`} key={f.key}>
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
                    min={f.kind === 'number' ? 0 : undefined}
                    value={String(form[f.key] ?? '')}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    required={f.required}
                    autoComplete={f.kind === 'password' ? 'new-password' : undefined}
                  />
                )}
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
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadImage(file);
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
              <Button type="submit" isPending={busy} className="hero-ui-btn">
                {busy ? 'Saving...' : 'Save Changes'}
              </Button>
              <button type="button" className="btn btn-outline" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      <div className="panel" style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c}>{c}</th>
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
                    <td key={c}>{display(row, c)}</td>
                  ))}
                  {editable && (
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="small-btn" onClick={() => begin(row)}>
                        Edit
                      </button>
                      {!['settings', 'bookings'].includes(resource) && row.id !== ownId && (
                        <button
                          className="small-btn"
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
      <p className="note" style={{ marginTop: 17 }}>
        {rows.length} record(s) shown
        {resource === 'bookings' || resource === 'audits' ? ' (most recent records)' : ''}. Images
        must use a /cars/ public asset path or an HTTPS image URL. Avoid unlicensed imagery.
      </p>
    </>
  );
}
