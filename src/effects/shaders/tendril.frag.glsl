// The tendrils: a thin solid line down the middle of each ribbon, and a soft
// glow either side of it as strong as the theme's glow, in the colour blended
// along the tendril. Premultiplied output, for additive blending.
precision mediump float;

// The ribbon's half-width, and the solid line's, in CSS pixels.
uniform float uHalf;
uniform float uCore;
// The theme's glow, 0 to 1.
uniform float uGlow;

varying float vSide;
varying vec3 vColor;
varying float vFade;

void main() {
  float d = abs(vSide) * uHalf;
  float core = 1.0 - smoothstep(uCore - 0.6, uCore + 0.6, d);
  float w = uHalf * 0.45;
  float halo = uGlow * 0.5 * exp(-d * d / (w * w));
  float a = min(1.0, 0.85 * core + halo) * vFade;
  gl_FragColor = vec4(vColor * a, a);
}
