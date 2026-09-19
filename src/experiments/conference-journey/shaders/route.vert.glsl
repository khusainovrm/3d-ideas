uniform float uLift;
uniform float uTime;
uniform float uWaveStrength;
uniform float uMotion;
attribute float aProgress;
varying float vProgress;

float wave(vec2 p, float frequency, float speed, vec2 direction) {
  return sin(dot(p, direction) * frequency + uTime * speed);
}

void main() {
  vec3 p = position;
  // The ocean plane is rotated around X and centered at world Z = -66.
  // Recreate its displacement here so the route remains on the surface.
  vec2 oceanPosition = vec2(p.x, -66.0 - p.z);
  float broad = wave(oceanPosition, 0.13, 0.34, normalize(vec2(1.0, 0.42))) * 0.48;
  broad += wave(oceanPosition, 0.23, -0.28, normalize(vec2(0.32, 1.0))) * 0.23;
  float detail = sin((oceanPosition.x + oceanPosition.y) * 0.48 + uTime * 0.48) * 0.08;
  float waterHeight = (broad + detail) * uWaveStrength * uMotion;
  p.y += waterHeight + 0.055 + pow(aProgress, 1.4) * uLift;
  vProgress = aProgress;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
