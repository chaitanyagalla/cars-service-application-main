import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, Phone, MessageCircle } from 'lucide-react';
import CustomerLayout from '@/components/customer-layout';
import { BookingForm } from '@/components/booking-form';
import { CarCard } from '@/components/site-shell';
import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/store';
import { withCarRatings } from '@/lib/car-ratings';
export const dynamic = 'force-dynamic';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const car = await prisma.car.findUnique({ where: { slug } });
  return {
    title: car ? `Rent ${car.name}` : 'Car not found',
    description: car?.description || 'Find self-drive cars in Hyderabad',
  };
}
export default async function CarDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [record, settings] = await Promise.all([
    prisma.car.findUnique({ where: { slug } }),
    getSettings(),
  ]);
  if (!record || !record.published) notFound();
  const [car] = await withCarRatings([record]);
  const related = await withCarRatings(
    await prisma.car.findMany({
      where: { published: true, category: car.category, id: { not: car.id } },
      take: 3,
    }),
  );
  const specs = [
    ['Seating Capacity', `${car.seats} Adults`],
    ['Fuel Type', car.fuel],
    ['Transmission', car.transmission],
    ['Mileage', car.mileage || 'Ask us'],
    ['Boot Space', car.bootSpace || 'Ask us'],
    ['Engine', car.engine || 'Ask us'],
  ];
  const prices = [
    ['12 Hours', car.price12h],
    ['24 Hours', car.priceDay],
    ['3 Days', car.price3Days],
    ['Weekly', car.priceWeek],
  ];
  return (
    <CustomerLayout>
      <section className="section">
        <div className="container">
          <div className="detail-hero">
            <div>
              <img className="detail-photo" src={car.imageUrl} alt={car.name} />
              {car.gallery.length > 0 && (
                <div style={{ display: 'flex', gap: 10, marginTop: 15, overflowX: 'auto' }}>
                  {car.gallery.map((url, i) => (
                    <img
                      src={url}
                      alt={`${car.name} view ${i + 2}`}
                      key={url}
                      width={120}
                      height={75}
                      style={{ borderRadius: 9, objectFit: 'cover' }}
                    />
                  ))}
                </div>
              )}
            </div>
            <div>
              <Link href="/cars" className="muted-link muted">
                ← Back to Cars
              </Link>
              <div style={{ marginTop: 15 }}>
                <span className="eyebrow">{car.category}</span>
              </div>
              <h1
                className="display"
                style={{ fontSize: 'clamp(40px,5vw,60px)', margin: '0 0 16px' }}
              >
                {car.name}
              </h1>
              <p className="muted">{car.description}</p>
              <div className="detail-price" style={{ marginTop: 20 }}>
                ₹{car.priceDay.toLocaleString('en-IN')}{' '}
                <span className="muted" style={{ fontSize: 15, fontWeight: 400 }}>
                  / 24 hours
                </span>
              </div>
              <p className="note">
                {car.available
                  ? 'Enquiries open — confirm live availability with our team'
                  : 'Currently unavailable — contact us for alternatives'}
              </p>
              <div className="actions" style={{ justifyContent: 'flex-start', marginTop: 25 }}>
                <a
                  className="btn btn-green"
                  href={`/api/whatsapp/${car.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle size={19} /> Book on WhatsApp
                </a>
                <a
                  className="btn btn-outline"
                  href={`tel:${settings.phoneNumber.replace(/\D/g, '')}`}
                >
                  <Phone size={19} /> Call Now
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="section" style={{ background: 'var(--panel2)' }}>
        <div className="container">
          <h2 className="display">Specifications</h2>
          <p className="sub" style={{ margin: '0 0 35px' }}>
            Technical details and available features
          </p>
          <div className="specs">
            {specs.map(([k, v]) => (
              <div key={k} className="panel spec">
                <span style={{ color: 'var(--gold)', fontSize: 22 }}>◆</span>
                <div>
                  <span>{k}</span>
                  <strong>{v}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="center">
            <h2 className="display">Flexible Pricing</h2>
            <p className="sub">Choose the duration that works best for your trip</p>
          </div>
          <div className="pricing-grid">
            {prices.map(([duration, cost]) => (
              <div className="panel pricing-card" key={duration}>
                <h3>{duration}</h3>
                <strong>
                  {Number(cost) ? `₹${Number(cost).toLocaleString('en-IN')}` : 'Ask us'}
                </strong>
                <span>Rental only — confirm terms</span>
              </div>
            ))}
          </div>
          <div className="specs" style={{ marginTop: 22, gridTemplateColumns: '1fr 1fr' }}>
            <div className="panel spec">
              <div>
                <strong>Extra Kilometer Charges</strong>
                <span>
                  ₹{car.extraKmRate}/km after {car.includedKm} km
                </span>
              </div>
            </div>
            <div className="panel spec">
              <div>
                <strong>Extra Hour Charges</strong>
                <span>₹{car.extraHourRate}/hour beyond booking duration</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="section" style={{ background: 'var(--panel2)' }}>
        <div className="container">
          <h2 className="display">What&apos;s Included</h2>
          <p className="sub" style={{ margin: '0 0 35px' }}>
            Confirm specific inclusions, eligibility and conditions before payment.
          </p>
          <div className="included-grid">
            {[
              `₹${car.deposit} Security Deposit`,
              `${car.includedKm} Included Kilometers`,
              'WhatsApp Support',
              'Pickup Coordination',
              'Car-specific Pricing',
              'All India Permit (verify terms)',
            ].map((t) => (
              <div key={t} className="panel included">
                <CheckCircle2 size={19} />
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <h2 className="display">Customer ratings</h2>
          {car.ratingCount ? (
            <p className="rating" style={{ fontSize: 22 }}>
              ★ {car.rating!.toFixed(1)} / 5{' '}
              <span className="muted">
                from {car.ratingCount} completed {car.ratingCount === 1 ? 'rental' : 'rentals'}
              </span>
            </p>
          ) : (
            <p className="muted">No customer ratings yet.</p>
          )}
        </div>
      </section>
      {car.available && (
        <section className="section" id="booking">
          <div className="container" style={{ maxWidth: 780 }}>
            <div className="panel" style={{ padding: 26 }}>
              <BookingForm carId={car.id} />
            </div>
          </div>
        </section>
      )}
      {related.length > 0 && (
        <section className="section">
          <div className="container">
            <h2 className="display">Similar Cars</h2>
            <p className="sub" style={{ margin: '0 0 35px' }}>
              You might also like these vehicles
            </p>
            <div className="car-grid">
              {related.map((c) => (
                <CarCard key={c.id} car={c} />
              ))}
            </div>
          </div>
        </section>
      )}
    </CustomerLayout>
  );
}
