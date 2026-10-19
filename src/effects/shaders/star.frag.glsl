// The star dust: a small soft dot in the theme's ink, leaning toward the
// accent, and on the bright few a halo as strong as the theme's glow, each
// as bright as its twinkle lets it be now.
// Premultiplied output, for additive blending.
precision mediump float;

// The theme's ink and accent, as sRGB 0 to 1.
uniform vec3 uInk;
uniform vec3 uAccent;
// The theme's glow, 0 to 1.
uniform float uGlow;

varying float vBright;
varying float vTouch;
varying float vLit;
varying float vSize;
varying float vCore;

void main() {
  // From the point's centre, in CSS pixels.
  float d = length(gl_PointCoord - 0.5) * vSize;
  float core = 1.0 - smoothstep(vCore - 0.5, vCore + 0.5, d);
  float w = vSize * 0.22;
  float halo = vBright > 0.6 ? uGlow * 0.45 * exp(-d * d / (w * w)) : 0.0;
  vec3 colour = mix(uInk, uAccent, vTouch);
  // How bright it is, and its twinkle now: the halo comes and goes with the dot.
  float b = vBright * vLit;
  float a = min(1.0, core * b + halo * b);
  // The halo is the accent's more than the dot is.
  vec3 c = colour * core * b + mix(colour, uAccent, 0.5) * halo * b;
  gl_FragColor = vec4(min(c, vec3(1.0)), a);
}
