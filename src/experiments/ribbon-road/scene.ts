import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  AdditiveBlending,
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  DynamicDrawUsage,
  FrontSide,
  IcosahedronGeometry,
  LineSegments,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Points,
  Quaternion,
  Raycaster,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three'
import type { SceneFactory } from '../../three/core/types'
import type { QualityLevel } from '../../three/core/quality'
import { disposeObject } from '../../three/utils/dispose'
import ribbonVertexShader from './shaders/ribbon.vert.glsl?raw'
import ribbonFragmentShader from './shaders/ribbon.frag.glsl?raw'
import particleVertexShader from './shaders/particles.vert.glsl?raw'
import particleFragmentShader from './shaders/particles.frag.glsl?raw'
import {
  BALL_RADIUS,
  BALL_SURFACE_GAP,
  BALL_APPEARANCE,
  JOURNEY_END,
  JOURNEY_START,
  ROAD_APPEARANCE,
  ROAD_VISIBILITY,
  ROAD_INTRO,
  PARTICLE_CONNECTIONS,
  PURPLE_PORTAL,
  RIBBON_ROAD_FEATURES,
  SIDE_CAMERA,
  createRibbonGeometry,
  createRoadCurve,
  getRoadFrame,
  type BallShape,
} from './route'

gsap.registerPlugin(ScrollTrigger)

export const ROAD_SECTIONS = {
  hero: [0, 0.16],
  about: [0.16, 0.36],
  program: [0.36, 0.53],
  speakers: [0.53, 0.78],
  registration: [0.78, 0.91],
  partners: [0.91, 1],
} as const

type RoadSection = keyof typeof ROAD_SECTIONS

interface ParticleConnection {
  from: number
  to: number
  createdAt: number
}

const PARTICLE_COUNTS: Record<QualityLevel, number> = { low: 480, medium: 900, high: 1500 }
const RIBBON_STEPS: Record<QualityLevel, number> = { low: 150, medium: 240, high: 340 }
const BALL_SEGMENTS: Record<QualityLevel, number> = { low: 16, medium: 24, high: 32 }
const createBallGeometry = (shape: BallShape, segments: number): BufferGeometry => {
  if (shape === 'lowPoly') return new IcosahedronGeometry(BALL_RADIUS, 1)
  if (shape === 'faceted') {
    const widthSegments = Math.max(10, Math.round(segments * 0.5))
    return new SphereGeometry(BALL_RADIUS, widthSegments, Math.max(7, Math.round(widthSegments * 0.7)))
  }
  return new SphereGeometry(BALL_RADIUS, segments, Math.max(12, Math.round(segments * 0.75)))
}
const PORTAL_PROGRESS = JOURNEY_START + ROAD_SECTIONS.speakers[0] * (JOURNEY_END - JOURNEY_START) + 0.02
const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))
const journeyProgress = (scroll: number): number => JOURNEY_START + clamp01(scroll) * (JOURNEY_END - JOURNEY_START)
const smoothstep = (a: number, b: number, value: number): number => {
  const x = clamp01((value - a) / (b - a))
  return x * x * (3 - 2 * x)
}

const sectionAt = (progress: number): RoadSection => {
  for (const [name, range] of Object.entries(ROAD_SECTIONS) as [RoadSection, readonly [number, number]][]) {
    if (progress >= range[0] && progress < range[1]) return name
  }
  return 'partners'
}

const particleStateAt = (progress: number): string => {
  const section = sectionAt(progress)
  return section === 'speakers' ? 'hidden' : section
}

const particleMorphAt = (progress: number): number => {
  if (progress < 0.16) return smoothstep(0.08, 0.18, progress)
  if (progress < 0.36) return 1 + smoothstep(0.27, 0.38, progress)
  if (progress < 0.78) return 2
  if (progress < 0.91) return 2 + smoothstep(0.76, 0.86, progress)
  return 3 + smoothstep(0.89, 0.98, progress)
}

const seeded = (index: number, salt: number): number => {
  const value = Math.sin(index * 91.713 + salt * 17.17) * 43758.5453
  return value - Math.floor(value)
}

const buildParticleGeometry = (count: number): BufferGeometry => {
  const geometry = new BufferGeometry()
  const hero = new Float32Array(count * 3)
  const about = new Float32Array(count * 3)
  const program = new Float32Array(count * 3)
  const registration = new Float32Array(count * 3)
  const partners = new Float32Array(count * 3)
  const seeds = new Float32Array(count)
  const sizes = new Float32Array(count)

  for (let index = 0; index < count; index += 1) {
    const a = seeded(index, 1) * Math.PI * 2
    const b = seeded(index, 2)
    const z = (seeded(index, 3) - 0.5) * 22
    const radius = 2.2 + b * 7.5
    hero.set([Math.cos(a) * radius, 1.2 + Math.sin(a) * radius * 0.52, z], index * 3)

    const helix = index / count * Math.PI * 7
    about.set([Math.cos(helix) * (2.2 + b * 2.4), 1.5 + Math.sin(helix) * (1.2 + b * 2.8), (seeded(index, 4) - 0.5) * 22], index * 3)

    const lane = index % 5
    program.set([(lane - 2) * 1.35 + (b - 0.5) * 0.35, 0.7 + seeded(index, 5) * 5.5, (seeded(index, 6) - 0.5) * 24], index * 3)

    const cluster = index % 4
    const cx = cluster % 2 === 0 ? -3.4 : 3.4
    const cy = cluster < 2 ? 2.3 : -2.3
    registration.set([cx + (b - 0.5) * 2.2, 1.2 + cy + (seeded(index, 7) - 0.5) * 2.2, (seeded(index, 8) - 0.5) * 20], index * 3)

    const columns = 14
    const column = index % columns
    const row = Math.floor(index / columns) % 12
    partners.set([(column - (columns - 1) / 2) * 0.72, 1.2 + (row - 5.5) * 0.64, (Math.floor(index / (columns * 12)) - 3) * 1.35], index * 3)
    seeds[index] = seeded(index, 9)
    sizes[index] = 1.3 + seeded(index, 10) * 2.1
  }

  geometry.setAttribute('position', new BufferAttribute(hero, 3))
  geometry.setAttribute('aAbout', new BufferAttribute(about, 3))
  geometry.setAttribute('aProgram', new BufferAttribute(program, 3))
  geometry.setAttribute('aRegistration', new BufferAttribute(registration, 3))
  geometry.setAttribute('aPartners', new BufferAttribute(partners, 3))
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1))
  geometry.setAttribute('aSize', new BufferAttribute(sizes, 1))
  return geometry
}

export const createRibbonRoadScene: SceneFactory = (runtime) => {
  const { scene, camera, renderer, container } = runtime
  const curve = createRoadCurve()
  const state = { scroll: 0, hover: 0, pulse: 0 }
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches
  const pointer = { x: 0, y: 0, smoothX: 0, smoothY: 0 }
  const shaderPointer = new Vector2()
  const rayPointer = new Vector2()
  const black = new Color('#070708')
  const purple = new Color(PURPLE_PORTAL.background)
  const background = new Color(black)
  const ballMilk = new Color(BALL_APPEARANCE.color)
  const ballPurple = new Color('#d4c9f0')
  const tangent = new Vector3()
  const normal = new Vector3()
  const right = new Vector3()
  const point = new Vector3()
  const lookAt = new Vector3()
  const cameraTarget = new Vector3()
  const ballPrevious = new Vector3()
  const rotationAxis = new Vector3()
  const rotationStep = new Quaternion()
  const particleMatrix = new Matrix4()
  const particleRight = new Vector3()
  const particleAnchor = new Vector3()
  const particleQuaternion = new Quaternion()
  const introParticlePosition = new Vector3()
  const introParticleQuaternion = new Quaternion()
  const introForward = new Vector3()
  const introRight = new Vector3()
  const introUp = new Vector3()
  const journeyCameraPosition = new Vector3()
  const journeyLookAt = new Vector3()
  const introCameraPosition = new Vector3()
  const introLookAt = new Vector3()
  const connectionFrom = new Vector3()
  const connectionTo = new Vector3()
  const raycaster = new Raycaster()
  raycaster.params.Points = { threshold: PARTICLE_CONNECTIONS.hoverThreshold }
  const portalDelta = new Vector3()
  const portalTangent = new Vector3()
  const portalNormal = new Vector3()
  const portalRight = new Vector3()
  getRoadFrame(curve, PORTAL_PROGRESS, portalTangent, portalNormal, portalRight)
  let ballProgress = Math.max(0, JOURNEY_START - ROAD_INTRO.ballStartProgressOffset)
  let ballVelocity = 0
  let rotationSpeed = 0
  let purplePhase = 0
  let particleCount = 0
  let ribbon: Mesh | undefined
  let particles: Points | undefined
  let ball: Mesh<BufferGeometry, MeshStandardMaterial> | undefined
  let activeQuality = runtime.quality
  let lastRoadWidth = ROAD_APPEARANCE.width
  let lastRoadThickness = ROAD_APPEARANCE.thickness
  let lastBallShape: BallShape = BALL_APPEARANCE.shape
  let pointerSamplePending = false
  let lastHoveredParticle = -1
  const particleConnections: ParticleConnection[] = []

  scene.background = background
  renderer.setClearColor(black, 1)
  camera.fov = 46
  camera.near = 0.08
  camera.far = 110
  camera.updateProjectionMatrix()
  scene.add(camera)
  scene.add(new AmbientLight('#c9c2b8', 1.8))
  const keyLight = new DirectionalLight('#fff4e7', 3.2)
  keyLight.position.set(-4, 8, 7)
  scene.add(keyLight)
  const violetLight = new DirectionalLight('#7650ff', 0)
  violetLight.position.set(5, 2, -3)
  scene.add(violetLight)

  const ribbonMaterial = new ShaderMaterial({
    vertexShader: ribbonVertexShader,
    fragmentShader: ribbonFragmentShader,
    uniforms: {
      uTime: { value: 0 }, uMotion: { value: runtime.reducedMotion ? 0.15 : 1 },
      uPurplePhase: { value: 0 }, uHover: { value: 0 }, uPulse: { value: -1 },
      uFadeStart: { value: ROAD_VISIBILITY.visibleDistance },
      uFadeEnd: { value: ROAD_VISIBILITY.visibleDistance + ROAD_VISIBILITY.fadeSoftness },
      uFadeStrength: { value: ROAD_VISIBILITY.strength },
      uIntroReveal: { value: ROAD_INTRO.enabled ? 0 : 1 },
      uRoadColor: { value: new Color(ROAD_APPEARANCE.color) },
    },
    side: FrontSide,
    transparent: true,
  })
  const particleMaterial = new ShaderMaterial({
    vertexShader: particleVertexShader,
    fragmentShader: particleFragmentShader,
    uniforms: {
      uTime: { value: 0 }, uState: { value: 0 }, uPixelRatio: { value: renderer.getPixelRatio() }, uVisibility: { value: 1 },
      uPointer: { value: shaderPointer }, uViewport: { value: new Vector2(window.innerWidth, window.innerHeight) }, uPointerStrength: { value: 0 },
      uIntroNoise: { value: ROAD_INTRO.enabled && !runtime.reducedMotion ? 1 : 0 },
      uNoiseAmplitude: { value: ROAD_INTRO.particleNoiseAmplitude },
      uNoiseSpeed: { value: ROAD_INTRO.particleNoiseSpeed },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
  const connectionPositions = new Float32Array(PARTICLE_CONNECTIONS.maxLines * 2 * 3)
  const connectionAlphas = new Float32Array(PARTICLE_CONNECTIONS.maxLines * 2)
  const connectionGeometry = new BufferGeometry()
  const connectionPositionAttribute = new BufferAttribute(connectionPositions, 3)
  const connectionAlphaAttribute = new BufferAttribute(connectionAlphas, 1)
  connectionPositionAttribute.setUsage(DynamicDrawUsage)
  connectionAlphaAttribute.setUsage(DynamicDrawUsage)
  connectionGeometry.setAttribute('position', connectionPositionAttribute)
  connectionGeometry.setAttribute('aAlpha', connectionAlphaAttribute)
  const connectionMaterial = new ShaderMaterial({
    vertexShader: `
      attribute float aAlpha;
      varying float vAlpha;
      void main() {
        vAlpha = aAlpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      void main() {
        gl_FragColor = vec4(0.91, 0.89, 0.85, vAlpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  })
  const connectionLines = new LineSegments(connectionGeometry, connectionMaterial)
  connectionLines.frustumCulled = false
  connectionLines.renderOrder = 4
  connectionLines.visible = false
  scene.add(connectionLines)
  const portalMaterial = new MeshStandardMaterial({
    color: PURPLE_PORTAL.color,
    emissive: PURPLE_PORTAL.emissive,
    emissiveIntensity: 0.72,
    roughness: 0.58,
    metalness: 0,
  })
  const ballMaterial = new MeshStandardMaterial({
    color: ballMilk,
    roughness: 0.66,
    metalness: 0,
    emissive: '#000000',
    emissiveIntensity: 0.2,
  })

  const portal = new Mesh(new SphereGeometry(PURPLE_PORTAL.radius, 36, 28), portalMaterial)
  portal.position.copy(curve.getPointAt(PORTAL_PROGRESS)).addScaledVector(
    portalNormal,
    ROAD_APPEARANCE.thickness / 2 + PURPLE_PORTAL.radius + BALL_SURFACE_GAP,
  )
  portal.renderOrder = 2
  portal.visible = false
  scene.add(portal)

  const buildQuality = (quality: QualityLevel): void => {
    activeQuality = quality
    if (ribbon) { scene.remove(ribbon); ribbon.geometry.dispose() }
    ribbon = new Mesh(createRibbonGeometry(curve, RIBBON_STEPS[quality], ROAD_APPEARANCE.width, ROAD_APPEARANCE.thickness), ribbonMaterial)
    ribbon.frustumCulled = false
    ribbon.visible = !ROAD_INTRO.enabled
    scene.add(ribbon)

    if (particles) { particles.parent?.remove(particles); particles.geometry.dispose() }
    particleCount = PARTICLE_COUNTS[quality]
    particles = new Points(buildParticleGeometry(particleCount), particleMaterial)
    particles.frustumCulled = false
    scene.add(particles)

    if (ball) { scene.remove(ball); ball.geometry.dispose() }
    const segments = BALL_SEGMENTS[quality]
    ballMaterial.flatShading = BALL_APPEARANCE.shape !== 'sphere'
    ballMaterial.needsUpdate = true
    ball = new Mesh(createBallGeometry(BALL_APPEARANCE.shape, segments), ballMaterial)
    ball.renderOrder = 3
    getRoadFrame(curve, ballProgress, tangent, normal, right)
    ball.position.copy(curve.getPointAt(ballProgress)).addScaledVector(normal, ROAD_APPEARANCE.thickness / 2 + BALL_APPEARANCE.radius + BALL_SURFACE_GAP)
    ballPrevious.copy(ball.position)
    ball.visible = !ROAD_INTRO.enabled
    scene.add(ball)
    lastRoadWidth = ROAD_APPEARANCE.width
    lastRoadThickness = ROAD_APPEARANCE.thickness
    lastBallShape = BALL_APPEARANCE.shape
  }
  buildQuality(runtime.quality)

  const scrollTween = gsap.to(state, {
    scroll: 1,
    ease: 'none',
    scrollTrigger: { trigger: container.parentElement, start: 'top top', end: 'bottom bottom', scrub: runtime.reducedMotion ? false : 0.45 },
  })
  let hoverTween: gsap.core.Tween | undefined
  let pulseTween: gsap.core.Tween | undefined
  const onNavFocus = (event: Event): void => {
    const active = (event as CustomEvent<number>).detail >= 0
    hoverTween?.kill()
    hoverTween = gsap.to(state, { hover: active ? 1 : 0, duration: 0.45, ease: 'sine.out' })
  }
  const onComplete = (): void => {
    pulseTween?.kill()
    state.pulse = 0
    pulseTween = gsap.to(state, { pulse: 1, duration: 1.4, ease: 'power2.inOut', onComplete: () => { state.pulse = 0 } })
  }
  const onPointerMove = (event: PointerEvent): void => {
    if (coarsePointer) return
    pointer.x = (event.clientX / Math.max(1, window.innerWidth)) * 2 - 1
    pointer.y = -((event.clientY / Math.max(1, window.innerHeight)) * 2 - 1)
    rayPointer.set(pointer.x, pointer.y)
    pointerSamplePending = true
  }
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  container.addEventListener('roadnavfocus', onNavFocus)
  container.addEventListener('roadcomplete', onComplete)

  let introProgress = ROAD_INTRO.enabled ? 0 : 1
  let introEndScroll = 0
  const introProgressAt = (reducedMotion: boolean): number => {
    if (!ROAD_INTRO.enabled) { introEndScroll = 0; return 1 }
    const viewportHeight = Math.max(1, window.innerHeight)
    const section = ROAD_INTRO.triggerSectionId ? document.getElementById(ROAD_INTRO.triggerSectionId) : null
    const start = section
      ? section.getBoundingClientRect().top + window.scrollY
      : viewportHeight * ROAD_INTRO.triggerViewportHeights
    const end = start + viewportHeight * ROAD_INTRO.transitionViewportHeights
    introEndScroll = end
    if (reducedMotion) return window.scrollY >= start ? 1 : 0
    return smoothstep(start, Math.max(start + 1, end), window.scrollY)
  }

  return {
    update: ({ elapsed, delta, reducedMotion }) => {
      if (ROAD_APPEARANCE.width !== lastRoadWidth || ROAD_APPEARANCE.thickness !== lastRoadThickness) {
        if (ribbon) {
          ribbon.geometry.dispose()
          ribbon.geometry = createRibbonGeometry(
            curve,
            RIBBON_STEPS[activeQuality],
            ROAD_APPEARANCE.width,
            ROAD_APPEARANCE.thickness,
          )
        }
        portal.position.copy(curve.getPointAt(PORTAL_PROGRESS)).addScaledVector(
          portalNormal,
          ROAD_APPEARANCE.thickness / 2 + PURPLE_PORTAL.radius + BALL_SURFACE_GAP,
        )
        lastRoadWidth = ROAD_APPEARANCE.width
        lastRoadThickness = ROAD_APPEARANCE.thickness
      }
      if (BALL_APPEARANCE.shape !== lastBallShape && ball) {
        ball.geometry.dispose()
        ball.geometry = createBallGeometry(BALL_APPEARANCE.shape, BALL_SEGMENTS[activeQuality])
        ball.material.flatShading = BALL_APPEARANCE.shape !== 'sphere'
        ball.material.needsUpdate = true
        lastBallShape = BALL_APPEARANCE.shape
      }

      introProgress = introProgressAt(reducedMotion)
      const roadReveal = smoothstep(ROAD_INTRO.roadRevealStart, ROAD_INTRO.roadRevealEnd, introProgress)
      const ballEntry = smoothstep(ROAD_INTRO.ballEntryStart, ROAD_INTRO.ballEntryEnd, introProgress)
      pointer.smoothX += (pointer.x - pointer.smoothX) * (1 - Math.exp(-2.2 * Math.min(delta, 0.05)))
      pointer.smoothY += (pointer.y - pointer.smoothY) * (1 - Math.exp(-2.2 * Math.min(delta, 0.05)))
      shaderPointer.set(pointer.smoothX, pointer.smoothY)
      const journeyTargetProgress = clamp01(journeyProgress(state.scroll) + 0.02)
      const introBallStart = Math.max(0, JOURNEY_START - ROAD_INTRO.ballStartProgressOffset)
      const introTargetProgress = introBallStart + (ROAD_INTRO.ballArrivalProgress - introBallStart) * ballEntry
      const handoffDistance = Math.max(1, window.innerHeight * ROAD_INTRO.ballHandoffViewportHeights)
      const ballHandoff = !ROAD_INTRO.enabled || reducedMotion
        ? 1
        : smoothstep(introEndScroll, introEndScroll + handoffDistance, window.scrollY)
      const targetProgress = introTargetProgress + (journeyTargetProgress - introTargetProgress) * ballHandoff
      const previousProgress = ballProgress
      const damping = reducedMotion ? 18 : state.scroll > 0.78 ? 6.5 : 4.6
      const blend = 1 - Math.exp(-damping * Math.min(delta, 0.05))
      ballProgress += (targetProgress - ballProgress) * blend
      ballVelocity = (ballProgress - previousProgress) / Math.max(delta, 0.001)
      rotationSpeed = Math.abs(ballVelocity) * curve.getLength() / Math.max(0.05, BALL_APPEARANCE.radius)

      getRoadFrame(curve, ballProgress, tangent, normal, right)
      point.copy(curve.getPointAt(ballProgress)).addScaledVector(
        normal,
        ROAD_APPEARANCE.thickness / 2 + BALL_APPEARANCE.radius + BALL_SURFACE_GAP,
      )
      if (ball) {
        const distance = point.distanceTo(ballPrevious)
        rotationAxis.crossVectors(tangent, normal).normalize()
        rotationStep.setFromAxisAngle(rotationAxis, distance / Math.max(0.05, BALL_APPEARANCE.radius))
        ball.quaternion.premultiply(rotationStep)
        ball.position.copy(point)
        ball.scale.setScalar(BALL_APPEARANCE.radius / BALL_RADIUS)
        ballPrevious.copy(point)
        ball.visible = ballEntry > 0.005
      }

      const signedPortalDistance = portalDelta.copy(point).sub(portal.position).dot(portalTangent)
      const portalEntry = smoothstep(
        -PURPLE_PORTAL.radius * PURPLE_PORTAL.crossingSoftness,
        PURPLE_PORTAL.radius * PURPLE_PORTAL.crossingSoftness,
        signedPortalDistance,
      )
      const portalExit = 1 - smoothstep(ROAD_SECTIONS.speakers[1] - 0.015, ROAD_SECTIONS.registration[0] + 0.055, state.scroll)
      purplePhase = portalEntry * portalExit
      background.copy(black).lerp(purple, purplePhase)
      scene.background = background
      const portalFlash = 1 - smoothstep(PURPLE_PORTAL.radius * 0.18, PURPLE_PORTAL.radius * 1.35, Math.abs(signedPortalDistance))
      violetLight.intensity = purplePhase * 5.2 + portalFlash * 2.4

      // The camera must have a single continuous source of truth. Switching
      // between scroll progress and ball progress caused a visible position
      // jump at the end of the intro handoff.
      const cameraProgress = clamp01(ballProgress - 0.02)
      getRoadFrame(curve, cameraProgress, tangent, normal, right)
      const horizontalPointer = RIBBON_ROAD_FEATURES.horizontalPointerCamera && !coarsePointer && !reducedMotion
        ? pointer.smoothX
        : 0
      let heroSideView = 0
      if (RIBBON_ROAD_FEATURES.cinematic3DCamera) {
        cameraTarget.copy(curve.getPointAt(cameraProgress))
        // Hold a true profile view while the road and ball first appear. The
        // camera only starts orbiting into the journey view after intro has
        // fully arrived, using the same smooth handoff as the ball.
        heroSideView = ROAD_INTRO.enabled ? 1 - smoothstep(0, 1, ballHandoff) : 0
        const cameraHeight = ROAD_INTRO.initialSideHeight
          + (4.2 - ROAD_INTRO.initialSideHeight) * (1 - heroSideView)
        journeyCameraPosition.copy(cameraTarget)
          .addScaledVector(tangent, -7.4 * (1 - heroSideView))
          .addScaledVector(normal, cameraHeight)
          .addScaledVector(right, heroSideView * ROAD_INTRO.initialSideDistance + Math.sin(state.scroll * Math.PI * 4) * 0.45)
          .addScaledVector(right, horizontalPointer * 0.4)
        const lookAhead = 0.012 + (1 - heroSideView) * 0.033
        journeyLookAt.copy(curve.getPointAt(clamp01(cameraProgress + lookAhead))).addScaledVector(normal, 0.2)
      } else {
        // The camera follows the real ball but keeps a constant view direction
        // along -X. On screen it can only shift horizontally (Z) and vertically
        // (Y), so the route is always observed from a perpendicular side view.
        cameraTarget.copy(point)
        const pointerX = horizontalPointer * SIDE_CAMERA.horizontalPointerTravel
        const pointerY = coarsePointer || reducedMotion ? 0 : pointer.smoothY * SIDE_CAMERA.verticalPointerTravel
        journeyCameraPosition.set(
          cameraTarget.x + SIDE_CAMERA.distance,
          cameraTarget.y + SIDE_CAMERA.heightOffset + pointerY,
          cameraTarget.z + pointerX,
        )
        journeyLookAt.set(cameraTarget.x, journeyCameraPosition.y, journeyCameraPosition.z)
      }
      const cameraArrival = smoothstep(0, 1, introProgress)
      introCameraPosition.copy(journeyCameraPosition).addScaledVector(introUp.set(0, 1, 0), ROAD_INTRO.cameraLift)
      introLookAt.copy(journeyLookAt).addScaledVector(introUp, ROAD_INTRO.cameraLift)
      camera.position.lerpVectors(introCameraPosition, journeyCameraPosition, cameraArrival)
      lookAt.lerpVectors(introLookAt, journeyLookAt, cameraArrival)
      camera.lookAt(lookAt)
      camera.updateMatrixWorld()

      const particlesVisibility = 1 - purplePhase
      particleMaterial.uniforms.uTime!.value = elapsed * (reducedMotion ? 0.2 : 1)
      particleMaterial.uniforms.uState!.value = particleMorphAt(state.scroll)
      particleMaterial.uniforms.uVisibility!.value = particlesVisibility
      particleMaterial.uniforms.uPointerStrength!.value = coarsePointer || reducedMotion ? 0 : 1
      particleMaterial.uniforms.uIntroNoise!.value = reducedMotion
        ? 0
        : 1 - smoothstep(0.08, 0.92, introProgress)
      if (particles) {
        const anchorProgress = clamp01(ballProgress + 0.008)
        getRoadFrame(curve, anchorProgress, tangent, normal, right)
        particleAnchor.copy(curve.getPointAt(anchorProgress)).addScaledVector(normal, 0.5)
        particleRight.copy(right).multiplyScalar(-1)
        particleMatrix.makeBasis(particleRight, normal, tangent)
        particleQuaternion.setFromRotationMatrix(particleMatrix)

        camera.getWorldDirection(introForward)
        introRight.set(1, 0, 0).applyQuaternion(camera.quaternion)
        introUp.set(0, 1, 0).applyQuaternion(camera.quaternion)
        introParticlePosition.copy(camera.position)
          .addScaledVector(introForward, ROAD_INTRO.particleDistance)
          .addScaledVector(introRight, ROAD_INTRO.particleRightOffset)
          .addScaledVector(introUp, ROAD_INTRO.particleVerticalOffset)
        introParticleQuaternion.copy(camera.quaternion)

        particles.position.lerpVectors(introParticlePosition, particleAnchor, introProgress)
        particles.quaternion.slerpQuaternions(introParticleQuaternion, particleQuaternion, introProgress)
        particles.scale.setScalar(ROAD_INTRO.particleIntroScale + (1 - ROAD_INTRO.particleIntroScale) * introProgress)

        const connectionsActive = RIBBON_ROAD_FEATURES.particleConnections
          && !coarsePointer
          && !reducedMotion
          && introProgress <= 0.001
        connectionLines.visible = connectionsActive
        connectionLines.position.copy(particles.position)
        connectionLines.quaternion.copy(particles.quaternion)
        connectionLines.scale.copy(particles.scale)

        if (!connectionsActive) {
          lastHoveredParticle = -1
          particleConnections.length = 0
          connectionGeometry.setDrawRange(0, 0)
          pointerSamplePending = false
        } else {
          particles.updateMatrixWorld(true)
          if (pointerSamplePending) {
            raycaster.setFromCamera(rayPointer, camera)
            const hit = raycaster.intersectObject(particles, false)[0]
            const hoveredParticle = hit?.index ?? -1
            if (hoveredParticle >= 0 && hoveredParticle !== lastHoveredParticle) {
              if (lastHoveredParticle >= 0) {
                if (particleConnections.length >= PARTICLE_CONNECTIONS.maxLines) particleConnections.shift()
                particleConnections.push({ from: lastHoveredParticle, to: hoveredParticle, createdAt: elapsed })
              }
              lastHoveredParticle = hoveredParticle
            }
            pointerSamplePending = false
          }

          const heroPositions = particles.geometry.getAttribute('position') as BufferAttribute
          const seeds = particles.geometry.getAttribute('aSeed') as BufferAttribute
          const noiseTime = elapsed * ROAD_INTRO.particleNoiseSpeed
          const introNoise = 1 - smoothstep(0.08, 0.92, introProgress)
          const sampleParticle = (index: number, target: Vector3): void => {
            target.fromBufferAttribute(heroPositions, index)
            const seed = seeds.getX(index)
            const phase = seed * 47.123
            const amplitude = ROAD_INTRO.particleNoiseAmplitude
              * (0.55 + (seed * 73.71 % 1) * 0.45)
              * introNoise
            target.x += (Math.sin(noiseTime * 0.83 + phase) + Math.sin(noiseTime * 1.71 + phase * 1.37) * 0.46) * amplitude
            target.y += (Math.cos(noiseTime * 0.71 + phase * 1.91) + Math.sin(noiseTime * 1.43 + phase * 0.67) * 0.42) * amplitude
            target.z += (Math.sin(noiseTime * 0.59 + phase * 2.13) + Math.cos(noiseTime * 1.27 + phase * 0.91) * 0.36) * amplitude
            target.x += Math.sin(elapsed * 0.16 + seed * 19) * 0.035
            target.y += Math.cos(elapsed * 0.13 + seed * 23) * 0.03
          }

          const fadeDuration = Math.max(0.05, PARTICLE_CONNECTIONS.fadeDuration)
          for (let index = particleConnections.length - 1; index >= 0; index -= 1) {
            if (elapsed - particleConnections[index]!.createdAt >= fadeDuration) particleConnections.splice(index, 1)
          }
          particleConnections.forEach((connection, index) => {
            sampleParticle(connection.from, connectionFrom)
            sampleParticle(connection.to, connectionTo)
            const positionOffset = index * 6
            connectionPositions.set(connectionFrom.toArray(), positionOffset)
            connectionPositions.set(connectionTo.toArray(), positionOffset + 3)
            const life = clamp01((elapsed - connection.createdAt) / fadeDuration)
            const alpha = (1 - smoothstep(0, 1, life)) * 0.38
            connectionAlphas[index * 2] = alpha
            connectionAlphas[index * 2 + 1] = alpha
          })
          connectionGeometry.setDrawRange(0, particleConnections.length * 2)
          connectionPositionAttribute.needsUpdate = true
          connectionAlphaAttribute.needsUpdate = true
        }
      }
      ribbonMaterial.uniforms.uTime!.value = elapsed
      ribbonMaterial.uniforms.uPurplePhase!.value = purplePhase
      ribbonMaterial.uniforms.uHover!.value = state.hover
      ribbonMaterial.uniforms.uPulse!.value = state.pulse > 0 ? state.pulse : -1
      ribbonMaterial.uniforms.uIntroReveal!.value = roadReveal
      ;(ribbonMaterial.uniforms.uRoadColor!.value as Color).set(ROAD_APPEARANCE.color)
      ribbonMaterial.depthWrite = roadReveal > 0.98
      if (ribbon) ribbon.visible = roadReveal > 0.001
      const portalVisibility = smoothstep(0.34, 0.45, state.scroll) * (1 - smoothstep(0.58, 0.68, state.scroll))
      portalMaterial.emissiveIntensity = 0.72 + portalFlash * 1.15
      portal.visible = portalVisibility > 0.01
      const portalReveal = smoothstep(0, 0.28, portalVisibility)
      portal.scale.setScalar(portalReveal)

      if (ball) {
        ballMilk.set(BALL_APPEARANCE.color)
        ball.material.color.copy(ballMilk).lerp(ballPurple, purplePhase * 0.72)
        ball.material.emissive.copy(ballPurple)
        ball.material.emissiveIntensity = purplePhase * 0.22 + state.pulse * 0.45
      }
    },
    resize: (width, height) => {
      particleMaterial.uniforms.uPixelRatio!.value = renderer.getPixelRatio()
      particleMaterial.uniforms.uViewport!.value.set(width, height)
    },
    setQuality: (quality, profile) => {
      buildQuality(quality)
      particleMaterial.uniforms.uPixelRatio!.value = Math.min(devicePixelRatio, profile.dpr)
    },
    reset: () => window.scrollTo({ top: 0, behavior: runtime.reducedMotion ? 'auto' : 'smooth' }),
    stats: () => ({
      particles: particleCount,
      scrollProgress: state.scroll,
      transitionProgress: introProgress,
      section: sectionAt(state.scroll),
      ribbonProgress: state.scroll,
      particleState: particleStateAt(state.scroll),
      particlesVisible: purplePhase < 0.05,
      purplePhase: purplePhase > 0.5,
      ballProgress,
      ballVelocity,
      ballPosition: `${point.x.toFixed(1)}, ${point.y.toFixed(1)}, ${point.z.toFixed(1)}`,
      ballLag: Math.max(0, journeyProgress(state.scroll) + 0.02 - ballProgress),
      ballRotationSpeed: rotationSpeed,
    }),
    dispose: () => {
      window.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('roadnavfocus', onNavFocus)
      container.removeEventListener('roadcomplete', onComplete)
      hoverTween?.kill()
      pulseTween?.kill()
      scrollTween.scrollTrigger?.kill()
      scrollTween.kill()
      disposeObject(scene)
      ribbonMaterial.dispose()
      particleMaterial.dispose()
      connectionGeometry.dispose()
      connectionMaterial.dispose()
      portalMaterial.dispose()
    },
  }
}
