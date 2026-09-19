uniform float uTime;
uniform float uStorm;
uniform float uSize;
attribute float aSpeed;
varying float vAlpha;

void main() {
  vec3 p = position;
  float fall = mod(position.y - uTime * aSpeed * (2.0 + uStorm * 8.0) + 10.0, 20.0) - 10.0;
  p.y = fall;
  p.x += fall * 0.08 * uStorm;
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize * (14.0 / max(1.0, -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
  vAlpha = uStorm * 0.48;
}
