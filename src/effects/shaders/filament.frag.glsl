// The filament orb's lines: the accent, burning toward white where it is hot
// and the theme glows. Output is premultiplied, for additive blending.
precision mediump float;

// The theme's accent, as sRGB 0 to 1.
uniform vec3 uColor;
// The theme's glow, 0 to 1. With none (a light theme), nothing burns white:
// white on a white page would vanish.
uniform float uGlow;
// How much brighter to draw a line on a dense screen, where it is thinner:
// the square root of the pixel ratio.
uniform float uThin;

varying float vLight;
varying float vHeat;

void main() {
  float a = clamp(vLight * (0.4 + 0.45 * uGlow) * uThin, 0.0, 1.0);
  vec3 c = mix(uColor, vec3(1.0), clamp(vHeat * uGlow, 0.0, 0.85));
  gl_FragColor = vec4(c * a, a);
}
