import Link from 'next/link';
import Image from 'next/image';
import { CarFront, Phone, MapPin, Clock3, Mail, UsersRound, Fuel, Settings } from 'lucide-react';
import type { SiteSettings } from '@prisma/client';
import { whatsAppUrl } from '@/lib/whatsapp';
import type { Car } from '@prisma/client';
import type { RatedCar } from '@/lib/car-ratings';
import MobileNavigation from './mobile-navigation';

export function WhatsAppIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 2a10 10 0 0 0-8.66 15L2 22l5.14-1.35A10 10 0 1 0 12 2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        fill="currentColor"
        d="M16.75 13.43c-.27-.14-1.61-.79-1.86-.88-.25-.1-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.14-.42-2.17-1.34-.8-.72-1.34-1.61-1.5-1.88-.16-.27-.02-.42.12-.56.12-.12.27-.32.4-.48.14-.16.18-.27.27-.45.1-.18.05-.34-.02-.48-.07-.14-.61-1.48-.84-2.03-.22-.53-.45-.46-.61-.47h-.52c-.18 0-.48.07-.73.34-.25.27-.95.93-.95 2.27s.98 2.63 1.11 2.81c.14.18 1.92 2.93 4.65 4.1.65.28 1.16.44 1.55.56.65.2 1.25.17 1.72.1.52-.08 1.61-.66 1.84-1.3.23-.64.23-1.19.16-1.3-.07-.11-.25-.18-.52-.31Z"
      />
    </svg>
  );
}

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
            <Phone size={20} aria-hidden="true" /> {settings.phoneNumber}
          </a>
          <Link className="btn btn-gold" href="/cars">
            Book Now
          </Link>
          <MobileNavigation links={nav} />
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
            <Image
              className="logo"
              src="/brand.webp"
              alt="Universal logo"
              width={108}
              height={100}
            />
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
      aria-describedby="floating-whatsapp-tooltip"
      target="_blank"
      rel="noopener noreferrer"
    >
      <WhatsAppIcon size={30} />
      <span className="floating-wa-tooltip" id="floating-whatsapp-tooltip" role="tooltip">
        Let&apos;s talk
      </span>
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
          <span>
            <UsersRound size={18} aria-hidden="true" /> {car.seats} seats
          </span>
          <span>
            <Fuel size={18} aria-hidden="true" /> {car.fuel}
          </span>
          <span>
            <Settings size={18} aria-hidden="true" /> {car.transmission}
          </span>
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
              <WhatsAppIcon size={32} />
            </a>
          ) : (
            <span className="pill">Unavailable</span>
          )}
        </div>
      </div>
    </article>
  );
}
