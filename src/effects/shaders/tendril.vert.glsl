// The tendrils: every vertex is already placed, in CSS pixels inside the
// element, on one edge of a tendril's ribbon (tendrils.ts walks each path). This
// only turns pixels into clip space and passes the rest along.
// Plain GLSL ES 1.00; every uniform and attribute declared here.
precision highp float;

// The element's size, in CSS pixels.
uniform vec2 uView;

// The point, in CSS pixels from the element's top left; z unused.
attribute vec3 position;
// Across the ribbon: -1 one edge, 1 the other.
attribute float aSide;
// The colour here, blended along the tendril, as sRGB 0 to 1.
attribute vec3 aColor;
// How much of the tendril shows here: soft at its two ends.
attribute float aFade;

varying float vSide;
varying vec3 vColor;
varying float vFade;

void main() {
  vec2 c = position.xy / uView * 2.0 - 1.0;
  vSide = aSide;
  vColor = aColor;
  vFade = aFade;
  gl_Position = vec4(c.x, -c.y, 0.0, 1.0);
}
