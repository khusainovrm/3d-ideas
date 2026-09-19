uniform float uReveal;
uniform float uIntensity;
uniform float uAccent;
uniform float uPulse;
varying float vProgress;
varying float vDepth;
varying float vSide;

void main() {
  if (vProgress > uReveal) discard;
  vec3 warmWhite = vec3(0.84, 0.82, 0.77);
  vec3 mutedGold = vec3(0.71, 0.59, 0.39);
  float accentBand = smoothstep(0.35, 0.72, vProgress) * uAccent;
  float pulse = exp(-abs(vProgress - uPulse) * 48.0);
  vec3 color = mix(warmWhite, mutedGold, accentBand * 0.72 + pulse * 0.5);
  float depthFade = mix(1.0, 0.46, vDepth);
  float edgeAlpha = 1.0 - smoothstep(0.68, 1.0, abs(vSide));
  gl_FragColor = vec4(color * uIntensity * (1.0 + pulse * 0.35), depthFade * edgeAlpha);
}
