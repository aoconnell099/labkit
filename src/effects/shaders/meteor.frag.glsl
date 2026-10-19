// A shooting star: a fine line that brightens toward its head, a soft glow
// round it as strong as the theme's glow, and a small bright head.
// Premultiplied output, for additive blending.
precision mediump float;

// The tail's length, in CSS pixels.
uniform float uLen;
// How far it has faded in or out, 0 to 1.
uniform float uFade;
// The theme's glow, 0 to 1.
uniform float uGlow;
// Its colour, as sRGB 0 to 1.
uniform vec3 uColour;

varying float vAlong;
varying float vAcross;

void main() {
  // How far toward the head, 0 to 1, and how far past it, in CSS pixels.
  float t = clamp(vAlong / uLen, 0.0, 1.0);
  float past = clamp(vAlong - uLen, 0.0, 40.0);
  float r2 = past * past + vAcross * vAcross;
  float glowW = 2.5 + 3.0 * uGlow;
  float line = exp(-r2 / 0.5);
  float glow = 0.35 * uGlow * exp(-r2 / (glowW * glowW));
  // Dim at the tail's end, full at the head.
  float trail = t * t;
  // The head, a little rounder and brighter than the line.
  float h = clamp(vAlong - uLen, -40.0, 40.0);
  float head = exp(-(h * h + vAcross * vAcross) / 3.0);
  float a = min(1.0, uFade * ((line + glow) * trail + 0.8 * head));
  gl_FragColor = vec4(min(uColour * a * 1.2, vec3(1.0)), a);
}
