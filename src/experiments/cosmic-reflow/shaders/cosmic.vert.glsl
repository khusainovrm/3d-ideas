uniform float uTime;
uniform float uScroll;
uniform float uTransition;
uniform float uPixelRatio;
uniform float uAspectScale;
uniform vec2 uPointer;
uniform float uPointerStrength;
uniform float uSpeakerFocus;
uniform float uSpeakerInfluence;
uniform float uFormFocus;
uniform float uPulse;
uniform float uHoveredPlanet;
uniform float uSelectedPlanet;
uniform float uReducedMotion;

attribute vec3 aLine;
attribute vec3 aGalaxy;
attribute vec3 aWheel;
attribute vec3 aLogo;
attribute vec3 aLogoColor;
attribute float aSeed;
attribute float aSize;
attribute float aOpacity;
attribute float aAccent;
attribute float aPlanetId;
attribute float aPlanetSize;

varying float vOpacity;
varying float vAccent;
varying float vGalaxy;
varying float vWheel;
varying float vLogo;
varying float vPointer;
varying vec3 vLogoColor;
varying float vPlanet;
varying float vPlanetId;
varying float vPlanetHover;
varying float vPlanetSelected;

float easeInOut(float value) {
  return value * value * (3.0 - 2.0 * value);
}

float transitionAt(float start, float end) {
  return easeInOut(smoothstep(start, end, uScroll));
}

mat2 rotate2d(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

void main() {
  float toLine = transitionAt(0.14, 0.29);
  float toGalaxy = transitionAt(0.35, 0.52);
  float toWheel = transitionAt(0.64, 0.79);
  float toLogo = transitionAt(0.88, 0.98);
  vec3 reflowPosition = position;
  reflowPosition = mix(reflowPosition, aLine, toLine);
  reflowPosition = mix(reflowPosition, aGalaxy, toGalaxy);
  reflowPosition = mix(reflowPosition, aWheel, toWheel);
  reflowPosition = mix(reflowPosition, aLogo, toLogo);

  float nebulaPresence = 1.0 - smoothstep(0.13, 0.29, uScroll);
  float galaxyPresence = smoothstep(0.38, 0.52, uScroll) * (1.0 - smoothstep(0.64, 0.79, uScroll));
  float wheelPresence = smoothstep(0.67, 0.79, uScroll) * (1.0 - smoothstep(0.88, 0.98, uScroll));
  float logoPresence = smoothstep(0.9, 0.99, uScroll);

  vec3 nebulaCenter = vec3(3.15, 0.0, 0.0);
  vec3 nebulaLocal = reflowPosition - nebulaCenter;
  nebulaLocal.xy = rotate2d(uTime * 0.018) * nebulaLocal.xy;
  nebulaLocal *= 1.0 + sin(uTime * 0.38 + aSeed * 15.0) * 0.018 * nebulaPresence;
  reflowPosition = mix(reflowPosition, nebulaCenter + nebulaLocal, nebulaPresence);

  vec3 galaxyCenter = vec3(3.15, -0.1, 0.0);
  vec3 galaxyLocal = reflowPosition - galaxyCenter;
  galaxyLocal.xy = rotate2d(uTime * 0.075) * galaxyLocal.xy;
  float tilt = 0.24;
  galaxyLocal.yz = rotate2d(tilt) * galaxyLocal.yz;
  reflowPosition = mix(reflowPosition, galaxyCenter + galaxyLocal, galaxyPresence);

  vec3 wheelCenter = vec3(-3.1, 0.0, 0.0);
  vec3 wheelLocal = reflowPosition - wheelCenter;
  wheelLocal.xy = rotate2d(0.14 + sin(uTime * 0.16) * 0.025) * wheelLocal.xy;
  reflowPosition = mix(reflowPosition, wheelCenter + wheelLocal, wheelPresence);

  float driftStrength = mix(0.065, 0.008, logoPresence);
  vec3 drift = vec3(
    sin(uTime * 0.17 + aSeed * 17.0),
    cos(uTime * 0.13 + aSeed * 23.0),
    sin(uTime * 0.11 + aSeed * 31.0)
  );
  reflowPosition += drift * driftStrength * (0.55 + uTransition * 0.75);

  float linePresence = smoothstep(0.16, 0.29, uScroll) * (1.0 - smoothstep(0.35, 0.52, uScroll));
  float speakerBand = 1.0 - smoothstep(0.05, 0.24, abs(aSeed - uSpeakerFocus));
  reflowPosition.xy += normalize(vec2(0.3, 1.0)) * speakerBand * linePresence * uSpeakerInfluence * 0.12;

  if (uFormFocus > -0.5) {
    float sector = floor(fract(aSeed * 13.7) * 4.0);
    float match = 1.0 - step(0.3, abs(sector - uFormFocus));
    vec2 direction = normalize(reflowPosition.xy - wheelCenter.xy + vec2(0.0001));
    reflowPosition.xy += direction * match * wheelPresence * 0.14;
  }

  vec2 pointerWorld = vec2(uPointer.x * 10.0, uPointer.y * 5.8);
  vec2 pointerDelta = reflowPosition.xy - pointerWorld;
  float pointerDistance = length(pointerDelta);
  float pointerInfluence = smoothstep(2.4, 0.0, pointerDistance) * uPointerStrength * (nebulaPresence + linePresence * 0.35);
  reflowPosition.xy += normalize(pointerDelta + vec2(0.0001)) * pointerInfluence * 0.23;

  vec2 pulseDirection = normalize(reflowPosition.xy - wheelCenter.xy + vec2(0.0001));
  reflowPosition.xy += pulseDirection * sin(uPulse * 3.14159265) * wheelPresence * 0.65;

  reflowPosition.x *= uAspectScale;
  vec4 mvPosition = modelViewMatrix * vec4(reflowPosition, 1.0);
  float focusBoost = speakerBand * linePresence * uSpeakerInfluence * 0.7 + uPulse * wheelPresence * 0.45;
  float logoSize = mix(1.0, 1.32, logoPresence);
  float planetMask = step(-0.5, aPlanetId);
  float planetHover = planetMask * (1.0 - step(0.25, abs(aPlanetId - uHoveredPlanet)));
  float planetSelected = planetMask * (1.0 - step(0.25, abs(aPlanetId - uSelectedPlanet)));
  float planetPulse = mix(0.0, sin(uTime * 1.25 + aPlanetId * 1.73) * 0.12, 1.0 - uReducedMotion);
  float planetBaseScale = 1.0 + aPlanetSize + planetPulse + planetHover * 0.38 + planetSelected * 0.2;
  float planetScale = mix(1.0, planetBaseScale * 2.5, planetMask * galaxyPresence);
  gl_PointSize = clamp(uPixelRatio * aSize * (1.0 + focusBoost) * logoSize * planetScale * (25.0 / max(1.0, -mvPosition.z)), 1.0, 29.0);
  gl_Position = projectionMatrix * mvPosition;

  vOpacity = aOpacity;
  vAccent = aAccent;
  vGalaxy = galaxyPresence;
  vWheel = wheelPresence;
  vLogo = logoPresence;
  vPointer = pointerInfluence;
  vLogoColor = aLogoColor;
  vPlanet = planetMask * galaxyPresence;
  vPlanetId = aPlanetId;
  vPlanetHover = planetHover * galaxyPresence;
  vPlanetSelected = planetSelected * galaxyPresence;
}
