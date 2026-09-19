export type PositionWriter = (index: number, x: number, y: number, z?: number) => void

export const createPositions = (count: number, fill: (write: PositionWriter, random: () => number) => void, seed: number): Float32Array => {
  const positions = new Float32Array(count * 3)
  let state = seed >>> 0
  const random = (): number => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
  const write: PositionWriter = (index, x, y, z = 0) => {
    const offset = index * 3
    positions[offset] = x
    positions[offset + 1] = y
    positions[offset + 2] = z
  }
  fill(write, random)
  return positions
}

export const centeredNoise = (random: () => number): number =>
  random() + random() + random() - 1.5
