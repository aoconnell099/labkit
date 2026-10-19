// A texture drawn over the whole canvas as it is: premultiplied, for additive
// blending (planet-inside.ts scales its small smoke up with it).
precision mediump float;

uniform sampler2D uTex;

varying vec2 vUv;

void main() {
  gl_FragColor = texture2D(uTex, vUv);
}
