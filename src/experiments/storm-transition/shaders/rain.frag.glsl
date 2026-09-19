varying float vAlpha;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  if (abs(uv.x) > 0.08 || abs(uv.y) > 0.48) discard;
  gl_FragColor = vec4(0.56, 0.64, 0.66, vAlpha * (1.0 - abs(uv.y) * 1.5));
}
