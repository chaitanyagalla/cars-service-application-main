import Link from 'next/link';
import {
  CarFront,
  Users,
  MapPin,
  ShieldCheck,
  Clock3,
  CalendarDays,
  Truck,
  CheckCircle2,
  MessageCircle,
  Phone,
  Mail,
  Shield,
  Check,
} from 'lucide-react';
import CustomerLayout from '@/components/customer-layout';
import { CarCard } from '@/components/site-shell';
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
  const stats = [
    { icon: CarFront, value: `${cars.length}+`, label: 'Cars listed' },
    { icon: Users, value: 'Easy', label: 'WhatsApp booking' },
    { icon: MapPin, value: `${locations.length}`, label: 'Service areas' },
    {
      icon: ShieldCheck,
      value: cars.some((c) => c.deposit === 0) ? '₹0' : 'Varies',
      label: 'Security deposit',
    },
  ];
  return (
    <CustomerLayout>
      <section className="hero">
        <div className="container">
          <div className="eyebrow">★ Self-Drive Car Rentals in Hyderabad</div>
          <h1 className="serif">
            {settings.headline.includes('No Deposit.') ? (
              <>
                {settings.headline.split('No Deposit.')[0]}
                <span className="gold-text">No Deposit.</span>
              </>
            ) : (
              settings.headline
            )}
          </h1>
          <p className="sub">{settings.description}</p>
          <div className="actions">
            <Link className="btn btn-gold" href="/cars">
              Explore Cars →
            </Link>
            <a className="btn btn-outline" href={`tel:${settings.phoneNumber.replace(/\D/g, '')}`}>
              <Phone size={17} /> Call Now
            </a>
          </div>
          <div className="hero-metrics">
            <div>
              <strong>{cars.length}+</strong>
              <span>Cars listed</span>
            </div>
            <div>
              <strong>{cars.some((c) => c.deposit === 0) ? '₹0' : 'Varies'}</strong>
              <span>Security deposit</span>
            </div>
            <div>
              <strong>{locations.length}</strong>
              <span>Service areas</span>
            </div>
          </div>
        </div>
      </section>
      <section className="section-compact">
        <div className="container stats-grid">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="stat-icon">
                <s.icon size={28} />
              </div>
              <div className="stat-value">{s.value}</div>
              <strong>{s.label}</strong>
            </div>
          ))}
        </div>
      </section>
      <section className="section" id="cars">
        <div className="container">
          <div className="center">
            <span className="eyebrow">Our Fleet</span>
            <h2 className="serif">Choose Your Perfect Ride</h2>
            <p className="sub">
              From fuel-efficient hatchbacks to spacious SUVs, find the car that suits your next
              journey.
            </p>
          </div>
          <div className="car-grid">
            {cars.slice(0, 6).map((c) => (
              <CarCard key={c.id} car={c} />
            ))}
          </div>
          <div className="center" style={{ marginTop: 35 }}>
            <Link className="btn btn-gold" href="/cars">
              View All Cars →
            </Link>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="center">
            <span className="eyebrow">Why Choose Us</span>
            <h2 className="serif">Drive the Premium. Travel with Freedom.</h2>
            <p className="sub">
              Flexible self-drive options with a customer-first booking experience.
            </p>
          </div>
          <div className="feature-grid">
            {[
              {
                icon: Clock3,
                title: 'Flexible Pickup',
                text: 'Choose a suitable pickup time and discuss delivery arrangements with our team.',
              },
              {
                icon: MapPin,
                title: 'Areas Across Hyderabad',
                text: 'Enquire about doorstep delivery in our listed Hyderabad service areas.',
              },
              {
                icon: CarFront,
                title: 'Well-Maintained Fleet',
                text: 'Browse hatchbacks, sedans, MPVs and SUVs with clear car-specific pricing.',
              },
            ].map((f) => (
              <div className="panel feature" key={f.title}>
                <div className="feature-icon">
                  <f.icon size={29} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section" style={{ background: '#0c0b17' }}>
        <div className="container">
          <div className="center">
            <span className="eyebrow">How It Works</span>
            <h2 className="serif">Book in 4 Simple Steps</h2>
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
            <h2 className="serif">Doorstep Delivery Across Hyderabad</h2>
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
        <section className="section" style={{ background: '#0c0b17' }}>
          <div className="container">
            <div className="center">
              <span className="eyebrow">Customer Reviews</span>
              <h2 className="serif">What Our Customers Say</h2>
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
            <h2 className="serif">Common Questions About Our Self-Drive Cars</h2>
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
            <h2 className="serif">Ready to Get Started?</h2>
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
            <h2 className="serif">Your Next Trip Starts Here</h2>
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
