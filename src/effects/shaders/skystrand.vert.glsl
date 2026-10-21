// The colourful sky's strands: ribbons laid out in CSS pixels every frame
// (sky.ts), each a wide plume or a brighter wisp in it.
// Plain GLSL ES 1.00; every uniform and attribute declared here.
precision highp float;

// The element's size, in CSS pixels.
uniform vec2 uView;

// x, y in CSS pixels from the top left; z unused.
attribute vec3 position;
// Across the ribbon, -1 to 1.
attribute float aSide;
// How strongly it shows here along its length, 0 to 1.
attribute float aFade;
// 0 a wide plume, 1 a wisp in it.
attribute float aKind;
// Its colour, as sRGB 0 to 1.
attribute vec3 aColour;
// How far along the strand this is, and the ribbon's half-width here, in CSS pixels.
attribute vec2 aLocal;

varying float vSide;
varying float vFade;
varying float vKind;
varying vec3 vColour;
// Along and across the ribbon, in CSS pixels: the grains and fibres hold to the strand.
varying vec2 vLocal;

void main() {
  vSide = aSide;
  vFade = aFade;
  vKind = aKind;
  vColour = aColour;
  vLocal = vec2(aLocal.x, aSide * aLocal.y);
  vec2 c = position.xy / uView;
  gl_Position = vec4(c.x * 2.0 - 1.0, 1.0 - c.y * 2.0, 0.0, 1.0);
}
