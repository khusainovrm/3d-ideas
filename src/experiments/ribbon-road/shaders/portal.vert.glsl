uniform float uTime;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  vec3 p = position + normal * sin(position.y * 3.0 + uTime * 0.7) * 0.015;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
