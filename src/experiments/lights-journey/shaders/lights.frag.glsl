precision mediump float;

uniform float uLightIntensity;

varying float vAlpha;
varying float vWarmth;
varying float vGlow;

void main() {
  vec2 centered = gl_PointCoord - 0.5;
  float distanceToCenter = length(centered);
  float core = 1.0 - smoothstep(0.04, 0.19, distanceToCenter);
  float halo = 1.0 - smoothstep(0.08, 0.5, distanceToCenter);
  float alpha = (core + halo * 0.42 * vGlow) * vAlpha * uLightIntensity;
  if (alpha < 0.015) discard;

  vec3 cool = vec3(0.78, 0.84, 0.91);
  vec3 warm = vec3(0.79, 0.64, 0.36);
  vec3 color = mix(cool, warm, vWarmth);
  gl_FragColor = vec4(color, alpha);
}
