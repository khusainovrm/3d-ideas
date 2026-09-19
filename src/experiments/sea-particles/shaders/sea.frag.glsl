varying float vGlint;
varying float vWave;

void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float alpha = smoothstep(0.5, 0.05, d) * (0.22 + vGlint * 0.72);
  vec3 deep = vec3(0.055, 0.18, 0.22);
  vec3 foam = vec3(0.67, 0.78, 0.76);
  vec3 color = mix(deep, foam, vGlint * 0.72 + max(vWave, 0.0) * 0.12);
  gl_FragColor = vec4(color, alpha);
}
