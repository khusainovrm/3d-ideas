uniform float uTime;
uniform float uStorm;
uniform float uMotion;
varying float vHeight;
varying float vDepth;

float wave(vec2 p, float f, float speed) {
  return sin(p.x * f + uTime * speed) * cos(p.y * f * 0.73 - uTime * speed * 0.82);
}

void main() {
  vec3 p = position;
  float calm = wave(p.xy, 0.17, 0.35) * 0.38;
  float chaos = wave(p.yx, 0.48, 1.3) * 0.62 + sin(p.x * 0.83 + p.y * 0.61 + uTime * 1.7) * 0.28;
  float h = calm + chaos * uStorm;
  p.z += h * uMotion;
  vHeight = h;
  vDepth = smoothstep(-50.0, 25.0, p.y);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
