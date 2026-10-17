precision highp float;
attribute float aLight;
attribute float aPhase;
uniform float uScale;
uniform float uPointSize;
uniform vec2 uViewport;
uniform float uSampleSize;
uniform float uTime;
uniform float uRadius;
uniform float uForce;
uniform float uRipple;
uniform float uMotion;
uniform float uPointerActive;
uniform vec2 uPointer;
uniform vec2 uPulseOrigin;
uniform float uPulseAge;
varying float vLight;
varying float vInfluence;
varying vec2 vPixelCenter;
varying float vHalfSize;

void main() {
  vec2 rest = position.xy * uScale;
  vec2 p = rest;
  // Uniform branches skip the entire storm calculation while scrolling/idle.
  float falloff = 0.0;
  float pulse = 0.0;
  float phase = aPhase * 6.283185;
  if (uPointerActive > 0.001) {
    vec2 offset = rest - uPointer;
    float distanceToPointer = length(offset);
    vec2 direction = offset / max(distanceToPointer, 0.001);
    float normalizedDistance = distanceToPointer / max(uRadius, 0.01);
    falloff = exp(-normalizedDistance * normalizedDistance * 1.6) * uPointerActive;
    float ripple = sin(distanceToPointer * 8.0 - uTime * 7.0 + phase * 0.22);
    p += direction * falloff * uForce * (0.54 + 0.46 * ripple * uRipple);
    p += vec2(-direction.y, direction.x) * falloff * uForce * 0.22 * sin(uTime * 2.0 + phase);
  }
  if (uMotion != 0.0) {
    p += vec2(sin(uTime * 0.6 + phase), cos(uTime * 0.48 + phase)) * uMotion * 0.028;
  }
  if (uPulseAge < 12.0) {
    float ring = length(rest - uPulseOrigin);
    float normalizedRing = (ring - uPulseAge * 3.2) / 0.28;
    pulse = exp(-normalizedRing * normalizedRing) * exp(-uPulseAge * 0.65);
    p += normalize(rest - uPulseOrigin + vec2(0.0001)) * pulse * uForce * 0.8;
  }

  vLight = aLight;
  vInfluence = clamp(falloff * 0.65 + pulse, 0.0, 1.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, position.z, 1.0);
  vPixelCenter = (gl_Position.xy / gl_Position.w * 0.5 + 0.5) * uViewport;
  vHalfSize = 0.5 * uSampleSize * uPointSize;
  // Rasterize a padded footprint; the fragment shader integrates sample coverage.
  gl_PointSize = ceil(2.0 * vHalfSize + 2.0);
}
