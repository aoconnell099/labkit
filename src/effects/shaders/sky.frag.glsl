// The star dust's sky: the glow of the band the stars gather along, drawn once
// into a texture whenever the element's shape, its theme or its sky changes
// (sky.ts), then slid with the farthest stars every frame (skyquad).
//
// Everything is in the field's own units, 0 to 1 across and down, and wraps
// at its edges like the stars: the band is where x + y is near uBandAt, x
// mirrored when uFlip is set (star-dust.ts lays each sky's band so), and
// the noise repeats exactly over the field (noise.glsl), so a slide never
// shows a seam.
//
// Its alpha is how thick the band's stars are at each place (star.vert.glsl's
// band stars read it), not the glow's cover: skyquad reads only the colour.
//
// Each sky follows two or more of the owner's photographs, a little dimmer so it
// never overpowers what is in front of it, its band wide and ragged, wandering,
// swelling and torn, with knots and dark rifts:
// - deep blue: a royal blue night and a soft pale-blue band with dark lanes, its
//   colour written here, twice as bright as it is drawn so the faint glow keeps
//   more of an 8-bit texture's steps.
// - violet: not colour but the nebula's shape, which skyquad colours by where it
//   is on the screen, cyan at the top through blue and purple to pink at the
//   bottom, as in the owner's photograph (2026-10-20: the band read as "grey/white
//   clouds instead of the reference image"): red is how much cloud, swirled and
//   folded into filaments and gritty with unresolved stars; green its bright
//   heart; blue a nudge to its colour (0.5 none), so the colours wander a little.
// - colourful: a dark teal night, and through the middle a striking band, its
//   heart bright peach to cream, gritty, cut deep by dark lanes, in a haze of rose
//   and teal (its colour, as deep blue's). The swirled dust in many colours is
//   skydust.frag.glsl's.
precision highp float;

// Which sky: 1 deep blue, 2 blue, violet and pink, 3 colourful.
uniform float uSky;
// The theme's accent, as sRGB 0 to 1.
uniform vec3 uAccent;
// The noise lattice's cells across and down the field, whole numbers.
uniform vec2 uPeriod;
// Where the band crosses (x + y), as star-dust.ts lays the stars for this sky.
uniform float uBandAt;
// 1 when the band runs from top left to bottom right (x mirrored), else 0.
uniform float uFlip;
// The texture's size, in texels.
uniform vec2 uTexels;

varying vec2 vUv;

// #include noise

void main() {
  // The field's units, down from the top, as the stars are placed.
  vec2 s = vec2(vUv.x, 1.0 - vUv.y);
  // Half the lattice, kept to whole cells so it still repeats exactly over the field.
  vec2 coarse = max(vec2(1.0), floor(uPeriod * 0.5));
  // Broad, slow patches across the whole field: the sky is never one flat colour.
  float broad = fbm(s, coarse, 6.0);

  // Across the band, wrapping: 0 on its line, -0.5 to 0.5. It is never a clean stripe
  // (the owner, 2026-10-20: "a little bit wider and more chaotic like the reference
  // images"): its line wanders, it swells and narrows along its length, and its edges are
  // torn, more than its heart. Each is added before the wrap, so the wrap never seams.
  float fx = uFlip > 0.5 ? 1.0 - s.x : s.x;
  float d0 = fract(fx + s.y - uBandAt + 0.5) - 0.5;
  float wander = (fbm(s, coarse, 11.0) - 0.5) * 0.5;
  float tear = (fbm(s, uPeriod, 13.0) - 0.5) * 0.36 * (0.35 + 0.65 * smoothstep(0.03, 0.2, abs(d0)));
  float swell = 0.65 + 0.9 * smoothstep(0.3, 0.7, fbm(s, coarse, 12.0));
  float d = (fract(d0 + wander + tear + 0.5) - 0.5) / swell;
  float ad = abs(d);
  float haze = exp(-d * d / (2.0 * 0.21 * 0.21));
  float body = exp(-d * d / (2.0 * 0.14 * 0.14));
  float core = exp(-d * d / (2.0 * 0.085 * 0.085));

  // Clouds that mottle the band, knots of brighter cloud in it, fine dark lanes of dust down
  // its heart, and broad dark rifts that blot out whole stretches of it, more to one side of
  // its line than on it, as the galaxy's great rift runs beside its bright heart.
  float mottle = smoothstep(0.35, 0.75, fbm(s, uPeriod, 1.0));
  float knots = smoothstep(0.55, 0.8, fbm(s, uPeriod * 2.0, 15.0));
  float ridge = 1.0 - abs(fbm(s, uPeriod * 2.0, 2.0) * 2.0 - 1.0);
  float rd = d - 0.05;
  float rift = smoothstep(0.5, 0.68, fbm(s, uPeriod, 14.0)) * exp(-rd * rd / (2.0 * 0.07 * 0.07));
  float lanes = max(smoothstep(0.72, 0.95, ridge) * smoothstep(0.14, 0.0, ad), 0.8 * rift);
  mottle = min(mottle + 0.6 * knots, 1.3);
  // How thick the band's stars are here: thickest in its heart and its knots, thinner
  // round it, and few in its lanes and rifts, as the dust there hides them.
  float stars = body * (0.5 + 0.5 * mottle) * (1.0 - 0.85 * lanes) + 0.3 * haze * (1.0 - 0.6 * lanes);

  vec3 col;
  if (uSky < 1.5) {
    // Deep blue: a royal blue night, deeper in patches, and a soft band of pale-blue
    // cloud with dark lanes in it, a little paler where its clouds gather.
    vec3 night = vec3(0.03, 0.07, 0.19) * (0.75 + 0.45 * broad);
    vec3 band = mix(uAccent, vec3(0.42, 0.58, 1.0), 0.7);
    float light = 0.08 * haze + 0.16 * body * (0.35 + 0.65 * mottle);
    col = night + band * light * (1.0 - 0.75 * lanes) + vec3(0.7, 0.8, 1.0) * core * mottle * 0.06;
  } else if (uSky < 2.5) {
    // Blue, violet and pink: the nebula's shape, which skyquad colours. A broad column of
    // cloud down the band, swirled and folded, with filaments in it and grit all through
    // it, and fainter cloud across the rest of the sky.
    vec2 w = swirl(s, coarse, 31.0, 0.32);
    float cloud = smoothstep(0.32, 0.78, fbm(w, uPeriod, 35.0));
    float fil = pow(ridged(w, uPeriod * 2.0, 36.0), 5.0);
    float fine = pow(ridged(w, uPeriod * 4.0, 37.0), 7.0);
    float g = grit(s, uTexels, 38.0);
    float wide = exp(-d * d / (2.0 * 0.26 * 0.26));
    float neb = wide * (0.55 * cloud + 0.55 * fil + 0.3 * fine) + (1.0 - wide) * 0.3 * cloud * (0.4 + fil);
    neb *= (0.8 + 0.4 * g) * (1.0 - 0.75 * lanes);
    // Its bright heart: where the band's body and its knots gather, gritty too.
    float heart = body * smoothstep(0.45, 0.95, cloud * 0.6 + mottle * 0.5) * (1.0 - 0.9 * lanes) * (0.75 + 0.5 * g);
    float tint = fbm(w, coarse, 39.0);
    gl_FragColor = vec4(clamp(neb, 0.0, 1.0), clamp(heart, 0.0, 1.0), tint, clamp(stars, 0.0, 1.0));
    return;
  } else {
    // Colourful: a dark teal night, a haze of rose and teal round the band, and its heart
    // striking, glowing peach to cream where its clouds gather, gritty with stars, threaded
    // with fine dark lanes rather than blotted by broad ones.
    vec3 night = vec3(0.01, 0.04, 0.06) * (0.8 + 0.4 * broad);
    vec3 teal = vec3(0.12, 0.55, 0.62);
    vec3 rose = vec3(0.62, 0.32, 0.5);
    vec2 w = swirl(s, coarse, 41.0, 0.2);
    float cloud = smoothstep(0.25, 0.75, fbm(w, uPeriod, 42.0));
    float g = grit(s, uTexels, 43.0);
    vec3 warm = mix(vec3(1.0, 0.55, 0.3), vec3(1.0, 0.42, 0.45), smoothstep(0.45, 0.8, fbm(s, coarse, 7.0)));
    float thread = smoothstep(0.72, 0.95, ridged(w, uPeriod * 3.0, 44.0)) * smoothstep(0.18, 0.0, ad);
    float cut = 1.0 - 0.8 * max(thread, 0.7 * rift);
    float heart = body * (0.35 + 0.65 * mottle) * (0.55 + 0.45 * cloud) * (0.8 + 0.4 * g);
    col = night + teal * max(haze - 1.3 * body, 0.0) * 0.12 + rose * max(haze - body * 0.5, 0.0) * 0.1
        + warm * heart * 0.4 * cut
        + vec3(1.0, 0.86, 0.72) * body * body * (0.3 + 0.7 * mottle) * (0.4 + 0.6 * cloud) * 0.5 * cut;
  }
  // Twice as bright, capped at 1 as a whole rather than channel by channel: a channel
  // clipped alone turns the band's brightest heart grey or yellow once it is drawn at half.
  col *= 2.0;
  col /= max(1.0, max(col.r, max(col.g, col.b)));
  gl_FragColor = vec4(col, clamp(stars, 0.0, 1.0));
}
