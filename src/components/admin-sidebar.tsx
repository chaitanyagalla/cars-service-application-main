'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import {
  ArrowUpRight,
  CarFront,
  ChevronRight,
  ClipboardList,
  History,
  LayoutDashboard,
  MapPin,
  MessageCircleQuestion,
  Settings2,
  ShieldCheck,
  Star,
  UsersRound,
  Menu,
  X,
} from 'lucide-react';
import { LogoutButton } from '@/components/logout-button';

const navigation = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Cars & Prices', href: '/admin/cars', icon: CarFront },
  { label: 'Locations', href: '/admin/locations', icon: MapPin },
  { label: 'FAQs', href: '/admin/faqs', icon: MessageCircleQuestion },
  { label: 'Testimonials', href: '/admin/testimonials', icon: Star },
  { label: 'Booking Leads', href: '/admin/bookings', icon: ClipboardList },
  { label: 'Website Settings', href: '/admin/settings', icon: Settings2 },
  { label: 'Staff Users', href: '/admin/users', icon: UsersRound },
  { label: 'Audit Trail', href: '/admin/audits', icon: History },
];

export function AdminSidebar({ name, role }: { name: string; role: string }) {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const mobileOpen = openPath === pathname;
  const navigationId = useId();
  const aside = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!mobileOpen) return;
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !aside.current?.contains(event.target)) setOpenPath(null);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenPath(null);
        menuButton.current?.focus();
      }
    }
    function resize() {
      if (window.innerWidth > 760) setOpenPath(null);
    }
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    window.addEventListener('resize', resize);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('resize', resize);
    };
  }, [mobileOpen]);
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');
  return (
    <aside className="admin-aside" ref={aside} data-mobile-open={mobileOpen}>
      <Link href="/" className="admin-brand" aria-label="Universal home">
        <span className="admin-brand-mark">
          <CarFront size={23} aria-hidden="true" />
        </span>
        <span>
          <strong>UNIVERSAL</strong>
          <small>SELF DRIVE CARS</small>
        </span>
      </Link>
      <button
        ref={menuButton}
        type="button"
        className="admin-menu-toggle"
        aria-label={mobileOpen ? 'Close admin menu' : 'Open admin menu'}
        aria-expanded={mobileOpen}
        aria-controls={navigationId}
        onClick={() => setOpenPath(mobileOpen ? null : pathname)}
      >
        {mobileOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
      </button>
      <div className="admin-profile">
        <span className="admin-avatar" aria-hidden="true">
          {initials.toUpperCase() || 'U'}
        </span>
        <div className="admin-profile-info">
          <strong title={name}>{name}</strong>
          <span>
            <ShieldCheck size={12} aria-hidden="true" />
            {role.replaceAll('_', ' ').toLowerCase()}
          </span>
        </div>
        <span className="admin-online-dot" title="Signed in" />
      </div>
      <nav id={navigationId} className="admin-nav" aria-label="Admin navigation">
        <p className="admin-nav-label">WORKSPACE</p>
        {navigation.map(({ label, href, icon: Icon }) => {
          const active =
            href === '/admin'
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`admin-nav-link${active ? ' is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => setOpenPath(null)}
            >
              <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
              {active && (
                <ChevronRight className="admin-nav-chevron" size={16} aria-hidden="true" />
              )}
            </Link>
          );
        })}
      </nav>
      <div className="admin-sidebar-footer">
        <Link href="/" className="admin-website-link">
          View website
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
        <LogoutButton />
      </div>
    </aside>
  );
}
