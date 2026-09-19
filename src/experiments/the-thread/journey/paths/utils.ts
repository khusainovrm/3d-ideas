export type PathPointWriter = (index: number, x: number, y: number, z?: number) => void

export const createPath = (samples: number, fill: (t: number, index: number, write: PathPointWriter) => void): Float32Array => {
  const result = new Float32Array(samples * 3)
  const write: PathPointWriter = (index, x, y, z = 0) => {
    const offset = index * 3
    result[offset] = x
    result[offset + 1] = y
    result[offset + 2] = z
  }
  for (let index = 0; index < samples; index += 1) {
    fill(index / Math.max(1, samples - 1), index, write)
  }
  return result
}
