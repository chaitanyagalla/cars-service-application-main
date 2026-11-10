'use client';
import { SteeringLoader } from '@/components/steering-loader';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import {
  CAR_IMAGE_ASPECT,
  CAR_IMAGE_MAX_UPLOAD_BYTES,
  CAR_IMAGE_MAX_ZOOM,
  CAR_IMAGE_MIN_SHARP_WIDTH,
  cropOutputSize,
  cropRect,
  cropSize,
  initialCropView,
  normalizeCropView,
  panCropView,
  zoomCropView,
  type CropView,
  type Size,
} from '@/lib/car-image';

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Encode as WebP (JPEG on browsers without WebP encoding), staying under the upload limit. */
async function encodeCrop(canvas: HTMLCanvasElement): Promise<Blob> {
  const probe = await canvasToBlob(canvas, 'image/webp', 0.9);
  const webp = probe?.type === 'image/webp';
  let source = canvas;
  if (!webp) {
    // JPEG has no transparency; flatten onto white so cut-out PNGs don't turn black.
    source = document.createElement('canvas');
    source.width = canvas.width;
    source.height = canvas.height;
    const ctx = source.getContext('2d');
    if (!ctx) throw new Error('Your browser could not prepare the image.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, source.width, source.height);
    ctx.drawImage(canvas, 0, 0);
  }
  for (const quality of [0.9, 0.8, 0.7, 0.6]) {
    const blob =
      webp && quality === 0.9
        ? probe
        : await canvasToBlob(source, webp ? 'image/webp' : 'image/jpeg', quality);
    if (blob && blob.size <= CAR_IMAGE_MAX_UPLOAD_BYTES) return blob;
  }
  throw new Error('The cropped image is still over 3MB. Try a smaller photo.');
}

export default function ImageCropDialog({
  file,
  onCancel,
  onConfirm,
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (cropped: File) => void;
}) {
  const titleId = useId();
  const helpId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<Size | null>(null);
  const [frameWidth, setFrameWidth] = useState(0);
  const [view, setView] = useState<CropView>({ zoom: 1, x: 0, y: 0 });
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);
    setNatural(null);
    setError('');
    return () => URL.revokeObjectURL(next);
  }, [file]);

  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);

  useLayoutEffect(() => {
    const element = frame.current;
    if (!element) return;
    const measure = () => setFrameWidth(element.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Wheel zoom needs a non-passive listener so the page behind the dialog doesn't scroll.
  useEffect(() => {
    const element = frame.current;
    if (!element || !natural || !frameWidth) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const box = element.getBoundingClientRect();
      const anchor = {
        x: event.clientX - box.left - box.width / 2,
        y: event.clientY - box.top - box.height / 2,
      };
      setView((v) =>
        zoomCropView(v, natural, frameWidth, v.zoom * Math.exp(-event.deltaY * 0.0015), anchor),
      );
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [natural, frameWidth]);

  const ready = natural !== null && frameWidth > 0;
  const current = natural ? normalizeCropView(view, natural) : view;
  const rect = natural ? cropRect(current, natural) : null;
  const scale = natural && frameWidth ? frameWidth / cropSize(natural, current.zoom).width : 0;
  const lowResolution = rect !== null && rect.width < CAR_IMAGE_MIN_SHARP_WIDTH;

  function zoomTo(zoom: number) {
    if (natural && frameWidth) setView((v) => zoomCropView(v, natural, frameWidth, zoom));
  }
  function pan(dx: number, dy: number) {
    if (natural && frameWidth) setView((v) => panCropView(v, natural, frameWidth, dx, dy));
  }
  function pinchDistance() {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  async function confirm() {
    const img = image.current;
    if (!img || !natural || !rect || exporting) return;
    setExporting(true);
    setError('');
    try {
      const out = cropOutputSize(rect);
      const canvas = document.createElement('canvas');
      canvas.width = out.width;
      canvas.height = out.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Your browser could not prepare the image.');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height, 0, 0, out.width, out.height);
      const blob = await encodeCrop(canvas);
      const base = file.name.replace(/\.[^.]*$/, '').replace(/[^\w-]+/g, '-') || 'car';
      const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
      onConfirm(new File([blob], `${base}-card.${ext}`, { type: blob.type }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not crop this image.');
      setExporting(false);
    }
  }

  return createPortal(
    <dialog
      ref={dialog}
      className="crop-dialog"
      aria-labelledby={titleId}
      aria-describedby={helpId}
      onCancel={(event) => {
        event.preventDefault();
        if (!exporting) onCancel();
      }}
    >
      <h2 id={titleId}>Crop car photo</h2>
      <p className="note" id={helpId}>
        Drag to reposition. Zoom with the slider, mouse wheel or pinch. This frame is the exact
        shape of the car card image, so everything inside it fills the card edge to edge.
      </p>
      <div
        ref={frame}
        className="crop-frame"
        style={{ aspectRatio: String(CAR_IMAGE_ASPECT) }}
        tabIndex={0}
        role="group"
        aria-roledescription="crop area"
        aria-label="Photo crop area. Arrow keys move the photo; plus and minus zoom; 0 resets."
        onPointerDown={(event) => {
          if (!ready || (event.pointerType === 'mouse' && event.button !== 0)) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          pinch.current =
            pointers.current.size === 2 ? { distance: pinchDistance(), zoom: current.zoom } : null;
        }}
        onPointerMove={(event) => {
          const previous = pointers.current.get(event.pointerId);
          if (!previous || !natural) return;
          pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          if (pointers.current.size === 1) {
            pan(event.clientX - previous.x, event.clientY - previous.y);
          } else if (pointers.current.size === 2 && pinch.current) {
            const start = pinch.current;
            const distance = pinchDistance();
            if (start.distance > 0) zoomTo((start.zoom * distance) / start.distance);
          }
        }}
        onPointerUp={(event) => {
          pointers.current.delete(event.pointerId);
          pinch.current = null;
        }}
        onPointerCancel={(event) => {
          pointers.current.delete(event.pointerId);
          pinch.current = null;
        }}
        onKeyDown={(event) => {
          if (!natural || !frameWidth) return;
          const step = event.shiftKey ? 40 : 10;
          const moves: Record<string, [number, number]> = {
            ArrowLeft: [step, 0],
            ArrowRight: [-step, 0],
            ArrowUp: [0, step],
            ArrowDown: [0, -step],
          };
          if (moves[event.key]) pan(...moves[event.key]);
          else if (event.key === '+' || event.key === '=') zoomTo(current.zoom + 0.1);
          else if (event.key === '-' || event.key === '_') zoomTo(current.zoom - 0.1);
          else if (event.key === '0') setView(initialCropView(natural));
          else return;
          event.preventDefault();
        }}
      >
        {url && (
          <img
            ref={image}
            src={url}
            alt=""
            draggable={false}
            onLoad={(event) => {
              const img = event.currentTarget;
              const size = { width: img.naturalWidth, height: img.naturalHeight };
              setNatural(size);
              setView(initialCropView(size));
            }}
            onError={() => setError('This file could not be opened as an image.')}
            style={
              natural && scale
                ? {
                    width: natural.width * scale,
                    height: natural.height * scale,
                    transform: `translate(${frameWidth / 2 - current.x * scale}px, ${
                      frameWidth / CAR_IMAGE_ASPECT / 2 - current.y * scale
                    }px)`,
                  }
                : { visibility: 'hidden' }
            }
          />
        )}
        <span className="crop-guides" aria-hidden="true" />
        {!ready && !error && (
          <span className="crop-loading">
            <SteeringLoader label="Loading photo…" />
          </span>
        )}
      </div>
      <div className="crop-controls">
        <button
          type="button"
          className="small-btn"
          aria-label="Zoom out"
          disabled={!ready || current.zoom <= 1}
          onClick={() => zoomTo(current.zoom - 0.25)}
        >
          <Minus size={16} aria-hidden="true" />
        </button>
        <input
          type="range"
          aria-label="Zoom"
          min={1}
          max={CAR_IMAGE_MAX_ZOOM}
          step={0.01}
          value={current.zoom}
          disabled={!ready}
          onChange={(event) => zoomTo(Number(event.target.value))}
        />
        <button
          type="button"
          className="small-btn"
          aria-label="Zoom in"
          disabled={!ready || current.zoom >= CAR_IMAGE_MAX_ZOOM}
          onClick={() => zoomTo(current.zoom + 0.25)}
        >
          <Plus size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="small-btn crop-reset"
          disabled={!ready}
          onClick={() => natural && setView(initialCropView(natural))}
        >
          <RotateCcw size={14} aria-hidden="true" /> Reset
        </button>
      </div>
      {rect && lowResolution && (
        <p className="note crop-warning">
          This crop is only {Math.round(rect.width)}px wide, so it may look soft on large screens.
          Zoom out or use a larger photo for the sharpest result.
        </p>
      )}
      {error && (
        <p role="alert" className="crop-error">
          {error}
        </p>
      )}
      <div className="app-confirm-actions">
        <button type="button" className="btn btn-outline" disabled={exporting} onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-gold"
          disabled={!ready || exporting}
          onClick={() => void confirm()}
        >
          {exporting ? <SteeringLoader label="Preparing…" /> : 'Crop & upload'}
        </button>
      </div>
    </dialog>,
    document.body,
  );
}
