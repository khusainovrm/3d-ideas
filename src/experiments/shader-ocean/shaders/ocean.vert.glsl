uniform float uTime;
uniform float uIntensity;
uniform float uMotion;
varying float vHeight;
varying vec3 vWorldPosition;

float wave(vec2 p, float frequency, float speed) {
  return sin(p.x * frequency + uTime * speed) * cos(p.y * frequency * 0.72 - uTime * speed * 0.71);
}

void main() {
  vec3 p = position;
  float h = wave(p.xy, 0.16, 0.42) * 0.72;
  h += wave(p.yx + 7.0, 0.42, 0.68) * 0.24;
  h += sin((p.x + p.y) * 0.93 + uTime) * 0.07;
  p.z += h * uIntensity * uMotion;
  vHeight = h;
  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorldPosition = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
