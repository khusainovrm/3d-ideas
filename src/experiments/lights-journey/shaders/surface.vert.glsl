uniform float uTime;
uniform float uScrollProgress;
uniform float uRelief;
uniform float uMotion;

varying float vHeight;
varying float vDistance;
varying vec3 vWorldPosition;

float terrainHeight(vec2 p) {
  float broad = sin(p.x * 0.16 + uTime * 0.10) * cos(p.y * 0.09 - uTime * 0.08);
  float ridge = sin((p.x + p.y) * 0.23 + uTime * 0.12) * 0.35;
  float valley = cos(p.x * 0.08 - p.y * 0.12 + uScrollProgress * 2.4) * 0.25;
  return (broad * 0.75 + ridge + valley) * uRelief * uMotion;
}

void main() {
  vec3 p = position;
  p.z += terrainHeight(p.xy);

  vec4 world = modelMatrix * vec4(p, 1.0);
  vHeight = p.z;
  vDistance = clamp((-world.z - 2.0) / 150.0, 0.0, 1.0);
  vWorldPosition = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
