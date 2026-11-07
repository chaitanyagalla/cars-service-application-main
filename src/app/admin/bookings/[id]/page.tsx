import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/security';
import { leadContactNumber } from '@/lib/lead-contact';
import AdminManager from '@/components/admin-manager';

export const dynamic = 'force-dynamic';
export default async function LeadDetails({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const lead = await prisma.bookingIntent.findUnique({
    where: { id },
    include: { car: { select: { name: true, slug: true } } },
  });
  if (!lead) notFound();
  const number = leadContactNumber(lead.customerPhone);
  const when = (date: Date | null) =>
    date
      ? date.toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : 'Not specified';
  const message = `Hello ${lead.customerName}, regarding your enquiry ${lead.id} for ${lead.car.name}.`;
  return (
    <>
      <a className="small-btn" href="/admin/bookings">
        ← All enquiries
      </a>
      <h1 className="serif" style={{ fontSize: 36, marginTop: 20 }}>
        Enquiry details
      </h1>
      <p className="note">Reference: {lead.id}</p>
      <dl className="panel lead-details">
        {[
          ['Customer', lead.customerName],
          ['Phone', lead.customerPhone],
          ['Car', lead.car.name],
          ['Pickup area', lead.pickupLocation],
          ['Pickup (India time)', when(lead.pickupDate)],
          ['Return (India time)', when(lead.returnDate)],
          ['Submitted (India time)', when(lead.createdAt)],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <section className="panel" style={{ padding: 24, margin: '20px 0' }}>
        <h2 style={{ fontSize: 20, fontWeight: 750 }}>Customer request</h2>
        <p className="lead-note">{lead.notes || 'No additional notes.'}</p>
        {number && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 20 }}>
            <a className="btn btn-outline" href={`tel:+${number}`}>
              Call customer
            </a>
            <a
              className="btn btn-gold"
              href={`https://wa.me/${number}?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open WhatsApp draft
            </a>
          </div>
        )}
        <p className="note" style={{ marginTop: 12 }}>
          WhatsApp opens a draft; you choose whether to send it. A lead status does not reserve a
          vehicle or collect payment.
        </p>
      </section>
      <AdminManager
        resource="bookings"
        ownId={admin.id}
        initialRows={JSON.parse(JSON.stringify([lead]))}
        listQuery={new URLSearchParams({ id }).toString()}
        leadDetails
      />
    </>
  );
}
