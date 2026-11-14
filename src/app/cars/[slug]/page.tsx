import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  ChevronRight,
  CircleCheck,
  Clock3,
  Cog,
  FileText,
  Fuel,
  Gauge,
  Luggage,
  MapPin,
  Phone,
  Route,
  Settings,
  ShieldCheck,
  Star,
  UsersRound,
} from 'lucide-react';
import CustomerLayout from '@/components/customer-layout';
import { BookingForm } from '@/components/booking-form';
import CarGallery from '@/components/car-gallery';
import { CarCard, WhatsAppIcon } from '@/components/site-shell';
import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/store';
import { withCarRatings } from '@/lib/car-ratings';
export const dynamic = 'force-dynamic';

const categories: Record<string, { label: string; plural: string }> = {
  HATCHBACK: { label: 'Hatchback', plural: 'hatchbacks' },
  SEDAN: { label: 'Sedan', plural: 'sedans' },
  MPV: { label: 'MPV', plural: 'MPVs' },
  SUV: { label: 'SUV', plural: 'SUVs' },
};
const rupees = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const car = await prisma.car.findUnique({ where: { slug } });
  if (!car || !car.published) return { title: 'Car not found' };
  return {
    title: `Rent ${car.name} in Hyderabad`,
    description:
      car.description?.trim() ||
      `Self-drive ${car.name} for rent in Hyderabad from ${rupees(car.priceDay)} per day, with ${car.includedKm} km included.`,
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
      orderBy: { sortOrder: 'asc' },
      take: 3,
    }),
  );

  const category = categories[car.category] ?? {
    label: car.category.charAt(0) + car.category.slice(1).toLowerCase(),
    plural: 'cars',
  };
  const fuel = car.fuel.toLowerCase().replace(/\bcng\b/g, 'CNG');
  const description =
    car.description?.trim() ||
    `A ${car.seats}-seater ${category.label.toLowerCase()} that runs on ${fuel}, with a ${car.transmission.toLowerCase()} gearbox. A practical pick for city errands and comfortable on weekend getaways.`;
  const phoneHref = `tel:${settings.phoneNumber.replace(/\D/g, '')}`;
  const whatsappDigits = settings.whatsappNumber.replace(/\D/g, '');
  const alternativesHref = `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(
    `Hi! The ${car.name} is unavailable right now. Could you suggest a similar car?`,
  )}`;

  const otherRates = (
    [
      ['12 hours', car.price12h],
      ['3 days', car.price3Days],
      ['1 week', car.priceWeek],
    ] as const
  ).filter(([, price]) => price > 0);
  const specs = [
    { icon: UsersRound, label: 'Seating', value: `${car.seats} adults` },
    { icon: Fuel, label: 'Fuel type', value: car.fuel },
    { icon: Settings, label: 'Transmission', value: car.transmission },
    { icon: Gauge, label: 'Mileage', value: car.mileage },
    { icon: Luggage, label: 'Boot space', value: car.bootSpace },
    { icon: Cog, label: 'Engine', value: car.engine },
  ].filter((spec) => spec.value?.trim());
  const included = [
    car.deposit === 0 && 'No security deposit',
    `${car.includedKm} km of driving included`,
    'Clear pricing for this car, with no hidden charges',
    'Pickup or doorstep delivery, depending on your area',
    'Support on call and WhatsApp, 24/7',
  ].filter((item): item is string => Boolean(item));
  const goodToKnow = [
    {
      icon: Route,
      title: 'Extra distance',
      text: `${rupees(car.extraKmRate)} per km after the first ${car.includedKm} km.`,
    },
    {
      icon: Clock3,
      title: 'Extra time',
      text: `${rupees(car.extraHourRate)} per hour if you return the car later than booked.`,
    },
    {
      icon: MapPin,
      title: 'Out-of-state trips',
      text: 'Share your route before booking so we can confirm permit terms.',
    },
    {
      icon: FileText,
      title: 'Documents',
      text: 'We’ll tell you exactly what to bring when we confirm your booking.',
    },
  ];
  const steps = [
    ['Share your trip', 'Tell us your pickup area, dates and timings.'],
    [
      'Get a confirmed quote',
      'We check availability and send the final price and document list on WhatsApp.',
    ],
    ['Pick up and drive', 'Collect the car at the agreed time and place, and enjoy the drive.'],
  ];

  return (
    <CustomerLayout>
      <section className="detail-top" aria-labelledby="car-name">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <ol>
              <li>
                <Link href="/">Home</Link>
                <ChevronRight size={14} aria-hidden="true" />
              </li>
              <li>
                <Link href="/cars">Cars</Link>
                <ChevronRight size={14} aria-hidden="true" />
              </li>
              <li aria-current="page">{car.name}</li>
            </ol>
          </nav>
          <div className="detail-hero">
            <CarGallery name={car.name} images={[car.imageUrl, ...car.gallery]} />
            <div className="detail-summary">
              <div className="detail-tags">
                <span className="detail-chip">{category.label}</span>
                <span className={`detail-status${car.available ? ' is-open' : ''}`}>
                  {car.available ? 'Available to enquire' : 'Currently unavailable'}
                </span>
              </div>
              <h1 id="car-name">{car.name}</h1>
              {car.rating != null && car.ratingCount > 0 && (
                <p className="detail-rating">
                  <Star size={16} aria-hidden="true" />
                  <strong>{car.rating.toFixed(1)}</strong> / 5 from {car.ratingCount} completed{' '}
                  {car.ratingCount === 1 ? 'rental' : 'rentals'}
                </p>
              )}
              <div className="detail-description">
                <h2 className="detail-mobile-heading">About this car</h2>
                <p className="detail-lede">{description}</p>
              </div>
              <ul className="detail-facts" aria-label="Key features">
                <li>
                  <UsersRound size={18} aria-hidden="true" /> {car.seats} seats
                </li>
                <li>
                  <Fuel size={18} aria-hidden="true" /> {car.fuel}
                </li>
                <li>
                  <Settings size={18} aria-hidden="true" /> {car.transmission}
                </li>
              </ul>

              <div className="detail-pricing">
                <p className="detail-price">
                  {rupees(car.priceDay)} <span>per day</span>
                </p>
                <p className="detail-price-note">
                  24-hour rental with {car.includedKm} km included
                </p>
                {otherRates.length > 0 ? (
                  <dl className="detail-rates">
                    {otherRates.map(([label, price]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{rupees(price)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="detail-price-note">
                    Need it for 12 hours, a few days or a week? Ask us for a quote.
                  </p>
                )}
              </div>

              <dl className="detail-terms">
                <div>
                  <dt>Security deposit</dt>
                  <dd>{rupees(car.deposit)}</dd>
                </div>
                <div>
                  <dt>Included distance</dt>
                  <dd>{car.includedKm} km</dd>
                </div>
                <div>
                  <dt>Extra distance</dt>
                  <dd>{rupees(car.extraKmRate)}/km</dd>
                </div>
              </dl>

              <div className="detail-cta">
                {car.available ? (
                  <a
                    className="btn btn-whatsapp"
                    href={`/api/whatsapp/${car.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <WhatsAppIcon size={22} />
                    <span className="detail-action-full">Check availability on WhatsApp</span>
                    <span className="detail-action-short">WhatsApp us</span>
                  </a>
                ) : (
                  <a
                    className="btn btn-whatsapp"
                    href={alternativesHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <WhatsAppIcon size={22} />
                    <span className="detail-action-full">Ask about similar cars</span>
                    <span className="detail-action-short">Find similar cars</span>
                  </a>
                )}
                <a className="btn btn-outline" href={phoneHref}>
                  <Phone size={18} aria-hidden="true" /> Call now
                </a>
              </div>
              <p className="detail-reassure">
                <ShieldCheck size={18} aria-hidden="true" />
                <span>
                  No payment to enquire. We confirm availability, documents and the final price on
                  WhatsApp before you book.
                </span>
              </p>
            </div>
            <div className="detail-specs-block">
              <h2 id="specs-heading">Specifications</h2>
              <dl className="detail-specs">
                {specs.map(({ icon: Icon, label, value }) => (
                  <div key={label}>
                    <Icon size={22} aria-hidden="true" />
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      <section className="detail-section detail-band" aria-labelledby="terms-heading">
        <div className="container">
          <div className="detail-head">
            <h2 id="terms-heading">Rental details</h2>
            <p>What comes with every booking, and the charges to keep in mind.</p>
          </div>
          <div className="detail-terms-grid">
            <div className="detail-card">
              <h3>What&apos;s included</h3>
              <ul className="detail-checklist">
                {included.map((item) => (
                  <li key={item}>
                    <CircleCheck size={20} aria-hidden="true" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="detail-card">
              <h3>Good to know</h3>
              <ul className="detail-notes">
                {goodToKnow.map(({ icon: Icon, title, text }) => (
                  <li key={title}>
                    <Icon size={20} aria-hidden="true" />
                    <div>
                      <strong>{title}</strong>
                      <span>{text}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {car.available && (
        <section className="detail-section" id="booking" aria-labelledby="book-heading">
          <div className="container detail-booking">
            <div>
              <div className="detail-head">
                <h2 id="book-heading">Book the {car.name} in three steps</h2>
                <p>
                  Prefer to share details up front? Fill in the form and we’ll take it from there.
                </p>
              </div>
              <ol className="detail-steps">
                {steps.map(([title, text]) => (
                  <li key={title}>
                    <strong>{title}</strong>
                    <span>{text}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="detail-card detail-form-card">
              <BookingForm carId={car.id} />
            </div>
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="detail-section detail-band" aria-labelledby="similar-heading">
          <div className="container">
            <div className="detail-head detail-head-row">
              <div>
                <h2 id="similar-heading">More {category.plural} you might like</h2>
                <p>Similar cars from our Hyderabad fleet.</p>
              </div>
              <Link className="detail-all-link" href="/cars">
                View all cars <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <div className="car-grid">
              {related.map((c) => (
                <CarCard key={c.id} car={c} />
              ))}
            </div>
          </div>
        </section>
      )}
      <div className="detail-mobile-booking" aria-label="Quick car enquiry">
        <div className="detail-mobile-price">
          <strong>{rupees(car.priceDay)}</strong>
          <span>per day</span>
        </div>
        <a
          className="btn btn-whatsapp"
          href={car.available ? `/api/whatsapp/${car.slug}` : alternativesHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          <WhatsAppIcon size={20} />
          {car.available ? 'Check availability' : 'Find similar cars'}
        </a>
      </div>
    </CustomerLayout>
  );
}
