'use client';

// @refresh reset
// Remount animation state when editing hooks during development.

import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Children,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

const ROTATION_INTERVAL = 5000;
const TRANSITION_DURATION = 900;

export default function FleetCarousel({ children }: { children: ReactNode }) {
  const cars = useMemo(() => Children.toArray(children), [children]);
  const count = cars.length;
  const carousel = useRef<HTMLDivElement>(null);
  const lastMove = useRef(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const instructionsId = useId();
  const [active, setActive] = useState(Math.min(1, Math.max(0, count - 1)));
  const [hovered, setHovered] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const [inView, setInView] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const paginationStart = Math.max(0, Math.min(active - 1, count - 3));

  useEffect(() => {
    setActive(Math.min(1, Math.max(0, count - 1)));
    lastMove.current = 0;
  }, [count]);

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReducedMotion(motion.matches);
    updateMotion();
    motion.addEventListener('change', updateMotion);
    return () => motion.removeEventListener('change', updateMotion);
  }, []);

  useEffect(() => {
    const element = carousel.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.25,
    });
    const updateVisibility = () => setTabVisible(!document.hidden);
    observer.observe(element);
    updateVisibility();
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, [count]);

  const move = useCallback(
    (direction: number) => {
      if (count < 2) return;
      const now = Date.now();
      if (!reducedMotion && now - lastMove.current < TRANSITION_DURATION) return;
      lastMove.current = now;
      setHovered(null);
      setActive((current) => (current + direction + count) % count);
    },
    [count, reducedMotion],
  );

  useEffect(() => {
    if (count < 2 || hovered !== null || focused || !inView || !tabVisible || reducedMotion) return;
    // Restart the full delay after hover ends so the center card can settle first.
    const timeout = window.setTimeout(() => move(1), ROTATION_INTERVAL);
    return () => window.clearTimeout(timeout);
  }, [count, active, hovered, focused, inView, tabVisible, reducedMotion, move]);

  if (!count) return <p className="center muted">Our fleet will be available soon.</p>;

  return (
    <div
      className="fleet-carousel"
      ref={carousel}
      role="region"
      aria-roledescription="carousel"
      aria-label="Our car fleet"
      aria-describedby={instructionsId}
      tabIndex={count > 1 ? 0 : undefined}
      onFocusCapture={(event) => setFocused(event.target.matches(':focus-visible'))}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          move(event.key === 'ArrowRight' ? 1 : -1);
        }
      }}
      onPointerDown={(event) => {
        swiped.current = false;
        if (event.pointerType === 'touch')
          touchStart.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerCancel={() => {
        touchStart.current = null;
      }}
      onPointerUp={(event) => {
        const start = touchStart.current;
        touchStart.current = null;
        if (!start) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
          swiped.current = true;
          move(dx < 0 ? 1 : -1);
        }
      }}
      onClickCapture={(event) => {
        if (swiped.current) {
          event.preventDefault();
          event.stopPropagation();
          swiped.current = false;
        }
      }}
    >
      <p className="sr-only" id={instructionsId}>
        Cars rotate automatically every five seconds. Hover or keyboard focus pauses rotation. Use
        the side arrows, pagination buttons, left and right arrow keys, or swipe to explore the
        fleet.
      </p>
      <div className="fleet-stage" id={instructionsId + '-stage'}>
        {cars.map((car, index) => {
          // Circular positions keep the last-to-first transition identical to every other step.
          const distance = (index - active + count) % count;
          const slot =
            distance === 0
              ? 0
              : distance === 1
                ? 1
                : distance === count - 1
                  ? -1
                  : distance > count / 2
                    ? -2
                    : 2;
          const featured = slot === 0;
          return (
            <div
              className="fleet-slide"
              data-slot={slot}
              key={index}
              role="group"
              aria-roledescription="slide"
              aria-label={'Car ' + (index + 1) + ' of ' + count}
              aria-hidden={!featured}
              onPointerEnter={(event) => {
                if (event.pointerType === 'mouse') setHovered(index);
              }}
              onPointerLeave={() => setHovered((current) => (current === index ? null : current))}
            >
              <div className="fleet-slide-content" inert={!featured}>
                {car}
              </div>
            </div>
          );
        })}
      </div>
      {count > 1 && (
        <>
          <div className="fleet-controls" role="group" aria-label="Car navigation">
            <button
              type="button"
              className="fleet-nav"
              aria-label="Previous car"
              aria-controls={instructionsId + '-stage'}
              onClick={() => move(-1)}
            >
              <ChevronLeft size={32} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="fleet-nav"
              aria-label="Next car"
              aria-controls={instructionsId + '-stage'}
              onClick={() => move(1)}
            >
              <ChevronRight size={32} aria-hidden="true" />
            </button>
          </div>
          <div className="fleet-pagination">
            <div className="fleet-dots" role="group" aria-label="Choose a car">
              {cars.slice(paginationStart, paginationStart + 3).map((_, offset) => {
                const index = paginationStart + offset;
                return (
                  <button
                    key={index}
                    type="button"
                    className="fleet-dot"
                    aria-label={`Show car ${index + 1}`}
                    aria-current={active === index ? 'true' : undefined}
                    onClick={() => move(index - active)}
                  />
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
