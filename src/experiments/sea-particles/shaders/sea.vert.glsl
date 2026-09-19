uniform float uTime;
uniform float uPointSize;
uniform float uMotion;
attribute float aGlint;
varying float vGlint;
varying float vWave;

void main() {
  vec3 p = position;
  float broad = sin(p.x * 0.33 + uTime * 0.42) * cos(p.z * 0.22 - uTime * 0.28);
  float detail = sin(p.x * 1.1 - p.z * 0.72 + uTime * 0.8) * 0.16;
  p.y += (broad * 0.52 + detail) * uMotion;
  vWave = broad;
  vGlint = aGlint;

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uPointSize * (1.0 + aGlint * 1.6) * (18.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
