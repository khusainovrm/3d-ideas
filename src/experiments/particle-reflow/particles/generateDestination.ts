import { centeredNoise, createPositions } from './utils'

export const DESTINATION_CENTER = [-3.3, 0, 0] as const

export const generateDestination = (count: number): Float32Array => createPositions(count, (write, random) => {
  for (let index = 0; index < count; index += 1) {
    const mode = index % 5
    if (mode < 3) {
      const spoke = index % 12
      const angle = (spoke / 12) * Math.PI * 2
      const radius = Math.pow(random(), 0.72) * 5.2
      write(index,
        DESTINATION_CENTER[0] + Math.cos(angle) * radius + centeredNoise(random) * 0.055,
        DESTINATION_CENTER[1] + Math.sin(angle) * radius + centeredNoise(random) * 0.055,
        centeredNoise(random) * 0.25,
      )
    } else {
      const ring = 1.1 + (index % 4) * 0.82
      const angle = random() * Math.PI * 2
      write(index, DESTINATION_CENTER[0] + Math.cos(angle) * ring, DESTINATION_CENTER[1] + Math.sin(angle) * ring, centeredNoise(random) * 0.3)
    }
  }
}, 5501)
