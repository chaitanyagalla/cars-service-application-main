'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Testimonial } from '@prisma/client';
import { ArrowLeft, ArrowRight, BadgeCheck, CarFront, MapPin, Quote, Star } from 'lucide-react';
import styles from './testimonials.module.css';

type Review = Pick<
  Testimonial,
  'id' | 'name' | 'area' | 'carName' | 'text' | 'rating' | 'verified'
>;

const REVIEWS_PER_PAGE = 3;
const ROTATION_INTERVAL = 6000;

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('');
}

function Stars({ rating }: { rating: number }) {
  const value = Math.max(1, Math.min(5, Math.round(rating)));
  return (
    <span className={styles.stars} role="img" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          size={15}
          fill={index < value ? 'currentColor' : 'none'}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

export default function Testimonials({ reviews }: { reviews: Review[] }) {
  const [selection, setSelection] = useState({ page: 0, featured: 0 });
  const [mobile, setMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [direction, setDirection] = useState<'next' | 'previous'>('next');
  const section = useRef<HTMLElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const perPage = mobile ? 1 : REVIEWS_PER_PAGE;
  const pageCount = Math.max(1, Math.ceil(reviews.length / perPage));
  const rotating = mobile && !reducedMotion && !hovered && !focused && inView && pageVisible;
  const move = useCallback(
    (step: number) => {
      if (pageCount < 2) return;
      setDirection(step > 0 ? 'next' : 'previous');
      setSelection((current) => ({
        page: ((current.page % pageCount) + step + pageCount) % pageCount,
        featured: 0,
      }));
    },
    [pageCount],
  );

  useEffect(() => {
    const screen = window.matchMedia('(max-width: 650px)');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      setMobile(screen.matches);
      setReducedMotion(motion.matches);
    };
    update();
    screen.addEventListener('change', update);
    motion.addEventListener('change', update);
    return () => {
      screen.removeEventListener('change', update);
      motion.removeEventListener('change', update);
    };
  }, []);

  useEffect(() => {
    const element = section.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.2,
    });
    const updateVisibility = () => setPageVisible(!document.hidden);
    observer.observe(element);
    updateVisibility();
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, [reviews.length]);

  useEffect(() => {
    if (!rotating || reviews.length < 2) return;
    const timer = window.setTimeout(() => move(1), ROTATION_INTERVAL);
    return () => window.clearTimeout(timer);
  }, [rotating, reviews.length, selection.page, move]);

  if (!reviews.length) return null;

  const page = selection.page % pageCount;
  // Keep the last group full: five reviews are shown as 1–3, then 3–5.
  const start = Math.min(page * perPage, Math.max(0, reviews.length - perPage));
  const group = reviews.slice(start, start + perPage);
  const active = start + Math.min(selection.featured, group.length - 1);
  const review = reviews[active];
  const sample = review.id.startsWith('sample-testimonial-');
  const previews = group.map((_, index) => start + index).filter((index) => index !== active);

  return (
    <section
      className={styles.section}
      id="testimonials"
      aria-labelledby="testimonials-heading"
      ref={section}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={(event) => setFocused(event.target.matches(':focus-visible'))}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      <div className={`container ${styles.container}`}>
        <div className={styles.heading}>
          <h2 className="display" id="testimonials-heading">
            Good drives. <em>Great stories.</em>
          </h2>
        </div>

        <div className={styles.layout} data-single={reviews.length === 1}>
          <div
            className={styles.featured}
            role="region"
            aria-label="Featured testimonial"
            aria-roledescription="carousel"
            aria-live={rotating ? 'off' : 'polite'}
            aria-atomic="true"
            tabIndex={pageCount > 1 ? 0 : undefined}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
              event.preventDefault();
              move(event.key === 'ArrowRight' ? 1 : -1);
            }}
            onPointerDown={(event) => {
              if (event.pointerType === 'touch')
                touch.current = { x: event.clientX, y: event.clientY };
            }}
            onPointerCancel={() => {
              touch.current = null;
            }}
            onPointerUp={(event) => {
              const start = touch.current;
              touch.current = null;
              if (!start) return;
              const dx = event.clientX - start.x;
              if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(event.clientY - start.y))
                move(dx < 0 ? 1 : -1);
            }}
          >
            <Quote className={styles.watermark} size={180} strokeWidth={0.65} aria-hidden="true" />
            <div className={`${styles.story} ${mobile ? styles[direction] : ''}`} key={review.id}>
              <div className={styles.cardTop}>
                <Stars rating={review.rating} />
              </div>
              <blockquote>
                <p>“{review.text}”</p>
              </blockquote>
              <div className={styles.person}>
                <span className={styles.avatar} aria-hidden="true">
                  {initials(review.name)}
                </span>
                <div className={styles.identity}>
                  <strong>{review.name}</strong>
                  {review.area && (
                    <span>
                      <MapPin size={12} aria-hidden="true" /> {review.area}
                    </span>
                  )}
                </div>
                {review.verified && !sample && (
                  <span className={styles.verified}>
                    <BadgeCheck size={15} aria-hidden="true" /> Staff verified
                  </span>
                )}
              </div>
              {review.carName && (
                <div className={styles.car}>
                  <CarFront size={16} aria-hidden="true" /> {review.carName}
                </div>
              )}
            </div>
          </div>

          {previews.length > 0 && (
            <div className={styles.previews} aria-label="More stories">
              {previews.map((index) => {
                const next = reviews[index];
                return (
                  <button
                    className={styles.preview}
                    type="button"
                    key={next.id}
                    onClick={() => setSelection({ page, featured: index - start })}
                    aria-label={`Read ${next.name}’s testimonial`}
                  >
                    <div className={styles.previewTop}>
                      <Stars rating={next.rating} />
                      <ArrowRight size={18} aria-hidden="true" />
                    </div>
                    <p>“{next.text}”</p>
                    <div className={styles.previewPerson}>
                      <span className={styles.smallAvatar} aria-hidden="true">
                        {initials(next.name)}
                      </span>
                      <span>
                        <strong>{next.name}</strong>
                        <span>{next.carName || next.area}</span>
                      </span>
                      {next.id.startsWith('sample-testimonial-') && (
                        <span className={styles.sampleLabel}>Sample</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.bottom}>
          {reviews.length > 1 && (
            <div className={styles.navigation} role="group" aria-label="Testimonial navigation">
              <span
                className={styles.counter}
                aria-live={rotating ? 'off' : 'polite'}
                aria-label={
                  mobile
                    ? `Showing review ${active + 1} of ${reviews.length}`
                    : `Showing reviews ${start + 1} to ${start + group.length} of ${reviews.length}`
                }
              >
                <strong>
                  {mobile
                    ? String(active + 1).padStart(2, '0')
                    : `${String(start + 1).padStart(2, '0')}–${String(start + group.length).padStart(2, '0')}`}
                </strong>
                <span>/</span>
                {String(reviews.length).padStart(2, '0')}
              </span>
              {pageCount > 1 && (
                <>
                  <button type="button" onClick={() => move(-1)} aria-label="Previous testimonial">
                    <ArrowLeft size={19} aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => move(1)} aria-label="Next testimonial">
                    <ArrowRight size={19} aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
