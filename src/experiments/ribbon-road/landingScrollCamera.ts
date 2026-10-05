import { LANDING_ROAD_POINTS } from './landingRoadPath'
import type { RoadPointValues } from './roadPaths'
import { CatmullRomCurve3, PerspectiveCamera, Vector3, type BufferGeometry } from 'three'

export const LANDING_SCROLL_CAMERA = {
  cameraX: 0,
  cameraZ: 14,
  fov: 46,
  edgeMargin: 0.1,
  endpointInset: 2,
}

export function validateLandingPoints(points: RoadPointValues): string {
  if (points.length < 2) return 'Нужно минимум две точки.'
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!
    if (p.length !== 3 || p.some(value => !Number.isFinite(value))) return `Точка #${i + 1}: нужны конечные X, Y, Z.`
    if (i && p.every((value, axis) => value === points[i - 1]![axis])) return `Точки #${i} и #${i + 1} совпадают.`
  }
  if (points[points.length - 1]![1] >= points[0]![1]) return 'Конец маршрута должен быть ниже начала по Y.'
  return ''
}

/** Open 3D spline: local climbs and loops are allowed; camera still descends. */
export class LandingRoadCurve extends CatmullRomCurve3 {
  readonly frameUp = new Vector3(0, 0, 1)
  constructor(values: RoadPointValues = LANDING_ROAD_POINTS) {
    const error = validateLandingPoints(values)
    if (error) throw new Error(error)
    super(values.map(p => new Vector3(...p)), false, 'centripetal')
    this.arcLengthDivisions = Math.max(2000, values.length * 80)
  }
}

/** Fit actual ribbon corners, including thickness, at every depth. */
export function landingCameraDistance(geometry: BufferGeometry, aspect: number) {
  const c = LANDING_SCROLL_CAMERA
  const positions = geometry.getAttribute('position')
  const slope = Math.tan(c.fov * Math.PI / 360) * Math.max(0.01, aspect)
    * (1 - 2 * c.edgeMargin)
  let distance = c.cameraZ
  for (let i = 0; i < positions.count; i++) {
    distance = Math.max(distance, positions.getZ(i)
      + Math.max(1, (Math.abs(positions.getX(i) - c.cameraX) + 0.05) / slope))
  }
  return distance
}

export function setLandingCamera(camera: PerspectiveCamera, progress: number, distance: number, curve: LandingRoadCurve = new LandingRoadCurve()) {
  const c = LANDING_SCROLL_CAMERA
  camera.fov = c.fov
  camera.far = Math.max(110, distance + Math.max(...curve.points.map(p => Math.abs(p.z))) + 100)
  const startY = curve.points[0]!.y, endY = curve.points[curve.points.length - 1]!.y
  const inset = Math.min(c.endpointInset, (startY - endY) / 4)
  camera.position.set(c.cameraX,
    startY - inset + (endY - startY + 2 * inset) * progress,
    distance)
  camera.quaternion.identity()
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld()
}
