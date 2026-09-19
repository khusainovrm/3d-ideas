import { centeredNoise, createPositions } from './utils'

export const generateGrid = (count: number): Float32Array => createPositions(count, (write, random) => {
  const columns = Math.ceil(Math.sqrt(count * 1.9))
  const rows = Math.ceil(count / columns)
  for (let index = 0; index < count; index += 1) {
    const column = index % columns
    const row = Math.floor(index / columns)
    const u = column / Math.max(1, columns - 1)
    const v = row / Math.max(1, rows - 1)
    const horizonPull = index % 4 === 0
    const x = (u - 0.5) * 21
    const y = horizonPull ? centeredNoise(random) * 0.22 : (v - 0.5) * 8.5
    write(index, x + centeredNoise(random) * 0.04, y + centeredNoise(random) * 0.04, centeredNoise(random) * 0.45)
  }
}, 6607)
