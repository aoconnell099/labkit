// A strand of the colourful sky, after the owner's photograph of colourful dust
// fanning up from a horizon: a plume of fine dust, soft across and fibrous along
// its length, with grains of light caught in it that twinkle. A wisp is a
// narrower, brighter streak inside the plume. Premultiplied output, for additive
// blending.
precision highp float;

// The theme's glow, 0 to 1.
uniform float uGlow;
// Time, in loops of the pace.
uniform float uTime;
// How strongly the plumes are drawn: more out of the band, where none overlap (sky.ts).
uniform float uStrength;

varying float vSide;
varying float vFade;
varying float vKind;
varying vec3 vColour;
varying vec2 vLocal;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

void main() {
  float s2 = vSide * vSide;
  // Fibres: noise stretched far along the strand and fine across it, drifting outward
  // slowly, so the plume reads as streaks of dust rather than a beam.
  vec2 q = vec2(vLocal.x * 0.006 - uTime * 0.12, vLocal.y * 0.09);
  float fib = 0.6 * vnoise(q) + 0.4 * vnoise(q * vec2(2.1, 2.7) + 3.7);
  fib = smoothstep(0.3, 0.85, fib);
  // Clumps along it, so the light gathers and thins as it goes.
  float clump = 0.55 + 0.45 * vnoise(vec2(vLocal.x * 0.012 - uTime * 0.2, 1.3 + vLocal.y * 0.01));
  float a = vKind < 0.5
    ? exp(-s2 * 2.2) * (0.2 + 0.8 * fib) * clump * 0.3
    : exp(-s2 * 5.0) * (0.15 + 0.85 * fib) * clump * 0.32;
  vec3 col = vColour * a;
  if (vKind < 0.5) {
    // Grains of light caught in the plume, one in some cells of 3 CSS pixels, each a
    // dot that twinkles on its own; densest where the plume is, half of them white.
    vec2 cell = floor(vLocal / 3.0);
    float h = hash(cell);
    vec2 at = fract(vLocal / 3.0) - 0.5 - (vec2(hash(cell + 7.1), hash(cell + 3.3)) - 0.5) * 0.5;
    float grain = smoothstep(0.42, 0.0, length(at)) * step(0.8, h) * exp(-s2 * 1.4);
    float tw = 0.45 + 0.55 * sin(uTime * 6.2831853 * (2.0 + 4.0 * hash(cell + 1.9)) + h * 60.0);
    col += mix(vColour, vec3(1.0), step(0.95, h)) * grain * max(tw, 0.0) * (0.6 + 0.6 * fib);
  }
  col *= vFade * (0.6 + 0.4 * uGlow) * uStrength;
  gl_FragColor = vec4(col, max(col.r, max(col.g, col.b)));
}
