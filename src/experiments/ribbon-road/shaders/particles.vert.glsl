uniform float uTime;
uniform float uState;
uniform float uPixelRatio;
uniform float uVisibility;
uniform sampler2D uDisplacementTexture;
uniform vec2 uViewport;
uniform float uPointerStrength;
uniform float uPointerAttraction;
uniform float uHeroReveal;
uniform float uNavFormation;
uniform float uNebulaRemaining;
uniform float uNavHover0;
uniform float uNavHover1;
uniform float uNavHover2;
uniform float uNavHover3;
uniform float uNavHover4;
uniform float uNavHoverScale;
uniform float uNavHoverBrightness;
uniform float uNavSelectedFigure;
uniform float uNavSelectedBrightness;
uniform float uNavLayoutScale;
uniform vec3 uNavCenters[5];
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
varying float vFigureForeground;

float navHover(float figureIndex) {
  if (figureIndex < 0.5) return uNavHover0;
  if (figureIndex < 1.5) return uNavHover1;
  if (figureIndex < 2.5) return uNavHover2;
  if (figureIndex < 3.5) return uNavHover3;
  return uNavHover4;
}

vec3 navCenter(float figureIndex) {
  if (figureIndex < 0.5) return uNavCenters[0];
  if (figureIndex < 1.5) return uNavCenters[1];
  if (figureIndex < 2.5) return uNavCenters[2];
  if (figureIndex < 3.5) return uNavCenters[3];
  return uNavCenters[4];
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
  float navMembership = step(-0.5, figureIndex);
  float navFormationDelay = mod(aNavData.y, 256.0) / 255.0;
  float navAlphaByte = floor(aNavData.y / 256.0);
  float navSizeByte = mod(aNavData.z, 256.0);
  float navBrightnessByte = floor(aNavData.z / 256.0);
  vec3 navStyle = vec3(
    mix(0.08, 0.82, navAlphaByte / 255.0),
    mix(0.42, 1.75, navSizeByte / 255.0),
    mix(0.45, 1.45, navBrightnessByte / 255.0)
  );
  float figureHover = navHover(figureIndex) * navMembership;
  float selectedAmount = (1.0 - step(0.25, abs(figureIndex - uNavSelectedFigure))) * navMembership;
  float figureProgress = smoothstep(navFormationDelay, min(1.0, navFormationDelay + 0.28), uNavFormation)
    * navMembership * heroAmount;
  vec3 scaledNavTarget = navCenter(figureIndex)
    + aNavTarget * uNavLayoutScale * mix(1.0, uNavHoverScale, figureHover);
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
  // Keep the reference silhouette stable once assembled, especially the thin lens rim.
  float driftStrength = mix(1.0, aHeroDrift, heroAmount) * mix(1.0, 0.018, figureProgress);
  p += introDrift * uNoiseAmplitude * personalAmplitude * uIntroNoise * driftStrength;

  p.x += sin(uTime * 0.16 + aSeed * 19.0) * 0.035 * driftStrength;
  p.y += cos(uTime * 0.13 + aSeed * 23.0) * 0.03 * driftStrength;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec4 clip = projectionMatrix * mv;
  vec2 particleNdc = clip.xy / max(0.0001, clip.w);
  vec2 trailUv = particleNdc * 0.5 + 0.5;
  float inViewport = step(0.0, trailUv.x) * step(trailUv.x, 1.0)
    * step(0.0, trailUv.y) * step(trailUv.y, 1.0);
  float trail = texture2D(uDisplacementTexture, clamp(trailUv, 0.0, 1.0)).r;
  float displacement = smoothstep(0.08, 0.65, trail)
    * uPointerStrength * heroAmount * (1.0 - figureProgress) * inViewport;
  // Like the reference: stable personal directions, mostly towards the camera.
  // Once formed, section figures never receive displacement.
  float angle = aSeed * 6.2831853;
  vec3 direction = normalize(vec3(cos(angle) * 0.2, sin(angle) * 0.2, 1.0));
  mv.xyz += direction * displacement * uPointerAttraction * 12.0
    * mix(0.15, 1.0, fract(aSeed * 73.71));
  clip = projectionMatrix * mv;
  float perspective = 28.0 / max(2.0, -mv.z);
  float heroGlow = mix(1.0, aHeroGlow, heroAmount);
  // The reference is photographic dust: most hero grains are close to one
  // physical pixel, while only the three terminal nodes get a larger halo.
  // Project local-space cloud splats (intro scale .42, vertical FOV 46°).
  // Coverage stays continuous on resize and across quality levels.
  float heroSize = aHeroSize * uViewport.y * 0.017668;
  float particleSize = mix(aSize, heroSize, heroAmount);
  particleSize = mix(particleSize, navStyle.y, figureProgress);
  particleSize *= mix(1.0, uNavHoverScale, figureHover * figureProgress);
  float pointGlow = mix(heroGlow, 1.0, figureProgress);
  gl_PointSize = min(12.0, particleSize * pointGlow * uPixelRatio * perspective);
  gl_Position = clip;
  float regularAlpha = (0.22 + fract(aSeed * 31.7) * 0.48) * aJourneyVisibility;
  // Each particle gets a stable random start time. Start times occupy the
  // first 82% of the interval, leaving 18% for every individual fade-in.
  float revealStart = fract(aSeed * 91.713 + aHeroDrift * 17.17) * 0.82;
  float revealOpacity = smoothstep(revealStart, revealStart + 0.18, heroReveal);
  float particleAlpha = mix(regularAlpha, aHeroAlpha * 0.82, heroAmount);
  float cloudDim = mix(1.0, uNebulaRemaining, uNavFormation * (1.0 - navMembership) * heroAmount);
  // Background counterparts of migrating particles retain the original cloud.
  // Hide them before formation and outside hero (including journey morphs).
  float isBackgroundCopy = 1.0 - step(-1.5, figureIndex);
  float copyReveal = smoothstep(navFormationDelay, min(1.0, navFormationDelay + 0.28), uNavFormation);
  float backgroundCopyVisibility = mix(1.0, copyReveal * heroAmount, isBackgroundCopy);
  float revealedAlpha = particleAlpha * mix(1.0, revealOpacity, heroAmount);
  float styledAlpha = mix(revealedAlpha, min(1.0, navStyle.x), figureProgress);
  vAlpha = uVisibility * styledAlpha * cloudDim * backgroundCopyVisibility;
  vFigureForeground = figureProgress;
  vAccent = step(0.965, aSeed) * (1.0 - heroAmount) * (1.0 - figureProgress);
  float formedBrightness = mix(1.0, navStyle.z, figureProgress);
  float selectedBrightness = mix(1.0, uNavSelectedBrightness, selectedAmount * figureProgress);
  vNavBrightness = min(2.6, formedBrightness
    * mix(1.0, uNavHoverBrightness, figureHover * figureProgress)
    * selectedBrightness);
}
