// Bloom's blur: nine samples along one direction, weighted like a bell curve.
// Run once across and once down.
precision mediump float;

uniform sampler2D uTex;
// One step along the blur, in texture units.
uniform vec2 uStep;

varying vec2 vUv;

void main() {
  vec4 c = texture2D(uTex, vUv) * 0.2270270;
  c += (texture2D(uTex, vUv + uStep * 1.3846154) + texture2D(uTex, vUv - uStep * 1.3846154)) * 0.3162162;
  c += (texture2D(uTex, vUv + uStep * 3.2307692) + texture2D(uTex, vUv - uStep * 3.2307692)) * 0.0702703;
  gl_FragColor = c;
}
