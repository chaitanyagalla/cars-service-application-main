'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function MobileNavigation({ links }: { links: string[][] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const navigationId = useId();
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        toggle.current?.focus();
      }
    }
    function resize() {
      if (window.innerWidth > 900) setOpen(false);
    }
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    window.addEventListener('resize', resize);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('resize', resize);
    };
  }, [open]);

  return (
    <div className="mobile-menu" ref={root}>
      <button
        ref={toggle}
        type="button"
        className="mobile-menu-toggle"
        aria-label={open ? 'Close navigation' : 'Open navigation'}
        aria-expanded={open}
        aria-controls={navigationId}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X size={23} aria-hidden="true" /> : <Menu size={23} aria-hidden="true" />}
      </button>
      <nav
        id={navigationId}
        className="mobile-menu-dropdown"
        aria-label="Mobile navigation"
        hidden={!open}
      >
        {links.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            aria-current={
              pathname === href || (href !== '/' && pathname.startsWith(`${href}/`))
                ? 'page'
                : undefined
            }
            onClick={() => setOpen(false)}
          >
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
