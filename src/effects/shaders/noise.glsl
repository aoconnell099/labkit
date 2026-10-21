// Noise for the star dust's sky textures (sky.frag.glsl and skydust.frag.glsl), put in
// where each says `// #include noise` (sky.ts). Everything repeats exactly over the
// field: the lattice is `per` cells across and down, a whole number each, so a texture
// that slides never shows a seam.

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

// Ridged noise: 1 on a thin crest, falling away either side, for filaments of cloud.
float ridged(vec2 s, vec2 cells, float seed) {
  return 1.0 - abs(fbm(s, cells, seed) * 2.0 - 1.0);
}

// The field moved by noise of its own, twice, so clouds swirl and fold rather than billow
// (each move repeats over the field, so the result does too). `amount` is how far, in
// shares of the field.
vec2 swirl(vec2 s, vec2 cells, float seed, float amount) {
  vec2 w = s + amount * (vec2(fbm(s, cells, seed), fbm(s, cells, seed + 1.0)) - 0.5);
  return w + amount * 0.7 * (vec2(fbm(w, cells * 2.0, seed + 2.0), fbm(w, cells * 2.0, seed + 3.0)) - 0.5);
}

// Fine grain, a texel to a cell (`texels` the texture's size): the grit of a sky made of
// more stars than can be told apart.
float grit(vec2 s, vec2 texels, float seed) {
  vec2 per = max(vec2(1.0), floor(texels));
  return vnoise(s * per + seed * 17.0, per);
}
