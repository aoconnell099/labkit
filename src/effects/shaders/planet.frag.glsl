// The planet orb: a glass ball with glowing clouds inside, lit from within, and a
// bright rim where the glass turns away, drawn on a square facing the viewer
// (halo.vert.glsl). The sphere is worked out per pixel, so it needs no mesh.
// No highlight dot: it read as plastic (labkit #53). Output is premultiplied:
// the glass darkens what is behind it by its alpha and adds its own light.
precision highp float;

// The orb's colour, as sRGB 0 to 1: its tint, or the theme's accent.
uniform vec3 uColor;
// The theme's glow, 0 to 1: how strongly it is lit from inside.
uniform float uGlow;
// How bright the pulse is now, 0 to about 1 (drift.ts).
uniform float uBreath;
// The shell's lean right now: the clouds wander with it, never turning round.
uniform mat3 uRot;
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

  // The surface normal facing the viewer, and the same point in the shell's own
  // frame (n times the matrix is the matrix's inverse, for a rotation).
  vec3 n = vec3(p, sqrt(max(0.0, 1.0 - r * r)));
  vec3 q = n * uRot;

  // Marbling, as before: bands across the sphere, bent by noise that swirls.
  float t = uSwirl * 6.2831853;
  vec3 w = q * 1.6 + vec3(sin(t) * 0.35, 0.0, cos(t) * 0.35);
  float warp = fbm(w);
  float bands = 0.5 + 0.5 * sin(q.y * 5.0 + warp * 7.0 + t);
  float marble = mix(bands, fbm(q * 3.0 + warp * 1.5), 0.5);
  // Clouds: the marbling's bright parts, soft-edged, with clear glass between.
  float cloud = smoothstep(0.3, 0.72, marble) * (0.6 + 0.4 * fbm(q * 5.0 - warp));

  // Lit from within: strongest where the ball is thickest toward the viewer, and
  // at two hot spots deep in the clouds that ride with the shell.
  float core = pow(n.z, 1.3);
  float hot = pow(max(dot(q, normalize(vec3(-0.35, 0.3, 0.88))), 0.0), 6.0)
            + 0.8 * pow(max(dot(q, normalize(vec3(0.5, -0.45, 0.74))), 0.0), 9.0);
  float pulse = 0.75 + 0.35 * uBreath;
  // With no glow (a light theme) the clouds still show, in the tint alone.
  float light = cloud * (0.35 + 0.65 * core + 2.0 * hot) * (0.5 + 0.6 * uGlow) * pulse;
  vec3 glass = uColor * 0.06;
  vec3 col = glass + uColor * light;
  col = mix(col, vec3(1.0), clamp(light * light * 0.7 * uGlow, 0.0, 0.85));

  // The rim: a bright ring where the glass turns away, thin, and a broad faint
  // sheen inside it, both in the tint, burning toward white as the theme glows.
  float edge = 1.0 - n.z;
  float rim = pow(edge, 5.0) * 1.6 + pow(edge, 2.0) * 0.18;
  rim *= 0.6 + 0.4 * uGlow;
  col += mix(uColor, vec3(1.0), 0.35 * uGlow) * rim;

  // Glass: see-through where it is clear, more solid in the clouds and the rim.
  float a = clamp(0.5 + 0.4 * cloud + rim, 0.0, 1.0) * inside;
  gl_FragColor = vec4(min(col, vec3(1.0)) * inside, a);
}
