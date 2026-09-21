uniform float uTime;
uniform float uScrollProgress;
uniform float uRelief;
uniform float uMotion;
uniform float uPixelRatio;
uniform float uSpeakerIndex;
uniform float uSpeakerStrength;
uniform float uFormFocus;
uniform float uPulse;

attribute float aPath;
attribute float aLane;
attribute float aSeed;
attribute float aSize;
attribute float aGroup;

varying float vAlpha;
varying float vWarmth;
varying float vGlow;

float hash(float n) { return fract(sin(n) * 43758.5453123); }

float terrainHeight(vec2 p) {
  float broad = sin(p.x * 0.16 + uTime * 0.10) * cos(p.y * 0.09 - uTime * 0.08);
  float ridge = sin((p.x + p.y) * 0.23 + uTime * 0.12) * 0.35;
  float valley = cos(p.x * 0.08 - p.y * 0.12 + uScrollProgress * 2.4) * 0.25;
  return (broad * 0.75 + ridge + valley) * uRelief * uMotion;
}

vec3 heroPosition() {
  float z = 13.0 - aPath * 158.0;
  float perspective = mix(8.0, 0.35, pow(aPath, 0.62));
  return vec3(aLane * perspective + (hash(aSeed) - 0.5) * 1.2, 0.0, z);
}

vec3 aboutPosition() {
  float branch = floor(hash(aSeed + 3.0) * 3.0) - 1.0;
  float z = 11.0 - aPath * 158.0;
  float x = branch * (3.3 + aPath * 4.0) + aLane * 2.1 + sin(aPath * 15.0 + aSeed) * 0.7;
  return vec3(x, 0.0, z);
}

vec3 speakerPosition() {
  float group = aGroup;
  float anchorX = group < 0.5 ? -6.2 : (group < 1.5 ? 4.4 : (group < 2.5 ? -2.6 : 6.5));
  float anchorZ = group < 0.5 ? -15.0 : (group < 1.5 ? -48.0 : (group < 2.5 ? -82.0 : -116.0));
  float angle = aSeed * 6.2831853;
  float radius = 0.7 + pow(hash(aSeed * 4.7), 2.0) * 6.0;
  float isActive = 1.0 - step(0.45, abs(group - uSpeakerIndex));
  radius *= 1.0 - isActive * uSpeakerStrength * 0.32;
  return vec3(anchorX + cos(angle) * radius, isActive * uSpeakerStrength * 1.2, anchorZ + sin(angle) * radius * 1.8);
}

vec3 echoPosition() {
  float z = 12.0 - aPath * 158.0;
  float wave = sin(aPath * 22.0 + aSeed * 2.0) * (3.0 + hash(aSeed) * 4.0);
  return vec3(wave + aLane * 3.0, sin(aPath * 30.0 + uTime * 0.25) * 0.18, z);
}

vec3 destinationPosition() {
  float angle = aPath * 27.0 + aSeed;
  float radius = 1.2 + pow(hash(aSeed * 2.1), 1.8) * 12.0;
  radius *= 1.0 - uFormFocus * 0.16;
  float z = -28.0 + sin(angle) * radius * 1.1;
  float x = cos(angle) * radius;
  return vec3(x, uFormFocus * exp(-radius * 0.15) * 1.1, z);
}

vec3 partnerPosition() {
  float row = floor(aPath * 12.0);
  float z = 8.0 - row * 13.0;
  float x = aLane * 18.0 + (mod(row, 2.0) - 0.5) * 3.0;
  return vec3(x, 0.0, z);
}

void main() {
  vec3 p = heroPosition();
  p = mix(p, aboutPosition(), smoothstep(0.10, 0.27, uScrollProgress));
  p = mix(p, speakerPosition(), smoothstep(0.30, 0.47, uScrollProgress));
  p = mix(p, echoPosition(), smoothstep(0.52, 0.66, uScrollProgress));
  p = mix(p, destinationPosition(), smoothstep(0.68, 0.83, uScrollProgress));
  p = mix(p, partnerPosition(), smoothstep(0.87, 1.0, uScrollProgress));

  vec2 terrainUv = vec2(p.x, -p.z - 65.0);
  p.y += terrainHeight(terrainUv) + 0.16 + hash(aSeed + 7.0) * 0.28;
  p.y += sin(uTime * 0.24 + aSeed * 11.0) * 0.055 * uMotion;

  float pulseDistance = abs((-p.z + 10.0) / 165.0 - uPulse);
  float pulse = uPulse < 0.0 ? 0.0 : exp(-pulseDistance * 42.0);
  p.y += pulse * 0.45;

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  float groupActive = 1.0 - step(0.45, abs(aGroup - uSpeakerIndex));
  float sizeBoost = groupActive * uSpeakerStrength * 1.45 + pulse * 0.85;
  gl_PointSize = min(25.0, (aSize + sizeBoost) * uPixelRatio * (45.0 / max(5.0, -mvPosition.z)));
  gl_Position = projectionMatrix * mvPosition;

  vAlpha = 0.58 + hash(aSeed + 12.0) * 0.40;
  vWarmth = clamp(0.14 + groupActive * uSpeakerStrength * 0.86 + smoothstep(0.68, 0.84, uScrollProgress) * 0.45, 0.0, 1.0);
  vGlow = 0.35 + sizeBoost + step(0.91, hash(aSeed * 8.0)) * 0.65;
}
