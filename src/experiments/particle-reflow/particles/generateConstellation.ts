import { centeredNoise, createPositions } from './utils'

export const SPEAKER_ANCHORS = [
  [-6.7, 2.7, -0.4], [-2.3, 0.4, 0.1], [3.2, 3.1, -0.5],
  [7.1, -0.6, 0.2], [-4.8, -3.0, -0.2], [2.0, -2.4, 0.3],
] as const

export const getSpeakerGroup = (index: number): number => index % SPEAKER_ANCHORS.length

export const generateConstellation = (count: number): Float32Array => createPositions(count, (write, random) => {
  for (let index = 0; index < count; index += 1) {
    const group = getSpeakerGroup(index)
    const anchor = SPEAKER_ANCHORS[group]!
    if (random() < 0.68) {
      const angle = random() * Math.PI * 2
      const radius = Math.pow(random(), 1.8) * 2.25
      write(index, anchor[0] + Math.cos(angle) * radius, anchor[1] + Math.sin(angle) * radius, anchor[2] + centeredNoise(random) * 0.7)
    } else {
      write(index, (random() - 0.5) * 21, (random() - 0.5) * 10.5, centeredNoise(random) * 1.4)
    }
  }
}, 3301)
