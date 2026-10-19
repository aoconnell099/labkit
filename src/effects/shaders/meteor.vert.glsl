// A shooting star: one quad laid along it, from the end of its tail to a little
// past its head, wide enough for its glow (star-dust.ts places it).
// Plain GLSL ES 1.00; every uniform and attribute declared here.
precision highp float;

// The element's size, in CSS pixels.
uniform vec2 uView;
// The app's offset as the shooting star takes it, in CSS pixels.
uniform vec2 uOffset;
// Its head and the end of its tail, in CSS pixels.
uniform vec2 uHead;
uniform vec2 uTail;
// Half the quad's width, and how far it runs past the head, in CSS pixels.
uniform float uHalf;

// x along it, 0 at the tail's end and 1 past the head; y across it, -1 to 1.
attribute vec3 position;

// From the tail's end along it, and from its line across it, in CSS pixels.
varying float vAlong;
varying float vAcross;

void main() {
  vec2 d = uHead - uTail;
  float len = length(d);
  vec2 dir = len > 0.001 ? d / len : vec2(1.0, 0.0);
  vec2 side = vec2(-dir.y, dir.x);
  vAlong = position.x * (len + uHalf);
  vAcross = position.y * uHalf;
  vec2 p = uTail + dir * vAlong + side * vAcross + uOffset;
  vec2 c = p / uView;
  gl_Position = vec4(c.x * 2.0 - 1.0, 1.0 - c.y * 2.0, 0.0, 1.0);
}
