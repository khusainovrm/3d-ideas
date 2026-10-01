import { BufferAttribute, BufferGeometry, CatmullRomCurve3, Vector3 } from 'three'
import { roadPointValuesAt, type RoadPointValues } from './roadPaths'

export type RibbonSplineType = 'centripetal' | 'catmullrom' | 'chordal'

export const ROAD_WIDTH = 1.825
export const ROAD_THICKNESS = 0.23
export const BALL_RADIUS = 0.46
export const BALL_SURFACE_GAP = -0.01
export const JOURNEY_START = 0.09
export const JOURNEY_END = 0.82

export type BallShape = 'sphere' | 'faceted' | 'lowPoly'

/** Mutable runtime values exposed in the #debug appearance folders. */
export const ROAD_APPEARANCE = {
  width: ROAD_WIDTH,
  thickness: ROAD_THICKNESS,
  color: '#e7e1d8',
}

export const BALL_APPEARANCE: { radius: number; shape: BallShape; color: string } = {
  radius: BALL_RADIUS,
  shape: 'sphere',
  color: '#e7e1d8',
}

/**
 * Controls how much of the road is visible around the camera.
 * `visibleDistance` is the fully opaque radius, `fadeSoftness` is the length
 * of the soft dissolve into darkness, and `strength` blends the effect from
 * disabled (0) to fully applied (1).
 */
export const ROAD_VISIBILITY = {
  visibleDistance: 15.5,
  fadeSoftness: 5.5,
  strength: 1,
} as const

export const PURPLE_PORTAL = {
  radius: BALL_RADIUS,
  color: '#7655ff',
  emissive: '#4320aa',
  background: '#2b105d',
  crossingSoftness: 0.72,
} as const

/**
 * true  — current cinematic camera following the 3D road frame.
 * false — fixed side view without 3D turns; pointer movement stays in the
 *         two-dimensional Y/Z observation plane.
 */
export const RIBBON_ROAD_FEATURES = {
  cinematic3DCamera: true,
  horizontalPointerCamera: true,
  particleConnections: false,
}

export const PARTICLE_CONNECTIONS = {
  fadeDuration: 6,
  maxLines: 64,
  hoverThreshold: 0.22,
}

export const SIDE_CAMERA = {
  distance: 10,
  heightOffset: 1.4,
  horizontalPointerTravel: 1.1,
  verticalPointerTravel: 0.65,
} as const

/** Intro before the regular road journey.
 * The transition starts at the configured trigger and lasts
 * `transitionViewportHeights`. Set `triggerSectionId` (for example,
 * `road-about`) to use a DOM section, or leave it null to use viewport scroll.
 */
export const ROAD_INTRO = {
  enabled: true,
  triggerSectionId: null as string | null,
  triggerViewportHeights: 1,
  transitionViewportHeights: 0.45,
  cameraLift: 11,
  roadRevealStart: 0.18,
  roadRevealEnd: 0.82,
  ballEntryStart: 0.34,
  ballEntryEnd: 0.96,
  ballStartProgressOffset: 0.1,
  ballArrivalProgress: JOURNEY_START + 0.02,
  ballHandoffViewportHeights: 0.65,
  initialSideDistance: 6.8,
  initialSideHeight: 1.8,
  particleDistance: 8,
  particleRightOffset: 0.65,
  particleViewportOffsetX: 0.1,
  particleVerticalOffset: 0,
  particleRevealDelay: 0.2,
  particleRevealDuration: 3,
  particleIntroScale: 0.42,
  particleNoiseAmplitude: 0.24,
  particleNoiseSpeed: 0.42,
} as const


const WORLD_UP = new Vector3(0, 1, 0)

export const createRoadCurve = (
  pointValues: RoadPointValues | readonly Vector3[] = roadPointValuesAt(0),
  tension = 0.5,
  curveType: RibbonSplineType = 'centripetal',
): CatmullRomCurve3 => new CatmullRomCurve3(
  pointValues.map((point) => point instanceof Vector3 ? point.clone() : new Vector3(...point)),
  false,
  curveType,
  tension,
)

export const getRoadFrame = (
  curve: CatmullRomCurve3,
  progress: number,
  tangent: Vector3,
  normal: Vector3,
  right: Vector3,
): void => {
  curve.getTangentAt(Math.max(0, Math.min(1, progress)), tangent).normalize()
  normal.copy(WORLD_UP).addScaledVector(tangent, -WORLD_UP.dot(tangent))
  if (normal.lengthSq() < 0.0001) normal.set(0, 0, 1)
  normal.normalize()
  right.crossVectors(tangent, normal).normalize()
}

export const createRibbonGeometry = (
  curve: CatmullRomCurve3,
  steps: number,
  width = ROAD_WIDTH,
  thickness = ROAD_THICKNESS,
): BufferGeometry => {
  const geometry = new BufferGeometry()
  const positions = new Float32Array((steps + 1) * 8 * 3)
  const normals = new Float32Array((steps + 1) * 8 * 3)
  const indices = new Uint32Array(steps * 4 * 6)
  const tangent = new Vector3()
  const up = new Vector3()
  const right = new Vector3()
  const center = new Vector3()
  const corners = [new Vector3(), new Vector3(), new Vector3(), new Vector3()]

  const write = (array: Float32Array, vertex: number, value: Vector3): void => {
    array[vertex * 3] = value.x
    array[vertex * 3 + 1] = value.y
    array[vertex * 3 + 2] = value.z
  }

  for (let index = 0; index <= steps; index += 1) {
    const progress = index / steps
    curve.getPointAt(progress, center)
    getRoadFrame(curve, progress, tangent, up, right)
    corners[0]!.copy(center).addScaledVector(up, thickness / 2).addScaledVector(right, -width / 2)
    corners[1]!.copy(center).addScaledVector(up, thickness / 2).addScaledVector(right, width / 2)
    corners[2]!.copy(center).addScaledVector(up, -thickness / 2).addScaledVector(right, width / 2)
    corners[3]!.copy(center).addScaledVector(up, -thickness / 2).addScaledVector(right, -width / 2)
    const base = index * 8
    write(positions, base, corners[0]!); write(positions, base + 1, corners[1]!)
    write(positions, base + 2, corners[2]!); write(positions, base + 3, corners[3]!)
    write(positions, base + 4, corners[3]!); write(positions, base + 5, corners[0]!)
    write(positions, base + 6, corners[1]!); write(positions, base + 7, corners[2]!)
    write(normals, base, up); write(normals, base + 1, up)
    write(normals, base + 2, up.clone().negate()); write(normals, base + 3, up.clone().negate())
    write(normals, base + 4, right.clone().negate()); write(normals, base + 5, right.clone().negate())
    write(normals, base + 6, right); write(normals, base + 7, right)
  }

  for (let index = 0; index < steps; index += 1) {
    for (let face = 0; face < 4; face += 1) {
      const a = index * 8 + face * 2
      const b = a + 1
      const c = (index + 1) * 8 + face * 2
      const d = c + 1
      indices.set([a, b, c, c, b, d], (index * 4 + face) * 6)
    }
  }

  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new BufferAttribute(normals, 3))
  geometry.setIndex(new BufferAttribute(indices, 1))
  geometry.computeBoundingSphere()
  return geometry
}
