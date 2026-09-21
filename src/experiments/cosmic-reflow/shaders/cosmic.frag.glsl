uniform float uTime;
uniform float uPulse;
varying float vOpacity;
varying float vAccent;
varying float vGalaxy;
varying float vWheel;
varying float vLogo;
varying float vPointer;
varying vec3 vLogoColor;
varying float vPlanet;
varying float vPlanetId;
varying float vPlanetHover;
varying float vPlanetSelected;
varying float vLogoOnly;
varying float vMeteorMask;
varying float vMeteor;
varying float vMeteorHead;

vec3 planetColor(float id) {
  if (id < 0.5) return vec3(0.55, 0.90, 1.0);
  if (id < 1.5) return vec3(0.84, 0.64, 1.0);
  if (id < 2.5) return vec3(1.0, 0.74, 0.47);
  return vec3(0.50, 1.0, 0.79);
}

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float radius = length(uv);
  if (radius > 0.5) discard;
  float core = smoothstep(0.24, 0.0, radius);
  float edge = smoothstep(0.5, 0.18, radius);

  vec3 ice = vec3(0.55, 0.73, 0.88);
  vec3 violet = vec3(0.53, 0.38, 0.83);
  vec3 cyan = vec3(0.35, 0.83, 0.91);
  vec3 amber = vec3(0.96, 0.65, 0.34);
  vec3 color = mix(ice, violet, vAccent * 0.6);
  color = mix(color, cyan, vGalaxy * (0.22 + vAccent * 0.35));
  color = mix(color, amber, vWheel * (0.2 + vAccent * 0.45));
  vec3 readableLogo = mix(vLogoColor, vec3(0.78, 0.82, 0.98), 0.2);
  color = mix(color, readableLogo, vLogo * 0.94);
  color += (violet + cyan) * core * vPointer * 0.18;
  color += amber * core * uPulse * vWheel * 0.28;
  vec3 planetTint = planetColor(vPlanetId);
  color = mix(color, planetTint, vPlanet * 0.88);
  color += planetTint * core * (vPlanet * 0.58 + vPlanetHover * 0.4 + vPlanetSelected * 0.28);

  float twinkle = 0.9 + sin(uTime * 0.8 + vAccent * 41.0) * 0.1 * (1.0 - vLogo);
  float planetHalo = smoothstep(0.5, 0.05, radius) * vPlanet * 0.3;
  float logoOnlyVisibility = mix(1.0 - vLogoOnly, 1.0, vLogo);
  float alpha = ((edge * 0.58 + core * 0.42) * vOpacity + planetHalo) * twinkle * (1.0 + vLogo * 0.34 + vPlanetHover * 0.24) * logoOnlyVisibility;
  vec3 meteorColor = mix(vec3(0.42, 0.76, 1.0), vec3(1.0), vMeteorHead);
  float meteorAlpha = (edge * 0.32 + core * 0.9) * vMeteor * mix(0.18, 1.0, vMeteorHead);
  color = mix(color, meteorColor, vMeteorMask);
  alpha = mix(alpha, meteorAlpha, vMeteorMask);
  gl_FragColor = vec4(color, alpha);
}
