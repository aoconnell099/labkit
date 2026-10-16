// A square covering the whole target, for bloom's passes: its corners are
// already where the screen's are, so no camera is used.
// Plain GLSL ES 1.00; every uniform and attribute declared here.
precision highp float;

attribute vec3 position;
attribute vec2 uv;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
