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
// Where the twinkle's loop stands, 0 to 2 pi (star-dust.ts TWINKLE_LOOPS).
uniform float uTwinkle;

// Where the star sits, 0 to 1 across and down; z unused.
attribute vec3 position;
// How near it is, 0.2 (far) to 1 (near): how far it drifts and shifts.
attribute float aNear;
// How bright, 0 to 1: mostly faint, a few bright.
attribute float aBright;
// How far its colour leans from the ink to the accent, 0 to 1.
attribute float aTouch;
// The twinkle: two waves' whole cycles per loop, a phase, and how deep it dims.
attribute vec4 aTwinkle;
// A colour some points lean toward instead (warm, rose, violet), and how far: 0 for most.
attribute vec4 aShade;

varying float vBright;
varying float vTouch;
// The twinkle's share of its light now, about 0.2 to 1.4.
varying float vLit;
varying vec4 vShade;
// The point's size, and its solid core's radius, in CSS pixels.
varying float vSize;
varying float vCore;

void main() {
  vec2 p = fract(position.xy + (uDrift + uOffset / uView) * aNear);
  // The solid dot grows a little with brightness; the bright few get a halo
  // as wide as the theme's glow.
  vCore = 0.4 + 1.0 * aBright;
  float halo = aBright > 0.6 ? 2.0 + 7.0 * uGlow : 1.0;
  vSize = 2.0 * (vCore + halo);
  vBright = aBright;
  vTouch = aTouch;
  vShade = aShade;
  // Mostly a gentle swell and fade, catching brighter for a moment near the
  // top of a swell; the two waves keep any two points from keeping time.
  float t = 0.5 + 0.3 * sin(aTwinkle.x * uTwinkle + aTwinkle.z)
                + 0.2 * sin(aTwinkle.y * uTwinkle + aTwinkle.z * 1.7);
  vLit = 1.0 - aTwinkle.w + aTwinkle.w * (0.55 * t + 0.95 * pow(t, 6.0));
  gl_PointSize = vSize * uPixelRatio;
  gl_Position = vec4(p.x * 2.0 - 1.0, 1.0 - p.y * 2.0, 0.0, 1.0);
}
