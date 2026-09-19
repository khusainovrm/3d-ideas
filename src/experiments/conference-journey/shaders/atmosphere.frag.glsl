varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float glow = exp(-d * 7.5);
  gl_FragColor = vec4(0.62, 0.57, 0.42, glow * vAlpha);
}
