'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './car-gallery.module.css';
import { LoadingCarImage } from './loading-car-image';

export default function CarGallery({ name, images }: { name: string; images: string[] }) {
  const photos = [...new Set(images.filter(Boolean))];
  const [active, setActive] = useState(0);
  const current = photos[active] ?? photos[0];
  return (
    <div className="detail-gallery">
      <div className="detail-photo">
        <LoadingCarImage
          src={current}
          alt={
            photos.length > 1
              ? `${name}, photo ${active + 1} of ${photos.length}`
              : `${name} self-drive car`
          }
        />
      </div>
      {photos.length > 1 && (
        <div className={`${styles.controls} detail-gallery-controls`}>
          <button
            type="button"
            aria-label="Previous car photo"
            onClick={() => setActive((active - 1 + photos.length) % photos.length)}
          >
            <ChevronLeft size={18} aria-hidden="true" />
            Previous
          </button>
          <span role="status">
            Photo {Math.min(active + 1, photos.length)} of {photos.length}
          </span>
          <button
            type="button"
            aria-label="Next car photo"
            onClick={() => setActive((active + 1) % photos.length)}
          >
            Next
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      )}
      {photos.length > 1 && (
        <div className="detail-thumbs" role="group" aria-label={`${name} photos`}>
          {photos.map((url, index) => (
            <button
              type="button"
              key={url}
              aria-label={`Show photo ${index + 1} of ${photos.length}`}
              aria-pressed={index === active}
              onClick={() => setActive(index)}
            >
              <img src={url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
