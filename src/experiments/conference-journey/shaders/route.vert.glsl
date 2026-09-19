uniform float uLift;
attribute float aProgress;
varying float vProgress;

void main() {
  vec3 p = position;
  p.y += pow(aProgress, 1.4) * uLift;
  vProgress = aProgress;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
