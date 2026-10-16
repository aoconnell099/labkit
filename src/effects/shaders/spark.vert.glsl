// The filament orb's sparks: points through the shells and a spray past the
// edge, leaned with their layer, twinkling, brighter on a pulse.
// Plain GLSL ES 1.00; every uniform and attribute declared here.
precision highp float;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
// Each layer's lean right now (the same eight as the lines).
uniform mat3 uRot[8];
// Time, in loops of the theme's pace.
uniform float uTime;
// How bright the pulse is now, 0 to about 1.
uniform float uPulse;
// A spark's size, in device pixels: 1 when the canvas is 320 CSS px wide.
uniform float uPx;

attribute vec3 position;
attribute float aLayer;
attribute float aSeed;
// About 0.25 to 1: most sparks are faint, a few are bright.
attribute float aGain;

varying float vLight;
varying float vHeat;

void main() {
  vec3 p = uRot[int(aLayer + 0.5)] * position;
  float tw = 0.5 + 0.5 * sin(6.2831853 * (aSeed * 17.0 + uTime * (1.0 + 3.0 * fract(aSeed * 5.3))));
  float near = mix(0.3, 1.0, clamp(p.z * 0.5 + 0.5, 0.0, 1.0));
  vLight = aGain * mix(0.25, 1.0, tw) * (0.6 + 0.6 * uPulse) * near;
  vHeat = aGain * near;
  gl_PointSize = uPx * (1.2 + 2.6 * aGain) * near;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
