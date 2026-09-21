uniform float uTime;
uniform float uWind;
varying float vWave;

void main() {
  vec3 transformed = position;
  float anchored = smoothstep(-0.48, 0.5, position.x);
  float wave = sin(uTime * 2.1 + position.x * 7.0 + position.y * 2.0);
  transformed.z += wave * 0.075 * anchored * uWind;
  transformed.y += sin(uTime * 1.35 + position.x * 4.0) * 0.018 * anchored * uWind;
  vWave = wave * 0.5 + 0.5;

  vec4 worldPosition = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
