// Bloom's last pass: the sharp picture with its blur added over it.
// Premultiplied in, premultiplied out.
precision mediump float;

uniform sampler2D uSharp;
uniform sampler2D uGlow;
// How much blur to add: the theme's glow, scaled by the piece.
uniform float uStrength;

varying vec2 vUv;

void main() {
  vec4 c = texture2D(uSharp, vUv) + texture2D(uGlow, vUv) * uStrength;
  gl_FragColor = clamp(c, 0.0, 1.0);
}
