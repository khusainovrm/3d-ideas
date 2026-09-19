uniform float uTime;
uniform float uSize;
uniform float uOpacity;
uniform float uBurst;
attribute float aScale;
attribute float aPhase;
varying float vAlpha;

void main() {
  vec3 p = position;
  p.x += sin(uTime * 0.08 + aPhase) * 0.18;
  p.y += cos(uTime * 0.11 + aPhase) * 0.12;
  p.xy *= 1.0 + uBurst * 0.04;
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize * aScale * (18.0 / max(1.0, -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
  vAlpha = uOpacity * (0.14 + aScale * 0.2) * (1.0 + uBurst * 0.8);
}
