import {
  AmbientLight,
  AxesHelper,
  BufferGeometry,
  Color,
  DirectionalLight,
  FrontSide,
  GridHelper,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Raycaster,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import type { SceneFactory } from '../../three/core/types'
import { disposeObject } from '../../three/utils/dispose'
import { createRibbonGeometry, createRoadCurve, getRoadFrame } from '../ribbon-road/route'
import { getIntroPreviewState, type ConstructorState } from './model'

const FORWARD = new Vector3(0, 0, 1)
const SECTIONS = [
  ['hero', 0], ['about', 0.16], ['program', 0.36], ['speakers', 0.53],
  ['registration', 0.78], ['partners', 0.91], ['footer', 1],
] as const

export interface ConstructorBridge {
  state: ConstructorState
  onSelect(index: number): void
  onTransformCommit(): void
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))
const smoothstep = (start: number, end: number, value: number): number => {
  const x = clamp01((value - start) / Math.max(0.0001, end - start))
  return x * x * (3 - 2 * x)
}
const curveFromNodes = (state: ConstructorState) => createRoadCurve(
  state.nodes.map((node) => new Vector3(node.position.x, node.position.y, node.position.z)),
  state.tension,
  state.splineType,
)

const lineGeometry = (points: readonly Vector3[]): BufferGeometry => new BufferGeometry().setFromPoints([...points])

const sectionAt = (progress: number): string => {
  for (let index = SECTIONS.length - 1; index >= 0; index -= 1) {
    const item = SECTIONS[index]
    if (item && progress >= item[1]) return item[0]
  }
  return 'hero'
}

export const createConstructorScene = (bridge: ConstructorBridge): SceneFactory => (runtime) => {
  const { scene, camera, renderer } = runtime
  const state = bridge.state
  scene.background = new Color('#09090a')
  renderer.setClearColor('#09090a', 1)
  camera.position.set(12, 12, 24)
  camera.fov = state.camera.fov
  camera.near = state.camera.near
  camera.far = state.camera.far
  camera.updateProjectionMatrix()

  scene.add(new AmbientLight('#dad4ca', 1.8))
  const light = new DirectionalLight('#fff7eb', 3.4)
  light.position.set(-6, 12, 8)
  scene.add(light)

  const roadMaterial = new MeshStandardMaterial({ color: '#e7e1d8', roughness: 0.74, metalness: 0, side: FrontSide, transparent: true })
  const ballMaterial = new MeshStandardMaterial({ color: '#eee7dc', roughness: 0.65, metalness: 0 })
  const nodeMaterial = new MeshStandardMaterial({ color: '#aaa7a0', roughness: 0.55 })
  const polygonMaterial = new LineBasicMaterial({ color: '#6c6a65', transparent: true, opacity: 0.65 })
  const splineMaterial = new LineBasicMaterial({ color: '#ff6a13', transparent: true, opacity: 0.88 })
  const portalMaterial = new MeshStandardMaterial({ color: '#7655ff', emissive: '#4d2cc7', emissiveIntensity: 0.75, transparent: true, opacity: 0.76 })

  let curve = curveFromNodes(state)
  let road = new Mesh(createRibbonGeometry(curve, state.geometrySteps, state.width, state.thickness), roadMaterial)
  let polygon = new Line(lineGeometry(curve.points), polygonMaterial)
  let spline = new Line(lineGeometry(curve.getPoints(300)), splineMaterial)
  let handles = new InstancedMesh(new SphereGeometry(0.28, 14, 10), nodeMaterial, state.nodes.length)
  handles.instanceMatrix.setUsage(35048)
  handles.frustumCulled = false
  scene.add(road, polygon, spline, handles)

  const ball = new Mesh(new SphereGeometry(state.ballRadius, 24, 18), ballMaterial)
  scene.add(ball)
  const portal = new Mesh(new SphereGeometry(1, 24, 16), portalMaterial)
  portal.scale.set(1, 1, 0.18)
  scene.add(portal)
  const grid = new GridHelper(120, 40, '#3d3b37', '#242321')
  grid.position.y = -13.5
  scene.add(grid)
  const axes = new AxesHelper(5)
  scene.add(axes)

  const orbit = new OrbitControls(camera, renderer.domElement)
  orbit.enableDamping = true
  orbit.dampingFactor = 0.08
  orbit.target.set(0, -3, -38)
  orbit.update()

  const transformTarget = new Object3D()
  scene.add(transformTarget)
  const transform = new TransformControls(camera, renderer.domElement)
  transform.setMode('translate')
  transform.setSize(0.8)
  const transformHelper = transform.getHelper()
  scene.add(transformHelper)

  const raycaster = new Raycaster()
  const rayPointer = new Vector2()
  const instanceMatrix = new Matrix4()
  const instanceColor = new Color()
  const tangent = new Vector3()
  const normal = new Vector3()
  const right = new Vector3()
  const point = new Vector3()
  const previousBallPosition = new Vector3()
  const rotationAxis = new Vector3()
  const rotationStep = new Quaternion()
  const cameraTarget = new Vector3()
  const desiredCamera = new Vector3()
  const desiredLook = new Vector3()
  const journeyCamera = new Vector3()
  const journeyLook = new Vector3()
  const introCamera = new Vector3()
  const introLook = new Vector3()
  const worldUp = new Vector3(0, 1, 0)
  const pointer = new Vector2()
  let lastRevision = -1
  let lastMode = state.mode
  let lastSelected = -2
  let lastFocusNonce = state.focusNonce
  let draggingBefore = ''
  let currentQualityScale = runtime.profile.segmentScale
  let latestIntroProgress = state.intro.enabled ? 0 : 1
  let snapPreviewCamera = false

  const updateHandles = (): void => {
    for (let index = 0; index < state.nodes.length; index += 1) {
      const node = state.nodes[index]!
      instanceMatrix.makeTranslation(node.position.x, node.position.y, node.position.z)
      handles.setMatrixAt(index, instanceMatrix)
      if (index === state.selectedIndex) instanceColor.set('#ff6a13')
      else if (index === state.hoveredIndex) instanceColor.set('#f5f1e9')
      else if (index === 0) instanceColor.set('#79c99e')
      else if (index === state.nodes.length - 1) instanceColor.set('#8b78ff')
      else instanceColor.set('#aaa7a0')
      handles.setColorAt(index, instanceColor)
    }
    handles.instanceMatrix.needsUpdate = true
    if (handles.instanceColor) handles.instanceColor.needsUpdate = true
  }

  const rebuild = (): void => {
    curve = curveFromNodes(state)
    const dragScale = state.dragging ? 0.5 : 1
    const steps = Math.max(40, Math.round(state.geometrySteps * currentQualityScale * dragScale))
    road.geometry.dispose()
    road.geometry = createRibbonGeometry(curve, steps, state.width, state.thickness)
    polygon.geometry.dispose()
    polygon.geometry = lineGeometry(curve.points)
    spline.geometry.dispose()
    spline.geometry = lineGeometry(curve.getPoints(Math.max(100, steps)))
    if (handles.count !== state.nodes.length) {
      scene.remove(handles)
      handles.geometry.dispose()
      handles = new InstancedMesh(new SphereGeometry(0.28, 14, 10), nodeMaterial, state.nodes.length)
      handles.frustumCulled = false
      scene.add(handles)
    }
    updateHandles()
    const selected = state.nodes[state.selectedIndex]
    if (selected) transformTarget.position.set(selected.position.x, selected.position.y, selected.position.z)
    const portalProgress = state.journeyStart + 0.53 * (state.journeyEnd - state.journeyStart) + 0.02
    portal.position.copy(curve.getPointAt(clamp01(portalProgress)))
    portal.quaternion.setFromUnitVectors(FORWARD, curve.getTangentAt(clamp01(portalProgress)).normalize())
    lastRevision = state.revision
  }

  const select = (index: number): void => {
    bridge.onSelect(index)
    const node = state.nodes[index]
    if (node) {
      transformTarget.position.set(node.position.x, node.position.y, node.position.z)
      transform.attach(transformTarget)
    } else transform.detach()
    updateHandles()
  }

  const pointerNdc = (event: PointerEvent): void => {
    const rect = renderer.domElement.getBoundingClientRect()
    rayPointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -(((event.clientY - rect.top) / rect.height) * 2 - 1))
  }
  const hitHandle = (event: PointerEvent): number => {
    pointerNdc(event)
    raycaster.setFromCamera(rayPointer, camera)
    return raycaster.intersectObject(handles, false)[0]?.instanceId ?? -1
  }
  const onPointerMove = (event: PointerEvent): void => {
    pointerNdc(event)
    pointer.lerp(rayPointer, 0.16)
    if (state.mode !== 'edit' || state.dragging) return
    const next = hitHandle(event)
    if (next !== state.hoveredIndex) { state.hoveredIndex = next; updateHandles() }
  }
  const onPointerDown = (event: PointerEvent): void => {
    if (state.mode !== 'edit' || state.dragging) return
    const index = hitHandle(event)
    if (index >= 0) select(index)
  }
  const onWheel = (event: WheelEvent): void => {
    if (state.mode !== 'preview') return
    event.preventDefault()
    state.playing = false
    state.progress = clamp01(state.progress + event.deltaY * 0.00065)
  }
  const onTransformChange = (): void => {
    if (!state.dragging) return
    const node = state.nodes[state.selectedIndex]
    if (!node) return
    node.position.x = transformTarget.position.x
    node.position.y = transformTarget.position.y
    node.position.z = transformTarget.position.z
    state.revision += 1
  }
  const onDraggingChanged = (event: { value: unknown }): void => {
    const dragging = Boolean(event.value)
    state.dragging = dragging
    orbit.enabled = !dragging && state.mode === 'edit'
    if (dragging) draggingBefore = JSON.stringify(state.nodes)
    else if (draggingBefore) { state.revision += 1; bridge.onTransformCommit(); draggingBefore = '' }
  }

  renderer.domElement.addEventListener('pointermove', onPointerMove, { passive: true })
  renderer.domElement.addEventListener('pointerdown', onPointerDown)
  renderer.domElement.addEventListener('wheel', onWheel, { passive: false })
  transform.addEventListener('objectChange', onTransformChange)
  transform.addEventListener('dragging-changed', onDraggingChanged)
  rebuild()
  select(state.selectedIndex)

  return {
    update: ({ delta }) => {
      if (lastRevision !== state.revision) rebuild()
      if (lastSelected !== state.selectedIndex) { lastSelected = state.selectedIndex; select(state.selectedIndex) }

      if (state.mode !== lastMode) {
        lastMode = state.mode
        orbit.enabled = state.mode === 'edit'
        transformHelper.visible = state.mode === 'edit'
        if (state.mode === 'edit') {
          camera.position.set(12, 12, Math.min(30, curve.points[0]?.z ?? 24))
          orbit.target.copy(curve.getPointAt(clamp01(state.journeyStart + state.progress * (state.journeyEnd - state.journeyStart))))
          orbit.update()
        } else snapPreviewCamera = true
      }

      if (state.focusNonce !== lastFocusNonce) {
        lastFocusNonce = state.focusNonce
        const selected = state.nodes[state.selectedIndex]
        if (selected) {
          orbit.target.set(selected.position.x, selected.position.y, selected.position.z)
          camera.position.set(selected.position.x + 7, selected.position.y + 5, selected.position.z + 8)
        }
      }

      if (state.mode === 'preview' && state.playing) {
        state.progress = clamp01(state.progress + delta * 0.045)
        if (state.progress >= 1) state.playing = false
      }

      const intro = getIntroPreviewState(state)
      latestIntroProgress = intro.progress
      const journeyTargetProgress = clamp01(state.journeyStart + state.progress * (state.journeyEnd - state.journeyStart) + 0.02)
      const introBallStart = Math.max(0, state.journeyStart - state.intro.ballStartProgressOffset)
      const introTargetProgress = introBallStart + (state.intro.ballArrivalProgress - introBallStart) * intro.ballEntry
      const targetCurveProgress = state.mode === 'preview' && state.intro.enabled
        ? introTargetProgress + (journeyTargetProgress - introTargetProgress) * intro.ballHandoff
        : journeyTargetProgress
      const ballBlend = state.mode === 'preview' && state.followScroll ? 1 - Math.exp(-state.ballDamping * Math.min(delta, 0.05)) : 1
      state.ballProgress += (targetCurveProgress - state.ballProgress) * ballBlend
      getRoadFrame(curve, state.ballProgress, tangent, normal, right)
      point.copy(curve.getPointAt(state.ballProgress)).addScaledVector(normal, state.thickness / 2 + state.ballRadius + state.ballGap)
      const travelled = point.distanceTo(previousBallPosition)
      if (travelled < 4) {
        rotationAxis.crossVectors(tangent, normal).normalize()
        rotationStep.setFromAxisAngle(rotationAxis, travelled / Math.max(0.05, state.ballRadius))
        ball.quaternion.premultiply(rotationStep)
      }
      ball.position.copy(point)
      ball.scale.setScalar(state.ballRadius / 0.46)
      previousBallPosition.copy(point)
      ball.visible = state.ballVisible && (state.mode === 'edit' || !state.intro.enabled || intro.ballEntry > 0.005)

      if (state.mode === 'preview') {
        const cameraProgress = clamp01(state.ballProgress - 0.02)
        getRoadFrame(curve, cameraProgress, tangent, normal, right)
        cameraTarget.copy(curve.getPointAt(cameraProgress))
        const initialSideView = state.intro.enabled ? 1 - smoothstep(0, 1, intro.ballHandoff) : 0
        const cameraHeight = state.intro.initialSideHeight
          + (state.camera.heightOffset - state.intro.initialSideHeight) * (1 - initialSideView)
        const sideOffset = state.intro.initialSideDistance * initialSideView
          + state.camera.sideOffset * (1 - initialSideView)
        journeyCamera.copy(cameraTarget)
          .addScaledVector(tangent, -state.camera.distanceBehind * (1 - initialSideView))
          .addScaledVector(normal, cameraHeight)
          .addScaledVector(right, sideOffset + pointer.x * state.camera.pointerParallax)
          .addScaledVector(normal, pointer.y * state.camera.pointerParallax * 0.35)
        const lookAhead = 0.012 + (state.camera.lookAhead - 0.012) * (1 - initialSideView)
        journeyLook.copy(curve.getPointAt(clamp01(cameraProgress + lookAhead))).addScaledVector(normal, 0.2)
        introCamera.copy(journeyCamera).addScaledVector(worldUp, state.intro.cameraLift)
        introLook.copy(journeyLook).addScaledVector(worldUp, state.intro.cameraLift)
        desiredCamera.lerpVectors(introCamera, journeyCamera, intro.progress)
        desiredLook.lerpVectors(introLook, journeyLook, intro.progress)
        const cameraBlend = 1 - Math.exp(-state.camera.damping * Math.min(delta, 0.05))
        if (snapPreviewCamera) {
          camera.position.copy(desiredCamera)
          snapPreviewCamera = false
        } else camera.position.lerp(desiredCamera, cameraBlend)
        camera.lookAt(desiredLook)
      } else orbit.update()

      camera.fov = state.camera.fov; camera.near = state.camera.near; camera.far = state.camera.far; camera.updateProjectionMatrix()
      const roadReveal = state.mode === 'preview' && state.intro.enabled ? intro.roadReveal : 1
      road.visible = state.showRibbon && roadReveal > 0.001
      roadMaterial.opacity = roadReveal
      roadMaterial.depthWrite = roadReveal > 0.98
      handles.visible = state.mode === 'edit' && state.showPoints
      polygon.visible = state.mode === 'edit' && state.showPolygon
      spline.visible = state.mode === 'edit' && state.showSpline
      grid.visible = state.mode === 'edit' && state.showGrid
      axes.visible = state.mode === 'edit' && state.showAxes
      portal.visible = state.showPortal && (state.mode === 'edit' || (state.progress > 0.34 && state.progress < 0.68))
      transformHelper.visible = state.mode === 'edit' && state.selectedIndex >= 0
    },
    setQuality: (_quality, profile) => { currentQualityScale = profile.segmentScale; state.revision += 1 },
    reset: () => { state.progress = 0; state.playing = false },
    stats: () => ({
      scrollProgress: state.progress,
      ribbonProgress: state.progress,
      transitionProgress: latestIntroProgress,
      ballProgress: state.ballProgress,
      ballPosition: `${ball.position.x.toFixed(1)}, ${ball.position.y.toFixed(1)}, ${ball.position.z.toFixed(1)}`,
      section: sectionAt(state.progress),
      lineSamples: Math.round(state.geometrySteps * currentQualityScale),
      nodeCount: state.nodes.length,
      selectedNode: state.selectedIndex,
      editorMode: state.mode,
      dragging: state.dragging,
      historyIndex: state.historyIndex,
      cameraPosition: `${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)}`,
      cameraTarget: `${desiredLook.x.toFixed(1)}, ${desiredLook.y.toFixed(1)}, ${desiredLook.z.toFixed(1)}`,
    }),
    dispose: () => {
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('wheel', onWheel)
      transform.removeEventListener('objectChange', onTransformChange)
      transform.removeEventListener('dragging-changed', onDraggingChanged)
      transform.detach()
      transform.dispose()
      orbit.dispose()
      disposeObject(scene)
    },
  }
}
