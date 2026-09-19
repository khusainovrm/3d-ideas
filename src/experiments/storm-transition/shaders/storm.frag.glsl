uniform float uStorm;
uniform float uCalm;
varying float vHeight;
varying float vDepth;

void main() {
  vec3 calmDeep = vec3(0.012, 0.065, 0.085);
  vec3 stormDeep = vec3(0.009, 0.014, 0.022);
  vec3 crest = mix(vec3(0.12, 0.28, 0.31), vec3(0.34, 0.39, 0.40), uStorm);
  vec3 base = mix(stormDeep, calmDeep, uCalm);
  float foam = smoothstep(0.45, 1.0, vHeight) * (0.25 + uStorm * 0.5);
  vec3 color = mix(base, crest, clamp(vHeight * 0.34 + 0.38, 0.0, 1.0));
  color += foam * vec3(0.18, 0.2, 0.2);
  color *= mix(0.35, 1.0, vDepth);
  gl_FragColor = vec4(color, 1.0);
}
