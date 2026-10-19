// The colourful sky's strands: ribbons laid out in CSS pixels every frame
// (star-dust.ts), each a soft wide glow or a fine bright line.
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
// 0 a wide soft glow, 1 a fine line.
attribute float aKind;
// Its colour, as sRGB 0 to 1.
attribute vec3 aColour;

varying float vSide;
varying float vFade;
varying float vKind;
varying vec3 vColour;

void main() {
  vSide = aSide;
  vFade = aFade;
  vKind = aKind;
  vColour = aColour;
  vec2 c = position.xy / uView;
  gl_Position = vec4(c.x * 2.0 - 1.0, 1.0 - c.y * 2.0, 0.0, 1.0);
}
