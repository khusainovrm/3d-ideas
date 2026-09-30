uniform float uTime;
uniform float uStrength;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  float facing = abs(vNormal.z);
  float edge = pow(1.0 - facing, 2.0);
  float bands = 0.5 + 0.5 * sin(length(vPosition.xy) * 7.0 - uTime * 0.65);
  vec3 violet = mix(vec3(0.22, 0.08, 0.52), vec3(0.53, 0.38, 1.0), edge + bands * 0.13);
  gl_FragColor = vec4(violet * (0.72 + edge * 0.8), (0.3 + edge * 0.55) * uStrength);
}
