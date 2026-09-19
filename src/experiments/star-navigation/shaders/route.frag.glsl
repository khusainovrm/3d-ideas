varying float vVisible;

void main() {
  if (vVisible < 0.01) discard;
  gl_FragColor = vec4(0.72, 0.63, 0.39, vVisible * 0.72);
}
