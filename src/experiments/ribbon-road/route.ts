import { BufferAttribute, BufferGeometry, CatmullRomCurve3, Vector3 } from 'three'

export type RibbonSplineType = 'centripetal' | 'catmullrom' | 'chordal'

export const ROAD_WIDTH = 1.825
export const ROAD_THICKNESS = 0.23
export const BALL_RADIUS = 0.46
export const BALL_SURFACE_GAP = 0.025
export const JOURNEY_START = 0.15
export const JOURNEY_END = 0.82

export const ROAD_POINT_VALUES: readonly (readonly [number, number, number])[] = [
  [-4, 7, 18], [-3.5, 6.5, 13], [-3, 6, 8], [-2.2, 5.5, 4], [-1, 5, 0],
  [0.5, 4.5, -4], [1.8, 3.5, -8], [2.8, 2.5, -12], [3.2, 2, -16], [3, 1.5, -20],
  [2.3, 0.5, -24], [1.2, -0.5, -28], [0, -1, -32], [-1.2, -1.5, -36], [-2.2, -2.5, -40],
  [-3, -3.5, -44], [-3.2, -4, -48], [-3, -5, -52], [-2.3, -6, -56], [-1.2, -6.5, -60],
  [0, -7, -64], [1, -8, -68], [1.8, -9, -72], [2.3, -9.5, -76], [2.5, -10, -81],
  [2.2, -11, -86], [1.5, -11.5, -91], [0.7, -12.2, -96], [0, -13, -102],
]

const WORLD_UP = new Vector3(0, 1, 0)

export const createRoadCurve = (
  points: readonly Vector3[] = ROAD_POINT_VALUES.map((point) => new Vector3(...point)),
  tension = 0.5,
  curveType: RibbonSplineType = 'centripetal',
): CatmullRomCurve3 => new CatmullRomCurve3([...points], false, curveType, tension)

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
