# Pip's Dock: art contract

Every art file must follow this exactly, so the pieces line up when assembled. Scene coordinates are CSS px on a
1920x1080 canvas (the TV shows it at 4K). Origin top-left.

## Look
- "Painterly realism": layered flat-shaded shapes (Firewatch / storybook posters / old Florida travel posters), soft
  atmospheric haze, a warm-vs-cool light split. No black outlines; edges are defined by tone. 2-4 tones per object
  plus one highlight.
- Calm and cosy, not loud. Characters are cute (big heads, round shapes, big dark eyes with one white catchlight),
  but drawn with the same flat shading as the world.
- Plain SVG only: path, rect, circle, ellipse, polygon, polyline, g, defs, linearGradient, radialGradient, stop,
  clipPath. `filter` (feTurbulence, feGaussianBlur) is allowed ONLY in plate.js (plates are pre-rendered on the PC).
  Sprites (everything else) must not use filter, mask, image, text, style elements, script, external references or
  animation. Use gradients with opacity for softness.
- Each file: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 W H" width="W" height="H">`, transparent
  background, nothing drawn outside the viewBox. Check every file with `node scene-proto/tools/check-svg.js <file>`.

## Phase palettes (sky top -> horizon / water / accents)
- dawn: sky #283766 -> #8E6C9F -> #F3A27C -> #FFDCA3; water #6B5F80, glitter #FFC9A0; far shore silhouette #3B3350
- day: sky #3A7FC4 -> #86C0E8 -> #D8EDF6 haze; water #2E7C9E -> #63AEC2; far shore #557F69; dock wood #8B7462 / #C4B39C
- golden: sky #4A6DA6 -> #C79CB7 (pink band) -> #F4CBA2; far shore lit #C98B56; water #45698A, glints #FFC37A
- dusk: sky #1B2347 -> #4A3E77 -> #BF6F89 horizon band; far shore #231D35; lights #FFCF7A
- night: sky #0A1330 -> #15234A, town glow #21345C at horizon; far shore #07101F; warm lights; porch light #FFC870

## Scene map (fixed; do not move these)
- Horizon / far waterline: y = 432. Far shore (barrier island, sabal palms, Australian pines): band y 396-432, hazy.
- Causeway: low bridge across x 1250-1920 sitting just on the horizon (y 418-436). Tiny warm lights only at dusk/night.
- Sun: dawn only, half-risen disc centred x 1080 on the horizon. Day: no disc (sun overhead). Golden/dusk: no disc.
  Night: no moon in the plate (the engine draws the real moon phase at x 1040-1136, y 150-246).
- Clock quadrant x > 1300, y < 260: nothing but sky, darkened 10-18% with a soft radial.
- Water: y 432 to 1080. Below y 555 keep it calm, dark and low-contrast (app rows sit there).
- Dock (side view): from the left edge to x = 660. Deck top y = 466, deck about 14 px thick, a fascia board below,
  posts down into the water (y 480-560) with broken reflections.
- Bait shed: x 0-230, y 330-470, tin roof, small porch light under the eave at about (205, 360), a sign board under
  the eave about x 40-190, y 372-400 reading DOCK (plate only).
- Mangrove prop roots and one short sabal palm on the shore at the far left, behind the shed.
- Tall mooring piling at the dock end: x 640-668, top y = 384, down into the water to about y 570.
- Gus stands on the piling top: his sprite box is 120x130 at left 594, top 256; his feet touch y 384 (box y 128).
- Pip sits on the deck edge near the dock end: his box is 190x200 at left 430, top 296. His rump sits on the deck at
  box y 170 (scene y 466); his feet dangle over the fascia to about box y 196. He faces right (three-quarter view
  toward the water and the bobber).
- Lantern on the deck left of Pip: box 40x60 at left 372, top 406 (base on the deck at y 466).
- Rod / line / bobber: box 260x150 at left 560, top 360. The rod's handle (pivot) is at box (14, 30), which is where
  Pip's paws hold it; the line hangs from the tip to the bobber floating at box (240, 145) (scene 800, 505).
- Dinghy: box 220x96 at left 900, top 466, moored by a rope that runs from its bow (box left edge, y ~30) to the
  piling; draw the rope inside the box only to x 0.
- Ripples near the bobber at scene (780-880, 498-522).
- Sleeping Pip (dusk/night): box 220x110 at left 404, top 358, lying on the deck (bottom at y 466), curled under a
  small patchwork blanket, head toward the lantern on the left.

## Characters
- Pip: a small, chubby river otter. Chocolate brown #5B3A29 (shadow #43291C), cream chin and chest #EAD5B6, round
  small ears, big dark eyes #1B120D with one white catchlight, dark nose #2A1A12, lighter whisker pads, short whiskers.
  Webbed paws. A tiny faded-yellow bucket hat #D9B65A with a band #B08A3A: his signature.
- Gus: a brown pelican, stoic and deadpan. Grey-brown body #7B746B (shadow #5E5850), white head and neck with a
  pale-yellow crown, dark chestnut stripe down the back of the neck, long pale hooked bill with a grey pouch, pale eye,
  big flat dark feet gripping the piling top.
