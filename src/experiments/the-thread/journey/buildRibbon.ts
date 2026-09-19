import { BufferAttribute, BufferGeometry } from 'three'

export interface RibbonState {
  name: string
  centers: Float32Array
}

const ribbonPositions = (centers: Float32Array, samples: number): Float32Array => {
  const result = new Float32Array(samples * 2 * 3)
  for (let index = 0; index < samples; index += 1) {
    const previous = Math.max(0, index - 1)
    const next = Math.min(samples - 1, index + 1)
    const px = centers[previous * 3] ?? 0
    const py = centers[previous * 3 + 1] ?? 0
    const nx = centers[next * 3] ?? 0
    const ny = centers[next * 3 + 1] ?? 0
    const tangentX = nx - px
    const tangentY = ny - py
    const length = Math.hypot(tangentX, tangentY) || 1
    const normalX = -tangentY / length
    const normalY = tangentX / length
    const progress = index / Math.max(1, samples - 1)
    const width = 0.018 + Math.sin(progress * Math.PI) * 0.012
    const cx = centers[index * 3] ?? 0
    const cy = centers[index * 3 + 1] ?? 0
    const cz = centers[index * 3 + 2] ?? 0

    for (let side = 0; side < 2; side += 1) {
      const direction = side === 0 ? -1 : 1
      const offset = (index * 2 + side) * 3
      result[offset] = cx + normalX * width * direction
      result[offset + 1] = cy + normalY * width * direction
      result[offset + 2] = cz
    }
  }
  return result
}

export const buildRibbonGeometry = (samples: number, states: readonly RibbonState[]): BufferGeometry => {
  const geometry = new BufferGeometry()
  const first = states[0]
  if (!first) return geometry
  geometry.setAttribute('position', new BufferAttribute(ribbonPositions(first.centers, samples), 3))
  for (const state of states.slice(1)) {
    geometry.setAttribute(state.name, new BufferAttribute(ribbonPositions(state.centers, samples), 3))
  }

  const progress = new Float32Array(samples * 2)
  const sides = new Float32Array(samples * 2)
  for (let index = 0; index < samples; index += 1) {
    const value = index / Math.max(1, samples - 1)
    progress[index * 2] = value
    progress[index * 2 + 1] = value
    sides[index * 2] = -1
    sides[index * 2 + 1] = 1
  }
  geometry.setAttribute('aProgress', new BufferAttribute(progress, 1))
  geometry.setAttribute('aSide', new BufferAttribute(sides, 1))

  const indices = new Uint16Array((samples - 1) * 6)
  for (let index = 0; index < samples - 1; index += 1) {
    const vertex = index * 2
    const offset = index * 6
    indices[offset] = vertex
    indices[offset + 1] = vertex + 1
    indices[offset + 2] = vertex + 2
    indices[offset + 3] = vertex + 2
    indices[offset + 4] = vertex + 1
    indices[offset + 5] = vertex + 3
  }
  geometry.setIndex(new BufferAttribute(indices, 1))
  return geometry
}
