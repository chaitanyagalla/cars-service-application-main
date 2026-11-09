import { describe, expect, it } from 'vitest';
import {
  CAR_IMAGE_ASPECT,
  CAR_IMAGE_MAX_WIDTH,
  CAR_IMAGE_MAX_ZOOM,
  cropOutputSize,
  cropRect,
  initialCropView,
  panCropView,
  zoomCropView,
  type Rect,
  type Size,
} from '@/lib/car-image';

const wide: Size = { width: 4000, height: 1500 };
const tall: Size = { width: 1080, height: 1920 };
const photo: Size = { width: 3000, height: 2000 };

function expectInside(rect: Rect, image: Size) {
  expect(rect.x).toBeGreaterThanOrEqual(-1e-9);
  expect(rect.y).toBeGreaterThanOrEqual(-1e-9);
  expect(rect.x + rect.width).toBeLessThanOrEqual(image.width + 1e-9);
  expect(rect.y + rect.height).toBeLessThanOrEqual(image.height + 1e-9);
}

describe('car image cropping', () => {
  it.each([wide, tall, photo])('starts with the largest centred card-shaped crop (%o)', (image) => {
    const rect = cropRect(initialCropView(image), image);
    expect(rect.width / rect.height).toBeCloseTo(CAR_IMAGE_ASPECT, 9);
    expect(rect.width === image.width || rect.height === image.height).toBe(true);
    expect(rect.x + rect.width / 2).toBeCloseTo(image.width / 2);
    expect(rect.y + rect.height / 2).toBeCloseTo(image.height / 2);
    expectInside(rect, image);
  });

  it('never pans past the photo edge, so the card frame is always filled', () => {
    let view = zoomCropView(initialCropView(photo), photo, 600, 2);
    view = panCropView(view, photo, 600, 100_000, -100_000);
    const rect = cropRect(view, photo);
    expect(rect.x).toBeCloseTo(0);
    expect(rect.y + rect.height).toBeCloseTo(photo.height);
    expectInside(rect, photo);
  });

  it('clamps zoom between 1 and the maximum', () => {
    const start = initialCropView(photo);
    expect(zoomCropView(start, photo, 600, 0.2).zoom).toBe(1);
    expect(zoomCropView(start, photo, 600, 99).zoom).toBe(CAR_IMAGE_MAX_ZOOM);
  });

  it('keeps the point under the cursor fixed while zooming', () => {
    const frameWidth = 640;
    const start = initialCropView(photo);
    const anchor = { x: 120, y: -60 };
    const before = cropRect(start, photo);
    const pointX = before.x + (frameWidth / 2 + anchor.x) * (before.width / frameWidth);
    const after = cropRect(zoomCropView(start, photo, frameWidth, 1.5, anchor), photo);
    expect(after.x + (frameWidth / 2 + anchor.x) * (after.width / frameWidth)).toBeCloseTo(pointX);
  });

  it('exports at most the card width and never changes the ratio', () => {
    expect(cropOutputSize({ width: 3000, height: 1687.5 })).toEqual({
      width: CAR_IMAGE_MAX_WIDTH,
      height: Math.round(CAR_IMAGE_MAX_WIDTH / CAR_IMAGE_ASPECT),
    });
    expect(cropOutputSize({ width: 800, height: 450 })).toEqual({ width: 800, height: 450 });
  });
});
