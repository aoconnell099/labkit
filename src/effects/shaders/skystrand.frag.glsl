// A strand of the colourful sky: faint, so it never reads as a vine. The wide
// glow is soft all the way across; a fine line is bright at its middle only.
// Premultiplied output, for additive blending.
precision mediump float;

// The theme's glow, 0 to 1.
uniform float uGlow;

varying float vSide;
varying float vFade;
varying float vKind;
varying vec3 vColour;

void main() {
  float s2 = vSide * vSide;
  float a = vKind < 0.5 ? exp(-s2 * 2.5) * 0.07 : exp(-s2 * 9.0) * 0.16;
  a *= vFade * (0.6 + 0.4 * uGlow);
  gl_FragColor = vec4(vColour * a, a);
}
