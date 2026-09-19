import { centeredNoise, createPositions } from './utils'

export const generateOcean = (count: number): Float32Array => createPositions(count, (write, random) => {
  const columns = Math.ceil(Math.sqrt(count * 1.7))
  const rows = Math.ceil(count / columns)
  for (let index = 0; index < count; index += 1) {
    const column = index % columns
    const row = Math.floor(index / columns)
    const u = column / Math.max(1, columns - 1)
    const v = row / Math.max(1, rows - 1)
    const depth = v * 7
    const spread = 0.36 + v * 0.64
    const x = (u - 0.5) * 21 * spread + centeredNoise(random) * 0.06
    const wave = Math.sin(x * 0.72 + v * 5.5) * (0.08 + v * 0.2)
    const y = 0.7 - v * 4.3 + wave + centeredNoise(random) * 0.045
    write(index, x, y, -depth + centeredNoise(random) * 0.14)
  }
}, 1103)
