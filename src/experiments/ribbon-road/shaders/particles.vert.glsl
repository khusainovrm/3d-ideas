uniform float uTime;
uniform float uState;
uniform float uPixelRatio;
uniform float uVisibility;

attribute vec3 aAbout;
attribute vec3 aProgram;
attribute vec3 aRegistration;
attribute vec3 aPartners;
attribute float aSeed;
attribute float aSize;

varying float vAlpha;
varying float vAccent;

vec3 statePosition(float state) {
  if (state < 1.0) return mix(position, aAbout, smoothstep(0.0, 1.0, state));
  if (state < 2.0) return mix(aAbout, aProgram, smoothstep(1.0, 2.0, state));
  if (state < 3.0) return mix(aProgram, aRegistration, smoothstep(2.0, 3.0, state));
  return mix(aRegistration, aPartners, smoothstep(3.0, 4.0, state));
}

void main() {
  vec3 p = statePosition(uState);
  p.x += sin(uTime * 0.16 + aSeed * 19.0) * 0.035;
  p.y += cos(uTime * 0.13 + aSeed * 23.0) * 0.03;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float perspective = 28.0 / max(2.0, -mv.z);
  gl_PointSize = min(7.0, aSize * uPixelRatio * perspective);
  gl_Position = projectionMatrix * mv;
  vAlpha = uVisibility * (0.22 + fract(aSeed * 31.7) * 0.48);
  vAccent = step(0.965, aSeed);
}
