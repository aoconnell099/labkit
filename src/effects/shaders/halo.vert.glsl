// A square facing the viewer: behind an orb for its glow, or the planet orb's
// own sphere, worked out per pixel in planet.frag.glsl.
// Plain GLSL ES 1.00; every uniform and attribute declared here.
precision highp float;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

attribute vec3 position;
attribute vec2 uv;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
