import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  AdditiveBlending,
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  FrontSide,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Points,
  Quaternion,
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
  JOURNEY_END,
  JOURNEY_START,
  ROAD_THICKNESS,
  ROAD_VISIBILITY,
  ROAD_INTRO,
  PURPLE_PORTAL,
  RIBBON_ROAD_FEATURES,
  SIDE_CAMERA,
  createRibbonGeometry,
  createRoadCurve,
  getRoadFrame,
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

const PARTICLE_COUNTS: Record<QualityLevel, number> = { low: 480, medium: 900, high: 1500 }
const RIBBON_STEPS: Record<QualityLevel, number> = { low: 150, medium: 240, high: 340 }
const BALL_SEGMENTS: Record<QualityLevel, number> = { low: 16, medium: 24, high: 32 }
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
  const black = new Color('#070708')
  const purple = new Color(PURPLE_PORTAL.background)
  const background = new Color(black)
  const ballMilk = new Color('#e7e1d8')
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
  let ball: Mesh<SphereGeometry, MeshStandardMaterial> | undefined

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
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
  const portalMaterial = new MeshStandardMaterial({
    color: PURPLE_PORTAL.color,
    emissive: PURPLE_PORTAL.emissive,
    emissiveIntensity: 0.72,
    roughness: 0.58,
    metalness: 0,
  })

  const portal = new Mesh(new SphereGeometry(PURPLE_PORTAL.radius, 36, 28), portalMaterial)
  portal.position.copy(curve.getPointAt(PORTAL_PROGRESS)).addScaledVector(
    portalNormal,
    ROAD_THICKNESS / 2 + PURPLE_PORTAL.radius + BALL_SURFACE_GAP,
  )
  portal.renderOrder = 2
  portal.visible = false
  scene.add(portal)

  const buildQuality = (quality: QualityLevel): void => {
    if (ribbon) { scene.remove(ribbon); ribbon.geometry.dispose() }
    ribbon = new Mesh(createRibbonGeometry(curve, RIBBON_STEPS[quality]), ribbonMaterial)
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
    ball = new Mesh(
      new SphereGeometry(BALL_RADIUS, segments, Math.max(12, Math.round(segments * 0.75))),
      new MeshStandardMaterial({ color: ballMilk, roughness: 0.66, metalness: 0.0, emissive: '#000000', emissiveIntensity: 0.2 }),
    )
    ball.renderOrder = 3
    getRoadFrame(curve, ballProgress, tangent, normal, right)
    ball.position.copy(curve.getPointAt(ballProgress)).addScaledVector(normal, ROAD_THICKNESS / 2 + BALL_RADIUS + BALL_SURFACE_GAP)
    ballPrevious.copy(ball.position)
    ball.visible = !ROAD_INTRO.enabled
    scene.add(ball)
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
      rotationSpeed = Math.abs(ballVelocity) * curve.getLength() / BALL_RADIUS

      getRoadFrame(curve, ballProgress, tangent, normal, right)
      point.copy(curve.getPointAt(ballProgress)).addScaledVector(normal, ROAD_THICKNESS / 2 + BALL_RADIUS + BALL_SURFACE_GAP)
      if (ball) {
        const distance = point.distanceTo(ballPrevious)
        rotationAxis.crossVectors(tangent, normal).normalize()
        rotationStep.setFromAxisAngle(rotationAxis, distance / BALL_RADIUS)
        ball.quaternion.premultiply(rotationStep)
        ball.position.copy(point)
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
        heroSideView = 1 - smoothstep(0.0, 0.19, state.scroll)
        journeyCameraPosition.copy(cameraTarget)
          .addScaledVector(tangent, -7.4 * (1 - heroSideView))
          .addScaledVector(normal, 4.2)
          .addScaledVector(right, heroSideView * 5.6 + Math.sin(state.scroll * Math.PI * 4) * 0.45)
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
      }
      ribbonMaterial.uniforms.uTime!.value = elapsed
      ribbonMaterial.uniforms.uPurplePhase!.value = purplePhase
      ribbonMaterial.uniforms.uHover!.value = state.hover
      ribbonMaterial.uniforms.uPulse!.value = state.pulse > 0 ? state.pulse : -1
      ribbonMaterial.uniforms.uIntroReveal!.value = roadReveal
      ribbonMaterial.depthWrite = roadReveal > 0.98
      if (ribbon) ribbon.visible = roadReveal > 0.001
      const portalVisibility = smoothstep(0.34, 0.45, state.scroll) * (1 - smoothstep(0.58, 0.68, state.scroll))
      portalMaterial.emissiveIntensity = 0.72 + portalFlash * 1.15
      portal.visible = portalVisibility > 0.01
      const portalReveal = smoothstep(0, 0.28, portalVisibility)
      portal.scale.setScalar(portalReveal)

      if (ball) {
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
      portalMaterial.dispose()
    },
  }
}
