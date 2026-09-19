uniform float uTime;
uniform float uSize;
uniform float uSpeed;
uniform float uProgress;
attribute float aScale;
attribute float aPhase;
attribute float aProgress;
varying float vAlpha;
varying float vProgress;

void main() {
  vec3 p = position;
  p.y += sin(uTime * uSpeed + aPhase) * 0.06;
  p.x += cos(uTime * uSpeed * 0.6 + aPhase) * 0.025;
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize * aScale * (18.0 / max(1.0, -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
  vProgress = aProgress;
  vAlpha = smoothstep(aProgress - 0.08, aProgress, uProgress);
}
