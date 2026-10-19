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
varying float vSeed;
// 1: each piece takes a hue of its own instead of uColor (a rainbow planet).
uniform float uRainbow;

// Every hue at full strength, 0 to 1 round the wheel.
vec3 hue(float h) {
  return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
}

void main() {
  float a = clamp(vLight * (0.4 + 0.45 * uGlow) * uThin, 0.0, 1.0);
  vec3 c = mix(uRainbow > 0.5 ? mix(hue(vSeed), vec3(1.0), 0.15) : uColor, vec3(1.0), clamp(vHeat * uGlow, 0.0, 0.85));
  gl_FragColor = vec4(c * a, a);
}
