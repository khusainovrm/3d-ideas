uniform vec3 uCold;
uniform vec3 uWarm;
uniform float uWarmth;
uniform float uGlow;
varying float vWave;

void main() {
  vec3 color = mix(uCold, uWarm, clamp(uWarmth + vWave * 0.08, 0.0, 1.0));
  color += uGlow * vec3(0.24, 0.17, 0.07);
  gl_FragColor = vec4(color, 0.96);
}
