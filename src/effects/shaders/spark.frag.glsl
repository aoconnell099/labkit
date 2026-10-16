// A spark: a soft round point in the accent, white at its heart where the theme
// glows. Premultiplied output, for additive blending.
precision mediump float;

uniform vec3 uColor;
uniform float uGlow;

varying float vLight;
varying float vHeat;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = clamp(vLight * (1.0 - smoothstep(0.2, 1.0, d)) * (0.45 + 0.4 * uGlow), 0.0, 1.0);
  vec3 c = mix(uColor, vec3(1.0), clamp(vHeat * uGlow * (1.0 - d), 0.0, 0.9));
  gl_FragColor = vec4(c * a, a);
}
