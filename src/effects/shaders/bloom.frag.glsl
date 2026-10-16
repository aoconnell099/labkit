// Bloom's last pass: the sharp picture with its blur added over it.
// Premultiplied in, premultiplied out.
precision mediump float;

uniform sampler2D uSharp;
uniform sampler2D uGlow;
// How much blur to add: the theme's glow, scaled by the piece.
uniform float uStrength;

varying vec2 vUv;

// The glow fades to nothing over this share of the canvas at every edge. The blur
// samples clamp at the border, so without it the glow reaches the edge still lit
// and the canvas shows as a faint square over whatever is behind it: the stars,
// an orbit path, another orb.
const float EDGE = 0.12;

void main() {
  vec2 e = min(vUv, 1.0 - vUv);
  float fade = smoothstep(0.0, EDGE, min(e.x, e.y));
  vec4 c = texture2D(uSharp, vUv) + texture2D(uGlow, vUv) * (uStrength * fade);
  gl_FragColor = clamp(c, 0.0, 1.0);
}
