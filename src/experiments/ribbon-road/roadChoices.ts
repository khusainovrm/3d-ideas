import { CanvasTexture, Color, Curve, Sprite, SpriteMaterial, Vector3 } from 'three'
import type { Camera, CatmullRomCurve3, Scene } from 'three'
import { createRoadChoicePreview, ROAD_CHOICE_PREVIEW } from './roadChoicePreview'
import { ROAD_NAV_SECTIONS, type RoadSectionId } from './navigation'
import { ROAD_APPEARANCE, RIBBON_ROAD_FEATURES } from './route'

export const ROAD_CHOICES = {
  diameter: 10,
  turnAngle: 25,
  upAngle: 20,
  downAngle: 20,
  turnDuration: 1.2,
  turnLength: 0.055,
  sideGap: 3,
  verticalGap: 2,
  scatter: .65,
  scatterSeed: 7,
  opacity: .85,
  inactiveOpacity: .22,
  hoverScale: 1.8,
  visibilityDistance: 23,
  visibilityWindow: .085,
  activeColor: '#ffb65c',
  inactiveColor: '#77716b',
  sections: {
    'road-about': true,
    'road-program': true,
    'road-speakers': true,
    'road-registration': true,
    'road-partners': true,
  } satisfies Record<RoadSectionId, boolean>,
}

type Direction = 'left' | 'right' | 'up' | 'down'

// Repeatable scatter: debug changes are live, but markers never jitter per frame.
const randomOffset = (key: number) => {
  const value = Math.sin(key * 127.1 + ROAD_CHOICES.scatterSeed * 311.7) * 43758.5453
  return (value - Math.floor(value)) * 2 - 1
}

type Choice = {
  id: RoadSectionId
  progress: number
  selected: Direction | null
  amount: number
  start: number
  axis: Vector3
  pivot: Vector3
}

// Preserve the base road's progress parameter: changing its shape must not
// remap arc length and make the ball jump to a different part of the road.
class ChoiceCurve extends Curve<Vector3> {
  private turns: Choice[] = []
  constructor(public base: CatmullRomCurve3, public choices: Choice[]) { super() }
  refreshTurns() {
    // Later turns are local to the path already rotated by earlier choices.
    this.turns = this.choices.filter(choice => choice.selected !== null)
      .sort((a, b) => b.progress - a.progress)
    for (const choice of this.turns) this.base.getPointAt(choice.progress, choice.pivot)
  }
  private angleAt(choice: Choice, t: number) {
    const u = Math.min(1, Math.max(0, (t - choice.progress) / Math.max(.005, ROAD_CHOICES.turnLength)))
    // Smooth entry/exit, then a constant rotation of the entire remaining path.
    return choice.amount * u * u * u * (u * (u * 6 - 15) + 10)
  }
  axisToLocal(t: number, axis: Vector3) {
    // Undo preceding rotations, so subsequent turns compose in road order,
    // even when choices are made in a different order while scrolling back.
    for (let i = this.turns.length - 1; i >= 0; i--) {
      const choice = this.turns[i]!
      axis.applyAxisAngle(choice.axis, -this.angleAt(choice, t))
    }
    return axis.normalize()
  }
  override getPoint(t: number, target = new Vector3()) {
    this.base.getPointAt(t, target)
    if (RIBBON_ROAD_FEATURES.roadChoices) {
      for (const choice of this.turns) {
        const angle = this.angleAt(choice, t)
        if (angle === 0) continue
        target.sub(choice.pivot).applyAxisAngle(choice.axis, angle).add(choice.pivot)
      }
    }
    return target
  }
  override getPointAt(t: number, target = new Vector3()) { return this.getPoint(t, target) }
  override getTangentAt(t: number, target = new Vector3()) { return this.getTangent(t, target) }
  override getLength() { return this.base.getLength() }
}

export function createRoadChoices(scene: Scene, camera: Camera, base: CatmullRomCurve3) {
  const states = new Map<number, Choice[]>()
  const fresh = (): Choice[] => ROAD_NAV_SECTIONS.map(({ id }) => ({
    id, progress: 0, selected: null, amount: 0, start: 0, axis: new Vector3(), pivot: new Vector3(),
  }))
  states.set(0, fresh())
  const curve = new ChoiceCurve(base, states.get(0)!)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const context = canvas.getContext('2d')!
  const halo = context.createRadialGradient(64, 64, 12, 64, 64, 64)
  halo.addColorStop(0, 'rgba(255,255,255,.7)')
  halo.addColorStop(.38, 'rgba(255,255,255,.22)')
  halo.addColorStop(1, 'rgba(255,255,255,0)')
  context.fillStyle = halo
  context.fillRect(0, 0, 128, 128)
  const core = context.createRadialGradient(58, 57, 1, 64, 64, 20)
  core.addColorStop(0, '#fff')
  core.addColorStop(.5, '#eee')
  core.addColorStop(1, '#686868')
  context.fillStyle = core
  context.beginPath()
  context.arc(64, 64, 20, 0, Math.PI * 2)
  context.fill()
  const texture = new CanvasTexture(canvas)
  const markers = ROAD_NAV_SECTIONS.flatMap(({ id }, index) => [-1, 1].flatMap(side => [-1, 0, 1].map(level => {
    const sprite = new Sprite(new SpriteMaterial({ map: texture, depthWrite: false, toneMapped: false }))
    sprite.visible = false
    scene.add(sprite)
    const direction: Direction = level > 0 ? 'up' : level < 0 ? 'down' : side < 0 ? 'left' : 'right'
    const key = index * 6 + (side > 0 ? 3 : 0) + level + 2
    return { id, index, side, level, direction, key, sprite, x: 0, y: 0, active: false, hover: 0 }
  })))
  const center = new Vector3()
  const axis = new Vector3()
  const screenUp = new Vector3()
  const projected = new Vector3()
  const view = new Vector3()
  const activeColor = new Color()
  const inactiveColor = new Color()
  let lastElapsed = 0
  let lastProgress = 0
  let lastEnabled = RIBBON_ROAD_FEATURES.roadChoices
  let lastTurnLength = ROAD_CHOICES.turnLength
  let dirty = false
  let roadIndex = 0
  let reducedMotion = false
  let revision = 0
  const preview = createRoadChoicePreview(scene)
  const previewCurve = new ChoiceCurve(base, fresh())
  const previewAxis = new Vector3()
  const previewStart = new Vector3()
  const previewOffset = new Vector3()
  let previewProgress = 0
  let previewEnd = 1
  const samplePreview = (t: number, target: Vector3) => {
    previewCurve.getPointAt(previewProgress + (previewEnd - previewProgress) * t, target)
    // Join the actual ball position, easing down to the road centerline.
    target.addScaledVector(previewOffset, Math.max(0, 1 - t * 16))
  }
  const turnAxis = (marker: typeof markers[number], target: Vector3) => {
    const vertical = marker.level !== 0
    const toward = axis.setFromMatrixColumn(camera.matrixWorld, vertical ? 1 : 0)
      .normalize().multiplyScalar(vertical ? marker.level : marker.side)
    target.crossVectors(curve.getTangentAt(curve.choices[marker.index]!.progress), toward)
    if (target.lengthSq() < .0001) {
      target.setFromMatrixColumn(camera.matrixWorld, vertical ? 0 : 1)
        .multiplyScalar(vertical ? marker.level : -marker.side)
    }
    return curve.axisToLocal(curve.choices[marker.index]!.progress, target)
  }
  const turnDegrees = (direction: Direction) => direction === 'up' ? ROAD_CHOICES.upAngle
    : direction === 'down' ? ROAD_CHOICES.downAngle : ROAD_CHOICES.turnAngle

  const hit = (x: number, y: number) => markers.find(marker => marker.sprite.visible
    && marker.active && RIBBON_ROAD_FEATURES.roadChoices && ROAD_CHOICES.sections[marker.id]
    && curve.choices[marker.index]!.selected === null
    && lastProgress < curve.choices[marker.index]!.progress
    && Math.hypot(x - marker.x, y - marker.y) <= Math.max(14, ROAD_CHOICES.diameter * .7))

  return {
    curve,
    setRoad(nextBase: CatmullRomCurve3, index: number) {
      preview.clear()
      roadIndex = index
      if (!states.has(index)) states.set(index, fresh())
      curve.base = nextBase
      curve.choices = states.get(index)!
      curve.refreshTurns()
      markers.forEach(marker => { marker.active = false; marker.sprite.visible = false })
      dirty = true
    },
    reset() {
      preview.clear()
      states.clear()
      states.set(roadIndex, fresh())
      curve.choices = states.get(roadIndex)!
      curve.refreshTurns()
      dirty = true
    },
    setProgress(id: RoadSectionId, progress: number) {
      const choice = curve.choices.find(choice => choice.id === id)!
      if (Math.abs(choice.progress - progress) > .00001) {
        if (choice.amount !== 0) dirty = true
        choice.progress = progress
      }
    },
    // Called before ball/camera sampling so all geometry uses the same curve.
    animate(elapsed: number, prefersReducedMotion: boolean) {
      reducedMotion = prefersReducedMotion
      lastElapsed = elapsed
      if (lastEnabled !== RIBBON_ROAD_FEATURES.roadChoices) {
        dirty = true
        lastEnabled = RIBBON_ROAD_FEATURES.roadChoices
      }
      if (lastTurnLength !== ROAD_CHOICES.turnLength) {
        dirty = true
        lastTurnLength = ROAD_CHOICES.turnLength
      }
      for (const choice of curve.choices) {
        if (!choice.selected) continue
        const t = reducedMotion ? 1 : Math.min(1, Math.max(0, (elapsed - choice.start) / Math.max(.05, ROAD_CHOICES.turnDuration)))
        const degrees = turnDegrees(choice.selected)
        const amount = degrees * Math.PI / 180 * t * t * (3 - 2 * t)
        if (Math.abs(amount - choice.amount) > .000001) { choice.amount = amount; dirty = true }
      }
      curve.refreshTurns()
      if (dirty) revision++
      const changed = dirty
      dirty = false
      return changed
    },
    update(progress: number, visible: boolean, pointerX: number, pointerY: number, delta: number, ballPosition?: Vector3) {
      lastProgress = progress
      activeColor.set(ROAD_CHOICES.activeColor)
      inactiveColor.set(ROAD_CHOICES.inactiveColor)
      axis.setFromMatrixColumn(camera.matrixWorld, 0).normalize()
      screenUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize()
      const width = window.innerWidth, height = window.innerHeight
      for (const marker of markers) {
        const choice = curve.choices[marker.index]!
        curve.getPointAt(choice.progress, center)
        // Camera-right gives genuine screen-left/right in either camera mode.
        const scatterX = randomOffset(marker.key * 2) * ROAD_CHOICES.scatter
        // Bound vertical scatter so the upper/lower markers keep their meaning.
        const scatterY = randomOffset(marker.key * 2 + 1) * Math.min(ROAD_CHOICES.scatter, ROAD_CHOICES.verticalGap * .3)
        const sideDistance = ROAD_APPEARANCE.width / 2 + Math.max(.2, ROAD_CHOICES.sideGap + scatterX)
        marker.sprite.position.copy(center)
          .addScaledVector(axis, marker.side * sideDistance)
          .addScaledVector(screenUp, marker.level * ROAD_CHOICES.verticalGap + scatterY)
        view.copy(marker.sprite.position).applyMatrix4(camera.matrixWorldInverse)
        projected.copy(marker.sprite.position).project(camera)
        const distance = camera.position.distanceTo(marker.sprite.position)
        marker.sprite.visible = visible && RIBBON_ROAD_FEATURES.roadChoices && ROAD_CHOICES.sections[marker.id]
          && view.z < 0 && projected.z > -1 && projected.z < 1 && distance < ROAD_CHOICES.visibilityDistance
          && Math.abs(progress - choice.progress) < ROAD_CHOICES.visibilityWindow
        marker.active = marker.sprite.visible && choice.selected === null && progress < choice.progress
        marker.x = (projected.x * .5 + .5) * width
        marker.y = (.5 - projected.y * .5) * height
        const hovered = marker.active && Math.hypot(pointerX - marker.x, pointerY - marker.y) <= Math.max(14, ROAD_CHOICES.diameter * .7)
        marker.hover += ((hovered ? 1 : 0) - marker.hover) * (1 - Math.exp(-12 * delta))
        if (!marker.active) marker.hover = 0
        marker.sprite.material.color.copy(marker.active ? activeColor : inactiveColor)
        marker.sprite.material.opacity = (marker.active ? ROAD_CHOICES.opacity + marker.hover * (1 - ROAD_CHOICES.opacity) : ROAD_CHOICES.inactiveOpacity)
          * Math.min(1, Math.max(0, (ROAD_CHOICES.visibilityDistance - distance) / 4))
        // The texture core is 40/128 of its quad: keep it at ~20 CSS px.
        const worldPerPixel = 2 * -view.z / (camera.projectionMatrix.elements[5]! * height)
        marker.sprite.scale.setScalar(Math.max(0, worldPerPixel * ROAD_CHOICES.diameter * 128 / 40 * (1 + marker.hover * (ROAD_CHOICES.hoverScale - 1))))
      }
      if (!visible || !RIBBON_ROAD_FEATURES.roadChoices || !ROAD_CHOICE_PREVIEW.enabled) {
        preview.clear()
        return
      }
      const hovered = hit(pointerX, pointerY)
      let shape = ''
      if (hovered) {
        turnAxis(hovered, previewAxis)
        previewProgress = progress
        previewEnd = Math.min(1, progress + ROAD_CHOICE_PREVIEW.length)
        previewCurve.base = curve.base
        for (let i = 0; i < curve.choices.length; i++) {
          const source = curve.choices[i]!, target = previewCurve.choices[i]!
          target.progress = source.progress
          target.selected = i === hovered.index ? hovered.direction : source.selected
          target.amount = i === hovered.index ? turnDegrees(hovered.direction) * Math.PI / 180 : source.amount
          target.axis.copy(i === hovered.index ? previewAxis : source.axis)
        }
        previewCurve.refreshTurns()
        curve.getPointAt(progress, previewStart)
        previewOffset.copy(ballPosition ?? previewStart).sub(previewStart)
        shape = [revision, progress, previewEnd, ROAD_CHOICES.turnLength, turnDegrees(hovered.direction),
          ...previewAxis.toArray(), ...previewOffset.toArray(), ...curve.choices.map(choice => choice.progress)].join(',')
      }
      preview.update(hovered?.key ?? null, shape, samplePreview, delta, reducedMotion)
    },
    hitTest(x: number, y: number) { return Boolean(hit(x, y)) },
    click(x: number, y: number) {
      const marker = hit(x, y)
      if (!marker) return false
      const choice = curve.choices[marker.index]!
      choice.selected = marker.direction
      choice.start = lastElapsed
      turnAxis(marker, choice.axis)
      curve.refreshTurns()
      markers.filter(other => other.index === marker.index).forEach(other => { other.active = false })
      return true
    },
    dispose() {
      preview.dispose()
      for (const { sprite } of markers) { scene.remove(sprite); sprite.material.dispose() }
      texture.dispose()
    },
  }
}
