// The star dust's sky: the glow of the band the stars gather along, drawn once
// into a texture whenever the element's size, its theme or its sky changes
// (star-dust.ts), then slid with the farthest stars every frame (skyquad).
//
// Everything is in the field's own units, 0 to 1 across and down, and wraps
// at its edges like the stars: the band is where x + y is near BAND_AT, and
// the noise repeats exactly over the field (its lattice is uPeriod cells
// across and down, a whole number each, doubled every octave), so a slide
// never shows a seam. Written twice as bright as it is drawn, so the faint
// glow keeps more of an 8-bit texture's steps.
//
// Since 2026-10-20 (the owner: "a little more vibrant, closer to the reference
// images, including the band") each sky has a colour of its own across the
// whole field, not black, and its band is brighter and wider.
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
  float haze = exp(-d * d / (2.0 * 0.16 * 0.16));
  float core = exp(-d * d / (2.0 * 0.05 * 0.05));

  // Clouds that mottle the band, and dark lanes of dust down its heart.
  float mottle = smoothstep(0.3, 0.8, fbm(s, uPeriod, 1.0));
  float ridge = 1.0 - abs(fbm(s, uPeriod * 2.0, 2.0) * 2.0 - 1.0);
  float lanes = smoothstep(0.72, 0.95, ridge) * smoothstep(0.1, 0.0, ad);
  // Broad, slow patches across the whole field: the sky is never one flat colour.
  // Half the lattice, kept to whole cells so it still repeats exactly over the field.
  vec2 coarse = max(vec2(1.0), floor(uPeriod * 0.5));
  float broad = fbm(s, coarse, 6.0);
  float light = 0.1 * haze + 0.2 * core * (0.4 + 0.6 * mottle);

  vec3 col;
  if (uSky < 1.5) {
    // Deep blue: a navy night all over, and a soft pale-blue band with dark lanes in it.
    vec3 night = vec3(0.02, 0.04, 0.12) * (0.75 + 0.5 * broad);
    vec3 band = mix(uAccent, vec3(0.3, 0.45, 0.9), 0.6);
    // Its heart catches a little pale light where the clouds gather.
    col = night + band * light * (1.0 - 0.75 * lanes) + vec3(0.6, 0.7, 1.0) * core * mottle * 0.05;
  } else if (uSky < 2.5) {
    // Blue, violet and pink: deep blue drifting to purple, the band blue at its edges,
    // violet then pink at its heart, and clouds of cyan and magenta along it.
    vec3 night = mix(vec3(0.025, 0.04, 0.14), vec3(0.08, 0.03, 0.15), smoothstep(0.35, 0.7, broad));
    vec3 blue = vec3(0.32, 0.5, 1.0);
    vec3 violet = vec3(0.62, 0.42, 1.0);
    vec3 pink = vec3(1.0, 0.45, 0.78);
    vec3 tint = mix(blue, violet, smoothstep(0.16, 0.04, ad));
    tint = mix(tint, pink, smoothstep(0.09, 0.0, ad) * (0.4 + 0.6 * smoothstep(0.35, 0.8, fbm(s, coarse, 3.0))));
    float neb = smoothstep(0.45, 0.85, fbm(s, coarse, 4.0)) * (0.35 + haze);
    vec3 nebTint = mix(vec3(0.25, 0.7, 1.0), vec3(0.9, 0.3, 0.85), fbm(s, uPeriod, 5.0));
    // A bright, almost white blue down its heart where the clouds gather, as in the photographs.
    col = night + tint * light * 1.1 * (1.0 - 0.7 * lanes) + nebTint * neb * 0.09
        + vec3(0.72, 0.78, 1.0) * core * mottle * 0.13 * (1.0 - 0.6 * lanes);
  } else {
    // Colourful: a dark blue night with teal in it, the band warm peach at its heart and
    // teal at its edges, touched with violet, and brown lanes of dust down it.
    vec3 night = mix(vec3(0.02, 0.035, 0.085), vec3(0.02, 0.07, 0.08), smoothstep(0.4, 0.75, broad));
    vec3 warm = vec3(1.0, 0.66, 0.42);
    vec3 teal = vec3(0.25, 0.8, 0.82);
    vec3 tint = mix(teal, warm, smoothstep(0.14, 0.03, ad));
    tint = mix(tint, vec3(0.72, 0.4, 0.95), smoothstep(0.6, 0.85, fbm(s, coarse, 7.0)) * 0.5);
    col = night + tint * light * 1.1 * (1.0 - 0.8 * lanes);
  }
  col = min(col * 2.0, vec3(1.0));
  gl_FragColor = vec4(col, max(col.r, max(col.g, col.b)));
}
