# Animated hero image layers

Prepared with the built-in image_gen tool from `hyderabad-drive-light.webp`.
The original image is retained. These layers are used by `src/components/hero-scene.tsx`.

- `hero-charminar-background.png`: stationary background plate, with the SUV and its shadow removed. Hidden scenery was reconstructed by image generation.
- `hero-car-right.png`: transparent SUV layer facing right. Add a separate ground shadow during integration.

## Background prompt

Use case: precise-object-edit. Asset type: fixed background layer for an animated website hero. Input image is the edit target. Remove ONLY the entire black SUV and its dark cast shadow from this image; naturally reconstruct the pale paved road, any obscured railing and greenery beneath it. Preserve the existing Charminar building exactly in its current position, scale, architecture and orientation. Preserve existing trees, white sky, daylight, neutral warm palette, photographic realism and the original white feathered left and bottom edges. Keep original 1448 by 1086 composition and framing. The left side must remain predominantly clean white negative space, with subtle road at the bottom. No vehicles, people, text, logos or new structures. This is an empty background plate, not a redesign.

## Car prompt

Use case: background-extraction. Asset type: transparent movable car layer for a website hero animation. Input image is the edit target. Extract ONLY the same black SUV, preserving its exact vehicle identity, grille, headlights, wheels, windows, bodywork, photographic details and three-quarter camera perspective. Horizontally mirror the extracted car so the front grille and headlights point RIGHT and the rear points LEFT. The result must have true transparent alpha background with clean antialiased edges. No Charminar, trees, road, sky, white background, checkerboard pattern or text. Retain all tires and mirrors, do not crop any vehicle parts. Center the complete car in a tightly framed wide canvas with a small transparent margin, maintaining its original proportions (car body approx 1030 wide x 530 high in the reference). Preserve natural daylight and black paint reflections. Remove the old ground shadow; a shadow will be added separately in the webpage. Do not redesign the SUV.
