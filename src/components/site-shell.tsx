import Link from 'next/link';
import Image from 'next/image';
import { CarFront, Phone, MapPin, Clock3, Mail, MessageCircle } from 'lucide-react';
import type { SiteSettings } from '@prisma/client';
import { whatsAppUrl } from '@/lib/whatsapp';
import type { Car } from '@prisma/client';
import type { RatedCar } from '@/lib/car-ratings';

export function Header({ settings }: { settings: SiteSettings }) {
  const nav = [
    ['Home', '/'],
    ['Cars', '/cars'],
    ['Locations', '/locations'],
    ['About Us', '/about'],
    ['FAQs', '/faqs'],
  ];
  return (
    <header className="header">
      <div className="container head-inner">
        <Link href="/" aria-label="Universal Self Drive Cars home">
          <Image
            className="logo"
            src="/brand.webp"
            alt="Universal Self Drive Cars"
            width={92}
            height={92}
          />
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {nav.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="head-actions">
          <a className="phone" href={`tel:${settings.phoneNumber.replace(/\D/g, '')}`}>
            <Phone size={15} style={{ display: 'inline' }} /> {settings.phoneNumber}
          </a>
          <Link className="btn btn-gold" href="/cars">
            Book Now
          </Link>
        </div>
      </div>
      <nav className="mobile-nav container" aria-label="Mobile navigation">
        {nav.map(([label, href]) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
export function Footer({
  settings,
  cars = [],
  locations = [],
}: {
  settings: SiteSettings;
  cars?: Pick<Car, 'name' | 'slug'>[];
  locations?: { name: string }[];
}) {
  return (
    <footer className="footer">
      <div className="container">
        <div className="foot-grid">
          <div>
            <Image src="/brand.webp" alt="Universal logo" width={98} height={98} />
            <p>{settings.description}</p>
            <p>
              <Phone size={14} style={{ display: 'inline' }} /> {settings.phoneNumber}
            </p>
            <p>
              <Mail size={14} style={{ display: 'inline' }} /> {settings.contactEmail}
            </p>
            <p>
              <MapPin size={14} style={{ display: 'inline' }} /> {settings.address}
            </p>
            <p>
              <Clock3 size={14} style={{ display: 'inline' }} /> Contact us 24/7
            </p>
          </div>
          <div>
            <h3>Quick Links</h3>
            {[
              ['About Us', '/about'],
              ['FAQ', '/faqs'],
              ['Locations', '/locations'],
              ['Cars', '/cars'],
              ['Contact', '/#contact'],
              ['Privacy Policy', '/privacy'],
              ['Terms of Service', '/terms'],
            ].map(([t, h]) => (
              <Link key={h} href={h}>
                {t}
              </Link>
            ))}
          </div>
          <div>
            <h3>Our Cars</h3>
            {cars.slice(0, 14).map((c) => (
              <Link key={c.slug} href={`/cars/${c.slug}`}>
                {c.name}
              </Link>
            ))}
          </div>
          <div>
            <h3>Service Areas</h3>
            {locations.map((l) => (
              <Link href="/locations" key={l.name}>
                {l.name}
              </Link>
            ))}
          </div>
        </div>
        <div className="footer-bottom">
          © {new Date().getFullYear()} {settings.businessName}. Prices, availability and terms are
          subject to confirmation.{' '}
          <Link href="/admin/login" style={{ float: 'right' }}>
            Staff
          </Link>
        </div>
      </div>
    </footer>
  );
}
export function FloatingWhatsApp({ phone }: { phone: string }) {
  return (
    <a
      className="floating-wa"
      href={`https://wa.me/${phone.replace(/\D/g, '')}`}
      aria-label="Contact us on WhatsApp"
      target="_blank"
      rel="noopener noreferrer"
    >
      <MessageCircle size={29} />
    </a>
  );
}
export function CarCard({ car }: { car: RatedCar }) {
  return (
    <article className="car-card panel">
      <Link href={`/cars/${car.slug}`} className="car-photo">
        <img src={car.imageUrl} alt={`${car.name} self-drive car`} loading="lazy" />
        {car.featured && <span className="popular">★ Popular</span>}
      </Link>
      <div className="car-info">
        <div className="car-title-row">
          <div>
            <h3>
              <Link href={`/cars/${car.slug}`}>{car.name}</Link>
            </h3>
            <p>{car.category.charAt(0) + car.category.slice(1).toLowerCase()}</p>
          </div>
          <div className="price">
            ₹{car.priceDay.toLocaleString('en-IN')}
            <small>per day</small>
          </div>
        </div>
        {car.rating != null && (
          <div className="rating">
            {'★'.repeat(Math.round(car.rating))}{' '}
            <span className="muted">
              {car.rating.toFixed(1)} / 5 ({car.ratingCount}{' '}
              {car.ratingCount === 1 ? 'rating' : 'ratings'})
            </span>
          </div>
        )}
        <div className="car-meta">
          ♧ {car.seats} seats &nbsp; ⛽ {car.fuel} &nbsp; ⚙ {car.transmission}
        </div>
        <div className="pills">
          <span className="pill">₹{car.deposit} Deposit</span>
          <span className="pill">{car.includedKm} Kms</span>
          <span className="pill">Permit: confirm terms</span>
        </div>
        <div className="card-actions">
          <Link className="btn btn-outline" href={`/cars/${car.slug}`}>
            View Details →
          </Link>
          {car.available ? (
            <a
              className="square-whatsapp"
              href={`/api/whatsapp/${car.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Enquire on WhatsApp for ${car.name}`}
            >
              <MessageCircle size={21} />
            </a>
          ) : (
            <span className="pill">Unavailable</span>
          )}
        </div>
      </div>
    </article>
  );
}
