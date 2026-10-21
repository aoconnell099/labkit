// The colourful sky's dust, drawn once into a texture of its own beside the sky's
// (sky.ts): streams of glittering dust in many colours, radiating from one place and
// curving outward as they go, with dark sky between them and a soft glow under the
// glitter, as in the owner's photograph of colourful dust (2026-10-20: the strands
// before "are kind of looking like the tendrils, when in the reference image its much
// more random and swirled together"). It costs a frame nothing but the texture read
// skyquad makes.
//
// Where they radiate from (uOrigin):
// - the band (0): its middle, the field's centre, as star-dust.ts lays it, to both
//   sides of it. The texture slides with the sky, as the band does, and the dust fades
//   out before the field's edges, so it never seams.
// - below (1): just under the bottom's middle, upward. skyquad draws this one where it
//   is on the screen, unslid, as the strands from below always were.
//
// Its colour, baked in once so a frame only reads it: from the palette (uPalette, the
// colours given, in turn), mostly one colour along a stream and turning slowly, times
// how much dust there is (streams, clumps along them, a soft glow, and glitter) and how
// far inside its fan it is.
precision highp float;

// The noise lattice's cells across and down the field, whole numbers: in proportion to
// the element's sides, so they also say its shape.
uniform vec2 uPeriod;
// 1 when the band runs from top left to bottom right (x mirrored), else 0.
uniform float uFlip;
// Where the dust radiates from: 0 the band's middle, 1 below the screen.
uniform float uOrigin;
// The texture's size, in texels.
uniform vec2 uTexels;
// The dust's colours, as sRGB 0 to 1, in turn.
uniform vec3 uPalette[9];

varying vec2 vUv;

// #include noise

// A colour from the palette, `x` 0 to 1 along it: mostly one colour or the next, turning
// quickly between them, so they stay vivid where they fold together rather than mixing grey.
vec3 palette(float x) {
  float p = clamp(x, 0.0, 1.0) * 8.0;
  float i0 = floor(p);
  float f = smoothstep(0.3, 0.7, p - i0);
  vec3 c = vec3(0.0);
  for (int i = 0; i < 9; i++) {
    float fi = float(i);
    c += uPalette[i] * ((fi == i0 ? 1.0 - f : 0.0) + (fi == i0 + 1.0 ? f : 0.0));
  }
  return c;
}

// fbm that never repeats within the dust's reach: its lattice in `p`'s own units.
float free(vec2 p, float seed) {
  return fbm(p / 64.0, vec2(64.0), seed);
}

void main() {
  vec2 s = vec2(vUv.x, 1.0 - vUv.y);
  // In the element's own proportions, the long side 1, from where the dust radiates.
  vec2 shape = uPeriod / max(uPeriod.x, uPeriod.y);
  bool below = uOrigin > 0.5;
  vec2 a = (s - (below ? vec2(0.5, 1.04) : vec2(0.5))) * shape;
  // Out: up from below; across the band from its middle, either side alike.
  vec2 along = below ? vec2(1.0, 0.0) : normalize(vec2(uFlip > 0.5 ? 1.0 : -1.0, 1.0) * shape);
  vec2 outward = below ? vec2(0.0, -1.0) : vec2(-along.y, along.x);
  float u = dot(a, outward), v = dot(a, along);
  float r = length(a) + 1e-4;
  // The angle from straight out, folded so the band's two sides match.
  float ang = atan(v, below ? u : abs(u));
  // Each stream's own line: it curves hard outward the further it goes, twists round near its
  // source, and wavers. The band's two sides have streams of their own (the seam between
  // them, along the band, is outside the fan).
  float side = !below && u < 0.0 ? 9.7 : 0.0;
  float twist = 1.1 * exp(-r * 7.0);
  float stream = ang / (1.0 + 2.4 * r) + twist + 0.3 * (free(vec2(ang * 1.5, r * 2.5), 70.0) - 0.5) + side;

  // Broad feathers of dust with dark between, clumps along them, and a soft glow under them.
  float streaks = smoothstep(0.45, 0.75, free(vec2(stream * 4.5, r * 1.6), 71.0));
  float wisps = pow(1.0 - abs(free(vec2(stream * 9.0, r * 2.0), 75.0) * 2.0 - 1.0), 4.0);
  float clumps = smoothstep(0.3, 0.8, free(vec2(stream * 6.0, r * 7.0), 72.0));
  float glow = smoothstep(0.35, 0.8, free(vec2(stream * 2.5, r * 1.3), 73.0));
  // Glitter, the most of it: texels that catch the light, thick where the dust is.
  vec2 per = floor(uTexels);
  float h = hash(mod(floor(s * uTexels), per) + 3.7);
  float body = streaks * (0.4 + 0.6 * clumps) + 0.5 * wisps * streaks;
  float glint = step(1.0 - (0.16 * body + 0.035 * glow), h) * (0.45 + 0.55 * fract(h * 37.0));
  float dust = 0.32 * body + 0.2 * glow + glint;
  // A stream keeps mostly one colour, turning slowly along it.
  float hue = smoothstep(0.25, 0.75, free(vec2(stream * 1.8, r * 0.8), 74.0));

  // The fan: out to about three quarters of the long side, within 70 degrees or so of
  // straight out, and none right at its source.
  float fan = smoothstep(0.78, 0.12, r) * smoothstep(1.35, 0.85, abs(ang)) * smoothstep(0.0, 0.05, r);
  if (!below) {
    // Gone at the field's edges, so it matches across the wrap as the texture slides.
    fan *= smoothstep(0.0, 0.3, sin(3.14159265 * s.x)) * smoothstep(0.0, 0.3, sin(3.14159265 * s.y));
  }
  gl_FragColor = vec4(palette(hue) * clamp(dust, 0.0, 1.0) * fan, 1.0);
}
