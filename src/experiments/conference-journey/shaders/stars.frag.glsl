varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float core = exp(-d * 10.0);
  float halo = smoothstep(0.5, 0.0, d) * 0.25;
  gl_FragColor = vec4(vec3(0.69, 0.75, 0.73) * (0.8 + core), (core + halo) * vAlpha);
}
