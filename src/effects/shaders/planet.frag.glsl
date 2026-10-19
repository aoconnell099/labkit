// The planet orb: a glass ball full of slow smoke, lit from within, and a
// bright rim where the glass turns away, drawn on a square facing the viewer
// (halo.vert.glsl). The sphere is worked out per pixel, so it needs no mesh.
// No highlight dot: it read as plastic (labkit #53). Output is premultiplied:
// the glass darkens what is behind it by its alpha and adds its own light.
//
// The smoke (the owner's polish list: "more of a smoke effect inside") is
// sampled at two depths along the view, a near layer and a deeper one that
// shifts against it as the shell leans, so it reads as a volume rather than a
// painted skin. Each is noise bent by noise (a domain warp), which curls it into
// wisps, and the warp itself drifts, so the smoke billows and never repeats.
precision highp float;

// The orb's colour, as sRGB 0 to 1: its tint, or the theme's accent.
uniform vec3 uColor;
// The theme's glow, 0 to 1: how strongly it is lit from inside.
uniform float uGlow;
// How bright the pulse is now, 0 to about 1 (drift.ts).
uniform float uBreath;
// The shell's lean right now: the smoke wanders with it, never turning round.
uniform mat3 uRot;
// How far the smoke has drifted, in loops.
uniform float uSwirl;
// The square's half-width, in orb radii.
uniform float uExtent;
// 1: the smoke runs through every hue at once (Apps), instead of the tint.
uniform float uRainbow;

varying vec2 vUv;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

// Value noise in 3D, so the smoke has no seam on the sphere.
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
  return v;
}

// Three octaves: enough for the warp, which only bends the smoke.
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

// Every hue at full strength, 0 to 1 round the wheel.
vec3 hue(float h) {
  return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
}

// Smoke density at a point in the shell's frame: wisps where the warped noise is
// high, clear glass between.
float smoke(vec3 p, vec2 warp, float drift) {
  vec3 s = p * 1.8 + vec3(warp * 1.9, 0.0) + vec3(0.0, drift * 0.6, drift * 0.25);
  return smoothstep(0.4, 0.72, fbm(s));
}

void main() {
  // Where this pixel is, in orb radii from the centre.
  vec2 p = (vUv - 0.5) * 2.0 * uExtent;
  float r = length(p);
  // A soft edge about one pixel wide at the sizes it is shown.
  float inside = 1.0 - smoothstep(0.985, 1.0, r);
  if (inside <= 0.0) discard;

  // The surface normal facing the viewer, and the same point in the shell's own
  // frame (n times the matrix is the matrix's inverse, for a rotation).
  vec3 n = vec3(p, sqrt(max(0.0, 1.0 - r * r)));
  vec3 q = n * uRot;
  // A point deeper in the ball on the same line of sight, in the shell's frame.
  vec3 deep = vec3(p, n.z * 0.15) * uRot;

  // The warp, shared by both layers, drifting slowly on its own.
  float drift = uSwirl * 0.6;
  vec2 warp = vec2(fbm3(q * 1.3 + vec3(0.0, 0.0, drift)),
                   fbm3(q * 1.3 + vec3(5.2, 1.3, -drift))) - 0.5;
  float nearSmoke = smoke(q, warp, drift);
  float farSmoke = smoke(deep * 1.35 + vec3(3.7, 0.0, 1.9), warp * 0.7, drift * 0.8);

  // Lit from within: strongest toward the heart of the ball, and at two hot
  // spots deep in the smoke that ride with the shell.
  float core = pow(n.z, 1.3);
  float hot = pow(max(dot(q, normalize(vec3(-0.35, 0.3, 0.88))), 0.0), 6.0)
            + 0.8 * pow(max(dot(q, normalize(vec3(0.5, -0.45, 0.74))), 0.0), 9.0);
  float pulse = 0.75 + 0.35 * uBreath;
  float lit = (0.3 + 0.7 * core + 1.6 * hot) * (0.5 + 0.6 * uGlow) * pulse;

  // The smoke's colour: the tint, or for Apps every hue at once, flowing with
  // the smoke so the colours mix the way it curls.
  vec3 tint = uColor;
  vec3 tintFar = uColor;
  vec3 glass = uColor * 0.05;
  if (uRainbow > 0.5) {
    float h = fract(warp.x * 2.6 + warp.y * 1.7 + q.y * 0.6 + q.x * 0.3 + drift * 0.05);
    tint = mix(hue(h), vec3(1.0), 0.18);
    tintFar = mix(hue(fract(h + 0.33)), vec3(1.0), 0.1);
    glass = vec3(0.05);
  }

  // The far layer first, dimmer; the near one over it.
  vec3 col = glass + tintFar * farSmoke * lit * 0.55;
  float nearLight = nearSmoke * lit;
  col = mix(col, tint * nearLight * 1.15, nearSmoke * 0.85);
  // The thickest smoke burns toward white as the theme glows.
  col = mix(col, vec3(1.0), clamp(nearLight * nearLight * 0.55 * uGlow, 0.0, 0.8));

  // The rim: a bright ring where the glass turns away, thin, and a broad faint
  // sheen inside it, both in the tint, burning toward white as the theme glows.
  float edge = 1.0 - n.z;
  float rim = pow(edge, 5.0) * 1.6 + pow(edge, 2.0) * 0.18;
  rim *= 0.6 + 0.4 * uGlow;
  vec3 rimColour = uRainbow > 0.5 ? mix(tint, vec3(1.0), 0.4) : uColor;
  col += mix(rimColour, vec3(1.0), 0.35 * uGlow) * rim;

  // Glass: see-through where it is clear, more solid in the smoke and the rim.
  float a = clamp(0.5 + 0.3 * nearSmoke + 0.15 * farSmoke + rim, 0.0, 1.0) * inside;
  gl_FragColor = vec4(min(col, vec3(1.0)) * inside, a);
}
