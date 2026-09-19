uniform float uTime;
uniform float uOpacity;
uniform float uSize;
uniform float uFocus;
attribute float aScale;
attribute float aPhase;
attribute float aSpeaker;
varying float vAlpha;

void main() {
  vec3 p = position;
  float twinkle = 0.82 + sin(uTime * 0.45 + aPhase) * 0.18;
  float focused = aSpeaker >= 0.0 ? 1.0 - step(0.45, abs(aSpeaker - uFocus)) : 0.0;
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize * aScale * (1.0 + focused * 1.8) * (24.0 / max(1.0, -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
  vAlpha = uOpacity * twinkle * (0.45 + aScale * 0.35 + focused * 0.7);
}
