'use client';

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
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [inView, setInView] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

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
      setActive((current) => (current + direction + count) % count);
    },
    [count, reducedMotion],
  );

  useEffect(() => {
    if (count < 2 || reducedMotion || hovered || focused || !inView || !tabVisible) return;
    const interval = window.setInterval(() => move(1), ROTATION_INTERVAL);
    return () => window.clearInterval(interval);
  }, [count, reducedMotion, hovered, focused, inView, tabVisible, move]);

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
      onFocusCapture={() => setFocused(true)}
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
        Cars rotate automatically. Hover over or focus the featured car to pause. Use the left and
        right arrow keys or swipe to explore the fleet.
      </p>
      <div className="fleet-stage">
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
              inert={!featured}
              onPointerEnter={(event) => {
                if (featured && event.pointerType === 'mouse') setHovered(true);
              }}
              onPointerLeave={() => setHovered(false)}
            >
              {car}
            </div>
          );
        })}
      </div>
    </div>
  );
}
