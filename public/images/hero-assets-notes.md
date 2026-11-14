# Animated hero image layers

## Current artwork: cut from the approved mockup

The hero is built from the pixels of the approved mockup itself
(`docs/design-previews/hero-reference.png`, 1754 × 897), so the parked car, its
lighting, the asphalt and the skyline are the mockup's, not a regenerated
lookalike. `node scripts/build-hero-art.cjs` produces all three layers and
prints the placement numbers used in `globals.css`:

- `hero-plate.webp` (2388 × 1794): the scene with the mockup's UI and the car
  removed. It is shown while the car drives in.
- `hero-car.webp` (1492 × 824): the mockup's car and the hard part of its
  contact shadow as a cutout. This is the layer that moves.
- `hero-parked.webp` (1816 × 824): the mockup's untouched pixels around the
  car. It fades in over the car once it has parked, so the resting hero is the
  mockup exactly: the soft shadow settles and the road beside the car matches.

How the layers are made:

- The mockup is upsampled 2× (it is only 1754 px wide), so the art is as sharp
  as the mockup allows and no sharper. A larger mockup export would improve it.
- The mockup's navigation, headline, description, benefits and WhatsApp button
  are painted out with a surface interpolated from the surrounding pixels.
- The car's outline was traced by hand on the mockup; it is in the script.
- What the car hides comes from `hero-scene-reference.webp`, the generated
  car-free reconstruction described below. It was registered against the
  mockup's skyline and is blended in without a seam. Nothing else from it is
  visible, and none of it is visible once the car has parked.

Placement: the frame has the plate's proportions and sits flush with the hero's
right and bottom edges, as in the mockup. The hero's background eases from
`--bg` to the mockup's slightly deeper navy (`#0b1628`) behind the artwork so
the plate's faded edge does not show. The drive-in animation, reduced-motion
handling, image-error fallback and no-JavaScript fallback are unchanged; the
intro now waits for three image layers.

## Earlier generated reconstruction

Before the layers above, the hero used two assets prepared with the built-in
image_gen tool from the same mockup. They were close but not identical: the car
lost its copper rim light and the asphalt its lit texture. `hero-car-reference.webp`
is no longer rendered; `hero-scene-reference.webp` is now only an input to the
build script.

- `hero-car-reference.webp`: transparent SUV, 1774 × 887, lossless WebP.
- `hero-scene-reference.webp`: skyline and dry asphalt plate, 1448 × 1086,
  lossless WebP.

### Car preparation prompt

Use case: background-extraction. The input is the APPROVED reference, not inspiration. EXTRACT THE EXISTING CAR EXACTLY AS IT APPEARS in this screenshot into a transparent cutout. Preserve its original black paint, subtle blue-gray highlights, fine pale champagne rim light ONLY along upper rear roof, dark subdued side panels, gray/silver wheels and headlamp brightness EXACTLY. Do NOT relight, recolor, brighten, saturate, beautify, re-render, redesign or add cinematic effects. The reference's original pixels/color balance are the goal. Do not add orange reflections across the doors or gold wheel rims. Keep original car geometry, windows, camera perspective and facing right.
Remove all sky, skyline, ground, shadow, UI, text, logo and buttons. No mirror reflection. True transparent alpha, no matte. Output canvas 1774x887, aspect2:1. Place the entire extracted SUV in the same proportions as original, with approximately4.8% transparent left margin and2.6% transparent right margin,5% top margin,2.5% bottom margin. Retain all tires and mirrors. Strictly preserve the original reference car's lighting and restrained blue-black/silver/copper tones. This is extraction, not a new color treatment.

### Skyline and asphalt preparation prompt

Use case: precise-object-edit / background-extraction. The input screenshot is the APPROVED reference. Extract its ORIGINAL skyline and asphalt background with no new creative interpretation. Desired output is the screenshot's RIGHT 56% and BOTTOM 82%, equivalent to rectangle x=772,y=161,width=982,height=736 on a1754x897 original, scaled cleanly to1448x1086,4:3. This is the EXACT framing to use.
Remove the SUV, its cast shadow, every text/UI element and the WhatsApp floating button. Reconstruct only the ground/buildings originally hidden by those removed elements. Preserve all remaining visible reference pixels and color balance as closely as possible. Preserve original restrained cool midnight navy sky, building architecture and copper window lights, subtle dry dark slate asphalt texture, and the softly lit desaturated gray-brown ground under the removed car. NO new spotlight, NO extra warm orange illumination, NO enhanced/coarser aggregate, NO glossy or wet surface, NO mirror reflection, NO blur or fog. The lit asphalt is subtle and naturally textured exactly like the reference. Do not enlarge buildings or change horizon. No car, people, icons, letters or artificial shadows. The user wants one-to-one original color/material fidelity, not a different premium-looking interpretation.

## Archived lighting treatment

The following notes document the earlier assets and experiments. They do not
describe the current hero implementation.

Prepared with the built-in image_gen tool from `hyderabad-drive-light.webp`.
The original images are retained. The current midnight-and-copper hero stacks
three layers: `hero-skyline-night.webp` (dark asphalt, always visible),
`hero-skyline-ground.webp` (the lit asphalt, CSS-masked to a soft ellipse under
the parking spot and faded in only once the car has stopped), and the animated
`hero-car-night.webp` cutout with its CSS shadow on top.

On the side-by-side layouts the skyline frame is drawn at 122% of the car's frame and
raised slightly, so the towers and horizon match the approved mockup while the car keeps
its size; `hero-skyline-ground.webp` is offset inside that frame so its pool of light stays
under the parked car. A second copy of `hero-car-night.webp` (`.hero-car-reflection`) is
mirrored into the asphalt under the car, blurred and masked to fade out a third of the way
down, so no reflection needs to be baked into any plate.

## Foreground asphalt and contact shadows

`hero-skyline-ground.webp` is a sibling revision of `hero-skyline-night.webp`,
generated with the built-in image_gen tool. It adds visible asphalt aggregate and
warm foreground illumination beneath the car, with the skyline composition retained.
It is encoded as WebP at quality 92 (1448 x 1086). The original plate is retained.
It is layered over `hero-skyline-night.webp` as `.hero-ground` in
`globals.css`: a radial mask limits it to the asphalt under the parked car so the
rest of the ground stays as dark as the sky, and it is kept at opacity 0 while the
car drives in. The plate is also blurred, so only its pool of light shows: its baked-in
aggregate read as grain next to the mockup's smooth floor. The three-part CSS shadow (soft penumbra, dense underbody band, tire
contact points) travels with the cutout and is faint during the drive; no stationary
vehicle shadow is baked into either background plate.

Generation prompt:

Use case: precise-object-edit. Input image 1 is the edit target: empty modern city skyline at blue hour. Input image 2 is a lighting/material reference only: approved car website.
Edit ONLY the asphalt ground in the LOWER THIRD of image 1. Preserve sky, skyline, buildings, horizon height, lights, trees, composition, dimensions and colors above the horizon EXACTLY. No vehicle, no text, no website UI.
The target ground is too uniformly dark and its light sits too far behind the car. Create the clearly visible, realistic coarse dark slate asphalt ground seen under the car in image 2. Stronger fine-grain asphalt aggregate, subtle surface irregularities, perspective-correct rough texture, absolutely no tile grid or road markings. Add a wide softly feathered champagne/copper pool of illumination in the FOREGROUND, centered at x=43% and y=91% of the full image, spreading from x=5% to x=90%, y=78% to the bottom. The asphalt should be visibly textured and lit around where the tires will sit, with warm gray brown highlights against cool midnight slate shadows, maintaining elegant nighttime mood. Do NOT paint a car shadow or tires: those are separate moving layers. Light must reach the bottom edge; don't fade the ground to featureless black/navy. Keep texture visible there, with more subdued brightness than the central lit area. Softly fade only the far left edge into navy. Match the premium photographic grounded surface from reference 2, not a spotlight circle, no glow fog, no wet mirror, no parking stripes, no checkerboard. Output same 1448x1086 4:3 landscape plate, without changing upper two thirds.

## Nighttime car lighting

`hero-car-night.webp` was relit with the built-in image_gen tool using the original
`hero-car-right.png` as the edit target and the approved midnight/copper mockup as
the lighting reference. The original is retained. Cool navy body reflections and
warm copper rim lighting are baked into the transparent image, so they travel
with the existing car animation. The WebP preserves alpha at quality 100, with
image quality 94. Vehicle placement and animation are unchanged.

Generation prompt:

Use case: lighting-weather / precise-object-edit.
Input image 1 is the EDIT TARGET: a transparent cutout of the website's black SUV, facing right.
Input image 2 is a LIGHTING REFERENCE ONLY: the approved midnight navy/copper website mockup, whose car has warm copper rim lighting and deep blue evening reflections.
Relight ONLY the car in input 1 to faithfully match the car lighting in input 2. Preserve exactly the same SUV identity, body shape, wheel designs, grille, windows, headlights, camera angle, facing direction, scale, framing and transparent margins of input 1. Do not substitute the reference car geometry. Output a transparent cutout, NOT a website screenshot.
Lighting: realistic nighttime automotive photography. Rich blue-black glossy paint, cool navy blue ambient reflections across hood and side body, darker blue tinted windshield and side windows instead of pale gray daylight glare. Strong but narrow warm champagne-copper light tracing the rear left roof pillar, upper rear quarter, roof rail and left edge of the roof, with subtler copper gleams around the left wheel arch and wheel rims. This warm edge is painted LIGHT ON THE METAL, not an artificial outline or glow halo. Keep the headlight shapes crisp and illuminated. Preserve detail in tires, dark grille, chrome and contours. Remove the broad flat gray daylight appearance and brighten only selected cool and warm reflections. Match the high-end cinematic depth of the car in input 2, with beautifully controlled contrast.
Critical: TRUE TRANSPARENT ALPHA outside the vehicle, no background, sky, city, road, floor, shadow, checkerboard, white matte or drop shadow. Keep a clean anti-aliased silhouette and all tires and mirrors. No text, logos added, no extra objects. Output aspect ratio 2:1, same car bounding box as input 1 with approximately 4.8% transparent space at left and 2.6% at right. Don't crop any car edges. Preserve vehicle proportions and current placement exactly; change lighting/reflections only.

## Midnight skyline background

- `hero-skyline-night.webp`: generated with the built-in image_gen tool from the
  approved midnight-and-copper mockup, then encoded as WebP at quality 88
  (1448 x 1086, approximately 125 KiB).
- This is an illustrative modern skyline, not a photograph of a named Hyderabad landmark.
- The SUV stays a separate transparent layer so its existing drive-in animation,
  reduced-motion behavior, and image-error fallback continue to work.

Generation prompt:

Use case: precise-object-edit. Create a photographic BACKGROUND PLATE ONLY for implementing the website in the attached reference. Remove ALL website text, navigation, logo, buttons, icons, badges, and REMOVE THE ENTIRE CAR and its shadow. Reconstruct empty asphalt where car was. Keep the reference's premium modern glass office skyline on the far right, warm subtle copper building lights, deep midnight navy blue-hour sky, quiet stone/asphalt forecourt. No vehicles whatsoever, no text, no logos, no historic monuments. Landscape image 4:3 aspect. Tall buildings only at far right, starting at approximately x=65%; tallest tower top at 22% image height. Horizon at 66% height. Bottom third empty dark slate asphalt for a separate transparent SUV layer. Left 50% and upper part mostly clean dark navy atmosphere around #101B2D, fading seamlessly to flat #101B2D at far left and top. Render believable high-end automotive-advertising environment, sharp architecture, subdued contrast, warm window lights. This is a scenery asset not a website mockup. No white background. Match attached reference mood and building lighting closely.

## Original layers

- `hero-charminar-background.png`: stationary background plate, with the SUV and its shadow removed. Hidden scenery was reconstructed by image generation.
- `hero-car-right.png`: transparent SUV layer facing right. Add a separate ground shadow during integration.

## Background prompt

Use case: precise-object-edit. Asset type: fixed background layer for an animated website hero. Input image is the edit target. Remove ONLY the entire black SUV and its dark cast shadow from this image; naturally reconstruct the pale paved road, any obscured railing and greenery beneath it. Preserve the existing Charminar building exactly in its current position, scale, architecture and orientation. Preserve existing trees, white sky, daylight, neutral warm palette, photographic realism and the original white feathered left and bottom edges. Keep original 1448 by 1086 composition and framing. The left side must remain predominantly clean white negative space, with subtle road at the bottom. No vehicles, people, text, logos or new structures. This is an empty background plate, not a redesign.

## Car prompt

Use case: background-extraction. Asset type: transparent movable car layer for a website hero animation. Input image is the edit target. Extract ONLY the same black SUV, preserving its exact vehicle identity, grille, headlights, wheels, windows, bodywork, photographic details and three-quarter camera perspective. Horizontally mirror the extracted car so the front grille and headlights point RIGHT and the rear points LEFT. The result must have true transparent alpha background with clean antialiased edges. No Charminar, trees, road, sky, white background, checkerboard pattern or text. Retain all tires and mirrors, do not crop any vehicle parts. Center the complete car in a tightly framed wide canvas with a small transparent margin, maintaining its original proportions (car body approx 1030 wide x 530 high in the reference). Preserve natural daylight and black paint reflections. Remove the old ground shadow; a shadow will be added separately in the webpage. Do not redesign the SUV.
