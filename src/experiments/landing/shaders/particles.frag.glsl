precision highp float;
uniform float uBrightness;
varying float vLight;
varying float vInfluence;
varying vec2 vPixelCenter;
varying float vHalfSize;

void main() {
  // Exact overlap of a source sample with the framebuffer pixel. Additive blending
  // sums coverage instead of dimming overlapping grains or inflating faint pixels.
  vec2 pixelMin = gl_FragCoord.xy - 0.5;
  vec2 pixelMax = gl_FragCoord.xy + 0.5;
  vec2 overlap = max(vec2(0.0), min(pixelMax, vPixelCenter + vHalfSize)
    - max(pixelMin, vPixelCenter - vHalfSize));
  float coverage = overlap.x * overlap.y;
  if (coverage <= 0.0) discard;
  float intensity = vLight * uBrightness * (1.0 + vInfluence * 0.18);
  vec3 tint = mix(vec3(1.0), vec3(0.8, 0.94, 1.0), vInfluence * 0.35);
  gl_FragColor = vec4(tint * intensity, coverage);
}
