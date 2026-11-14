import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, ChevronDown, Clock3, Mail, MapPin, Phone } from 'lucide-react';
import type { Car, SiteSettings } from '@prisma/client';
import styles from './mobile-footer.module.css';

export default function MobileFooter({
  settings,
  cars,
  locations,
}: {
  settings: SiteSettings;
  cars: Pick<Car, 'name' | 'slug'>[];
  locations: { name: string }[];
}) {
  const groups = [
    {
      title: 'Explore',
      links: [
        { name: 'Home', href: '/' },
        { name: 'Our cars', href: '/cars' },
        { name: 'Delivery locations', href: '/locations' },
        { name: 'About us', href: '/about' },
        { name: 'FAQs', href: '/faqs' },
        { name: 'Contact us', href: '/#contact' },
      ],
    },
    {
      title: 'Our cars',
      links: cars.slice(0, 14).map((car) => ({ name: car.name, href: `/cars/${car.slug}` })),
    },
    {
      title: 'Delivery areas',
      links: locations.map((location) => ({ name: location.name, href: '/locations' })),
    },
  ];

  return (
    <div className={styles.footer}>
      <div className={styles.brand}>
        <Image
          className={styles.logo}
          src="/logo.jpeg"
          alt={`${settings.businessName} logo`}
          width={108}
          height={76}
        />
        <span className={styles.support}>
          <Clock3 size={12} aria-hidden="true" /> Here for you, 24/7
        </span>
      </div>
      <h2>
        Your plans. <em>Your drive.</em>
      </h2>
      <p className={styles.description}>{settings.description}</p>

      <div className={styles.actions}>
        <a
          className={styles.whatsapp}
          href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <path d="M12 2a10 10 0 0 0-8.66 15L2 22l5.14-1.35A10 10 0 1 0 12 2Z" />
            <path d="M8 7c0 4 5 9 9 9l1-3-3-1-1 1c-2-1-3-2-4-4l1-1-1-2Z" strokeLinejoin="round" />
          </svg>
          WhatsApp us <ArrowUpRight size={15} aria-hidden="true" />
        </a>
        <a
          className={styles.call}
          href={`tel:${settings.phoneNumber.replace(/\D/g, '')}`}
          aria-label={`Call ${settings.phoneNumber}`}
        >
          <Phone size={16} aria-hidden="true" /> Call us
        </a>
      </div>

      <div className={styles.contacts}>
        <a href={`mailto:${settings.contactEmail}`}>
          <Mail size={16} aria-hidden="true" />
          <span>{settings.contactEmail}</span>
          <ArrowUpRight size={14} aria-hidden="true" />
        </a>
        <a href={settings.mapsUrl} target="_blank" rel="noopener noreferrer">
          <MapPin size={16} aria-hidden="true" />
          <span>{settings.address}</span>
          <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </div>

      <nav className={styles.groups} aria-label="Footer navigation">
        {groups
          .filter((group) => group.links.length > 0)
          .map((group) => (
            <details key={group.title} name="mobile-footer-links">
              <summary>
                {group.title}
                <ChevronDown size={16} aria-hidden="true" />
              </summary>
              <div className={styles.links}>
                {group.links.map((link) => (
                  <Link key={`${link.href}-${link.name}`} href={link.href}>
                    {link.name}
                  </Link>
                ))}
              </div>
            </details>
          ))}
      </nav>

      <div className={styles.bottom}>
        <div className={styles.legal}>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/admin/login">Staff login</Link>
        </div>
        <p>
          © {new Date().getFullYear()} {settings.businessName}
        </p>
        <p className={styles.note}>Prices, availability and terms are subject to confirmation.</p>
      </div>
    </div>
  );
}
