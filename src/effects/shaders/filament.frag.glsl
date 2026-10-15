// The filament orb's strands: thin lines in the accent, brighter in front,
// fading out at each end. Output is premultiplied, for additive blending.
precision mediump float;

// The theme's accent, as sRGB 0 to 1.
uniform vec3 uColor;
// The theme's glow, 0 to 1.
uniform float uGlow;
// The breath through the loop, 0 to 1, eased by the theme's curves.
uniform float uBreath;

varying float vAlong;
varying float vFront;

void main() {
  float ends = sin(3.14159265 * vAlong);
  float a = (0.35 + 0.5 * uGlow) * (0.65 + 0.35 * uBreath) * ends * mix(0.2, 1.0, vFront);
  gl_FragColor = vec4(uColor * a, a);
}
