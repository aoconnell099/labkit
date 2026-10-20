// The star dust's sky, drawn every frame: the glow texture sky.frag.glsl drew,
// slid with the farthest stars and wrapping as they do, at half the brightness
// it was stored at, with a hair of dither so the faint gradient shows no steps.
// Over it, a glow along the bottom of the element that stays put, like the
// light over a horizon in the owner's photographs: pale blue for the deep blue
// sky, violet for the colourful one, and for the violet sky magenta-pink, with
// the sky above it turning pink toward it as the band does in the photograph.
// Premultiplied output, for additive blending.
precision highp float;

uniform sampler2D uSky;
// How far the farthest stars have moved, in the field's units (0 to 1).
uniform vec2 uShift;
// Which sky: 1 deep blue, 2 blue, violet and pink, 3 colourful.
uniform float uKind;

varying vec2 vUv;

void main() {
  vec2 s = vec2(vUv.x, 1.0 - vUv.y) - uShift;
  vec3 c = texture2D(uSky, vec2(s.x, 1.0 - s.y)).rgb * 0.5;
  // The horizon: brightest at the bottom's middle, rising a third of the way up.
  float x = vUv.x - 0.5;
  float rise = exp(-vUv.y * 5.0) * (0.55 + 0.45 * exp(-x * x * 6.0));
  vec3 horizon = uKind < 1.5 ? vec3(0.08, 0.15, 0.36)
               : uKind < 2.5 ? vec3(0.5, 0.15, 0.42)
               : vec3(0.26, 0.16, 0.6);
  if (uKind > 1.5 && uKind < 2.5) {
    // Toward the bottom the sky's own light turns violet, then pink.
    float low = smoothstep(0.55, 0.0, vUv.y);
    float l = dot(c, vec3(0.3, 0.5, 0.2));
    vec3 pinkish = l * mix(vec3(1.2, 0.75, 1.6), vec3(1.8, 0.7, 1.15), smoothstep(0.3, 0.0, vUv.y));
    c = mix(c, pinkish, low * 0.7);
  }
  c += horizon * rise;
  float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  c = max(c + (n - 0.5) / 255.0, 0.0);
  gl_FragColor = vec4(c, max(c.r, max(c.g, c.b)));
}
