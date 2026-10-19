// Bloom's last pass: the sharp picture with its blur added over it.
// Premultiplied in, premultiplied out.
precision mediump float;

uniform sampler2D uSharp;
uniform sampler2D uGlow;
// How much blur to add: the theme's glow, scaled by the piece.
uniform float uStrength;

varying vec2 vUv;

// The glow fades to nothing in a ring that ends at the canvas edge, so it ends in
// a circle round the orb. The blur samples clamp at the border, so without it the
// glow reaches the edge still lit and the canvas shows as a faint square over
// whatever is behind it: the stars, an orbit path, another orb. FADE is where the
// fade starts, as a share of the distance from the centre to the edge.
const float FADE = 0.72;

void main() {
  float r = length(vUv - 0.5) * 2.0;
  float fade = 1.0 - smoothstep(FADE, 1.0, r);
  vec4 sharp = texture2D(uSharp, vUv);
  vec3 glow = texture2D(uGlow, vUv).rgb * (uStrength * fade);
  // The glow adds light only. Its alpha would be the sharp picture's alpha blurred, and a
  // glass ball's opacity spread round it is a dark disc that hides what is behind (the
  // vines that reach a planet, the stars). Coverage stays exactly the sharp picture's.
  gl_FragColor = clamp(vec4(sharp.rgb + glow, sharp.a), 0.0, 1.0);
}
