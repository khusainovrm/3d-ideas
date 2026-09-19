uniform float uTime;
uniform float uScroll;
uniform float uTransition;
uniform float uNoiseStrength;
uniform float uPixelRatio;
uniform float uAspectScale;
uniform vec2 uPointer;
uniform float uPointerStrength;
uniform float uActiveSpeaker;
uniform vec3 uInteractionPoint;
uniform float uInteractionStrength;
uniform float uFormFocus;
uniform float uPulse;

attribute vec3 aAbout;
attribute vec3 aSpeakers;
attribute vec3 aTestimonials;
attribute vec3 aRegistration;
attribute vec3 aPartners;
attribute float aSeed;
attribute float aSize;
attribute float aOpacity;
attribute float aSpeaker;
attribute float aAccent;

varying float vOpacity;
varying float vAccent;
varying float vDepth;

float easeInOut(float value) {
  return value * value * (3.0 - 2.0 * value);
}

float transitionAt(float start, float end) {
  return easeInOut(smoothstep(start, end, uScroll));
}

void main() {
  vec3 reflowPosition = position;
  reflowPosition = mix(reflowPosition, aAbout, transitionAt(0.10, 0.25));
  reflowPosition = mix(reflowPosition, aSpeakers, transitionAt(0.30, 0.45));
  reflowPosition = mix(reflowPosition, aTestimonials, transitionAt(0.50, 0.62));
  reflowPosition = mix(reflowPosition, aRegistration, transitionAt(0.68, 0.82));
  reflowPosition = mix(reflowPosition, aPartners, transitionAt(0.88, 1.00));

  float slowTime = uTime * 0.16;
  vec3 drift = vec3(
    sin(slowTime + aSeed * 19.7),
    cos(slowTime * 0.83 + aSeed * 13.1),
    sin(slowTime * 0.61 + aSeed * 29.3)
  );
  reflowPosition += drift * uNoiseStrength * (0.55 + uTransition * 0.8);

  float speakerMatch = 1.0 - step(0.25, abs(aSpeaker - uActiveSpeaker));
  vec3 speakerTarget = uInteractionPoint + (reflowPosition - uInteractionPoint) * 0.64;
  reflowPosition = mix(reflowPosition, speakerTarget, speakerMatch * uInteractionStrength);

  if (uFormFocus > -0.5) {
    float fieldGroup = floor(fract(aSeed * 17.31) * 4.0);
    float formMatch = 1.0 - step(0.25, abs(fieldGroup - uFormFocus));
    vec3 formTarget = vec3(3.6, 2.2 - uFormFocus * 1.35, 0.0);
    reflowPosition = mix(reflowPosition, formTarget + (reflowPosition - formTarget) * 0.84, formMatch * 0.32);
  }

  vec2 pointerWorld = vec2(uPointer.x * 10.0, uPointer.y * 5.8);
  vec2 pointerDelta = reflowPosition.xy - pointerWorld;
  float pointerDistance = length(pointerDelta);
  float pointerInfluence = smoothstep(2.1, 0.0, pointerDistance) * uPointerStrength;
  reflowPosition.xy += normalize(pointerDelta + vec2(0.0001)) * pointerInfluence * 0.32;

  vec2 destinationCenter = vec2(-3.3, 0.0);
  vec2 pulseDirection = normalize(reflowPosition.xy - destinationCenter + vec2(0.0001));
  reflowPosition.xy += pulseDirection * sin(uPulse * 3.14159265) * 0.8 * smoothstep(8.0, 0.0, length(reflowPosition.xy - destinationCenter));

  reflowPosition.x *= uAspectScale;
  vec4 mvPosition = modelViewMatrix * vec4(reflowPosition, 1.0);
  gl_PointSize = clamp(uPixelRatio * aSize * (24.0 / max(1.0, -mvPosition.z)), 1.0, 8.0);
  gl_Position = projectionMatrix * mvPosition;

  vOpacity = aOpacity;
  vAccent = aAccent;
  vDepth = clamp((-mvPosition.z - 8.0) / 15.0, 0.0, 1.0);
}
