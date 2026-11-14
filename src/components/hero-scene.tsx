'use client';

import Image from 'next/image';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

type IntroPhase = 'loading' | 'playing' | 'complete' | 'skipped';

const DRIVE_MS = 4000;
// The car enters at speed and brakes gently, so the copy settles as the car parks.
const DRIVE_EASING = 'cubic-bezier(0.25, 0.6, 0.3, 1)';
// hero-car.webp has transparent margins; these anchor the reveal to the visible bumpers.
const CAR_REAR_INSET = 0.036;
const CAR_FRONT_INSET = 0.035;
// Above 1, the copy stays just behind the car for most of the drive and catches up as it brakes.
const REVEAL_CATCH_UP = 1.4;
// The empty scene, the car that drives across it, and the overlay that settles in once it parks.
// scripts/build-hero-art.cjs cuts all three from the approved mockup.
const HERO_IMAGE_COUNT = 3;

export default function HeroScene({ children }: { children: ReactNode }) {
  const sceneRef = useRef<HTMLElement>(null);
  const carRef = useRef<HTMLDivElement>(null);
  const loadedImages = useRef(0);
  const [phase, setPhase] = useState<IntroPhase>('loading');

  const skipIntro = () => setPhase((current) => (current === 'loading' ? 'skipped' : current));

  const handleImageLoad = () => {
    loadedImages.current += 1;
    if (loadedImages.current < HERO_IMAGE_COUNT) return;
    const firstRow = sceneRef.current?.querySelector('[data-hero-reveal]');
    // If the CSS fallback has already shown the copy, hiding it again to replay would flicker.
    const alreadyShown = !firstRow || getComputedStyle(firstRow).visibility === 'visible';
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const next = alreadyShown || reduceMotion ? 'skipped' : 'playing';
    setPhase((current) => (current === 'loading' ? next : current));
  };

  useEffect(() => {
    if (phase !== 'loading') return;
    // A missing or slow image must never leave the page's links hidden.
    const timeout = window.setTimeout(
      () => setPhase((current) => (current === 'loading' ? 'skipped' : current)),
      5000,
    );
    return () => window.clearTimeout(timeout);
  }, [phase]);

  // A layout effect, so the first painted frame already has the car off-screen.
  useLayoutEffect(() => {
    if (phase !== 'playing') return;
    const scene = sceneRef.current;
    const car = carRef.current;
    const copy = scene?.querySelector<HTMLElement>('.hero-copy');
    if (!scene || !car || !copy) return;

    const carBox = car.getBoundingClientRect();
    const copyBox = copy.getBoundingClientRect();
    // Measure where the text actually ends (rows at their resting offset), so the reveal finishes
    // at the last glyph rather than at the edge of the wider copy column.
    scene.style.setProperty('--hero-reveal', '1');
    const range = document.createRange();
    let textEnd = 0;
    for (const row of copy.querySelectorAll('[data-hero-reveal]')) {
      range.selectNodeContents(row);
      textEnd = Math.max(textEnd, range.getBoundingClientRect().right - copyBox.left);
    }
    scene.style.setProperty('--hero-copy-extent', `${Math.ceil(textEnd)}px`);
    const rear = carBox.left + carBox.width * CAR_REAR_INSET;
    const front = carBox.right - carBox.width * CAR_FRONT_INSET;
    // Beside the copy, the text is drawn out of the car's wake. When the car parks too far left for
    // that (the stacked mobile layout, where it drives below the copy), its nose leads the text.
    const anchor = rear - copyBox.left > copyBox.width * 0.4 ? rear : front;
    const span = Math.max(anchor - copyBox.left, 1);
    const startOffset = -Math.ceil(carBox.right + 24);

    const drive = car.animate(
      [{ transform: `translateX(${startOffset}px)` }, { transform: 'translateX(0)' }],
      { duration: DRIVE_MS, easing: DRIVE_EASING, fill: 'backwards' },
    );

    let frame = 0;
    const followCar = () => {
      // The effect's progress is already eased, so this is exactly where the car is drawn.
      const progress = drive.effect?.getComputedTiming().progress ?? 1;
      const anchorX = anchor + startOffset * (1 - progress);
      const travelled = Math.min(Math.max((anchorX - copyBox.left) / span, 0), 1);
      scene.style.setProperty('--hero-reveal', (travelled ** REVEAL_CATCH_UP).toFixed(4));
      frame = requestAnimationFrame(followCar);
    };
    followCar();

    drive.finished.then(
      () => setPhase('complete'),
      () => {}, // Cancelled by cleanup.
    );

    // The measurements only hold for this layout, so park the car if the width changes.
    // Height-only resizes come from mobile toolbars collapsing while scrolling.
    const startWidth = window.innerWidth;
    const parkOnResize = () => {
      if (window.innerWidth !== startWidth) drive.finish();
    };
    window.addEventListener('resize', parkOnResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', parkOnResize);
      drive.cancel();
      scene.style.removeProperty('--hero-reveal');
      scene.style.removeProperty('--hero-copy-extent');
    };
  }, [phase]);

  return (
    <section ref={sceneRef} className="hero" aria-labelledby="hero-heading" data-intro={phase}>
      <div className="hero-art" aria-hidden="true">
        <div className="hero-art-frame">
          <Image
            src="/images/hero-plate.webp"
            alt=""
            fill
            unoptimized
            sizes="(max-width: 900px) 124vw, 68vw"
            loading="eager"
            fetchPriority="high"
            onLoad={handleImageLoad}
            onError={skipIntro}
          />
        </div>
      </div>
      <div className="hero-car-art" aria-hidden="true">
        <div className="hero-art-frame">
          <div className="hero-car" ref={carRef}>
            <Image
              src="/images/hero-car.webp"
              alt=""
              width={1492}
              height={824}
              unoptimized
              sizes="(max-width: 900px) 78vw, 43vw"
              loading="eager"
              fetchPriority="high"
              onLoad={handleImageLoad}
              onError={skipIntro}
            />
          </div>
          {/* The mockup's own pixels around the parked car: its full shadow and the road beside it. */}
          <div className="hero-parked">
            <Image
              src="/images/hero-parked.webp"
              alt=""
              width={1816}
              height={824}
              unoptimized
              sizes="(max-width: 900px) 95vw, 52vw"
              loading="eager"
              onLoad={handleImageLoad}
              onError={skipIntro}
            />
          </div>
        </div>
      </div>
      {children}
      <noscript>
        <style>{`
          .hero .hero-car,
          .hero .hero-parked,
          .hero [data-hero-reveal],
          .header:has(+ main .hero) :is(.desktop-nav, .head-actions, .mobile-nav) {
            opacity: 1; visibility: visible; animation: none; transform: none;
            mask-image: none; -webkit-mask-image: none;
          }
        `}</style>
      </noscript>
    </section>
  );
}
