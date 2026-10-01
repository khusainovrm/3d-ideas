import { NAV_CONSTELLATION, ROAD_NAV_SECTIONS, type NavigationShape } from './navigation'

export interface NavigationFigureAttributes {
  targets: Float32Array
  data: Float32Array
}

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

const fract = (value: number): number => value - Math.floor(value)
const seeded = (index: number, salt: number): number => fract(Math.sin(index * 91.713 + salt * 17.17) * 43758.5453)
const gaussian = (index: number, salt: number): number => {
  const u = Math.max(0.00001, seeded(index, salt))
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * seeded(index, salt + 1))
}

const shapePoint = (
  shape: NavigationShape,
  pointIndex: number,
  count: number,
): readonly [number, number] => {
  const unit = (pointIndex + seeded(pointIndex, 31)) / Math.max(1, count)
  const jitterX = gaussian(pointIndex, 32) * 0.025
  const jitterY = gaussian(pointIndex, 34) * 0.025

  if (shape === 'ring') {
    const angle = unit * Math.PI * 2
    const radius = 0.47 + gaussian(pointIndex, 36) * 0.035
    return [Math.cos(angle) * radius + jitterX, Math.sin(angle) * radius + jitterY]
  }

  if (shape === 'bars') {
    const bar = pointIndex % 3
    const x = (bar - 1) * 0.34 + jitterX
    const height = [0.62, 0.94, 0.48][bar]!
    return [x, (seeded(pointIndex, 38) - 0.5) * height + jitterY]
  }

  if (shape === 'diamond') {
    const perimeter = unit * 4
    const edge = Math.floor(perimeter)
    const t = perimeter - edge
    const vertices = [[0, 0.58], [0.58, 0], [0, -0.58], [-0.58, 0], [0, 0.58]] as const
    const from = vertices[edge]!
    const to = vertices[edge + 1]!
    return [from[0] + (to[0] - from[0]) * t + jitterX, from[1] + (to[1] - from[1]) * t + jitterY]
  }

  if (shape === 'cross') {
    const horizontal = pointIndex % 2 === 0
    const along = (seeded(pointIndex, 40) - 0.5) * 1.15
    const across = gaussian(pointIndex, 42) * 0.055
    return horizontal ? [along, across] : [across, along]
  }

  const columns = Math.max(2, Math.ceil(Math.sqrt(count)))
  const column = pointIndex % columns
  const row = Math.floor(pointIndex / columns)
  const rows = Math.ceil(count / columns)
  return [
    (column / Math.max(1, columns - 1) - 0.5) * 1.05 + jitterX,
    (row / Math.max(1, rows - 1) - 0.5) * 1.05 + jitterY,
  ]
}

export const generateNavigationFigures = (count: number): NavigationFigureAttributes => {
  const targets = new Float32Array(count * 3)
  const data = new Float32Array(count * 3)
  for (let index = 0; index < count; index += 1) data[index * 3] = -1

  const figureCount = Math.max(1, Math.min(NAV_CONSTELLATION.figureCount, ROAD_NAV_SECTIONS.length))
  const particlesPerFigure = Math.min(
    NAV_CONSTELLATION.particlesPerFigure,
    Math.floor(count / figureCount),
  )
  const selectedCount = figureCount * particlesPerFigure
  const maxDelay = Math.max(0.01, (figureCount - 1) * NAV_CONSTELLATION.formationStagger + 0.14)

  for (let index = 0; index < selectedCount; index += 1) {
    const figureIndex = Math.floor(index / particlesPerFigure)
    const pointIndex = index % particlesPerFigure
    const center = navigationFigureCenter(figureIndex)
    const section = ROAD_NAV_SECTIONS[figureIndex]!
    const [offsetX, offsetY] = shapePoint(section.shape, pointIndex, particlesPerFigure)
    const targetOffset = index * 3
    const sizeScale = NAV_CONSTELLATION.figureSize / 0.07
    targets[targetOffset] = center[0] + offsetX * sizeScale
    targets[targetOffset + 1] = center[1] + offsetY * sizeScale
    targets[targetOffset + 2] = center[2] + gaussian(index, 50) * 0.035
    data[targetOffset] = figureIndex
    data[targetOffset + 1] = 1
    data[targetOffset + 2] = (
      figureIndex * NAV_CONSTELLATION.formationStagger
      + seeded(index, 52) * 0.14
    ) / maxDelay * 0.62
  }

  return { targets, data }
}
