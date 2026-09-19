varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float glow = exp(-d * 8.0);
  gl_FragColor = vec4(vec3(0.72, 0.57, 0.29) * (0.75 + glow), glow * vAlpha);
}
