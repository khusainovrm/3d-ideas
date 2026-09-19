uniform float uScroll;
uniform float uPulse;
varying float vOpacity;
varying float vAccent;
varying float vDepth;
varying float vInteraction;
varying float vPointerInfluence;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float distanceToCenter = length(uv);
  if (distanceToCenter > 0.5) discard;

  float core = smoothstep(0.28, 0.0, distanceToCenter);
  float edge = smoothstep(0.5, 0.24, distanceToCenter);
  float registration = smoothstep(0.68, 0.82, uScroll) * (1.0 - smoothstep(0.9, 1.0, uScroll));
  vec3 neutral = mix(vec3(0.48, 0.58, 0.61), vec3(0.88, 0.89, 0.86), 1.0 - vDepth);
  vec3 violet = vec3(0.39, 0.38, 0.50);
  vec3 gold = vec3(0.79, 0.66, 0.42);
  vec3 bronzeGold = vec3(0.76, 0.52, 0.24);
  vec3 color = mix(neutral, violet, vAccent * smoothstep(0.28, 0.52, uScroll) * 0.45);
  color = mix(color, gold, vAccent * registration * 0.9);
  float hoverGold = clamp(vInteraction * 0.82 + vPointerInfluence * 0.9, 0.0, 1.0);
  color = mix(color, bronzeGold, hoverGold);
  color += gold * hoverGold * core * 0.28;
  color += gold * vAccent * uPulse * 0.4;
  float alpha = (edge * 0.56 + core * 0.44) * vOpacity * (1.0 + hoverGold * 0.52);
  gl_FragColor = vec4(color, alpha);
}
