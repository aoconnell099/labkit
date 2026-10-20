// The filament orb's cloud (its `cloud` attribute; the owner's polish list,
// 2026-10-18): a nebula round the orb, after the owner's private references,
// described here in our own words. A soft glowing haze, lumpy and with no clean
// outline, folded sheets of fine glowing net in it, deepening toward violet and
// lifting toward teal in places. It drifts in place like a jellyfish: its
// outline swells and settles one lobe after another, never turning round, and
// it floats as a jellyfish does (the owner, 2026-10-20: "more of a gradual
// floating effect and less of a pulse"): over FLOAT loops it rises a little,
// drawing in gently at its sides, then sinks back as it relaxes, on one smooth
// wave with no quick squeeze, and no light of its own: its brightness is the
// orb's pulse only.
// Drawn on a square facing the viewer (halo.vert.glsl). Premultiplied output,
// for additive blending.
precision highp float;

// The accent, as sRGB 0 to 1.
uniform vec3 uColor;
// The theme's glow, 0 to 1.
uniform float uGlow;
// How bright the orb's pulse is now, 0 to about 1: the cloud swells with it.
uniform float uBreath;
// Time, in loops of the pace.
uniform float uTime;
// The square's half-width, in orb radii.
uniform float uExtent;

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
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec3(1.7, 9.2, 3.1);
    a *= 0.5;
  }
  return v / 0.9375;
}

// Loops in one float, up and back down: about 11 s at Cold core's pace (a loop is 8.7 s).
const float FLOAT = 1.25;

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

void main() {
  float t = uTime;
  // The float, 0 at rest to 1 at its highest and back, on one smooth wave. Rising, the
  // cloud draws in a little at its sides (read wider here, so it shows narrower) and
  // lengthens; sinking, it relaxes and spreads.
  float f = 0.5 - 0.5 * cos(6.2831853 * t / FLOAT);
  vec2 p = (vUv - 0.5) * 2.0 * uExtent;
  p = p * vec2(1.0 + 0.07 * f, 1.0 - 0.03 * f) - vec2(0.0, 0.12 * f - 0.04);
  float r = length(p);
  float a = atan(p.y, p.x);

  // The outline: three lobes' worth of swell going round at their own rates, so one
  // side swells as another settles. The pulse swells it all; the float draws it in.
  float edge = 1.75 + 0.16 * sin(3.0 * a + t * 2.2) + 0.12 * sin(5.0 * a - t * 1.7 + 1.3)
             + 0.08 * sin(2.0 * a + t * 1.2 + 2.1) + 0.06 * uBreath - 0.05 * f;

  vec3 q = vec3(p * 1.3, t * 0.22);
  vec2 warp = vec2(fbm3(q), fbm3(q + vec3(5.2, 1.3, 2.8))) - 0.5;
  float d = fbm(vec3(p * 1.6 + warp * 1.4, t * 0.18));
  // Soft, lumpy, a ragged edge where the noise pushes it in and out.
  float body = smoothstep(edge, edge * 0.4, r + (d - 0.5) * 0.45);
  float cloud = body * (0.5 + 0.6 * smoothstep(0.3, 0.75, d));
  // Folded sheets of fine glowing net: thin ridges where the warped noise folds.
  float ridge = 1.0 - abs(2.0 * fbm3(vec3(p * 2.4 + warp * 2.2, t * 0.28)) - 1.0);
  float net = pow(ridge, 10.0) * body;

  // Nebula colours: the accent, deepening to violet and lifting to teal in places.
  float n2 = fbm3(vec3(p * 0.9 + 7.0, t * 0.1));
  vec3 violet = vec3(0.52, 0.36, 1.0);
  vec3 teal = vec3(0.2, 0.85, 0.9);
  vec3 tint = mix(uColor, violet, smoothstep(0.55, 0.8, n2) * 0.6);
  tint = mix(tint, teal, smoothstep(0.35, 0.15, n2) * 0.35);

  float lift = 0.6 + 0.6 * uGlow;
  // Dust: a scatter of fine specks of light caught in it.
  vec2 cell = floor(p * 46.0);
  float speck = step(0.985, hash(vec3(cell, 7.0))) * body * (0.5 + 0.5 * sin(t * 3.0 + hash(vec3(cell, 3.0)) * 6.283));
  vec3 col = tint * cloud * 0.68 * lift + mix(tint, vec3(1.0), 0.4) * net * 0.75 * lift
           + mix(tint, vec3(1.0), 0.6) * speck * 0.5;
  // The float moves the cloud and never lights it: Jarvis's pulses are for working and
  // speaking (the polish list), so the cloud brightens with them only.
  col *= 0.85 + 0.3 * uBreath;
  // Gone before the square's edge, so it never sits in a box.
  col *= smoothstep(uExtent, uExtent * 0.82, r);
  col = min(col, vec3(1.0));
  gl_FragColor = vec4(col, max(col.r, max(col.g, col.b)));
}
