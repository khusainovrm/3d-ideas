uniform float uTime;
uniform float uWaveStrength;
uniform float uProgress;
uniform float uMotion;
varying float vHeight;
varying float vDepth;
varying vec3 vWorldPosition;

float wave(vec2 p, float frequency, float speed, vec2 direction) {
  return sin(dot(p, direction) * frequency + uTime * speed);
}

void main() {
  vec3 p = position;
  float broad = wave(p.xy, 0.13, 0.34, normalize(vec2(1.0, 0.42))) * 0.48;
  broad += wave(p.xy, 0.23, -0.28, normalize(vec2(0.32, 1.0))) * 0.23;
  float detail = sin((p.x + p.y) * 0.48 + uTime * 0.48) * 0.08;
  float height = (broad + detail) * uWaveStrength * uMotion;
  p.z += height;
  vec4 world = modelMatrix * vec4(p, 1.0);
  vec4 viewPosition = viewMatrix * world;
  vHeight = height;
  vDepth = -viewPosition.z;
  vWorldPosition = world.xyz;
  gl_Position = projectionMatrix * viewPosition;
}
