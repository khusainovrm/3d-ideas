uniform vec3 uColor;
varying float vAlpha;
varying float vProgress;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5 || vAlpha < 0.01) discard;
  float core = smoothstep(0.5, 0.0, d);
  float halo = exp(-d * 7.0);
  gl_FragColor = vec4(uColor * (0.72 + halo * 0.55), (core * 0.72 + halo * 0.24) * vAlpha);
}
