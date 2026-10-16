// The filament orb's lines: fragments, dials, the core's ribbon, threads and
// streaks, each leaned by its layer's own wander, flickering at its own rate,
// and lit by the pulse and the wave of light it sends out from the core.
// Plain GLSL ES 1.00. Every uniform and attribute is declared here and nothing
// is injected, so another engine can compile it as it stands.
precision highp float;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
// Each layer's lean right now: six shells, the core, the threads.
uniform mat3 uRot[8];
// Time, in loops of the theme's pace.
uniform float uTime;
// How bright the pulse is now, 0 to about 1.
uniform float uPulse;
// How far the latest pulse's wave has gone out, 0 to 1.
uniform float uWave;
// The latest pulse's strength, 0 to 1.
uniform float uStrength;

// A point on the piece, in orb radii, before its layer's lean.
attribute vec3 position;
// Which layer leans it, 0 to 7.
attribute float aLayer;
// The piece's own random number, 0 to 1.
attribute float aSeed;
// The piece's own brightness, about 0.3 to 1.
attribute float aGain;
// How far along its piece the point is, 0 to 1.
attribute float aAlong;
// 0 fragment, 1 dial, 2 core ribbon, 3 thread, 4 streak.
attribute float aKind;

// How much light the point gives, before the colour.
varying float vLight;
// How far toward white it burns, 0 to 1.
varying float vHeat;

void main() {
  int layer = int(aLayer + 0.5);
  vec3 p = uRot[layer] * position;
  float r = length(position);

  // Each piece blinks at its own rate; one in five goes fully dark between blinks.
  float rate = 0.6 + 2.4 * fract(aSeed * 7.13);
  float wave = 0.5 + 0.5 * sin(6.2831853 * (aSeed * 13.0 + uTime * rate));
  float blink = mix(0.35, 1.0, smoothstep(0.2, 0.8, wave));
  if (fract(aSeed * 31.7) > 0.8) blink *= step(0.4, fract(uTime * (0.8 + aSeed) + aSeed * 5.0));

  // The wave: a shell of light running out from the core as a pulse lands.
  float front = uWave * 1.4;
  float ring = exp(-pow((r - front) / 0.09, 2.0)) * uStrength * (1.0 - uWave);

  float light;
  float heat;
  if (aKind < 0.5) {            // fragment
    light = aGain * blink * (0.55 + 0.45 * uPulse);
    heat = 0.15;
  } else if (aKind < 1.5) {     // dial
    light = aGain * (0.85 + 0.15 * sin(6.2831853 * (uTime * 0.5 + aSeed))) * (0.7 + 0.5 * uPulse);
    heat = 0.3;
  } else if (aKind < 2.5) {     // core ribbon
    light = aGain * (1.1 + 0.9 * uPulse);
    heat = 0.75;
  } else if (aKind < 3.5) {     // thread: dim until a pulse cracks through it
    light = aGain * (0.3 + 1.3 * uPulse * blink);
    heat = 0.55;
  } else {                      // streak
    light = aGain * blink * (0.4 + 0.8 * uPulse);
    heat = 0.2;
  }
  light += ring * 1.6;
  heat += ring;

  // Soft ends on every piece, and the far side dimmer, so it reads as depth.
  float ends = smoothstep(0.0, 0.12, aAlong) * smoothstep(1.0, 0.88, aAlong);
  if (aKind > 0.5 && aKind < 1.5) ends = smoothstep(0.0, 0.06, aAlong) * smoothstep(1.0, 0.94, aAlong);
  float near = mix(0.28, 1.0, clamp(p.z * 0.5 + 0.5, 0.0, 1.0));

  vLight = light * ends * near;
  vHeat = heat * near;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
