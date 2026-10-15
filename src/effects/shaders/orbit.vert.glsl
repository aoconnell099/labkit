// The orbit rings: each vertex is a point on one ring, placed from its angle and
// the ring's own radius and tilts. The same shader draws the hairline, the soft
// glow band along it (pushed out sideways on screen) and the nodes travelling
// round it (as points), so the three always agree on where a ring is.
// Plain GLSL ES 1.00; every uniform and attribute declared here.
precision highp float;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
// How far round the nodes have travelled, in radians: one turn per loop.
uniform float uTurn;
// 1 for the nodes, which travel; 0 for the rings themselves, which hold.
uniform float uMove;
// The glow band's half-width, in clip units; 0 for the hairline and the nodes.
uniform float uWidth;
// A node's size, in device pixels.
uniform float uSize;

// The angle round the ring, in radians.
attribute float aAngle;
// The ring: its radius, its tilt toward the viewer, its roll on screen (both in
// radians), and the turns its nodes make per loop (negative goes the other way).
attribute vec4 aRing;
// Across the glow band: -1 one edge, 1 the other; 0 on the hairline and nodes.
attribute float aSide;

varying float vSide;
varying float vFront;
varying float vZ;
varying vec2 vNdc;

vec3 place(float a) {
  vec3 p = vec3(cos(a), 0.0, sin(a)) * aRing.x;
  float ct = cos(aRing.y), st = sin(aRing.y);
  p = vec3(p.x, ct * p.y - st * p.z, st * p.y + ct * p.z);
  float cr = cos(aRing.z), sr = sin(aRing.z);
  return vec3(cr * p.x - sr * p.y, sr * p.x + cr * p.y, p.z);
}

void main() {
  float a = aAngle + uMove * aRing.w * uTurn;
  vec3 p = place(a);
  vec4 clip = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  vNdc = clip.xy / clip.w;

  // The band is pushed across the ring's direction on screen, so it keeps its
  // width when the ring is seen edge on.
  vec4 ahead = projectionMatrix * modelViewMatrix * vec4(place(a + 0.01), 1.0);
  vec2 dir = ahead.xy / ahead.w - vNdc;
  dir = length(dir) > 1e-6 ? normalize(dir) : vec2(1.0, 0.0);
  clip.xy += vec2(-dir.y, dir.x) * aSide * uWidth * clip.w;

  vSide = aSide;
  vFront = p.z / aRing.x * 0.5 + 0.5;
  vZ = p.z;
  gl_PointSize = uSize;
  gl_Position = clip;
}
