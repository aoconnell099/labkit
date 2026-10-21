// The star dust's sky, drawn every frame: the textures sky.frag.glsl and
// skydust.frag.glsl drew, slid with the farthest stars and wrapping as they do,
// with a hair of dither so the faint gradient shows no steps. Over it, a glow
// along the bottom of the element that stays put, like the light over a horizon
// in the owner's photographs: pale blue for the deep blue sky, violet for the
// colourful one, and magenta-pink for the violet one.
// - deep blue and colourful: the texture is colour, stored twice as bright as it
//   is drawn.
// - violet: the texture is the nebula's shape, coloured here by where it is on
//   the screen, so the colours stay put as it slides: cyan at the top, through
//   blue and purple, to magenta and pink at the bottom, as in the owner's
//   photograph, a little dimmer.
// - colourful: the dust over it, its colour as skydust.frag.glsl baked it: out of
//   the band, slid with the sky as the band is; from below, where it is on the
//   screen, unslid.
// - a picture, when the app gives one: drawn as it is in place of all of it, the
//   horizon included, covering the element with a margin round it, and shifted
//   only by the app's offset, within that margin.
// Premultiplied output, for additive blending.
precision highp float;

uniform sampler2D uSky;
uniform sampler2D uDust;
// The app's picture, and 1 when it is drawn instead of the textures.
uniform sampler2D uPicture;
uniform float uHasPicture;
// How much of the picture shows across and down (0 to 1), and how far it has shifted,
// in the picture's own units: sky.ts keeps the shift within the margin.
uniform vec2 uPicScale;
uniform vec2 uPicShift;
// How far the farthest stars have moved, in the field's units (0 to 1).
uniform vec2 uShift;
// Which sky: 1 deep blue, 2 blue, violet and pink, 3 colourful.
uniform float uKind;
// Where the colourful sky's dust comes from: 0 the band, 1 below.
uniform float uOrigin;

varying vec2 vUv;

// Four colours down the screen, `t` 0 at the top to 1 at the bottom.
vec3 down(float t, vec3 top, vec3 upper, vec3 lower, vec3 bottom) {
  vec3 c = mix(top, upper, smoothstep(0.0, 0.4, t));
  c = mix(c, lower, smoothstep(0.35, 0.7, t));
  return mix(c, bottom, smoothstep(0.65, 1.0, t));
}

void main() {
  float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  if (uHasPicture > 0.5) {
    vec3 p = texture2D(uPicture, 0.5 + (vUv - 0.5) * uPicScale + uPicShift).rgb;
    p = max(p + (n - 0.5) / 255.0, 0.0);
    gl_FragColor = vec4(p, max(p.r, max(p.g, p.b)));
    return;
  }
  vec2 s = vec2(vUv.x, 1.0 - vUv.y) - uShift;
  vec2 at = vec2(s.x, 1.0 - s.y);
  vec4 tex = texture2D(uSky, at);
  vec3 c;
  if (uKind > 1.5 && uKind < 2.5) {
    // Violet: down the screen, nudged a little by the nebula's own tint.
    float t = clamp(1.0 - vUv.y + (tex.b - 0.5) * 0.45, 0.0, 1.0);
    vec3 night = down(t, vec3(0.05, 0.1, 0.21), vec3(0.04, 0.06, 0.2), vec3(0.08, 0.04, 0.19), vec3(0.15, 0.04, 0.15));
    vec3 cloud = down(t, vec3(0.12, 0.45, 0.72), vec3(0.1, 0.26, 0.68), vec3(0.32, 0.16, 0.62), vec3(0.72, 0.18, 0.5));
    vec3 light = down(t, vec3(0.42, 0.85, 0.98), vec3(0.4, 0.62, 1.0), vec3(0.7, 0.5, 0.98), vec3(1.0, 0.55, 0.72));
    c = night * (1.0 - 0.4 * tex.r) + cloud * tex.r * 0.62 + light * tex.g * 0.42;
  } else {
    c = tex.rgb * 0.5;
  }
  if (uKind > 2.5) {
    // The dust, its colour baked in its texture.
    c += texture2D(uDust, uOrigin > 0.5 ? vUv : at).rgb * 0.85;
  }
  // The horizon: brightest at the bottom's middle, rising a third of the way up.
  float x = vUv.x - 0.5;
  float rise = exp(-vUv.y * 5.0) * (0.55 + 0.45 * exp(-x * x * 6.0));
  vec3 horizon = uKind < 1.5 ? vec3(0.08, 0.15, 0.36)
               : uKind < 2.5 ? vec3(0.5, 0.15, 0.42)
               : vec3(0.26, 0.16, 0.6);
  c += horizon * rise;
  c = max(c + (n - 0.5) / 255.0, 0.0);
  gl_FragColor = vec4(c, max(c.r, max(c.g, c.b)));
}
