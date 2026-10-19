// The star dust's sky, drawn every frame: the glow texture sky.frag.glsl drew,
// slid with the farthest stars and wrapping as they do, at a quarter of the
// brightness it was stored at, with a hair of dither so the faint gradient
// shows no steps. Premultiplied output, for additive blending.
precision highp float;

uniform sampler2D uSky;
// How far the farthest stars have moved, in the field's units (0 to 1).
uniform vec2 uShift;

varying vec2 vUv;

void main() {
  vec2 s = vec2(vUv.x, 1.0 - vUv.y) - uShift;
  vec3 c = texture2D(uSky, vec2(s.x, 1.0 - s.y)).rgb * 0.25;
  float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  c = max(c + (n - 0.5) / 255.0, 0.0);
  gl_FragColor = vec4(c, max(c.r, max(c.g, c.b)));
}
