// An orb's glow: a soft light inside it and a ring at its rim, in the accent,
// as strong as the theme's glow. 0 glow draws nothing. Premultiplied output.
precision mediump float;

// The theme's accent, as sRGB 0 to 1.
uniform vec3 uColor;
// The theme's glow, 0 to 1.
uniform float uGlow;
// The breath through the loop, 0 to 1.
uniform float uBreath;
// The square's half-width, in orb radii.
uniform float uExtent;

varying vec2 vUv;

void main() {
  // Distance from the centre, in orb radii.
  float d = length(vUv - 0.5) * 2.0 * uExtent;
  float core = exp(-d * d * 2.5) * 0.35;
  float rim = exp(-pow((d - 1.0) * 4.0, 2.0)) * 0.3;
  float a = uGlow * (core + rim) * (0.7 + 0.3 * uBreath);
  // Light only, no coverage: a glow round an orb must not hide what is behind it.
  gl_FragColor = vec4(uColor * a, 0.0);
}
