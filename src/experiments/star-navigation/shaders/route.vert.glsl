uniform float uProgress;
attribute float aProgress;
varying float vVisible;

void main() {
  vVisible = smoothstep(aProgress - 0.035, aProgress, uProgress);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
