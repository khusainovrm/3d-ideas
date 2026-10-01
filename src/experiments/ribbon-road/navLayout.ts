import { NAV_CONSTELLATION, ROAD_NAV_SECTIONS } from './navigation'
import { ROAD_INTRO } from './route'

// Screen-space packing reserves the whole figure (including hover/distortion)
// and its label. Stable seed prevents jumping on reset or quality changes.
export function createNavigationLayout(width: number, height: number, fov = 46) {
  const mobile = width <= 820
  const left = mobile ? 12 : width * 0.56
  const right = width - (mobile ? 12 : 28)
  const top = height * (mobile ? 0.49 : 0.18)
  const bottom = height - (mobile ? 42 : 70)
  const worldHeight = 2 * ROAD_INTRO.particleDistance * Math.tan(fov * Math.PI / 360)
  const pixelsPerUnit = height / worldHeight * ROAD_INTRO.particleIntroScale
  const count = Math.min(NAV_CONSTELLATION.figureCount, ROAD_NAV_SECTIONS.length)
  type Placement = { x: number; y: number; halfWidth: number; radius: number; labelOffset: number }
  let placed: Placement[] = []
  let scale = 1
  for (let pass = 0; pass < 45; pass += 1) {
    scale = Math.pow(0.93, pass)
    placed = []
    let seed = NAV_CONSTELLATION.layoutSeed
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      return seed / 4294967296
    }
    for (let index = 0; index < count; index += 1) {
      // Encoding bounds are +/-0.7. Include hover and a small pointer pull margin.
      const radius = 0.7 * NAV_CONSTELLATION.figureSize / 0.07
        * pixelsPerUnit * scale * NAV_CONSTELLATION.hoverScale + 10
      const labelOffset = radius + 8
      const labelWidth = ROAD_NAV_SECTIONS[index]!.label.length * 5.5 + 12
      const halfWidth = Math.max(radius, labelWidth / 2)
      const gap = NAV_CONSTELLATION.layoutGap
      let found = false
      if (right - left < halfWidth * 2 || bottom - top < radius + labelOffset + 14) break
      for (let attempt = 0; attempt < 1600; attempt += 1) {
        const x = left + halfWidth + random() * (right - left - halfWidth * 2)
        const y = top + radius + random() * (bottom - top - radius - labelOffset - 14)
        const overlaps = placed.some((other) =>
          x - halfWidth < other.x + other.halfWidth + gap
          && x + halfWidth + gap > other.x - other.halfWidth
          && y - radius < other.y + other.labelOffset + 14 + gap
          && y + labelOffset + 14 + gap > other.y - other.radius)
        if (overlaps) continue
        placed.push({ x, y, radius, halfWidth, labelOffset })
        found = true
        break
      }
      if (!found) break
    }
    if (placed.length === count) break
  }
  return {
    scale,
    figures: placed.map((point) => ({
      ...point,
      center: [
        ((point.x - width * (0.5 + ROAD_INTRO.particleViewportOffsetX)) / height * worldHeight
          - ROAD_INTRO.particleRightOffset) / ROAD_INTRO.particleIntroScale,
        ((0.5 - point.y / height) * worldHeight - ROAD_INTRO.particleVerticalOffset)
          / ROAD_INTRO.particleIntroScale,
        0,
      ] as const,
    })),
  }
}
