import Link from 'next/link';
import Image from 'next/image';
import {
  CarFront,
  MapPin,
  CalendarDays,
  CheckCircle2,
  MessageCircle,
  Phone,
  Mail,
  ArrowRight,
  BadgeCheck,
  Tag,
  Headset,
  Star,
} from 'lucide-react';
import CustomerLayout from '@/components/customer-layout';
import { CarCard } from '@/components/site-shell';
import FleetCarousel from '@/components/fleet-carousel';
import { getCars, getSettings, getLocations, getFaqs, getTestimonials } from '@/lib/store';
export const dynamic = 'force-dynamic';
export default async function HomePage() {
  const [cars, settings, locations, faqs, reviews] = await Promise.all([
    getCars(),
    getSettings(),
    getLocations(),
    getFaqs(),
    getTestimonials(),
  ]);
  const useReferenceHeadline = settings.headline === 'Drive Your Way. No Deposit.';
  return (
    <CustomerLayout>
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero-art">
          <Image
            src="/images/hyderabad-drive-light.webp"
            alt="A black SUV on a Hyderabad road with Charminar in the background"
            fill
            sizes="(max-width: 760px) 100vw, 56vw"
            loading="eager"
            fetchPriority="high"
          />
        </div>
        <div className="container hero-inner">
          <div className="hero-copy">
            <div className="eyebrow hero-eyebrow">
              <Star size={16} fill="currentColor" aria-hidden="true" />
              Trusted Car Rentals in Hyderabad
            </div>
            <h1 className="display" id="hero-heading">
              {useReferenceHeadline ? (
                <>
                  <span>Freedom to drive.</span>
                  <span>Without the extra cost.</span>
                </>
              ) : (
                settings.headline
              )}
            </h1>
            <p className="sub">
              {useReferenceHeadline
                ? 'Choose from premium self-drive cars with zero deposit, clear pricing, and smooth pickup or delivery.'
                : settings.description}
            </p>
            <div className="actions">
              <Link className="btn btn-gold" href="/cars">
                Explore Cars <ArrowRight size={21} aria-hidden="true" />
              </Link>
              <a
                className="btn btn-outline"
                href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent('Hi, I would like a quote for a self-drive car in Hyderabad.')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Get a Quote
              </a>
            </div>
            <ul className="hero-benefits" aria-label="Rental benefits">
              <li>
                <BadgeCheck size={26} aria-hidden="true" /> Verified Fleet
              </li>
              <li>
                <Tag size={26} aria-hidden="true" /> No Hidden Charges
              </li>
              <li>
                <Headset size={26} aria-hidden="true" /> Instant Support
              </li>
            </ul>
          </div>
        </div>
      </section>
      <section className="section" id="cars">
        <div className="container">
          <div className="center">
            <span className="eyebrow">Our Fleet</span>
            <h2 className="display">Choose Your Perfect Ride</h2>
            <p className="sub">
              From fuel-efficient hatchbacks to spacious SUVs, find the car that suits your next
              journey.
            </p>
          </div>
          <FleetCarousel>
            {cars.map((c) => (
              <CarCard key={c.id} car={c} />
            ))}
          </FleetCarousel>
          <div className="center" style={{ marginTop: 35 }}>
            <Link className="btn btn-gold" href="/cars">
              View All Cars →
            </Link>
          </div>
        </div>
      </section>
      <section className="section" style={{ background: 'var(--panel2)' }}>
        <div className="container">
          <div className="center">
            <span className="eyebrow">How It Works</span>
            <h2 className="display">Book in 4 Simple Steps</h2>
            <p className="sub">Your journey starts with a simple enquiry.</p>
          </div>
          <div className="steps">
            {[
              {
                icon: CarFront,
                title: 'Choose Your Car',
                text: 'Filter the fleet and compare models, features and prices.',
              },
              {
                icon: CalendarDays,
                title: 'Select Your Dates',
                text: 'Tell us when and where you need the car.',
              },
              {
                icon: MessageCircle,
                title: 'Confirm on WhatsApp',
                text: 'Send your prefilled enquiry and confirm availability with our team.',
              },
              {
                icon: CheckCircle2,
                title: 'Drive & Return',
                text: 'Complete the agreed verification, pickup and return process.',
              },
            ].map((s, i) => (
              <div className="step" key={s.title}>
                <div className="step-icon">
                  <s.icon size={32} />
                </div>
                <h3>
                  {i + 1}. {s.title}
                </h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section" id="locations">
        <div className="container">
          <div className="center">
            <span className="eyebrow">Delivery Locations</span>
            <h2 className="display">Doorstep Delivery Across Hyderabad</h2>
            <p className="sub">Contact our team to check delivery availability for your area.</p>
          </div>
          <div className="location-grid">
            {locations.map((l) => (
              <div className="panel location-card" key={l.id}>
                <MapPin size={24} />
                <strong>{l.name}</strong>
                <span>{l.subtitle}</span>
              </div>
            ))}
          </div>
          <div className="center" style={{ marginTop: 35 }}>
            <Link className="btn btn-outline" href="/locations">
              View All Locations
            </Link>
          </div>
        </div>
      </section>
      {reviews.length > 0 && (
        <section className="section" style={{ background: 'var(--panel2)' }}>
          <div className="container">
            <div className="center">
              <span className="eyebrow">Customer Reviews</span>
              <h2 className="display">What Our Customers Say</h2>
              <p className="sub">Customer feedback shared with permission.</p>
            </div>
            <div className="review-grid">
              {reviews.slice(0, 6).map((r) => (
                <div className="panel review" key={r.id}>
                  <div className="stars">{'★'.repeat(r.rating)}</div>
                  <p>“{r.text}”</p>
                  <footer>
                    <strong>{r.name}</strong>
                    <br />
                    <span>
                      {r.area} {r.verified ? ' • Verified by staff' : ''}
                    </span>
                  </footer>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      <section className="section">
        <div className="container">
          <div className="center">
            <span className="eyebrow">FAQ</span>
            <h2 className="display">Common Questions About Our Self-Drive Cars</h2>
            <p className="sub">Quick answers before you hit the road.</p>
          </div>
          <div className="faq-list">
            {faqs.slice(0, 5).map((q, i) => (
              <details className="panel faq-item" key={q.id} open={i === 0}>
                <summary>{q.question}</summary>
                <p>{q.answer}</p>
              </details>
            ))}
          </div>
          <div className="center" style={{ marginTop: 32 }}>
            <Link className="btn btn-outline" href="/faqs">
              Read All FAQs
            </Link>
          </div>
        </div>
      </section>
      <section className="section" id="office">
        <div className="container">
          <div className="center">
            <span className="eyebrow">Get In Touch</span>
            <h2 className="display">Ready to Get Started?</h2>
            <p className="sub">Visit our location or contact us for a personalised quotation.</p>
          </div>
          <div className="detail-hero">
            <div className="panel" style={{ padding: 12, overflow: 'hidden' }}>
              <iframe
                title="Our office location on Google Maps"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(settings.address)}&output=embed`}
                style={{ width: '100%', height: 330, border: 0, borderRadius: 12 }}
              />
              <a
                className="btn btn-outline"
                href={settings.mapsUrl}
                rel="noopener noreferrer"
                target="_blank"
                style={{ marginTop: 12 }}
              >
                Open Google Maps →
              </a>
            </div>
            <div className="panel" style={{ padding: 30 }}>
              <h3 style={{ fontSize: 25, fontWeight: 800, marginBottom: 26 }}>Get in Touch</h3>
              <div className="panel" style={{ padding: 20, marginBottom: 14 }}>
                <MapPin style={{ display: 'inline', color: 'var(--gold)' }} /> &nbsp;{' '}
                {settings.address}
              </div>
              <div className="panel" style={{ padding: 20, marginBottom: 14 }}>
                <Phone style={{ display: 'inline', color: 'var(--gold)' }} /> &nbsp;{' '}
                <a href={`tel:${settings.phoneNumber.replace(/\D/g, '')}`}>
                  {settings.phoneNumber}
                </a>
              </div>
              <div className="panel" style={{ padding: 20, marginBottom: 14 }}>
                <Mail style={{ display: 'inline', color: 'var(--gold)' }} /> &nbsp;{' '}
                <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>
              </div>
              <a
                className="btn btn-green"
                href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Message on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
      <section className="section" id="contact">
        <div className="container">
          <div className="cta">
            <span className="eyebrow">Ready to Hit the Road?</span>
            <h2 className="display">Your Next Trip Starts Here</h2>
            <p className="sub">
              Choose your car, ask about availability, and confirm the details directly with our
              team.
            </p>
            <div className="actions">
              <Link className="btn btn-gold" href="/cars">
                Browse Cars →
              </Link>
              <a
                className="btn btn-green"
                href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={18} /> Book on WhatsApp
              </a>
              <a
                className="btn btn-outline"
                href={`tel:${settings.phoneNumber.replace(/\D/g, '')}`}
              >
                <Phone size={17} /> Call Now
              </a>
            </div>
          </div>
        </div>
      </section>
    </CustomerLayout>
  );
}
