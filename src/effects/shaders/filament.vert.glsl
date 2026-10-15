// The filament orb's strands: points on a unit sphere, rippled and turned.
// Plain GLSL ES 1.00. Every uniform and attribute is declared here and nothing
// is injected, so another engine can compile it as it stands.
precision highp float;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
// The turn about the vertical axis, in radians.
uniform float uAngle;
// How far through one loop, 0 to 1.
uniform float uPhase;

// A point on the strand, on the unit sphere.
attribute vec3 position;
// How far along its strand the point is, 0 to 1.
attribute float aAlong;
// The strand's own random number, 0 to 1.
attribute float aSeed;

varying float vAlong;
varying float vFront;

void main() {
  // A slow ripple runs along each strand, once round per loop.
  float ripple = 1.0 + 0.035 * sin(aAlong * 18.0 + (aSeed + uPhase) * 6.2831853);
  vec3 p = position * ripple;

  float c = cos(uAngle);
  float s = sin(uAngle);
  p = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);

  // A fixed tilt of 0.35 rad toward the viewer, so the pole shows.
  p = vec3(p.x, 0.9393727 * p.y - 0.3428978 * p.z, 0.3428978 * p.y + 0.9393727 * p.z);

  vFront = p.z * 0.5 + 0.5;
  vAlong = aAlong;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
