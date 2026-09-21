precision mediump float;

uniform float uTime;
uniform float uScrollProgress;
uniform float uLightIntensity;
uniform float uColorMix;

varying float vHeight;
varying float vDistance;
varying vec3 vWorldPosition;

void main() {
  vec3 charcoal = vec3(0.022, 0.027, 0.035);
  vec3 indigo = vec3(0.038, 0.051, 0.078);
  vec3 graphite = vec3(0.065, 0.069, 0.078);

  float crest = smoothstep(0.10, 1.35, vHeight);
  float contour = pow(1.0 - abs(fract((vHeight + vWorldPosition.x * 0.018) * 1.7) - 0.5) * 2.0, 11.0);
  float pathLight = exp(-abs(vWorldPosition.x) * 0.12) * (1.0 - vDistance);
  vec3 base = mix(charcoal, indigo, 0.22 + uColorMix * 0.36 + crest * 0.16);
  base = mix(base, graphite, contour * 0.055 * uLightIntensity);
  base += vec3(0.10, 0.085, 0.055) * pathLight * 0.04 * uLightIntensity;

  float distanceFade = mix(1.0, 0.32, smoothstep(0.18, 1.0, vDistance));
  float sideFade = smoothstep(38.0, 14.0, abs(vWorldPosition.x));
  gl_FragColor = vec4(base * distanceFade * sideFade, 1.0);
}
