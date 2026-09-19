varying float vVisible;
varying float vZone;

void main() {
  if (vVisible < 0.01) discard;
  vec3 sea = vec3(0.18, 0.46, 0.52);
  vec3 fog = vec3(0.56, 0.63, 0.61);
  vec3 storm = vec3(0.20, 0.25, 0.31);
  vec3 stars = vec3(0.58, 0.68, 0.78);
  vec3 gold = vec3(0.72, 0.57, 0.28);
  vec3 color = vZone < 1.0 ? mix(sea, fog, vZone) :
    vZone < 2.0 ? mix(fog, storm, vZone - 1.0) :
    vZone < 3.0 ? mix(storm, stars, vZone - 2.0) : mix(stars, gold, vZone - 3.0);
  gl_FragColor = vec4(color, vVisible * 0.9);
}
