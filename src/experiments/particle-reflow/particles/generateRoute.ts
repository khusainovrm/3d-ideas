import { centeredNoise, createPositions } from './utils'

export const generateRoute = (count: number): Float32Array => createPositions(count, (write, random) => {
  for (let index = 0; index < count; index += 1) {
    const t = index / Math.max(1, count - 1)
    const band = index % 11 === 0 ? 0.32 : 0.1
    const x = -7.2 + t * 14.6 + Math.sin(t * Math.PI * 4.5) * 1.55
    const y = -2.9 + t * 5.8 + Math.sin(t * Math.PI * 7) * 0.32
    write(index, x + centeredNoise(random) * band, y + centeredNoise(random) * band, centeredNoise(random) * 0.45)
  }
}, 2207)
