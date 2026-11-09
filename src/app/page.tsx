import Link from 'next/link';
import Image from 'next/image';
import {
  MapPin,
  MessageCircle,
  Phone,
  Mail,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Tag,
  Headset,
  Star,
} from 'lucide-react';
import CustomerLayout from '@/components/customer-layout';
import { CarCard } from '@/components/site-shell';
import FleetCarousel from '@/components/fleet-carousel';
import BookingJourney from '@/components/booking-journey';
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
                  <span>
                    Freedom to <em className="text-accent">drive.</em>
                  </span>
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
      <section className="section fleet-section" id="cars" aria-labelledby="fleet-heading">
        <div className="container">
          <div className="center">
            <span className="eyebrow fleet-eyebrow">
              <Star size={24} fill="currentColor" aria-hidden="true" /> Top Rated Cars
            </span>
            <h2 className="display" id="fleet-heading">
              Explore Our <span>Car Fleet</span>
            </h2>
            <p className="sub fleet-subtitle">
              Premium self-drive cars in Hyderabad. Choose from our most popular vehicles.
            </p>
          </div>
          <FleetCarousel>
            {cars.map((c) => (
              <CarCard key={c.id} car={c} />
            ))}
          </FleetCarousel>
        </div>
      </section>
      <BookingJourney whatsappNumber={settings.whatsappNumber} />
      <section
        className="section delivery-section"
        id="locations"
        aria-labelledby="delivery-heading"
      >
        <div className="container">
          <div className="center">
            <span className="eyebrow">Delivery Locations</span>
            <h2 className="display" id="delivery-heading">
              Doorstep Delivery Across <span className="text-accent">Hyderabad</span>
            </h2>
            <p className="sub">Contact our team to check delivery availability for your area.</p>
          </div>
          <div className="location-grid">
            {locations.map((l) => (
              <div className="panel location-card" key={l.id}>
                <MapPin size={20} />
                <strong>{l.name}</strong>
                <span>{l.subtitle}</span>
              </div>
            ))}
          </div>
          <div className="center delivery-action">
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
              <h2 className="display">
                What Our <span className="text-accent">Customers Say</span>
              </h2>
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
      <section className="section faq-section" id="faqs" aria-labelledby="faq-heading">
        <div className="container">
          <div className="center">
            <span className="eyebrow">FAQ</span>
            <h2 className="display" id="faq-heading">
              Common Questions About Our <span className="text-accent">Self-Drive Cars</span>
            </h2>
            <p className="sub">Quick answers before you hit the road.</p>
          </div>
          <div className="faq-list">
            {faqs.slice(0, 5).map((q, i) => (
              <details className="panel faq-item" name="home-faqs" key={q.id} open={i === 0}>
                <summary>{q.question}</summary>
                <p>{q.answer}</p>
              </details>
            ))}
          </div>
          <div className="center faq-action">
            <Link className="btn btn-outline" href="/faqs">
              Read All FAQs
            </Link>
          </div>
        </div>
      </section>
      <section className="office-section" id="office" aria-labelledby="office-heading">
        <div className="container">
          <div className="office-heading">
            <h2 className="display" id="office-heading">
              A local team. A real conversation.
            </h2>
          </div>
          <div className="office-grid">
            <div className="office-map">
              <iframe
                title="Our office location on Google Maps"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(settings.address)}&output=embed`}
              />
              <div className="office-map-footer">
                <span>
                  <MapPin size={16} aria-hidden="true" /> Find us in Hyderabad
                </span>
                <a href={settings.mapsUrl} rel="noopener noreferrer" target="_blank">
                  Get directions <ArrowUpRight size={16} aria-hidden="true" />
                </a>
              </div>
            </div>
            <div className="office-details">
              <h3>Let’s talk about your plans.</h3>
              <div className="office-contact-list">
                <a
                  className="office-contact-row"
                  href={settings.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="office-contact-icon">
                    <MapPin size={18} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="office-contact-label">Visit us</span>
                    <span className="office-contact-value">{settings.address}</span>
                  </span>
                  <ArrowUpRight size={16} aria-hidden="true" />
                </a>
                <a
                  className="office-contact-row"
                  href={`tel:${settings.phoneNumber.replace(/\D/g, '')}`}
                >
                  <span className="office-contact-icon">
                    <Phone size={18} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="office-contact-label">Give us a call</span>
                    <span className="office-contact-value">{settings.phoneNumber}</span>
                  </span>
                  <ArrowUpRight size={16} aria-hidden="true" />
                </a>
                <a className="office-contact-row" href={`mailto:${settings.contactEmail}`}>
                  <span className="office-contact-icon">
                    <Mail size={18} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="office-contact-label">Drop us a note</span>
                    <span className="office-contact-value">{settings.contactEmail}</span>
                  </span>
                  <ArrowUpRight size={16} aria-hidden="true" />
                </a>
              </div>
              <a
                className="btn btn-gold office-whatsapp"
                href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={17} aria-hidden="true" /> Message on WhatsApp
                <ArrowRight size={16} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </section>
      <section className="booking-cta-section" id="contact" aria-labelledby="booking-cta-heading">
        <div className="container">
          <div className="booking-cta">
            <div className="booking-cta-copy">
              <h2 className="display" id="booking-cta-heading">
                Your plans. Your car. Let’s go.
              </h2>
              <p>Find your car. Share your dates. We’ll help you take it from there.</p>
            </div>
            <div className="booking-cta-actions">
              <Link className="btn booking-cta-primary" href="/cars">
                Find your car <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <div className="booking-cta-secondary">
                <a
                  href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle size={16} aria-hidden="true" /> WhatsApp us
                </a>
                <a href={`tel:${settings.phoneNumber.replace(/\D/g, '')}`}>
                  <Phone size={15} aria-hidden="true" /> Call us
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </CustomerLayout>
  );
}
