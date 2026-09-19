uniform float uTime;
uniform float uProgress;
uniform float uWave;
uniform float uDepth;
uniform float uSpeakerIndex;
uniform float uInteractionStrength;
uniform float uFormTension;

attribute vec3 aRoute;
attribute vec3 aSpeakers;
attribute vec3 aEcho;
attribute vec3 aDestination;
attribute vec3 aNetwork;
attribute vec3 aFinal;
attribute float aProgress;
attribute float aSide;

varying float vProgress;
varying float vDepth;
varying float vSide;

float eased(float start, float end) {
  float value = smoothstep(start, end, uProgress);
  return value * value * (3.0 - 2.0 * value);
}

void main() {
  vec3 p = position;
  p = mix(p, aRoute, eased(0.09, 0.20));
  p = mix(p, aSpeakers, eased(0.27, 0.39));
  p = mix(p, aEcho, eased(0.50, 0.61));
  p = mix(p, aDestination, eased(0.66, 0.78));
  p = mix(p, aNetwork, eased(0.84, 0.93));
  p = mix(p, aFinal, eased(0.94, 1.00));

  float speakerCenter = uSpeakerIndex < 0.5 ? 0.18 : uSpeakerIndex < 1.5 ? 0.40 : uSpeakerIndex < 2.5 ? 0.63 : 0.83;
  float speakerLocality = exp(-pow((aProgress - speakerCenter) * 10.0, 2.0));
  float speakerState = smoothstep(0.27, 0.38, uProgress) * (1.0 - smoothstep(0.50, 0.61, uProgress));
  float speakerDirection = mod(floor(uSpeakerIndex), 2.0) < 0.5 ? 1.0 : -1.0;
  p.y += speakerLocality * speakerState * uInteractionStrength * speakerDirection * 0.42;
  p.z += speakerLocality * speakerState * uInteractionStrength * 0.35;

  float destinationState = smoothstep(0.66, 0.77, uProgress) * (1.0 - smoothstep(0.84, 0.93, uProgress));
  vec2 destinationCenter = vec2(-3.2, 0.0);
  p.xy = mix(p.xy, destinationCenter + (p.xy - destinationCenter) * 1.025, destinationState * uFormTension);

  p.y += sin(aProgress * 25.0 + uTime * 0.28) * uWave * 0.035;
  p.z *= uDepth;
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  vProgress = aProgress;
  vDepth = clamp((-mvPosition.z - 10.0) / 12.0, 0.0, 1.0);
  vSide = aSide;
}
