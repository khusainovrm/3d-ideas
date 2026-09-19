uniform float uTime;
uniform float uSize;
uniform float uScroll;
attribute float aScale;
attribute float aPhase;
varying float vAlpha;

void main() {
  vec3 p = position;
  p.y += sin(uTime * 0.12 + aPhase) * 0.34 + uScroll * 1.4;
  p.x += cos(uTime * 0.09 + aPhase * 1.7) * 0.17;
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize * aScale * (16.0 / max(1.0, -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
  vAlpha = aScale * 0.3;
}
