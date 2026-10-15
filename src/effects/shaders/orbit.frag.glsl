// The orbit rings, in the accent: a hairline, a glow band along it as strong as
// the theme's glow, and round nodes with a glow of their own. Brighter in
// front; behind the orb inside the rings, hidden by it. Premultiplied output,
// for additive blending.
precision mediump float;

// The theme's accent, as sRGB 0 to 1.
uniform vec3 uColor;
// The theme's glow, 0 to 1.
uniform float uGlow;
// The breath through the loop, 0 to 1, eased by the theme's curves.
uniform float uBreath;
// What is drawn: 0 the hairline, 1 the glow band, 2 the nodes.
uniform float uKind;
// The orb's disc, in the canvas's -1..1 units; 0 when no orb is inside.
uniform float uHole;
// A node's solid core, as a share of its point's radius.
uniform float uCore;

varying float vSide;
varying float vFront;
varying float vZ;
varying vec2 vNdc;

void main() {
  // Behind the centre and inside the orb's disc: the orb is in front of it.
  float behind = smoothstep(0.04, -0.04, vZ);
  float covered = behind * (1.0 - smoothstep(uHole - 0.03, uHole + 0.01, length(vNdc)));
  float depth = mix(0.25, 1.0, vFront) * (1.0 - covered) * (0.7 + 0.3 * uBreath);

  float a;
  if (uKind < 0.5) {
    a = 0.3 + 0.35 * uGlow;
  } else if (uKind < 1.5) {
    a = uGlow * 0.22 * exp(-vSide * vSide * 3.0);
  } else {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float core = 1.0 - smoothstep(uCore * 0.6, uCore, d);
    float halo = uGlow * 0.55 * exp(-d * d * 5.0) * (1.0 - smoothstep(0.75, 1.0, d));
    a = min(1.0, core + halo);
  }
  a *= depth;
  gl_FragColor = vec4(uColor * a, a);
}
