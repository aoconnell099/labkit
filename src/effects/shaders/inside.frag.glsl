// Inside a planet orb, full-bleed: the planet's smoke seen from within (the
// owner's polish list, 2026-10-18: "a representation of the outside, so slowly
// moving smoky background with some of the filament effect, and the slight
// lightning effect in the smoky clouds, and some bits of the black outside
// coming through"). Drawn small into a texture (planet-inside.ts) and scaled up:
// smoke is soft, so a phone pays for a fraction of its pixels.
// Premultiplied output, for additive blending over the page's dark.
precision highp float;

// The tint, as sRGB 0 to 1.
uniform vec3 uColor;
// 1: every hue at once, as the rainbow planet's smoke.
uniform float uRainbow;
// The theme's glow, 0 to 1.
uniform float uGlow;
// Time, in loops of the pace.
uniform float uTime;
// Width over height.
uniform float uAspect;
// A flash of lightning now, 0 to 1, and where, in the square's units (0 to 1).
uniform float uFlash;
uniform vec2 uFlashAt;

varying vec2 vUv;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i + vec3(0.0, 0.0, 0.0)), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
                 mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
                 mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
}

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec3(1.7, 9.2, 3.1);
    a *= 0.5;
  }
  return v / 0.96875;
}

float fbm3(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec3(1.7, 9.2, 3.1);
    a *= 0.5;
  }
  return v / 0.875;
}

vec3 hue(float h) {
  return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
}

void main() {
  vec2 uv = vec2(vUv.x * uAspect, vUv.y) * 1.7;
  float t = uTime * 0.05;
  // Noise bent by noise, drifting: the smoke curls and billows, never repeating.
  vec2 warp = vec2(fbm3(vec3(uv, t)), fbm3(vec3(uv + vec2(5.2, 1.3), -t))) - 0.5;
  float near = smoothstep(0.45, 0.78, fbm(vec3(uv + warp * 1.7, t * 0.6)));
  float far = smoothstep(0.4, 0.8, fbm(vec3(uv * 0.6 + vec2(3.7, 1.9) + warp * 0.8, t * 0.4)));
  // Filaments: thin bright ridges where the warped noise folds, mostly in the smoke.
  float ridge = 1.0 - abs(2.0 * fbm3(vec3(uv * 2.3 + warp * 2.6, t * 0.7)) - 1.0);
  float fil = pow(ridge, 14.0) * (0.25 + 0.75 * max(near, far));
  // Lightning: the clouds near the flash light up from inside.
  vec2 d = vec2((vUv.x - uFlashAt.x) * uAspect, vUv.y - uFlashAt.y);
  float flash = uFlash * exp(-dot(d, d) / 0.06) * (0.3 + near + 0.5 * far);

  vec3 tint = uColor;
  vec3 tintFar = uColor;
  if (uRainbow > 0.5) {
    float h = fract(warp.x * 2.2 + warp.y * 1.4 + uv.y * 0.25 + t * 0.4);
    tint = mix(hue(h), vec3(1.0), 0.15);
    tintFar = mix(hue(fract(h + 0.33)), vec3(1.0), 0.1);
  }
  float glow = 0.6 + 0.5 * uGlow;
  vec3 col = tintFar * far * 0.22 * glow + tint * near * 0.42 * glow;
  col += mix(tint, vec3(1.0), 0.5) * fil * 0.35 * glow;
  col += mix(tint, vec3(1.0), 0.65) * flash * 0.8;
  // A little darker at the edges, as if seen from the middle of the ball.
  vec2 e = vUv - 0.5;
  col *= 1.0 - 0.45 * dot(e, e) * 2.0;
  col = min(col, vec3(1.0));
  gl_FragColor = vec4(col, max(col.r, max(col.g, col.b)));
}
