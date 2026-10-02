import { HERO_CLOUD_REFERENCE } from './heroCloudData.generated'

export interface HeroCloudAttributes {
  positions: Float32Array
  sizes: Float32Array
  alphas: Float32Array
  glow: Float32Array
  drift: Float32Array
}
const PLANE_WIDTH = 28
let decoded: Uint8Array | undefined

/** Stratified, overlapping particle splats reconstruct the reference's light field.
 * Coverage is maintained at every quality level, avoiding isolated bright stars.
 * The image is sampled on the CPU only when geometry is built.
 */
export const generateHeroCloud = (count: number): HeroCloudAttributes => {
  decoded ??= Uint8Array.from(atob(HERO_CLOUD_REFERENCE.data), c => c.charCodeAt(0))
  const { width, height } = HERO_CLOUD_REFERENCE
  const columns = Math.ceil(Math.sqrt(count * width / height))
  const rows = Math.ceil(count / columns)
  const planeHeight = PLANE_WIDTH * height / width
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const alphas = new Float32Array(count)
  const glow = new Float32Array(count)
  const drift = new Float32Array(count)
  let seed = 0xC10D2026
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  // Shuffle membership so the points forming navigation figures come from all
  // parts of the original nebula; reset/rebuild reproduces identical positions.
  const order = Uint32Array.from({length: count}, (_, i) => i)
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const previous = order[i]!
    order[i] = order[j]!
    order[j] = previous
  }
  for (let index = 0; index < count; index++) {
    const cell = order[index]!
    const u = ((cell % columns) + 0.5 + (random() - 0.5) * 0.15) / columns
    const v = (Math.floor(cell / columns) + 0.5 + (random() - 0.5) * 0.15) / rows
    const px = Math.min(width - 1, u * (width - 1))
    const py = Math.min(height - 1, v * (height - 1))
    const x = Math.floor(px), y = Math.floor(py)
    const x1 = Math.min(width - 1, x + 1), y1 = Math.min(height - 1, y + 1)
    const tx = px - x, ty = py - y
    const upper = decoded[y * width + x]! * (1 - tx) + decoded[y * width + x1]! * tx
    const lower = decoded[y1 * width + x]! * (1 - tx) + decoded[y1 * width + x1]! * tx
    const light = Math.max(0, ((upper * (1 - ty) + lower * ty) / 255 - 0.035) / 0.965)
    positions[index * 3] = (u - 0.5) * PLANE_WIDTH
    positions[index * 3 + 1] = (0.5 - v) * planeHeight
    positions[index * 3 + 2] = (random() - 0.5) * 0.008
    // Local-space splat diameter; shader projects it using viewport height.
    sizes[index] = PLANE_WIDTH / columns * 2.2
    const edge = Math.min(1, Math.max(0, Math.min(u, v, 1 - u, 1 - v) / 0.035))
    const exposure = light * 0.65 + Math.pow(light, 3) * 0.7
    alphas[index] = Math.min(1, exposure) * edge * edge * (3 - 2 * edge)
    glow[index] = 1
    drift[index] = 0.005
  }
  return { positions, sizes, alphas, glow, drift }
}
