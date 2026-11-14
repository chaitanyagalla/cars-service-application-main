'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

// Scrolling this far in one direction flips the header, so small jitters are ignored.
const DIRECTION_THRESHOLD = 8;

/**
 * Renders the site header and slides it out of the way while the page scrolls down, bringing it
 * back as soon as the page scrolls up. The CSS in globals.css animates the data-hidden attribute.
 */
export default function ScrollHidingHeader({ children }: { children: ReactNode }) {
  const header = useRef<HTMLElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // The scroll position where the header last changed state; slow scrolls accumulate against it.
    let anchor = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = Math.max(0, window.scrollY);
      const height = header.current?.offsetHeight ?? 80;
      if (y <= height) {
        setHidden(false);
        anchor = y;
      } else if (y > anchor + DIRECTION_THRESHOLD) {
        setHidden(true);
        anchor = y;
      } else if (y < anchor - DIRECTION_THRESHOLD) {
        setHidden(false);
        anchor = y;
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header className="header" ref={header} data-hidden={hidden ? 'true' : undefined}>
      {children}
    </header>
  );
}
