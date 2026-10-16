// Bloom's first pass: the sharp picture shrunk, four samples a pixel so no
// hair-thin line falls between them.
precision mediump float;

uniform sampler2D uTex;
// One pixel of the sharp picture, in texture units.
uniform vec2 uTexel;

varying vec2 vUv;

void main() {
  vec2 d = uTexel * 1.5;
  gl_FragColor = 0.25 * (texture2D(uTex, vUv + vec2(-d.x, -d.y)) + texture2D(uTex, vUv + vec2(d.x, -d.y))
                       + texture2D(uTex, vUv + vec2(-d.x, d.y)) + texture2D(uTex, vUv + vec2(d.x, d.y)));
}
