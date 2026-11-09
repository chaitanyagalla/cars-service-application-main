'use client';

import { useRef, useState } from 'react';
import { ImagePlus, LoaderCircle, X } from 'lucide-react';
import {
  MAX_GALLERY_PHOTOS,
  PHOTO_TYPES,
  photoFileError,
  uploadGalleryBatch,
} from '@/lib/admin-image-uploads';

export function AdminGalleryUpload({
  gallery,
  disabled,
  onChange,
  onUploadingChange,
  onSessionExpired,
}: {
  gallery: string[];
  disabled: boolean;
  onChange: (gallery: string[]) => void;
  onUploadingChange: (uploading: boolean) => void;
  onSessionExpired: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const locked = disabled || progress !== null;
  async function upload(files: File[]) {
    if (locked || inFlight.current || !files.length) return;
    setErrors([]);
    setNotice('');
    if (gallery.length + files.length > MAX_GALLERY_PHOTOS) {
      setErrors([
        `You can add ${Math.max(0, MAX_GALLERY_PHOTOS - gallery.length)} more photos. Select fewer photos or remove an existing one.`,
      ]);
      return;
    }
    const invalid = files.map(photoFileError).filter((error): error is string => Boolean(error));
    if (invalid.length) {
      setErrors(invalid);
      return;
    }
    inFlight.current = true;
    onUploadingChange(true);
    setProgress({ done: 0, total: files.length });
    try {
      const result = await uploadGalleryBatch(
        files,
        (uploaded) => onChange([...gallery, ...uploaded]),
        (done) => setProgress({ done, total: files.length }),
      );
      setErrors(result.errors);
      if (result.sessionExpired) onSessionExpired();
      if (result.urls.length)
        setNotice(
          `${result.urls.length} photo${result.urls.length === 1 ? '' : 's'} ready. Save Changes to update the car.${result.errors.length ? ' Successful uploads have been kept.' : ''}`,
        );
    } finally {
      inFlight.current = false;
      setProgress(null);
      onUploadingChange(false);
    }
  }
  return (
    <section className="admin-gallery-editor" aria-label="Gallery photos">
      <div className="admin-photo-label">
        <h4>Gallery photos</h4>
        <span>
          {gallery.length} / {MAX_GALLERY_PHOTOS}
        </span>
      </div>
      <p className="note">Add interior, exterior and detail photos. Select several at once.</p>
      <div className="admin-gallery-previews">
        {gallery.map((url, index) => (
          <div className="admin-gallery-preview" key={`${url}:${index}`}>
            <img src={url} alt={`Gallery photo ${index + 1}`} />
            <span className="admin-photo-number">{index + 1}</span>
            <button
              type="button"
              className="admin-photo-remove"
              disabled={locked}
              aria-label={`Remove gallery photo ${index + 1}`}
              onClick={() => {
                onChange(gallery.filter((_, position) => position !== index));
                setErrors([]);
                setNotice('Photo removed from the gallery. Save Changes to update the car.');
              }}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
        {gallery.length < MAX_GALLERY_PHOTOS && (
          <button
            type="button"
            className="admin-gallery-add"
            disabled={locked}
            onClick={() => input.current?.click()}
          >
            <ImagePlus size={25} aria-hidden="true" />
            <span>{gallery.length ? 'Add more photos' : 'Add gallery photos'}</span>
            <small>Select multiple photos</small>
          </button>
        )}
      </div>
      <input
        ref={input}
        className="admin-photo-file-input"
        type="file"
        multiple
        accept={PHOTO_TYPES.join(',')}
        disabled={locked || gallery.length >= MAX_GALLERY_PHOTOS}
        aria-label="Select gallery photos"
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files || []);
          event.currentTarget.value = '';
          void upload(files);
        }}
      />
      <p className="admin-photo-help">
        JPG, PNG or WebP · Up to 3 MB each · Up to {MAX_GALLERY_PHOTOS} photos
      </p>
      {progress && (
        <div className="admin-photo-progress" role="status">
          <LoaderCircle className="admin-photo-spinner" size={17} aria-hidden="true" />
          <span>
            Uploading photos: {progress.done} of {progress.total} processed…
          </span>
          <progress value={progress.done} max={progress.total} aria-label="Photo upload progress" />
        </div>
      )}
      {notice && (
        <p className="admin-photo-notice" role="status">
          {notice}
        </p>
      )}
      {errors.length > 0 && (
        <div className="admin-photo-errors" role="alert">
          <strong>Some photos couldn’t be added</strong>
          <ul>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
