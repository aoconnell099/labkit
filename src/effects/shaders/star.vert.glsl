// The star dust: one point per star. Each star sits at a fixed place in a
// field that wraps at the element's edges, and the whole field drifts and
// shifts by the app's offset, nearer stars further (star-dust.ts).
// Plain GLSL ES 1.00; every uniform and attribute declared here.
precision highp float;

// The element's size, in CSS pixels, and device pixels per CSS pixel.
uniform vec2 uView;
uniform float uPixelRatio;
// How far the field has drifted, in shares of the element, at nearness 1.
uniform vec2 uDrift;
// The app's offset, in CSS pixels, at nearness 1.
uniform vec2 uOffset;
// The theme's glow, 0 to 1. mediump, as the fragment shader declares it: a
// uniform both stages use must have one precision.
uniform mediump float uGlow;

// Where the star sits, 0 to 1 across and down; z unused.
attribute vec3 position;
// How near it is, 0.2 (far) to 1 (near): how far it drifts and shifts.
attribute float aNear;
// How bright, 0 to 1: mostly faint, a few bright.
attribute float aBright;
// How far its colour leans from the ink to the accent, 0 to 1.
attribute float aTouch;

varying float vBright;
varying float vTouch;
// The point's size, and its solid core's radius, in CSS pixels.
varying float vSize;
varying float vCore;

void main() {
  vec2 p = fract(position.xy + (uDrift + uOffset / uView) * aNear);
  // The solid dot grows a little with brightness; the bright few get a halo
  // as wide as the theme's glow.
  vCore = 0.5 + 0.9 * aBright;
  float halo = aBright > 0.6 ? 2.0 + 7.0 * uGlow : 1.0;
  vSize = 2.0 * (vCore + halo);
  vBright = aBright;
  vTouch = aTouch;
  gl_PointSize = vSize * uPixelRatio;
  gl_Position = vec4(p.x * 2.0 - 1.0, 1.0 - p.y * 2.0, 0.0, 1.0);
}
