uniform float uTime;
uniform float uState;
uniform float uPixelRatio;
uniform float uVisibility;
uniform vec2 uPointer;
uniform vec2 uViewport;
uniform float uPointerStrength;
uniform float uPointerRadius;
uniform float uPointerAttraction;
uniform float uHeroReveal;
uniform float uNavFormation;
uniform float uNavHover0;
uniform float uNavHover1;
uniform float uNavHover2;
uniform float uNavHover3;
uniform float uNavHover4;
uniform float uNavHoverScale;
uniform float uNavHoverBrightness;
uniform float uNavSelectedFigure;
uniform float uNavSelectedBrightness;
uniform float uNavCheckerColumns;
uniform float uNavCheckerStepX;
uniform float uNavCheckerStepY;
uniform float uNavMobile;
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
attribute vec3 aNavTarget;
attribute vec3 aNavData;

varying float vAlpha;
varying float vAccent;
varying float vNavBrightness;

float navHover(float figureIndex) {
  if (figureIndex < 0.5) return uNavHover0;
  if (figureIndex < 1.5) return uNavHover1;
  if (figureIndex < 2.5) return uNavHover2;
  if (figureIndex < 3.5) return uNavHover3;
  return uNavHover4;
}

vec3 navCenter(float figureIndex) {
  float columns = max(1.0, uNavCheckerColumns);
  float column = mod(figureIndex, columns);
  float row = floor(figureIndex / columns);
  float upperRow = 1.0 - mod(figureIndex, 2.0);
  float y = mix(-uNavCheckerStepY, uNavCheckerStepY, upperRow) - row * uNavCheckerStepY * 2.4;
  return vec3(-2.2 + column * uNavCheckerStepX, y, 0.0);
}

vec3 navMobileCenter(float figureIndex) {
  if (figureIndex < 0.5) return vec3(-2.3, 1.0, 0.0);
  if (figureIndex < 1.5) return vec3(0.0, 0.05, 0.0);
  if (figureIndex < 2.5) return vec3(2.0, 1.0, 0.0);
  if (figureIndex < 3.5) return vec3(-1.2, -1.5, 0.0);
  return vec3(1.25, -2.25, 0.0);
}

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
  float figureIndex = aNavData.x;
  float navMembership = aNavData.y;
  float figureHover = navHover(figureIndex) * navMembership;
  float selectedAmount = (1.0 - step(0.25, abs(figureIndex - uNavSelectedFigure))) * navMembership;
  float figureProgress = smoothstep(aNavData.z, min(1.0, aNavData.z + 0.28), uNavFormation)
    * navMembership * heroAmount;
  vec3 desktopCenter = navCenter(figureIndex);
  vec3 figureCenter = mix(desktopCenter, navMobileCenter(figureIndex), uNavMobile);
  vec3 scaledNavTarget = figureCenter
    + (aNavTarget - desktopCenter) * mix(1.0, uNavHoverScale, figureHover);
  p = mix(p, scaledNavTarget, figureProgress);

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
  float pointerDistancePx = length(pointerDeltaPx);
  float pointerInfluence = (1.0 - smoothstep(uPointerRadius * 0.2, uPointerRadius, pointerDistancePx))
    * uPointerStrength * heroAmount;
  // Pull nearby particles towards the pointer in screen space. The center
  // remains stable while the outer edge creates a soft local distortion.
  vec2 pointerPull = (uPointer - particleNdc) * pointerInfluence * uPointerAttraction;
  clip.xy += pointerPull * clip.w;
  float perspective = 28.0 / max(2.0, -mv.z);
  float heroGlow = mix(1.0, aHeroGlow, heroAmount);
  // The reference is photographic dust: most hero grains are close to one
  // physical pixel, while only the three terminal nodes get a larger halo.
  float heroSize = aHeroSize * 0.6;
  float particleSize = mix(aSize, heroSize, heroAmount);
  particleSize *= mix(1.0, 1.18, figureProgress);
  particleSize *= mix(1.0, uNavHoverScale, figureHover * figureProgress);
  gl_PointSize = min(12.0, particleSize * heroGlow * uPixelRatio * perspective);
  gl_Position = clip;
  float regularAlpha = (0.22 + fract(aSeed * 31.7) * 0.48) * aJourneyVisibility;
  // Each particle gets a stable random start time. Start times occupy the
  // first 82% of the interval, leaving 18% for every individual fade-in.
  float revealStart = fract(aSeed * 91.713 + aHeroDrift * 17.17) * 0.82;
  float revealOpacity = smoothstep(revealStart, revealStart + 0.18, heroReveal);
  float particleAlpha = mix(regularAlpha, aHeroAlpha * 0.82, heroAmount);
  float cloudDim = mix(1.0, 0.48, uNavFormation * (1.0 - navMembership) * heroAmount);
  float figureAlpha = mix(1.0, 1.3, figureProgress);
  vAlpha = uVisibility * particleAlpha * mix(1.0, revealOpacity, heroAmount) * cloudDim * figureAlpha;
  vAccent = step(mix(0.965, 0.997, heroAmount), aSeed);
  float formedBrightness = mix(1.0, 1.35, figureProgress);
  float selectedBrightness = mix(1.0, uNavSelectedBrightness, selectedAmount * figureProgress);
  vNavBrightness = formedBrightness
    * mix(1.0, uNavHoverBrightness, figureHover * figureProgress)
    * selectedBrightness;
}
