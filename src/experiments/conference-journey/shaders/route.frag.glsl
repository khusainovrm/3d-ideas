uniform float uReveal;
uniform float uOpacity;
uniform float uFinish;
varying float vProgress;

void main() {
  float visible = smoothstep(vProgress - 0.035, vProgress, uReveal);
  if (visible < 0.01) discard;
  vec3 color = mix(vec3(0.60, 0.63, 0.58), vec3(0.74, 0.59, 0.32), vProgress * 0.55 + uFinish * 0.3);
  gl_FragColor = vec4(color, visible * uOpacity);
}
