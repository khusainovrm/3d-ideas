import { NAV_CONSTELLATION, ROAD_NAV_SECTIONS } from './navigation'
import { ROAD_INTRO } from './route'
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

export const NAV_LAYOUT_SCALE_X = 16.153846
export const NAV_LAYOUT_SCALE_Y = 10.952381
export const NAV_LAYOUT_ORIGIN_X = -2.2

export const navigationFigureCenter = (index: number): readonly [number, number, number] => {
  const columns = Math.max(1, NAV_CONSTELLATION.checkerColumns)
  const column = index % columns
  const row = Math.floor(index / columns)
  const stepX = NAV_CONSTELLATION.checkerStepX * NAV_LAYOUT_SCALE_X
  const stepY = NAV_CONSTELLATION.checkerStepY * NAV_LAYOUT_SCALE_Y
  const upperRow = index % 2 === 0
  return [
    NAV_LAYOUT_ORIGIN_X + column * stepX,
    (upperRow ? stepY : -stepY) - row * stepY * 2.4,
    0,
  ]
}

const MOBILE_FIGURE_CENTERS: readonly (readonly [number, number])[] = [
  [0.18, 0.55], [0.5, 0.55], [0.82, 0.55], [0.32, 0.76], [0.68, 0.76],
]

export const navigationMobileFigureCenter = (
  index: number,
  width = window.innerWidth,
  height = window.innerHeight,
  fov = 46,
): readonly [number, number, number] => {
  const screenCenter = MOBILE_FIGURE_CENTERS[index]
  if (!screenCenter) return navigationFigureCenter(index)
  const worldHeight = 2 * ROAD_INTRO.particleDistance * Math.tan(fov * Math.PI / 360)
  const worldWidth = worldHeight * width / Math.max(1, height)
  return [
    ((screenCenter[0] - 0.5 - ROAD_INTRO.particleViewportOffsetX) * worldWidth
      - ROAD_INTRO.particleRightOffset) / ROAD_INTRO.particleIntroScale,
    ((0.5 - screenCenter[1]) * worldHeight - ROAD_INTRO.particleVerticalOffset)
      / ROAD_INTRO.particleIntroScale,
    0,
  ]
}

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
    const center = navigationFigureCenter(figureIndex)

    for (let pointIndex = 0; pointIndex < targetCount && particleCursor < count; pointIndex += 1) {
      // Even deterministic downsampling keeps every luminance layer represented at lower qualities.
      const sourceIndex = Math.min(sourceCount - 1, Math.floor((pointIndex + 0.5) * sourceCount / targetCount))
      const sourceOffset = sourceIndex * stride
      const targetOffset = particleCursor * 3
      const localX = ((encoded[sourceOffset]! + encoded[sourceOffset + 1]! * 256) / 65535 * 2 - 1) * positionExtent
      const localY = ((encoded[sourceOffset + 2]! + encoded[sourceOffset + 3]! * 256) / 65535 * 2 - 1) * positionExtent
      const localZ = decodeRange(encoded[sourceOffset + 4]!, -depthExtent, depthExtent)
      targets[targetOffset] = center[0] + localX * sizeScale
      targets[targetOffset + 1] = center[1] + localY * sizeScale
      targets[targetOffset + 2] = center[2] + localZ * sizeScale
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
