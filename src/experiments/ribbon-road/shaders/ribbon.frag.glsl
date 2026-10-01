uniform float uPurplePhase;
uniform float uHover;
uniform float uPulse;
uniform float uFadeStart;
uniform float uFadeEnd;
uniform float uFadeStrength;
uniform float uIntroReveal;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vWave;

void main() {
  vec3 ivory = vec3(0.91, 0.885, 0.84);
  vec3 violetIvory = vec3(0.82, 0.77, 0.94);
  vec3 base = mix(ivory, violetIvory, uPurplePhase * 0.7);
  vec3 lightDirection = normalize(vec3(-0.4, 0.8, 0.55));
  float diffuse = max(dot(normalize(vNormal), lightDirection), 0.0);
  float rim = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 2.2);
  float pulse = exp(-abs(fract(vWorldPosition.z * 0.035) - uPulse) * 18.0);
  float shade = 0.48 + diffuse * 0.48 + rim * (0.08 + uHover * 0.08) + vWave * 2.0;
  float distanceFade = 1.0 - smoothstep(uFadeStart, uFadeEnd, distance(vWorldPosition, cameraPosition));
  float alpha = mix(1.0, distanceFade, uFadeStrength) * uIntroReveal;
  gl_FragColor = vec4(base * shade + pulse * vec3(0.25, 0.12, 0.02), alpha);
}
