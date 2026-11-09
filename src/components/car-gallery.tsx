'use client';
import { useState } from 'react';

export default function CarGallery({ name, images }: { name: string; images: string[] }) {
  const photos = [...new Set(images.filter(Boolean))];
  const [active, setActive] = useState(0);
  const current = photos[active] ?? photos[0];
  return (
    <div className="detail-gallery">
      <div className="detail-photo">
        <img
          src={current}
          alt={
            photos.length > 1
              ? `${name}, photo ${active + 1} of ${photos.length}`
              : `${name} self-drive car`
          }
        />
      </div>
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
