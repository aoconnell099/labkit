// The planet orb: a glossy, marbled sphere lit from inside, drawn on a square
// facing the viewer (halo.vert.glsl). The sphere is worked out per pixel, so it
// needs no mesh. Output is premultiplied, for normal blending.
precision highp float;

// The orb's colour, as sRGB 0 to 1: its tint, or the theme's accent.
uniform vec3 uColor;
// The theme's glow, 0 to 1: how strongly it is lit from inside.
uniform float uGlow;
// The breath through the loop, 0 to 1, eased by the theme's curves.
uniform float uBreath;
// The turn about the vertical axis, in radians.
uniform float uAngle;
// How far the marbling has swirled, in loops.
uniform float uSwirl;
// The square's half-width, in orb radii.
uniform float uExtent;

varying vec2 vUv;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

// Value noise in 3D, so the marbling has no seam on the sphere.
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

void main() {
  // Where this pixel is, in orb radii from the centre.
  vec2 p = (vUv - 0.5) * 2.0 * uExtent;
  float r = length(p);
  // A soft edge about one pixel wide at the sizes it is shown.
  float inside = 1.0 - smoothstep(0.985, 1.0, r);
  if (inside <= 0.0) discard;

  // The surface normal facing the viewer, and the same point turned with the orb.
  vec3 n = vec3(p, sqrt(max(0.0, 1.0 - r * r)));
  float c = cos(uAngle);
  float s = sin(uAngle);
  vec3 q = vec3(c * n.x + s * n.z, n.y, -s * n.x + c * n.z);

  // Marbling: bands across the sphere, bent by noise that slowly swirls.
  float t = uSwirl * 6.2831853;
  vec3 w = q * 1.6 + vec3(sin(t) * 0.35, 0.0, cos(t) * 0.35);
  float warp = fbm(w);
  float bands = 0.5 + 0.5 * sin(q.y * 5.0 + warp * 7.0 + t);
  float marble = mix(bands, fbm(q * 3.0 + warp * 1.5), 0.35);

  // Lit from inside: brightest where the orb is thickest toward the viewer,
  // breathing with the loop, as strong as the theme's glow.
  float core = pow(n.z, 1.4);
  // With no glow the marbling still shows, faintly, even on a near-black colour.
  float inner = (0.45 + 0.55 * uGlow) * (0.8 + 0.2 * uBreath);
  vec3 deep = uColor * 0.22;
  vec3 lit = mix(uColor, vec3(1.0), 0.15 + 0.3 * uGlow);
  vec3 col = mix(deep, lit, marble * (0.4 + 0.6 * core) * inner + 0.2 * core * uGlow);

  // Gloss: a fixed light up and to the left, a sharp highlight and a broad sheen,
  // and a bright rim where the glass turns away.
  vec3 l = normalize(vec3(-0.45, 0.55, 0.7));
  vec3 h = normalize(l + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(n, h), 0.0), 60.0);
  float sheen = pow(max(dot(n, h), 0.0), 6.0) * 0.12;
  float rim = pow(1.0 - n.z, 3.0) * (0.25 + 0.35 * uGlow);
  col += vec3(spec * 0.85 + sheen) + uColor * rim;

  gl_FragColor = vec4(min(col, vec3(1.0)) * inside, inside);
}
