/*
 * Builds the three hero layers from the approved mockup, so the parked hero is the mockup's own
 * pixels rather than a regenerated lookalike. Run with: node scripts/build-hero-art.cjs
 *
 *   hero-plate.webp   the scene with the UI and the car removed, shown while the car drives in
 *   hero-car.webp     the mockup's car and contact shadow as a cutout, the layer that moves
 *   hero-parked.webp  the mockup's untouched pixels around the car, faded in once it has parked
 *
 * All coordinates below are pixels in docs/design-previews/hero-reference.png (1754 x 897).
 * globals.css and hero-scene.tsx place the layers using PLATE and CAR, so keep them in sync.
 */
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const REFERENCE = path.join(ROOT, 'docs/design-previews/hero-reference.png');
// A generated, car-free reconstruction of the same scene. It only supplies what the car hides.
const FILL = path.join(ROOT, 'public/images/hero-scene-reference.webp');
const OUT = path.join(ROOT, 'public/images');

const SCALE = 2; // The mockup is small, so the layers are upsampled once here.
const PLATE = { x: 560, y: 0, w: 1194, h: 897 };
const CAR = { x: 830, y: 444, w: 746, h: 412 };
// Wider than the car: it also covers the soft shadow that trails off to either side.
const PARKED = { x: 756, y: 444, w: 908, h: 412 };
// Where FILL sits in the mockup, measured by registering its skyline against the mockup's.
const FILL_FIT = { sx: 0.7743, sy: 0.7736, tx: 633.8, ty: 42.65 };
// Behind the car the plate is rebuilt this far beyond its outline, clearing its glow and penumbra.
const CLEARANCE = 14;

// The car and the hard edge of its contact shadow, traced clockwise from the rear bumper.
const OUTLINE = [
  [857.5, 655],
  [857, 640],
  [858.7, 630],
  [862, 620],
  [864.5, 610],
  [865, 605],
  [865.5, 595],
  [867.5, 585],
  [871, 581],
  [875, 577.5],
  [882.5, 571],
  [890, 563.7],
  [899, 554.5],
  [905.5, 545],
  [912.5, 534.5],
  [918.7, 525],
  [922, 518.7],
  [923, 513.7],
  [926, 508.7],
  [933, 505],
  [945, 501],
  [955.5, 498.7],
  [962.5, 492.5],
  [972.5, 487],
  [985, 482],
  [1000, 478],
  [1020, 474],
  [1040, 471],
  [1060, 469.5],
  [1080, 468.7],
  [1095, 469.5],
  [1105, 472.5],
  [1112.5, 477],
  [1117.5, 480],
  [1150, 479.5],
  [1190, 478.7],
  [1200, 479],
  [1220, 477],
  [1240, 475.5],
  [1257.5, 475.5],
  [1270, 479],
  [1280, 485],
  [1287.5, 490.5],
  [1300, 497.5],
  [1312.5, 505],
  [1325, 513.7],
  [1337.5, 523],
  [1350, 533],
  [1362.5, 542.5],
  [1372.5, 548.7],
  [1375, 547],
  [1382.5, 545.5],
  [1391, 547],
  [1398.7, 551],
  [1403, 557.5],
  [1403.7, 565],
  [1402, 570.5],
  [1410, 572.5],
  [1425, 575],
  [1440, 577.5],
  [1455, 580.5],
  [1470, 584.5],
  [1485, 589.5],
  [1497.5, 595],
  [1506, 599.5],
  [1515, 604],
  [1522.5, 608.7],
  [1530, 615],
  [1535, 622.5],
  [1538.7, 630],
  [1542, 640],
  [1544.5, 650],
  [1548, 660],
  [1549, 680],
  [1549.5, 700],
  [1550, 720],
  [1549.5, 732.5],
  [1546, 741],
  [1540, 746],
  [1533.7, 750],
  [1532, 757],
  [1527, 767],
  [1520, 780],
  [1510, 792],
  [1500, 800],
  [1490, 812],
  [1470, 820],
  [1440, 826],
  [1400, 829],
  [1350, 826],
  [1300, 824],
  [1250, 822.5],
  [1220, 819.5],
  [1190, 816],
  [1165, 814],
  [1140, 811],
  [1100, 806],
  [1040, 799.5],
  [1000, 795],
  [940, 790.5],
  [900, 787],
  [865, 784],
  [855, 781.5],
  [862, 775],
  [878, 766],
  [876, 758],
  [872, 745],
  [870, 730],
  [869, 715],
  [866, 703],
  [859, 697],
  [857.5, 680],
];
// Lit asphalt seen under the sills and the front bumper; it belongs to the plate, not the car.
const GAPS = [
  [
    [987.5, 740],
    [1040, 745],
    [1090, 750],
    [1122.5, 755],
    [1130, 760],
    [1134, 767.5],
    [1132, 772.5],
    [1090, 772],
    [1040, 771],
    [1000, 771],
    [960, 772.5],
    [957.5, 774],
    [962.5, 762.5],
    [967.5, 750],
  ],
  [
    [1262.5, 767.5],
    [1325, 765.5],
    [1407.5, 763],
    [1412.5, 772.5],
    [1420, 785],
    [1427.5, 795],
    [1400, 792.5],
    [1350, 787],
    [1300, 782.5],
    [1247.5, 779],
    [1249, 775],
    [1261, 774],
  ],
];
// The faint ends of the cast shadow, beyond the outline. Left in the plate, they would lie on
// the empty road before the car arrives.
const SHADOW_TAILS = [
  [
    [788, 770],
    [860, 768],
    [860, 790],
    [788, 788],
  ],
  [
    [1490, 795],
    [1640, 800],
    [1640, 822],
    [1490, 822],
  ],
];
// Mockup UI that overlaps the plate: [x0, y0, x1, y1, grain]. Boxes on the asphalt keep its grain.
const UI_BOXES = [
  [560, 28, 1110, 96, false], // navigation
  [1308, 28, 1682, 98, false], // phone number and Book Now
  [560, 408, 846, 486, false], // headline, second line (before the first, which borders it)
  [560, 332, 682, 408, false], // headline, first line
  [560, 500, 694, 546, false], // description
  [560, 694, 686, 740, false], // benefits
  [1632, 788, 1732, 888, true], // WhatsApp button
];

const svgPath = (points) => `M${points.map(([x, y]) => `${x},${y}`).join('L')}Z`;

/** Rasterises SVG shapes drawn in mockup coordinates to a 0..1 mask of the given scale. */
async function mask(body, width, height, scale) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width * scale}" height="${height * scale}" ` +
    `viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#000"/>${body}</svg>`;
  const { data, info } = await sharp(Buffer.from(svg))
    .flatten({ background: '#000' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = new Float32Array(width * scale * height * scale);
  for (let i = 0; i < out.length; i++) out[i] = data[i * info.channels] / 255;
  return out;
}

async function blurMask(values, width, height, sigma) {
  const bytes = Buffer.alloc(values.length);
  for (let i = 0; i < values.length; i++) bytes[i] = Math.round(values[i] * 255);
  // sharp may hand a single-channel image back as RGB, so read by its reported channel count.
  const { data, info } = await sharp(bytes, { raw: { width, height, channels: 1 } })
    .blur(sigma)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = new Float32Array(values.length);
  for (let i = 0; i < out.length; i++) out[i] = data[i * info.channels] / 255;
  return out;
}

/**
 * Paints over a box of mockup UI with a surface interpolated from the pixels around it. A side
 * that touches the image edge has nothing beyond it, so it is interpolated from its two corners.
 */
function eraseBox(image, width, height, [x0, y0, x1, y1, grain]) {
  const at = (x, y, c) => image[(y * width + x) * 3 + c];
  // Average a few pixels outward, so one noisy pixel does not streak across the box.
  const edge = (x, y, dx, dy, c) => {
    let sum = 0;
    for (let k = 1; k <= 3; k++) sum += at(x + dx * k, y + dy * k, c);
    return sum / 3;
  };
  const hasLeft = x0 - 3 >= PLATE.x;
  const hasRight = x1 + 3 < width;
  const hasTop = y0 - 3 >= 0;
  const hasBottom = y1 + 3 < height;
  for (let c = 0; c < 3; c++) {
    const top = (x) => (hasTop ? edge(x, y0, 0, -1, c) : edge(x, y1, 0, 1, c));
    const bottom = (x) => (hasBottom ? edge(x, y1, 0, 1, c) : edge(x, y0, 0, -1, c));
    const lerp = (a, b, t) => a + (b - a) * t;
    const corner = { tl: top(x0), tr: top(x1), bl: bottom(x0), br: bottom(x1) };
    const left = (y, v) => (hasLeft ? edge(x0, y, -1, 0, c) : lerp(corner.tl, corner.bl, v));
    const right = (y, v) => (hasRight ? edge(x1, y, 1, 0, c) : lerp(corner.tr, corner.br, v));
    for (let y = y0; y <= y1; y++) {
      const v = (y - y0) / (y1 - y0);
      for (let x = x0; x <= x1; x++) {
        const u = (x - x0) / (x1 - x0);
        // Coons patch: blend the four boundary curves, then remove the doubly counted corners.
        let value =
          lerp(top(x), bottom(x), v) +
          lerp(left(y, v), right(y, v), u) -
          lerp(lerp(corner.tl, corner.tr, u), lerp(corner.bl, corner.br, u), v);
        if (grain) {
          // Borrow the asphalt's fine texture from the clean ground directly above the box.
          const sy = y - (y1 - y0) - 4;
          let local = 0;
          for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) local += at(x + i, sy + j, c);
          value += at(x, sy, c) - local / 25;
        }
        image[(y * width + x) * 3 + c] = Math.max(0, Math.min(255, value));
      }
    }
  }
}

/**
 * Fills `values` inside the mask with the smoothest surface that meets the surrounding pixels
 * (a membrane, as in Poisson image editing), using successive over-relaxation.
 */
function relax(values, inside, width, height, box) {
  const omega = 1.97;
  for (let pass = 0; pass < 2500; pass++) {
    for (let y = box.y0; y <= box.y1; y++) {
      for (let x = box.x0; x <= box.x1; x++) {
        const i = y * width + x;
        if (!inside[i]) continue;
        const mean = (values[i - 1] + values[i + 1] + values[i - width] + values[i + width]) / 4;
        values[i] += omega * (mean - values[i]);
      }
    }
  }
}

async function main() {
  const reference = await sharp(REFERENCE)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = reference.info.width;
  const H = reference.info.height;
  const W2 = W * SCALE;
  const H2 = H * SCALE;

  // 1. The mockup with its UI erased.
  const clean = Float32Array.from(reference.data);
  for (const box of UI_BOXES) eraseBox(clean, W, H, box);
  const cleanBytes = Buffer.from(Uint8Array.from(clean, (v) => Math.round(v)));
  const upscale = (bytes) =>
    sharp(bytes, { raw: { width: W, height: H, channels: 3 } })
      .resize(W2, H2, { kernel: 'cubic' })
      .raw()
      .toBuffer();
  const clean2 = await upscale(cleanBytes);

  // 2. The car-free reconstruction, laid over the mockup at both scales.
  const fillMeta = await sharp(FILL).metadata();
  const placeFill = async (scale) => {
    const width = Math.round(fillMeta.width * FILL_FIT.sx * scale);
    const height = Math.round(fillMeta.height * FILL_FIT.sy * scale);
    const left = Math.round(FILL_FIT.tx * scale);
    const top = Math.round(FILL_FIT.ty * scale);
    const tile = await sharp(FILL)
      .removeAlpha()
      .resize(width, height, { fit: 'fill', kernel: 'cubic' })
      .extract({
        left: 0,
        top: 0,
        width: Math.min(width, W * scale - left),
        height: Math.min(height, H * scale - top),
      })
      .png()
      .toBuffer();
    return sharp({
      create: { width: W * scale, height: H * scale, channels: 3, background: '#000' },
    })
      .composite([{ input: tile, left, top }])
      .removeAlpha()
      .raw()
      .toBuffer();
  };
  const fill1 = await placeFill(1);
  const fill2 = await placeFill(SCALE);

  // 3. Masks: the region to rebuild behind the car, and the car's own alpha.
  const outline = svgPath(OUTLINE);
  const rebuildShape = [OUTLINE, ...SHADOW_TAILS]
    .map(
      (points) =>
        `<path d="${svgPath(points)}" fill="#fff" stroke="#fff" stroke-width="${CLEARANCE * 2}" stroke-linejoin="round"/>`,
    )
    .join('');
  const rebuild1 = await mask(rebuildShape, W, H, 1);
  const rebuild2 = await blurMask(await mask(rebuildShape, W, H, SCALE), W2, H2, 3);
  const carShape = `<path d="${outline}${GAPS.map(svgPath).join('')}" fill="#fff" fill-rule="evenodd"/>`;
  const carHard = await mask(carShape, W, H, SCALE);
  const carCrisp = await blurMask(carHard, W2, H2, 0.8);
  const carSoft = await blurMask(carHard, W2, H2, 3.2);

  // 4. Behind the car, keep the reconstruction's detail but correct it by the smooth difference
  //    from the mockup at the region's rim, so the patch meets the mockup without a seam.
  const inside = new Uint8Array(W * H);
  const box = { x0: W, y0: H, x1: 0, y1: 0 };
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (rebuild1[y * W + x] < 0.5) continue;
      inside[y * W + x] = 1;
      box.x0 = Math.min(box.x0, x);
      box.x1 = Math.max(box.x1, x);
      box.y0 = Math.min(box.y0, y);
      box.y1 = Math.max(box.y1, y);
    }
  }
  const correction = [0, 1, 2].map((c) => {
    const values = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) values[i] = inside[i] ? 0 : clean[i * 3 + c] - fill1[i * 3 + c];
    relax(values, inside, W, H, box);
    return values;
  });
  const sample = (values, x, y) => {
    // Bilinear lookup of a mockup-scale field at an upscaled pixel centre.
    const fx = Math.max(0, Math.min(W - 1.001, (x + 0.5) / SCALE - 0.5));
    const fy = Math.max(0, Math.min(H - 1.001, (y + 0.5) / SCALE - 0.5));
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = fx - x0;
    const ty = fy - y0;
    const i = y0 * W + x0;
    return (
      values[i] * (1 - tx) * (1 - ty) +
      values[i + 1] * tx * (1 - ty) +
      values[i + W] * (1 - tx) * ty +
      values[i + W + 1] * tx * ty
    );
  };
  const empty2 = Buffer.from(clean2);
  for (let y = box.y0 * SCALE - 12; y <= box.y1 * SCALE + 12; y++) {
    for (let x = box.x0 * SCALE - 12; x <= box.x1 * SCALE + 12; x++) {
      const i = y * W2 + x;
      const amount = rebuild2[i];
      if (amount <= 0) continue;
      for (let c = 0; c < 3; c++) {
        const rebuilt = fill2[i * 3 + c] + sample(correction[c], x, y);
        empty2[i * 3 + c] = Math.max(
          0,
          Math.min(255, Math.round(clean2[i * 3 + c] * (1 - amount) + rebuilt * amount)),
        );
      }
    }
  }

  // 5. Write the layers.
  const crop = (rect) => ({
    left: rect.x * SCALE,
    top: rect.y * SCALE,
    width: rect.w * SCALE,
    height: rect.h * SCALE,
  });
  await sharp(empty2, { raw: { width: W2, height: H2, channels: 3 } })
    .extract(crop(PLATE))
    .webp({ quality: 86, effort: 6 })
    .toFile(path.join(OUT, 'hero-plate.webp'));

  const cutout = (rect, alphaAt) => {
    const rgba = Buffer.alloc(W2 * H2 * 4);
    for (let i = 0; i < W2 * H2; i++) {
      rgba[i * 4] = clean2[i * 3];
      rgba[i * 4 + 1] = clean2[i * 3 + 1];
      rgba[i * 4 + 2] = clean2[i * 3 + 2];
      rgba[i * 4 + 3] = Math.round(alphaAt(i) * 255);
    }
    return sharp(rgba, { raw: { width: W2, height: H2, channels: 4 } }).extract(crop(rect));
  };
  // The body keeps a crisp edge; from the tyres down, the shadow's edge softens into the road.
  const shadowStart = 764 * SCALE;
  const shadowFull = 790 * SCALE;
  await cutout(CAR, (i) => {
    const y = Math.floor(i / W2);
    const soften = Math.max(0, Math.min(1, (y - shadowStart) / (shadowFull - shadowStart)));
    return carCrisp[i] * (1 - soften) + carSoft[i] * soften;
  })
    .webp({ quality: 90, alphaQuality: 100, effort: 6 })
    .toFile(path.join(OUT, 'hero-car.webp'));
  // Everything the plate rebuilt, back as the mockup drew it. Outside that region the plate
  // already is the mockup, so the soft edge blends identical pixels.
  await cutout(PARKED, (i) => Math.min(1, rebuild2[i] * 1.6))
    .webp({ quality: 90, alphaQuality: 100, effort: 6 })
    .toFile(path.join(OUT, 'hero-parked.webp'));

  const pct = (value, total) => `${((value / total) * 100).toFixed(2)}%`;
  console.log('plate', PLATE.w * SCALE, 'x', PLATE.h * SCALE);
  console.log(
    'frame width',
    `${((PLATE.w / (W * 0.56)) * 100).toFixed(1)}cqw`,
    'aspect',
    `${PLATE.w} / ${PLATE.h}`,
  );
  for (const [name, rect] of [
    ['car', CAR],
    ['parked', PARKED],
  ]) {
    console.log(
      `${name} ${rect.w * SCALE} x ${rect.h * SCALE}:`,
      'left',
      pct(rect.x - PLATE.x, PLATE.w),
      'top',
      pct(rect.y - PLATE.y, PLATE.h),
      'width',
      pct(rect.w, PLATE.w),
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
