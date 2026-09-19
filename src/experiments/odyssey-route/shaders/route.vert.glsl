uniform float uProgress;
uniform float uTime;
attribute float aProgress;
attribute float aZone;
varying float vVisible;
varying float vZone;

void main() {
  vec3 p = position;
  p.x += sin(uTime * 0.35 + aProgress * 22.0) * 0.06;
  vVisible = smoothstep(aProgress - 0.045, aProgress, uProgress);
  vZone = aZone;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
