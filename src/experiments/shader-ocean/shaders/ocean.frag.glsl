uniform float uTime;
uniform float uDarkness;
varying float vHeight;
varying vec3 vWorldPosition;

void main() {
  vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
  float pseudoNormalY = clamp(0.72 + vHeight * 0.34, 0.0, 1.0);
  float fresnel = pow(1.0 - max(dot(viewDirection, normalize(vec3(0.0, pseudoNormalY, 0.7))), 0.0), 3.0);
  float shimmer = smoothstep(0.55, 0.9, sin(vWorldPosition.x * 0.33 + vWorldPosition.z * 0.18 - uTime * 0.3) * 0.5 + 0.5);
  vec3 abyss = vec3(0.008, 0.035, 0.055) * uDarkness;
  vec3 surface = vec3(0.035, 0.17, 0.22);
  vec3 light = vec3(0.46, 0.56, 0.51);
  vec3 color = mix(abyss, surface, clamp(vHeight * 0.4 + 0.48, 0.0, 1.0));
  color = mix(color, light, fresnel * 0.22 + shimmer * fresnel * 0.06);
  gl_FragColor = vec4(color, 1.0);
}
