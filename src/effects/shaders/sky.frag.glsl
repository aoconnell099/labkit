// The star dust's sky: the glow of the band the stars gather along, drawn once
// into a texture whenever the element's size, its theme or its sky changes
// (star-dust.ts), then slid with the farthest stars every frame (skyquad).
//
// Everything is in the field's own units, 0 to 1 across and down, and wraps
// at its edges like the stars: the band is where x + y is near uBandAt, x
// mirrored when uFlip is set (star-dust.ts lays each sky's band so), and
// the noise repeats exactly over the field (its lattice is uPeriod cells
// across and down, a whole number each, doubled every octave), so a slide
// never shows a seam. Written twice as bright as it is drawn, so the faint
// glow keeps more of an 8-bit texture's steps.
//
// Its alpha is how thick the band's stars are at each place (star.vert.glsl's
// band stars read it), not the glow's cover: skyquad reads only the colour.
//
// Since 2026-10-20 each sky follows two or more of the owner's photographs,
// kept a little dimmer so it never overpowers what is in front of it, its band
// wide and ragged, wandering, swelling and torn, with knots and dark rifts:
// - deep blue: a royal blue night and a soft pale-blue band with dark lanes;
// - violet: clouds of cyan, violet and magenta across the whole sky, cyan to
//   one side and magenta to the other, and through the middle a bright,
//   nearly white-blue band with dark lanes, violet at its edges (it turns pink
//   toward the bottom in skyquad.frag.glsl);
// - colourful: a dark night, and through the middle a warm peach band, its
//   heart mottled and cut by dark brown lanes, in a haze of teal.
precision highp float;

// Which sky: 1 deep blue, 2 blue, violet and pink, 3 colourful.
uniform float uSky;
// The theme's accent, as sRGB 0 to 1.
uniform vec3 uAccent;
// The noise lattice's cells across and down the field, whole numbers.
uniform vec2 uPeriod;
// Where the band crosses (x + y), as star-dust.ts lays the stars for this sky.
uniform float uBandAt;
// 1 when the band runs from top left to bottom right (x mirrored), else 0.
uniform float uFlip;

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
  // Half the lattice, kept to whole cells so it still repeats exactly over the field.
  vec2 coarse = max(vec2(1.0), floor(uPeriod * 0.5));
  // Broad, slow patches across the whole field: the sky is never one flat colour.
  float broad = fbm(s, coarse, 6.0);

  // Across the band, wrapping: 0 on its line, -0.5 to 0.5. It is never a clean stripe
  // (the owner, 2026-10-20: "a little bit wider and more chaotic like the reference
  // images"): its line wanders, it swells and narrows along its length, and its edges are
  // torn, more than its heart. Each is added before the wrap, so the wrap never seams.
  float fx = uFlip > 0.5 ? 1.0 - s.x : s.x;
  float d0 = fract(fx + s.y - uBandAt + 0.5) - 0.5;
  float wander = (fbm(s, coarse, 11.0) - 0.5) * 0.5;
  float tear = (fbm(s, uPeriod, 13.0) - 0.5) * 0.36 * (0.35 + 0.65 * smoothstep(0.03, 0.2, abs(d0)));
  float swell = 0.65 + 0.9 * smoothstep(0.3, 0.7, fbm(s, coarse, 12.0));
  float d = (fract(d0 + wander + tear + 0.5) - 0.5) / swell;
  float ad = abs(d);
  float haze = exp(-d * d / (2.0 * 0.21 * 0.21));
  float body = exp(-d * d / (2.0 * 0.14 * 0.14));
  float core = exp(-d * d / (2.0 * 0.085 * 0.085));

  // Clouds that mottle the band, knots of brighter cloud in it, fine dark lanes of dust down
  // its heart, and broad dark rifts that blot out whole stretches of it, more to one side of
  // its line than on it, as the galaxy's great rift runs beside its bright heart.
  float mottle = smoothstep(0.35, 0.75, fbm(s, uPeriod, 1.0));
  float knots = smoothstep(0.55, 0.8, fbm(s, uPeriod * 2.0, 15.0));
  float ridge = 1.0 - abs(fbm(s, uPeriod * 2.0, 2.0) * 2.0 - 1.0);
  float rd = d - 0.05;
  float rift = smoothstep(0.5, 0.68, fbm(s, uPeriod, 14.0)) * exp(-rd * rd / (2.0 * 0.07 * 0.07));
  float lanes = max(smoothstep(0.72, 0.95, ridge) * smoothstep(0.14, 0.0, ad), 0.8 * rift);
  mottle = min(mottle + 0.6 * knots, 1.3);

  vec3 col;
  if (uSky < 1.5) {
    // Deep blue: a royal blue night, deeper in patches, and a soft band of pale-blue
    // cloud with dark lanes in it, a little paler where its clouds gather.
    vec3 night = vec3(0.03, 0.07, 0.19) * (0.75 + 0.45 * broad);
    vec3 band = mix(uAccent, vec3(0.42, 0.58, 1.0), 0.7);
    float light = 0.08 * haze + 0.16 * body * (0.35 + 0.65 * mottle);
    col = night + band * light * (1.0 - 0.75 * lanes) + vec3(0.7, 0.8, 1.0) * core * mottle * 0.06;
  } else if (uSky < 2.5) {
    // Blue, violet and pink. Clouds of colour across the whole sky, cyan to one side and
    // magenta to the other, violet between (the side wraps, so the slide never seams),
    // with dark gaps between them.
    float side = 0.5 + 0.5 * cos(6.2831853 * (s.x - 0.2 + 0.1 * (broad - 0.5)));
    vec3 tint = mix(vec3(0.85, 0.26, 0.74), vec3(0.16, 0.55, 1.0), side);
    tint = mix(tint, vec3(0.5, 0.3, 1.0), 0.6 * (1.0 - abs(2.0 * side - 1.0)));
    // Two layers: broad soft clouds, and wisps of brighter cloud inside them.
    float clouds = smoothstep(0.3, 0.72, fbm(s, coarse, 4.0));
    float wisps = smoothstep(0.45, 0.8, fbm(s, uPeriod * 2.0, 8.0)) * clouds;
    vec3 night = vec3(0.02, 0.03, 0.11) + tint * (clouds * 0.2 + wisps * 0.22);
    // Its lanes are finer than the other skies', so the bright heart shows through.
    float fine = max(smoothstep(0.8, 0.97, ridge) * smoothstep(0.12, 0.0, ad), 0.55 * rift);
    // The band: a blue haze, violet toward its edges, and a bright, nearly white-blue
    // heart where its clouds gather, cut by dark lanes.
    vec3 band = vec3(0.3, 0.46, 1.0) * haze * 0.12
              + vec3(0.56, 0.4, 1.0) * max(haze - body, 0.0) * 0.08
              + vec3(0.7, 0.76, 1.0) * body * (0.35 + 0.65 * mottle) * 0.28
              + vec3(0.9, 0.9, 1.0) * core * mottle * 0.3;
    col = night * (1.0 - 0.5 * body) + band * (1.0 - 0.7 * fine);
  } else {
    // Colourful: a dark night, a haze of teal round the band, and its heart warm peach,
    // brightest where the clouds gather, pinker in places, cut deep by dark brown lanes.
    vec3 night = vec3(0.014, 0.03, 0.06) * (0.8 + 0.4 * broad);
    vec3 teal = vec3(0.16, 0.6, 0.72);
    vec3 warm = mix(vec3(1.0, 0.56, 0.34), vec3(0.95, 0.42, 0.56), smoothstep(0.45, 0.8, fbm(s, coarse, 7.0)));
    float heart = body * (0.25 + 0.75 * mottle);
    // The teal sits round the band, never on its heart, where it would grey the peach.
    col = night + teal * max(haze - 1.2 * body, 0.0) * 0.14 + warm * heart * 0.32 * (1.0 - 0.9 * lanes)
        + vec3(1.0, 0.8, 0.62) * core * mottle * 0.14 * (1.0 - lanes);
  }
  // Twice as bright, capped at 1 as a whole rather than channel by channel: a channel
  // clipped alone turns the band's brightest heart grey (violet's white-blue) or yellow
  // (colourful's peach) once it is drawn at half.
  col *= 2.0;
  col /= max(1.0, max(col.r, max(col.g, col.b)));
  // How thick the band's stars are here: thickest in its heart and its knots, thinner
  // round it, and few in its lanes and rifts, as the dust there hides them.
  float stars = body * (0.5 + 0.5 * mottle) * (1.0 - 0.85 * lanes) + 0.3 * haze * (1.0 - 0.6 * lanes);
  gl_FragColor = vec4(col, clamp(stars, 0.0, 1.0));
}
