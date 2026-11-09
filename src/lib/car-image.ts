/**
 * Every car photo frame on the site (catalog cards, home carousel, detail page) uses this
 * ratio, and the admin cropper produces images at exactly this ratio so they fill the frame
 * with no borders and no surprise cropping. Keep in sync with `--car-photo-ratio` in
 * globals.css.
 */
export const CAR_IMAGE_ASPECT = 16 / 9;
/** Output width for cropped uploads: sharp on 2x screens at the largest card size. */
export const CAR_IMAGE_MAX_WIDTH = 1600;
/** Crops narrower than this (in source pixels) may look soft on large screens. */
export const CAR_IMAGE_MIN_SHARP_WIDTH = 960;
export const CAR_IMAGE_MAX_ZOOM = 4;
/** Matches the limit enforced by /api/admin/uploads. */
export const CAR_IMAGE_MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

export type Size = { width: number; height: number };
export type Rect = Size & { x: number; y: number };
/** zoom: 1 = largest possible crop. x/y: crop centre in natural image pixels. */
export type CropView = { zoom: number; x: number; y: number };

const clamp = (value: number, min: number, max: number) =>
  min > max ? (min + max) / 2 : Math.min(max, Math.max(min, value));

export function initialCropView(image: Size): CropView {
  return { zoom: 1, x: image.width / 2, y: image.height / 2 };
}

/** Size of the crop (in natural image pixels) at a zoom level; always CAR_IMAGE_ASPECT. */
export function cropSize(image: Size, zoom: number): Size {
  const width = Math.min(image.width, image.height * CAR_IMAGE_ASPECT) / zoom;
  return { width, height: width / CAR_IMAGE_ASPECT };
}

/** Clamp zoom and keep the crop inside the image so the frame is always fully covered. */
export function normalizeCropView(view: CropView, image: Size): CropView {
  const zoom = clamp(view.zoom, 1, CAR_IMAGE_MAX_ZOOM);
  const crop = cropSize(image, zoom);
  return {
    zoom,
    x: clamp(view.x, crop.width / 2, image.width - crop.width / 2),
    y: clamp(view.y, crop.height / 2, image.height - crop.height / 2),
  };
}

/** Move the photo by a drag of (dx, dy) screen pixels inside a frame `frameWidth` wide. */
export function panCropView(
  view: CropView,
  image: Size,
  frameWidth: number,
  dx: number,
  dy: number,
): CropView {
  const scale = frameWidth / cropSize(image, view.zoom).width;
  return normalizeCropView({ ...view, x: view.x - dx / scale, y: view.y - dy / scale }, image);
}

/**
 * Zoom while keeping the image point under `anchor` fixed on screen. `anchor` is the offset
 * in screen pixels from the frame centre (omit to zoom around the centre).
 */
export function zoomCropView(
  view: CropView,
  image: Size,
  frameWidth: number,
  zoom: number,
  anchor = { x: 0, y: 0 },
): CropView {
  const from = normalizeCropView(view, image);
  const to = clamp(zoom, 1, CAR_IMAGE_MAX_ZOOM);
  const before = frameWidth / cropSize(image, from.zoom).width;
  const after = frameWidth / cropSize(image, to).width;
  const pointX = from.x + anchor.x / before;
  const pointY = from.y + anchor.y / before;
  return normalizeCropView(
    { zoom: to, x: pointX - anchor.x / after, y: pointY - anchor.y / after },
    image,
  );
}

/** The part of the source image (natural pixels) that the frame shows. */
export function cropRect(view: CropView, image: Size): Rect {
  const v = normalizeCropView(view, image);
  const crop = cropSize(image, v.zoom);
  return { x: v.x - crop.width / 2, y: v.y - crop.height / 2, ...crop };
}

/** Pixel size of the exported image; never upscales past the source detail. */
export function cropOutputSize(rect: Size): Size {
  const width = Math.max(16, Math.min(CAR_IMAGE_MAX_WIDTH, Math.round(rect.width)));
  return { width, height: Math.round(width / CAR_IMAGE_ASPECT) };
}
