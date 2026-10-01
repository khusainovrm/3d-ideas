export interface HeroCloudAttributes {
  positions: Float32Array
  sizes: Float32Array
  alphas: Float32Array
  glow: Float32Array
  drift: Float32Array
}

interface PointStyle {
  size: number
  alpha: number
  glow: number
  drift: number
}

interface PointSample extends PointStyle {
  x: number
  y: number
  z: number
}

type Random = () => number

const PLANE_SCALE = 8
const CENTER = { x: 0.12, y: -0.04 }
// The measured X is 0.475. A small local compensation places its projected
// centroid at the same screen coordinate after the cloud's depth spread.
const RIGHT_NODE = { x: 0.5, y: -0.033 }
const TOP_NODE = { x: 0.017, y: 0.78 }
const BOTTOM_NODE = { x: 0.008, y: -0.773 }
const LEFT_EDGE = { x: -1.9, y: 0.05 }
const RIGHT_EDGE = { x: 1.9, y: -0.07 }

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value))
const mix = (from: number, to: number, amount: number): number => from + (to - from) * amount
const smoothstep = (value: number): number => {
  const x = clamp(value, 0, 1)
  return x * x * (3 - 2 * x)
}

const mulberry32 = (seed: number): Random => () => {
  seed |= 0
  seed = seed + 0x6D2B79F5 | 0
  let value = Math.imul(seed ^ seed >>> 15, 1 | seed)
  value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value
  return ((value ^ value >>> 14) >>> 0) / 4294967296
}

const normal = (random: Random): number => {
  const u = Math.max(1e-7, random())
  const v = random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * v)
}

const boundedNormal = (random: Random, limit = 2.8): number => clamp(normal(random), -limit, limit)
const range = (random: Random, min: number, max: number): number => mix(min, max, random())
const logNormalSize = (random: Random, median: number, spread = 0.3): number => (
  median * Math.exp(boundedNormal(random, 2.2) * spread)
)

const baseStyle = (random: Random, alphaMin: number, alphaMax: number, drift: number): PointStyle => {
  const sizeClass = random()
  const median = sizeClass < 0.72 ? 0.92 : sizeClass < 0.95 ? 1.55 : 2.65
  return {
    size: clamp(logNormalSize(random, median), 0.55, 4),
    alpha: range(random, alphaMin, alphaMax),
    glow: 1,
    drift,
  }
}

const ellipse = (
  random: Random,
  centerX: number,
  centerY: number,
  sigmaX: number,
  sigmaY: number,
  rotation: number,
): { x: number; y: number } => {
  const x = boundedNormal(random) * sigmaX
  const y = boundedNormal(random) * sigmaY
  const cosine = Math.cos(rotation)
  const sine = Math.sin(rotation)
  return {
    x: centerX + x * cosine - y * sine,
    y: centerY + x * sine + y * cosine,
  }
}

const tube = (
  random: Random,
  start: { x: number; y: number },
  end: { x: number; y: number },
  progress: number,
  width: number,
  bendX: number,
  bendY: number,
  depth: number,
): { x: number; y: number; z: number } => {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.hypot(dx, dy)
  const perpendicularX = -dy / length
  const perpendicularY = dx / length
  const spread = boundedNormal(random) * width
  const bend = Math.sin(Math.PI * progress)
  return {
    x: mix(start.x, end.x, progress) + bendX * bend + perpendicularX * spread,
    y: mix(start.y, end.y, progress) + bendY * bend + perpendicularY * spread,
    z: boundedNormal(random) * depth + spread * 0.16,
  }
}

const centralMist = (random: Random): PointSample => {
  const lobe = random()
  const rotation = range(random, -Math.PI / 22.5, Math.PI / 22.5)
  const point = lobe < 0.55
    ? ellipse(random, CENTER.x, CENTER.y, 0.3, 0.22, rotation)
    : lobe < 0.85
      ? ellipse(random, 0.24, -0.02, 0.22, 0.13, rotation)
      : ellipse(random, -0.08, 0.02, 0.42, 0.16, rotation)
  return {
    ...point,
    z: boundedNormal(random) * 0.13,
    ...baseStyle(random, 0.11, 0.46, 1),
  }
}

const topStream = (random: Random): PointSample => {
  const nearNode = random() < 0.2
  const progress = nearNode ? Math.pow(random(), 2) * 0.2 : Math.pow(random(), 0.75)
  const halo = random() < 0.18
  const width = mix(0.025, 0.25, Math.pow(smoothstep(progress), 1.35)) * (halo ? 2.2 : 1)
  return {
    ...tube(random, TOP_NODE, CENTER, progress, width, 0.07, 0, halo ? 0.1 : 0.055),
    ...baseStyle(random, halo ? 0.08 : 0.18, halo ? 0.22 : 0.5, halo ? 1.2 : 0.65),
  }
}

const bottomStream = (random: Random): PointSample => {
  const nearNode = random() < 0.24
  let progress = nearNode ? Math.pow(random(), 2) * 0.18 : Math.pow(random(), 0.72)
  if (!nearNode && progress < 0.3) progress = 0.3 + progress * 0.45
  const halo = random() < 0.16
  const width = mix(0.025, 0.22, Math.pow(smoothstep(progress), 1.3)) * (halo ? 2.15 : 1)
  return {
    ...tube(random, BOTTOM_NODE, CENTER, progress, width, 0.055, 0, halo ? 0.095 : 0.055),
    ...baseStyle(random, halo ? 0.09 : 0.2, halo ? 0.24 : 0.56, halo ? 1.15 : 0.62),
  }
}

const leftTail = (random: Random): PointSample => {
  const progress = Math.pow(random(), 0.58)
  const halo = random() < 0.3
  const width = halo ? range(random, 0.2, 0.28) : mix(0.035, 0.13, smoothstep(progress))
  const point = tube(random, LEFT_EDGE, CENTER, progress, width, 0, Math.sin(progress * Math.PI * 3.1) * 0.035, halo ? 0.11 : 0.06)
  const fade = mix(0.35, 1, smoothstep(progress))
  const style = baseStyle(random, halo ? 0.055 : 0.08, halo ? 0.16 : 0.28, halo ? 1.2 : 0.72)
  style.alpha *= fade
  return { ...point, ...style }
}

const truncatedExponential = (random: Random, rate: number): number => (
  -Math.log(1 - random() * (1 - Math.exp(-rate))) / rate
)

const rightStream = (random: Random): PointSample => {
  if (random() < 0.45) {
    const progress = Math.pow(random(), 0.52)
    const width = mix(0.11, 0.035, progress)
    const point = tube(random, CENTER, RIGHT_NODE, progress, width, 0, -0.012, 0.05)
    const style = baseStyle(random, mix(0.22, 0.42, progress), mix(0.5, 0.74, progress), 0.52)
    style.glow = mix(1, 1.22, progress)
    return { ...point, ...style }
  }

  const progress = truncatedExponential(random, 2.8)
  const width = mix(0.045, 0.2, Math.pow(progress, 0.72))
  const point = tube(random, RIGHT_NODE, RIGHT_EDGE, progress, width, 0, -0.025, 0.065 + progress * 0.04)
  const style = baseStyle(random, 0.1, 0.42, 0.75)
  style.alpha *= Math.exp(-progress * 1.35)
  return { ...point, ...style }
}

const lightNode = (random: Random): PointSample => {
  const selector = random()
  const node = selector < 0.45
    ? RIGHT_NODE
    : selector < 0.69
      ? BOTTOM_NODE
      : selector < 0.87
        ? TOP_NODE
        : null

  if (!node) {
    const cluster = Math.floor(random() * 6)
    const progress = (cluster + 1) / 7
    const centerX = mix(CENTER.x, RIGHT_NODE.x, progress)
    const centerY = mix(CENTER.y, RIGHT_NODE.y, progress) + Math.sin(cluster * 2.37) * 0.018
    const point = ellipse(random, centerX, centerY, 0.018, 0.013, range(random, -0.2, 0.2))
    return {
      ...point,
      z: boundedNormal(random) * 0.025,
      size: clamp(logNormalSize(random, 1.45, 0.24), 0.9, 2.5),
      alpha: range(random, 0.5, 0.88),
      glow: 1.12,
      drift: 0.28,
    }
  }

  const layerValue = random()
  const sigma = layerValue < 0.3 ? range(random, 0.01, 0.018) : layerValue < 0.75 ? range(random, 0.035, 0.055) : range(random, 0.09, 0.16)
  const isRight = node === RIGHT_NODE
  const isBottom = node === BOTTOM_NODE
  const stretchX = isRight ? 1.65 : 0.68
  const stretchY = isRight ? 0.72 : 1.55
  const point = ellipse(random, node.x, node.y, sigma * stretchX, sigma * stretchY, 0)
  const importance = isRight ? 1 : isBottom ? 0.82 : 0.68
  return {
    ...point,
    z: boundedNormal(random) * (layerValue < 0.3 ? 0.018 : layerValue < 0.75 ? 0.045 : 0.09),
    size: clamp(logNormalSize(random, mix(1.2, 1.9, importance), 0.27), 0.8, 2.7),
    alpha: range(random, 0.55, 1) * importance,
    glow: mix(1.05, 1.28, importance),
    drift: layerValue < 0.3 ? 0.16 : layerValue < 0.75 ? 0.24 : 0.42,
  }
}

/**
 * Generates the measured, asymmetric hero cloud from PARTICLE_CLOUD_PROMPT.md.
 * Positions use a 16:9 reference plane and are scaled to fill the intro camera.
 */
export const generateHeroCloud = (count: number, seed = 0xC10D2026): HeroCloudAttributes => {
  const random = mulberry32(seed)
  const densityAlphaScale = 8000 / count
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const alphas = new Float32Array(count)
  const glow = new Float32Array(count)
  const drift = new Float32Array(count)

  for (let index = 0; index < count; index += 1) {
    const component = random()
    const point = component < 0.34
      ? centralMist(random)
      : component < 0.49
        ? topStream(random)
        : component < 0.64
          ? bottomStream(random)
          : component < 0.74
            ? leftTail(random)
            : component < 0.9
              ? rightStream(random)
              : lightNode(random)

    const warpStrength = point.drift < 0.45 ? 0.22 : 1
    const warpedX = point.x
      + (Math.sin(point.y * 9.17 + 0.8) * 0.009 + Math.sin(point.x * 5.31 - 1.2) * 0.006) * warpStrength
    const warpedY = point.y
      + (Math.sin(point.x * 7.43 + 2.1) * 0.008 + Math.sin(point.y * 4.79) * 0.005) * warpStrength

    positions[index * 3] = warpedX * PLANE_SCALE
    positions[index * 3 + 1] = warpedY * PLANE_SCALE
    positions[index * 3 + 2] = point.z * PLANE_SCALE
    sizes[index] = point.size
    alphas[index] = clamp(point.alpha * densityAlphaScale, 0, 1)
    glow[index] = point.glow
    drift[index] = point.drift
  }

  return { positions, sizes, alphas, glow, drift }
}
