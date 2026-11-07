import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), requireAdmin: vi.fn() }));
vi.mock('@/lib/db', () => ({ prisma: { bookingIntent: { findUnique: mocks.findUnique } } }));
vi.mock('@/lib/security', () => ({ requireAdmin: mocks.requireAdmin }));
import LeadDetails from '../src/app/admin/bookings/[id]/page';
import { AppFeedback } from '../src/components/app-feedback';

beforeEach(() => {
  mocks.requireAdmin.mockReset().mockResolvedValue({ id: 'owner' });
  mocks.findUnique.mockReset().mockResolvedValue({
    id: 'old-enquiry-reference',
    customerName: 'Test Customer',
    customerPhone: '9700093666',
    pickupLocation: 'Hyderabad',
    notes: 'n'.repeat(500),
    status: 'NEW',
    pickupDate: null,
    returnDate: null,
    createdAt: new Date('2026-11-01T12:00:00Z'),
    car: { name: 'Test Car', slug: 'test-car' },
  });
});

it('renders a direct enquiry URL with its full 500-character note and correctly targeted contact actions', async () => {
  const page = await LeadDetails({ params: Promise.resolve({ id: 'old-enquiry-reference' }) });
  const html = renderToStaticMarkup(<AppFeedback>{page}</AppFeedback>);
  expect(html).toContain('n'.repeat(500));
  expect(html).toContain('old-enquiry-reference');
  expect(html).toContain('tel:+919700093666');
  expect(html).toContain('https://wa.me/919700093666?text=');
  expect(html).toContain('Open WhatsApp draft');
  expect(html).toContain('does not reserve a vehicle or collect payment');
  expect(mocks.findUnique).toHaveBeenCalledWith(
    expect.objectContaining({ where: { id: 'old-enquiry-reference' } }),
  );
});

it('requires the administrator before looking up customer information', async () => {
  mocks.requireAdmin.mockRejectedValue(new Error('Sign in required'));
  await expect(
    LeadDetails({ params: Promise.resolve({ id: 'old-enquiry-reference' }) }),
  ).rejects.toThrow('Sign in required');
  expect(mocks.findUnique).not.toHaveBeenCalled();
});
