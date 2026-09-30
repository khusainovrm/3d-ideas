uniform float uTime;
uniform float uMotion;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vWave;

void main() {
  vec3 transformed = position;
  float wave = sin(position.z * 0.17 + uTime * 0.22) * 0.012 * uMotion;
  transformed.y += wave;
  vec4 world = modelMatrix * vec4(transformed, 1.0);
  vWorldPosition = world.xyz;
  vNormal = normalize(normalMatrix * normal);
  vWave = wave;
  gl_Position = projectionMatrix * viewMatrix * world;
}
