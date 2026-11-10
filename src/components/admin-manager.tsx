'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, toast } from '@heroui/react';
import { Images, Upload } from 'lucide-react';
import { SteeringLoader, SteeringWheel } from '@/components/steering-loader';
import type { Resource } from '@/lib/admin-data';
import { formatLocationName } from '@/lib/location-names';
import type { PageInfo } from '@/lib/admin-query';
import { useFeedback } from '@/components/app-feedback';
import ImageCropDialog from '@/components/image-crop-dialog';
import { AdminGalleryUpload } from '@/components/admin-gallery-upload';
import { AdminPagination } from '@/components/admin-pagination';
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const coverInput = useRef<HTMLInputElement>(null);
  const editor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (editing !== null && window.matchMedia('(max-width: 760px)').matches) {
      editor.current?.scrollIntoView({ block: 'start' });
      editor.current?.focus({ preventScroll: true });
    }
  }, [editing]);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [openingCrop, setOpeningCrop] = useState(false);
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
  const locked = busy || uploading || refreshing || galleryUploading || openingCrop;
  const writesBlocked = locked || stale || sessionExpired || uncertain;
  const editable = resource !== 'audits';
  const canCreate = !['bookings', 'settings', 'audits'].includes(resource);
  async function begin(row?: Record<string, any>) {
    if (writesBlocked || cropFile || !(await allowDiscard())) return;
    const next = row
      ? { ...row, password: '', gallery: row.gallery || [] }
      : {
          ...newDefaults,
          ...(resource === 'testimonials' ? { rating: 5 } : {}),
          ...(resource === 'locations' ? { sortOrder: pagination?.total ?? rows.length } : {}),
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
    if (locked || cropFile || !(await allowDiscard())) return;
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
    if (!dirty && !busy && !uploading && !galleryUploading && !uncertain) return;
    const warning =
      busy || uploading || galleryUploading
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
  }, [
    dirty,
    busy,
    uploading,
    galleryUploading,
    uncertain,
    confirmAction,
    requestLeave,
    registerLeaveGuard,
  ]);

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
    if (
      !editing ||
      writesBlocked ||
      cropFile ||
      mutationInFlight.current ||
      refreshInFlight.current
    )
      return;
    mutationInFlight.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    setLastChangeConfirmed(false);
    const payload: Record<string, any> = {};
    for (const f of fields[resource]) {
      const value = form[f.key];
      if (f.key === 'rating')
        payload.rating =
          value === '' || value === null || value === undefined ? null : Number(value);
      else if (f.kind === 'number') payload[f.key] = Number(value ?? 0);
      else if (f.kind === 'checkbox') payload[f.key] = Boolean(value);
      else if (f.key === 'password' && editing !== 'new' && !value) payload[f.key] = undefined;
      else payload[f.key] = value ?? '';
    }
    if (resource === 'cars') {
      payload.imageUrl = form.imageUrl || '/cars/placeholder.svg';
      payload.gallery = Array.isArray(form.gallery) ? form.gallery : [];
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
  function chooseImage(file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast('Unsupported image', {
        variant: 'danger',
        description: 'Choose a JPEG, PNG or WebP photo.',
        timeout: 6000,
      });
      return;
    }
    // Cropping re-encodes the photo, so large camera originals are fine here.
    if (file.size > 25 * 1024 * 1024) {
      toast('Image too large', {
        variant: 'danger',
        description: 'Choose a photo under 25MB.',
        timeout: 6000,
      });
      return;
    }
    setCropFile(file);
  }
  async function recropCurrentImage() {
    const url = String(form.imageUrl || '');
    if (!url || openingCrop) return;
    setOpeningCrop(true);
    try {
      const res = await fetch(url, { credentials: 'omit' });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(blob.type)) throw new Error();
      const name = decodeURIComponent(new URL(url, location.href).pathname.split('/').pop() || '');
      setCropFile(new File([blob], name || 'car', { type: blob.type }));
    } catch {
      toast('Could not open this image for cropping', {
        variant: 'danger',
        description:
          'Its host does not allow it to be edited here. Download the photo and use Upload instead.',
        timeout: 8000,
      });
    } finally {
      setOpeningCrop(false);
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
      setDeletingId(id);
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
      setDeletingId(null);
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
  const mobileLabels: Record<string, string> = {
    id: 'Reference',
    name: 'Name',
    page: 'Car page',
    category: 'Category',
    priceDay: 'Price / day',
    featured: 'Popular',
    available: 'Available',
    published: 'Published',
    customerName: 'Customer',
    customerPhone: 'Phone',
    car: 'Car',
    pickupLocation: 'Pickup area',
    pickupDate: 'Pickup',
    returnDate: 'Return',
    notes: 'Notes',
    status: 'Status',
    createdAt: 'Created',
    email: 'Email',
    role: 'Role',
    active: 'Active',
    user: 'Staff member',
    action: 'Action',
    resource: 'Resource',
    resourceId: 'Record ID',
    businessName: 'Business name',
    whatsappNumber: 'WhatsApp',
    contactEmail: 'Email',
    address: 'Address',
    rating: 'Rating',
    text: 'Review',
    verified: 'Verified',
    sortOrder: 'Display position',
    subtitle: 'Subtitle',
    question: 'Question',
    answer: 'Answer',
  };
  return (
    <>
      <div
        className="admin-page-header"
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
          <Heading className="display admin-page-title">
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
        <div className="admin-toolbar" style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn btn-outline"
            disabled={locked}
            onClick={() => {
              if (!mutationInFlight.current && !uploading) void reload();
            }}
          >
            {refreshing ? <SteeringLoader label="Refreshing…" /> : 'Refresh list'}
          </button>
          {resource === 'bookings' && !leadDetails && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={exportLeads}
              disabled={exporting || locked}
            >
              {exporting ? <SteeringLoader label="Exporting…" /> : 'Export filtered CSV'}
            </button>
          )}
          {canCreate && (
            <button className="btn btn-gold" onClick={() => begin()} disabled={writesBlocked}>
              + Add new
            </button>
          )}
        </div>
      </div>
      {message && (
        <p role="status" style={{ color: 'var(--success)', marginBottom: 14 }}>
          {message}
        </p>
      )}
      {error && (
        <p role="alert" style={{ color: 'var(--error)', marginBottom: 14 }}>
          {error}
        </p>
      )}
      {editable && editing !== null && (
        <div
          className="panel admin-editor"
          ref={editor}
          tabIndex={-1}
          aria-label="Record editor"
          style={{ marginBottom: 24 }}
        >
          <div
            className="admin-editor-heading"
            style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 24px 0' }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>
              {editing === 'new' ? 'Create new' : 'Edit record'}
            </h2>
            <button
              className="small-btn"
              disabled={locked || Boolean(cropFile)}
              onClick={closeEditor}
              aria-label="Close editor"
            >
              ✕
            </button>
          </div>
          <form className="admin-form" onSubmit={save}>
            {fields[resource].map((f) => (
              <label
                className={`field ${f.wide ? 'wide' : ''} ${f.kind === 'checkbox' ? 'admin-checkbox-field' : ''}`}
                key={f.key}
              >
                <span className="form-label">{f.label}</span>
                {f.kind === 'checkbox' ? (
                  <input
                    type="checkbox"
                    checked={Boolean(form[f.key])}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })}
                    style={{ height: 20, width: 20, accentColor: 'var(--ink)' }}
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
                    value={String(form[f.key] ?? '')}
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
              <section className="wide admin-car-photos" aria-label="Car photos">
                <div className="admin-photo-heading">
                  <Images size={22} aria-hidden="true" />
                  <div>
                    <h3>Car photos</h3>
                    <p className="note">
                      Show customers the car from every angle. Save Changes when you’re done.
                    </p>
                  </div>
                </div>
                <div className="admin-photo-columns">
                  <div>
                    <div className="admin-photo-label">
                      <h4>Cover photo</h4>
                      <span>Main photo</span>
                    </div>
                    {form.imageUrl && (
                      <div className="admin-cover-preview">
                        <img
                          src={String(form.imageUrl)}
                          alt="Cover preview, as shown on car cards"
                        />
                        {!/\.svg(\?|$)/i.test(String(form.imageUrl)) && (
                          <button
                            type="button"
                            className="small-btn"
                            disabled={writesBlocked || Boolean(cropFile)}
                            onClick={() => void recropCurrentImage()}
                          >
                            {openingCrop ? <SteeringLoader label="Opening…" /> : 'Adjust crop'}
                          </button>
                        )}
                      </div>
                    )}
                    <input
                      ref={coverInput}
                      id="admin-image-upload"
                      className="admin-photo-file-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      aria-describedby="admin-image-upload-help"
                      aria-label="Select cover photo"
                      disabled={writesBlocked || Boolean(cropFile)}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) chooseImage(file);
                      }}
                    />
                    <button
                      type="button"
                      className="admin-photo-upload-button"
                      disabled={writesBlocked || Boolean(cropFile)}
                      onClick={() => coverInput.current?.click()}
                    >
                      {uploading ? (
                        <SteeringWheel size={20} />
                      ) : (
                        <Upload size={18} aria-hidden="true" />
                      )}
                      {uploading
                        ? 'Uploading cover…'
                        : form.imageUrl && form.imageUrl !== '/cars/placeholder.svg'
                          ? 'Change cover photo'
                          : 'Upload cover photo'}
                    </button>
                    <p className="note" id="admin-image-upload-help" style={{ marginTop: 6 }}>
                      Choose a JPG, PNG or WebP photo up to 25 MB. Adjust the crop before uploading
                      so it fits the car card.
                    </p>
                    {uploading && (
                      <p className="note" role="status">
                        Uploading cover photo…
                      </p>
                    )}
                  </div>
                  <AdminGalleryUpload
                    key={editing}
                    gallery={Array.isArray(form.gallery) ? form.gallery : []}
                    disabled={writesBlocked || Boolean(cropFile)}
                    onChange={(gallery) => setForm((previous) => ({ ...previous, gallery }))}
                    onUploadingChange={setGalleryUploading}
                    onSessionExpired={() => {
                      setSessionExpired(true);
                      setError(sessionExpiredMessage);
                    }}
                  />
                </div>
                {cropFile && (
                  <ImageCropDialog
                    file={cropFile}
                    onCancel={() => setCropFile(null)}
                    onConfirm={(cropped) => {
                      setCropFile(null);
                      void uploadImage(cropped);
                    }}
                  />
                )}
              </section>
            )}
            <div
              className="wide admin-editor-actions"
              style={{ display: 'flex', gap: 12, alignItems: 'center' }}
            >
              <Button
                type="submit"
                isPending={busy}
                isDisabled={writesBlocked || Boolean(cropFile)}
                className="hero-ui-btn"
              >
                {busy && !deletingId ? <SteeringLoader label="Saving…" /> : 'Save Changes'}
              </Button>
              <button
                type="button"
                className="btn btn-outline"
                disabled={locked || Boolean(cropFile)}
                onClick={closeEditor}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      {filterControls}
      <div className="panel admin-record-panel" style={{ overflowX: 'auto' }}>
        <table
          className="admin-table admin-record-table"
          role="table"
          aria-label={`${resource} records`}
        >
          <thead role="rowgroup">
            <tr role="row">
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
          <tbody role="rowgroup">
            {rows.length === 0 ? (
              <tr role="row">
                <td
                  role="cell"
                  className="admin-empty-records"
                  colSpan={columns.length + (editable ? 1 : 0)}
                >
                  No records yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} role="row">
                  {columns.map((c) => (
                    <td key={c} role="cell" data-label={mobileLabels[c] || c}>
                      <div className="admin-cell-value">
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
                      </div>
                    </td>
                  ))}
                  {editable && (
                    <td
                      role="cell"
                      data-label="Actions"
                      className="admin-record-actions"
                      style={{ whiteSpace: 'nowrap' }}
                    >
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
                          style={{ color: 'var(--error)' }}
                        >
                          {deletingId === row.id ? <SteeringLoader label="Deleting…" /> : 'Delete'}
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
        <AdminPagination pagination={pagination} path={`/admin/${resource}`} query={listQuery} />
      )}
      <p className="note" style={{ marginTop: 17 }}>
        {rows.length} record(s) shown
        {resource === 'bookings'
          ? '. CSV exports include up to 10,000 matching enquiries; narrow the filters for larger results. Date filters use India time; CSV timestamps use UTC.'
          : resource === 'audits'
            ? '. Filters apply to the full audit history.'
            : resource === 'locations'
              ? '. Display positions include inactive areas. Names ignore capitalization and extra spaces when checking for duplicates.'
              : resource === 'cars'
                ? '. Edit a car to upload its cover and gallery photos.'
                : ''}
      </p>
    </>
  );
}
