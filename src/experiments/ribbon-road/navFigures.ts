import { NAV_CONSTELLATION, ROAD_NAV_SECTIONS } from './navigation'
import {
  PARTICLE_FIGURE_DATA,
  PARTICLE_FIGURE_ENCODING,
  type ParticleFigureKey,
} from './particleFigureData.generated'

export interface NavigationFigureAttributes {
  targets: Float32Array
  data: Float32Array
}

type NavigationQuality = keyof typeof NAV_CONSTELLATION.qualityParticleScale

const fract = (value: number): number => value - Math.floor(value)
const seeded = (index: number, salt: number): number => fract(Math.sin(index * 91.713 + salt * 17.17) * 43758.5453)
const decodedFigures = new Map<ParticleFigureKey, Uint8Array>()

const decodeFigure = (shape: ParticleFigureKey): Uint8Array => {
  const cached = decodedFigures.get(shape)
  if (cached) return cached
  const binary = atob(PARTICLE_FIGURE_DATA[shape].data)
  const decoded = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  decodedFigures.set(shape, decoded)
  return decoded
}

const decodeRange = (value: number, min: number, max: number): number => (
  min + value / 255 * (max - min)
)

export const generateNavigationFigures = (
  count: number,
  quality: NavigationQuality,
): NavigationFigureAttributes => {
  const targets = new Float32Array(count * 3)
  const data = new Float32Array(count * 3)
  for (let index = 0; index < count; index += 1) {
    data[index * 3] = -1
  }

  const figureCount = Math.max(1, Math.min(NAV_CONSTELLATION.figureCount, ROAD_NAV_SECTIONS.length))
  const qualityScale = NAV_CONSTELLATION.qualityParticleScale[quality]
  const requestedCounts = ROAD_NAV_SECTIONS.slice(0, figureCount).map(({ particleCount }) => (
    Math.max(1, Math.round(particleCount * qualityScale))
  ))
  const requestedTotal = requestedCounts.reduce((sum, figureCountValue) => sum + figureCountValue, 0)
  const availableScale = Math.min(1, count / Math.max(1, requestedTotal))
  const figureParticleCounts = requestedCounts.map((figureCountValue) => (
    Math.max(1, Math.floor(figureCountValue * availableScale))
  ))
  const maxDelay = Math.max(0.01, (figureCount - 1) * NAV_CONSTELLATION.formationStagger + 0.14)
  const sizeScale = NAV_CONSTELLATION.figureSize / 0.07
  const { stride, positionExtent, depthExtent } = PARTICLE_FIGURE_ENCODING
  let particleCursor = 0

  for (let figureIndex = 0; figureIndex < figureCount; figureIndex += 1) {
    const section = ROAD_NAV_SECTIONS[figureIndex]!
    const shape = section.shape as ParticleFigureKey
    const encoded = decodeFigure(shape)
    const sourceCount = PARTICLE_FIGURE_DATA[shape].count
    const targetCount = figureParticleCounts[figureIndex]!

    for (let pointIndex = 0; pointIndex < targetCount && particleCursor < count; pointIndex += 1) {
      // Even deterministic downsampling keeps every luminance layer represented at lower qualities.
      const sourceIndex = Math.min(sourceCount - 1, Math.floor((pointIndex + 0.5) * sourceCount / targetCount))
      const sourceOffset = sourceIndex * stride
      const targetOffset = particleCursor * 3
      const localX = ((encoded[sourceOffset]! + encoded[sourceOffset + 1]! * 256) / 65535 * 2 - 1) * positionExtent
      const localY = ((encoded[sourceOffset + 2]! + encoded[sourceOffset + 3]! * 256) / 65535 * 2 - 1) * positionExtent
      const localZ = decodeRange(encoded[sourceOffset + 4]!, -depthExtent, depthExtent)
      targets[targetOffset] = localX * sizeScale
      targets[targetOffset + 1] = localY * sizeScale
      targets[targetOffset + 2] = localZ * sizeScale
      data[targetOffset] = figureIndex
      const formationDelay = (
        figureIndex * NAV_CONSTELLATION.formationStagger
        + seeded(particleCursor, 52) * 0.14
      ) / maxDelay * 0.62
      const delayByte = Math.round(Math.max(0, Math.min(1, formationDelay)) * 255)
      // Pack two exact uint8 values into each float to stay within the WebGL attribute limit.
      data[targetOffset + 1] = delayByte + encoded[sourceOffset + 5]! * 256
      data[targetOffset + 2] = encoded[sourceOffset + 6]! + encoded[sourceOffset + 7]! * 256
      particleCursor += 1
    }
  }

  return { targets, data }
}
