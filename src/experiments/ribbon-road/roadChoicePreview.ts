import { DynamicDrawUsage, InstancedInterleavedBuffer, InterleavedBufferAttribute, Vector3 } from 'three'
import type { Scene } from 'three'
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'

export const ROAD_CHOICE_PREVIEW = {
  enabled: true,
  color: '#ffd49a',
  opacity: .38,
  width: 1.5,
  fadeIn: .2,
  fadeOut: .3,
  drawDuration: 1.1,
  length: 1,
  dashed: false,
  dashSize: .35,
  gapSize: .25,
}

// One draw call, fixed buffers, no tube geometry, textures or postprocessing.
const SEGMENTS = 128
export function createRoadChoicePreview(scene: Scene) {
  const geometry = new LineSegmentsGeometry()
  geometry.setPositions(new Float32Array(SEGMENTS * 6))
  const starts = geometry.getAttribute('instanceStart') as InterleavedBufferAttribute
  const ends = geometry.getAttribute('instanceEnd') as InterleavedBufferAttribute
  starts.data.setUsage(DynamicDrawUsage)
  const distances = new InstancedInterleavedBuffer(new Float32Array(SEGMENTS * 2), 2)
  distances.setUsage(DynamicDrawUsage)
  geometry.setAttribute('instanceDistanceStart', new InterleavedBufferAttribute(distances, 1, 0))
  geometry.setAttribute('instanceDistanceEnd', new InterleavedBufferAttribute(distances, 1, 1))
  // Keep the same shader for both styles; zero gap gives a solid line.
  const material = new LineMaterial({ dashed: true, transparent: true, depthWrite: false, depthTest: false, toneMapped: false })
  const line = new LineSegments2(geometry, material)
  line.name = 'road-choice-preview'
  line.frustumCulled = false
  line.renderOrder = 5
  line.visible = false
  scene.add(line)
  const points = Array.from({ length: SEGMENTS + 1 }, () => new Vector3())
  const lengths = new Float32Array(SEGMENTS + 1)
  const tip = new Vector3()
  let activeKey: number | null = null
  let shapeKey = ''
  let alpha = 0
  let drawn = 0
  let elapsed = 0
  let lastDrawn = -1

  const clear = () => {
    activeKey = null; shapeKey = ''; alpha = 0; drawn = 0; elapsed = 0; lastDrawn = -1
    line.visible = false
  }
  return {
    clear,
    update(key: number | null, shape: string, sample: (t: number, target: Vector3) => void, delta: number, reducedMotion: boolean) {
      if (!ROAD_CHOICE_PREVIEW.enabled) { clear(); return }
      if (key !== null && key !== activeKey) {
        activeKey = key; shapeKey = ''; drawn = 0; elapsed = 0; alpha = 0
      }
      const hovering = key !== null
      if (!hovering) activeKey = null
      const duration = hovering ? ROAD_CHOICE_PREVIEW.fadeIn : ROAD_CHOICE_PREVIEW.fadeOut
      alpha = reducedMotion || duration <= 0 ? Number(hovering)
        : Math.max(0, Math.min(1, alpha + (hovering ? 1 : -1) * delta / duration))
      if (!hovering && alpha === 0) { clear(); return }
      let changed = false
      if (hovering && shape !== shapeKey) {
        shapeKey = shape
        lengths[0] = 0
        for (let i = 0; i <= SEGMENTS; i++) {
          sample(i / SEGMENTS, points[i]!)
          if (i) lengths[i] = lengths[i - 1]! + points[i]!.distanceTo(points[i - 1]!)
        }
        changed = true
      }
      if (hovering) {
        elapsed += delta
        const t = reducedMotion || ROAD_CHOICE_PREVIEW.drawDuration <= 0 ? 1 : Math.min(1, elapsed / ROAD_CHOICE_PREVIEW.drawDuration)
        drawn = t * t * (3 - 2 * t)
      }
      if (changed || drawn !== lastDrawn) {
        lastDrawn = drawn
        const limit = lengths[SEGMENTS]! * drawn
        let count = 0
        for (let i = 0; i < SEGMENTS && lengths[i]! < limit; i++) {
          const start = lengths[i]!, end = lengths[i + 1]!
          const fraction = Math.min(1, (limit - start) / Math.max(1e-8, end - start))
          tip.lerpVectors(points[i]!, points[i + 1]!, fraction)
          starts.setXYZ(i, points[i]!.x, points[i]!.y, points[i]!.z)
          ends.setXYZ(i, tip.x, tip.y, tip.z)
          distances.array[i * 2] = start
          distances.array[i * 2 + 1] = Math.min(end, limit)
          count++
        }
        geometry.instanceCount = count
        starts.data.needsUpdate = true
        distances.needsUpdate = true
      }
      material.color.set(ROAD_CHOICE_PREVIEW.color)
      material.opacity = alpha * alpha * (3 - 2 * alpha) * ROAD_CHOICE_PREVIEW.opacity
      material.linewidth = ROAD_CHOICE_PREVIEW.width
      material.dashSize = ROAD_CHOICE_PREVIEW.dashSize
      material.gapSize = ROAD_CHOICE_PREVIEW.dashed ? ROAD_CHOICE_PREVIEW.gapSize : 0
      line.visible = alpha > 0 && geometry.instanceCount > 0
    },
    dispose() { scene.remove(line); geometry.dispose(); material.dispose() },
  }
}
