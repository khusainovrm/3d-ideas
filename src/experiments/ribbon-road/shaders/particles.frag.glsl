varying float vAlpha;
varying float vAccent;
varying float vPointer;

void main() {
  vec2 centered = gl_PointCoord - 0.5;
  float distanceToCenter = length(centered);
  float alpha = smoothstep(0.5, 0.04, distanceToCenter) * vAlpha;
  vec3 color = mix(vec3(0.77, 0.76, 0.72), vec3(1.0, 0.42, 0.08), vAccent);
  color = mix(color, vec3(1.0, 0.42, 0.08), vPointer * 0.9);
  gl_FragColor = vec4(color, alpha);
}
