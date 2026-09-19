uniform float uTime;
uniform float uNight;
uniform float uLight;
uniform vec3 uFogColor;
uniform float uFogDensity;
varying float vHeight;
varying float vDepth;
varying vec3 vWorldPosition;

void main() {
  vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
  float fresnel = pow(1.0 - abs(viewDirection.y), 3.0);
  float glint = smoothstep(0.74, 1.0, sin(vWorldPosition.x * 0.24 - vWorldPosition.z * 0.11 - uTime * 0.12) * 0.5 + 0.5);
  vec3 dayDeep = vec3(0.018, 0.085, 0.108);
  vec3 nightDeep = vec3(0.004, 0.014, 0.028);
  vec3 base = mix(dayDeep, nightDeep, uNight);
  vec3 crest = mix(vec3(0.10, 0.25, 0.27), vec3(0.08, 0.12, 0.17), uNight);
  vec3 warm = vec3(0.64, 0.53, 0.31);
  vec3 color = mix(base, crest, clamp(vHeight * 0.55 + 0.42, 0.0, 1.0));
  color += fresnel * 0.08 * mix(vec3(0.48, 0.62, 0.62), warm, uLight);
  color += glint * fresnel * 0.035 * uLight * warm;
  float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * vDepth * vDepth);
  gl_FragColor = vec4(mix(color, uFogColor, clamp(fogFactor, 0.0, 0.94)), 1.0);
}
