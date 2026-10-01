uniform float uTime;
uniform float uState;
uniform float uPixelRatio;
uniform float uVisibility;
uniform vec2 uPointer;
uniform vec2 uViewport;
uniform float uPointerStrength;
uniform float uHeroReveal;
uniform float uIntroNoise;
uniform float uNoiseAmplitude;
uniform float uNoiseSpeed;

attribute vec3 aAbout;
attribute vec3 aProgram;
attribute vec3 aRegistration;
attribute vec3 aPartners;
attribute float aSeed;
attribute float aSize;
attribute float aJourneyVisibility;
attribute float aHeroSize;
attribute float aHeroAlpha;
attribute float aHeroGlow;
attribute float aHeroDrift;

varying float vAlpha;
varying float vAccent;
varying float vPointer;

vec3 statePosition(float state) {
  if (state < 1.0) return mix(position, aAbout, smoothstep(0.0, 1.0, state));
  if (state < 2.0) return mix(aAbout, aProgram, smoothstep(1.0, 2.0, state));
  if (state < 3.0) return mix(aProgram, aRegistration, smoothstep(2.0, 3.0, state));
  return mix(aRegistration, aPartners, smoothstep(3.0, 4.0, state));
}

void main() {
  vec3 p = statePosition(uState);
  float heroAmount = 1.0 - smoothstep(0.0, 0.85, uState);
  float heroReveal = smoothstep(0.0, 1.0, uHeroReveal);

  // A few incommensurate waves give every particle a slow, non-repeating
  // drift without the cost and visual agitation of high-frequency noise.
  float noiseTime = uTime * uNoiseSpeed;
  float phase = aSeed * 47.123;
  float personalAmplitude = mix(0.55, 1.0, fract(aSeed * 73.71));
  vec3 introDrift = vec3(
    sin(noiseTime * 0.83 + phase) + sin(noiseTime * 1.71 + phase * 1.37) * 0.46,
    cos(noiseTime * 0.71 + phase * 1.91) + sin(noiseTime * 1.43 + phase * 0.67) * 0.42,
    sin(noiseTime * 0.59 + phase * 2.13) + cos(noiseTime * 1.27 + phase * 0.91) * 0.36
  );
  float driftStrength = mix(1.0, aHeroDrift, heroAmount);
  p += introDrift * uNoiseAmplitude * personalAmplitude * uIntroNoise * driftStrength;

  p.x += sin(uTime * 0.16 + aSeed * 19.0) * 0.035 * driftStrength;
  p.y += cos(uTime * 0.13 + aSeed * 23.0) * 0.03 * driftStrength;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec4 clip = projectionMatrix * mv;
  vec2 particleNdc = clip.xy / max(0.0001, clip.w);
  vec2 pointerDeltaPx = (particleNdc - uPointer) * 0.5 * uViewport;
  float pointerDistancePx = max(abs(pointerDeltaPx.x), abs(pointerDeltaPx.y));
  float pointerInfluence = (1.0 - smoothstep(26.0, 30.0, pointerDistancePx)) * uPointerStrength;
  float perspective = 28.0 / max(2.0, -mv.z);
  float heroGlow = mix(1.0, aHeroGlow, heroAmount);
  // The reference is photographic dust: most hero grains are close to one
  // physical pixel, while only the three terminal nodes get a larger halo.
  float heroSize = aHeroSize * 0.6;
  float particleSize = mix(aSize, heroSize, heroAmount);
  gl_PointSize = min(12.0, particleSize * heroGlow * uPixelRatio * perspective);
  gl_Position = clip;
  float regularAlpha = (0.22 + fract(aSeed * 31.7) * 0.48) * aJourneyVisibility;
  // Each particle gets a stable random start time. Start times occupy the
  // first 82% of the interval, leaving 18% for every individual fade-in.
  float revealStart = fract(aSeed * 91.713 + aHeroDrift * 17.17) * 0.82;
  float revealOpacity = smoothstep(revealStart, revealStart + 0.18, heroReveal);
  float particleAlpha = mix(regularAlpha, aHeroAlpha * 0.82, heroAmount);
  vAlpha = uVisibility * particleAlpha * mix(1.0, revealOpacity, heroAmount);
  vAccent = step(mix(0.965, 0.997, heroAmount), aSeed);
  vPointer = pointerInfluence;
}
