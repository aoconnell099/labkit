// The star dust's sky: the glow of the band the stars gather along, drawn once
// into a texture whenever the element's size, its theme or its sky changes
// (star-dust.ts), then slid with the farthest stars every frame (skyquad).
//
// Everything is in the field's own units, 0 to 1 across and down, and wraps
// at its edges like the stars: the band is where x + y is near BAND_AT, and
// the noise repeats exactly over the field (its lattice is uPeriod cells
// across and down, a whole number each, doubled every octave), so a slide
// never shows a seam. Written four times brighter than it is drawn, so the
// faint glow keeps more of an 8-bit texture's steps.
precision highp float;

// Which sky: 1 deep blue, 2 blue, violet and pink, 3 colourful.
uniform float uSky;
// The theme's accent, as sRGB 0 to 1.
uniform vec3 uAccent;
// The noise lattice's cells across and down the field, whole numbers.
uniform vec2 uPeriod;
// Where the band crosses (x + y), as star-dust.ts gathers the stars.
uniform float uBandAt;

varying vec2 vUv;

float hash(vec2 i) {
  return fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453);
}

// Value noise whose lattice repeats every `per` cells.
float vnoise(vec2 p, vec2 per) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(mod(i, per));
  float b = hash(mod(i + vec2(1.0, 0.0), per));
  float c = hash(mod(i + vec2(0.0, 1.0), per));
  float d = hash(mod(i + vec2(1.0, 1.0), per));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Five octaves over the field `s` (0 to 1), `cells` lattice cells per period,
// repeating exactly over the field.
float fbm(vec2 s, vec2 cells, float seed) {
  float v = 0.0;
  float a = 0.5;
  vec2 per = cells;
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(s * per + seed * 17.0, per);
    per *= 2.0;
    a *= 0.5;
  }
  return v / 0.96875;
}

void main() {
  // The field's units, down from the top, as the stars are placed.
  vec2 s = vec2(vUv.x, 1.0 - vUv.y);
  // Across the band, wrapping: 0 on its line, -0.5 to 0.5.
  float d = fract(s.x + s.y - uBandAt + 0.5) - 0.5;
  float ad = abs(d);
  float haze = exp(-d * d / (2.0 * 0.13 * 0.13));
  float core = exp(-d * d / (2.0 * 0.045 * 0.045));

  // Clouds that mottle the band, and dark lanes of dust down its heart.
  float mottle = smoothstep(0.3, 0.8, fbm(s, uPeriod, 1.0));
  float ridge = 1.0 - abs(fbm(s, uPeriod * 2.0, 2.0) * 2.0 - 1.0);
  float lanes = smoothstep(0.72, 0.95, ridge) * smoothstep(0.1, 0.0, ad);
  float light = 0.05 * haze + 0.1 * core * (0.45 + 0.55 * mottle);

  vec3 col;
  if (uSky < 1.5) {
    // Deep blue: a navy haze in the theme's accent, quiet.
    vec3 navy = mix(uAccent, vec3(0.16, 0.26, 0.62), 0.55);
    col = navy * light * 1.15 * (1.0 - 0.8 * lanes);
  } else if (uSky < 2.5) {
    // Blue at the edges, violet then pink at the heart, and soft nebulae along it.
    vec3 violet = vec3(0.56, 0.36, 1.0);
    vec3 pink = vec3(1.0, 0.45, 0.76);
    vec3 tint = mix(uAccent, violet, smoothstep(0.15, 0.05, ad));
    tint = mix(tint, pink, smoothstep(0.08, 0.0, ad) * (0.45 + 0.55 * smoothstep(0.35, 0.8, fbm(s, uPeriod * 0.5, 3.0))));
    float neb = smoothstep(0.52, 0.85, fbm(s, uPeriod * 0.5, 4.0)) * haze;
    vec3 nebTint = mix(violet, pink, fbm(s, uPeriod, 5.0));
    col = tint * light * 1.15 * (1.0 - 0.75 * lanes) + nebTint * neb * 0.11;
  } else {
    // Colourful: warm gold dust at the heart, teal at the edges, brown lanes.
    vec3 warm = vec3(1.0, 0.72, 0.42);
    vec3 teal = vec3(0.25, 0.85, 0.8);
    vec3 tint = mix(teal, warm, smoothstep(0.13, 0.03, ad));
    col = tint * light * (1.0 - 0.85 * lanes);
  }
  col = min(col * 4.0, vec3(1.0));
  gl_FragColor = vec4(col, max(col.r, max(col.g, col.b)));
}
