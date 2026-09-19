uniform float uIntensity;
uniform float uNight;
uniform float uFinish;
varying vec2 vUv;

void main() {
  vec2 p = vUv - vec2(0.5, 0.37);
  float distanceField = length(p * vec2(1.25, 2.8));
  float glow = exp(-distanceField * 6.5);
  float line = exp(-abs(p.y) * 48.0) * exp(-abs(p.x) * 2.6);
  vec3 cold = vec3(0.24, 0.38, 0.43);
  vec3 warm = vec3(0.76, 0.61, 0.34);
  vec3 color = mix(cold, warm, uIntensity * 0.72 + uFinish * 0.2);
  float alpha = (glow * 0.42 + line * 0.22) * (0.25 + uIntensity * 0.75);
  alpha *= mix(1.0, 0.7, uNight);
  gl_FragColor = vec4(color, alpha);
}
