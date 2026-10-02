varying float vAlpha;
varying float vAccent;
varying float vNavBrightness;
varying float vFigureForeground;

void main() {
  vec2 centered = gl_PointCoord - 0.5;
  float distanceToCenter = length(centered);
  float alpha = smoothstep(0.5, 0.04, distanceToCenter) * vAlpha;
  vec3 color = mix(vec3(0.77, 0.76, 0.72), vec3(1.0, 0.42, 0.08), vAccent);
  color *= vNavBrightness;
  // Zero blend alpha retains additive dust; formed figures occlude that dust.
  gl_FragColor = vec4(color * alpha, clamp(alpha * vFigureForeground, 0.0, 1.0));
}
