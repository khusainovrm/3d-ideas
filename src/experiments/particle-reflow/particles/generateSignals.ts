import { centeredNoise, createPositions } from './utils'

export const generateSignals = (count: number): Float32Array => createPositions(count, (write, random) => {
  const centerX = 3.4
  for (let index = 0; index < count; index += 1) {
    const ring = index % 7
    const angle = random() * Math.PI * 2
    const baseRadius = 0.72 + ring * 0.68
    const radius = baseRadius + centeredNoise(random) * 0.11
    const horizontal = 1.08 + ring * 0.025
    write(index, centerX + Math.cos(angle) * radius * horizontal, Math.sin(angle) * radius, centeredNoise(random) * 0.5)
  }
}, 4409)
