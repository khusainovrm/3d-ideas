import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  Raycaster,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three'
import type { SceneFactory } from '../../three/core/types'
import type { QualityLevel } from '../../three/core/quality'
import { disposeObject } from '../../three/utils/dispose'
import {
  createFallbackLogo,
  GALAXY_CENTER,
  generateGalaxy,
  generateLine,
  generateNebula,
  generateWheel,
  PLANET_INDICES,
  PLANET_POSITIONS,
  sampleLogo,
  WHEEL_CENTER,
} from './particles/generators'
import { getCosmicState, getTransitionProgress, STATE_PROGRESS, type CosmicState } from './states'
import vertexShader from './shaders/cosmic.vert.glsl?raw'
import fragmentShader from './shaders/cosmic.frag.glsl?raw'
import rostelecomLogoUrl from './assets/rostelecom-horizontal.png'

gsap.registerPlugin(ScrollTrigger)

const PARTICLE_COUNTS: Record<QualityLevel, number> = {
  low: 4000,
  medium: 8000,
  high: 16000,
}
const METEOR_PARTICLE_COUNT = 72

const transitionAt = (value: number, start: number, end: number): number => {
  const normalized = Math.min(1, Math.max(0, (value - start) / (end - start)))
  const smooth = normalized * normalized * (3 - 2 * normalized)
  return smooth * smooth * (3 - 2 * smooth)
}

const smoothstep = (value: number, start: number, end: number): number => {
  const normalized = Math.min(1, Math.max(0, (value - start) / (end - start)))
  return normalized * normalized * (3 - 2 * normalized)
}

const duplicatePositions = (source: Float32Array, extraParticles = 0): Float32Array => {
  const positions = new Float32Array(source.length * 2 + extraParticles * 3)
  positions.set(source)
  positions.set(source, source.length)
  return positions
}

const isInteractiveTarget = (target: EventTarget | null): boolean =>
  target instanceof Element && Boolean(target.closest('a, button, input, label, form, .cosmic-tooltip'))

export const createCosmicReflowScene: SceneFactory = (runtime) => {
  const { scene, camera, renderer, container } = runtime
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches
  const pointerTarget = new Vector2()
  const pointerCurrent = new Vector2()
  const state = {
    scroll: 0,
    speakerFocus: 0.1,
    speakerInfluence: 0,
    formFocus: -1,
    pulse: 0,
    hoveredPlanet: -1,
    selectedPlanet: -1,
    wheelRotation: 0,
    meteorProgress: 0,
    meteorActive: 0,
  }

  scene.background = new Color('#030309')
  renderer.setClearColor('#030309', 1)
  camera.position.set(0, 0, 16)
  camera.fov = 44
  camera.near = 0.1
  camera.far = 80
  camera.updateProjectionMatrix()

  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uTransition: { value: 0 },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uAspectScale: { value: 1 },
      uPointer: { value: pointerCurrent },
      uPointerStrength: { value: 0 },
      uSpeakerFocus: { value: 0.1 },
      uSpeakerInfluence: { value: 0 },
      uFormFocus: { value: -1 },
      uPulse: { value: 0 },
      uHoveredPlanet: { value: -1 },
      uSelectedPlanet: { value: -1 },
      uReducedMotion: { value: runtime.reducedMotion ? 1 : 0 },
      uWheelRotation: { value: 0 },
      uMeteorProgress: { value: 0 },
      uMeteorActive: { value: 0 },
      uMeteorStart: { value: new Vector2() },
      uMeteorDirection: { value: new Vector2(0.8, -1.6) },
    },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
  })

  let particles: Points | undefined
  let particleCount = 0
  let buildVersion = 0
  let disposed = false
  let aspectScale = 1
  const planetMorphTargets = PLANET_POSITIONS.map(() => ({
    nebula: new Vector3(),
    line: new Vector3(),
    galaxy: new Vector3(),
    wheel: new Vector3(),
  }))

  const buildParticles = (quality: QualityLevel): void => {
    buildVersion += 1
    const version = buildVersion
    if (particles) {
      scene.remove(particles)
      particles.geometry.dispose()
    }

    const primaryParticleCount = PARTICLE_COUNTS[quality]
    particleCount = primaryParticleCount * 2 + METEOR_PARTICLE_COUNT
    const fallbackLogo = createFallbackLogo(particleCount)
    const nebulaPositions = duplicatePositions(generateNebula(primaryParticleCount), METEOR_PARTICLE_COUNT)
    const linePositions = duplicatePositions(generateLine(primaryParticleCount), METEOR_PARTICLE_COUNT)
    const galaxyPositions = duplicatePositions(generateGalaxy(primaryParticleCount), METEOR_PARTICLE_COUNT)
    const wheelPositions = duplicatePositions(generateWheel(primaryParticleCount), METEOR_PARTICLE_COUNT)
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(nebulaPositions, 3))
    geometry.setAttribute('aLine', new BufferAttribute(linePositions, 3))
    geometry.setAttribute('aGalaxy', new BufferAttribute(galaxyPositions, 3))
    geometry.setAttribute('aWheel', new BufferAttribute(wheelPositions, 3))
    geometry.setAttribute('aLogo', new BufferAttribute(fallbackLogo.positions, 3))
    geometry.setAttribute('aLogoColor', new BufferAttribute(fallbackLogo.colors, 3))

    const seeds = new Float32Array(particleCount)
    const sizes = new Float32Array(particleCount)
    const opacities = new Float32Array(particleCount)
    const accents = new Float32Array(particleCount)
    const planetIds = new Float32Array(particleCount).fill(-1)
    const planetSizes = new Float32Array(particleCount)
    const logoOnly = new Float32Array(particleCount)
    const meteorIds = new Float32Array(particleCount).fill(-1)
    for (let index = 0; index < particleCount; index += 1) {
      const seed = ((index * 16807) % 2147483647) / 2147483647
      seeds[index] = seed
      sizes[index] = index % 173 === 0 ? 3.6 : 0.65 + ((index * 31) % 100) / 100 * 1.35
      opacities[index] = 0.28 + ((index * 47) % 100) / 100 * 0.7
      accents[index] = index % 97 === 0 ? 1 : index % 19 === 0 ? 0.48 : 0
      logoOnly[index] = index >= primaryParticleCount && index < primaryParticleCount * 2 ? 1 : 0
      if (index >= primaryParticleCount * 2) meteorIds[index] = index - primaryParticleCount * 2
    }
    PLANET_INDICES.forEach((particleIndex, planetId) => {
      const offset = particleIndex * 3
      const targets = planetMorphTargets[planetId]!
      targets.nebula.fromArray(nebulaPositions, offset)
      targets.line.fromArray(linePositions, offset)
      targets.galaxy.fromArray(galaxyPositions, offset)
      targets.wheel.fromArray(wheelPositions, offset)
      planetIds[particleIndex] = planetId
      planetSizes[particleIndex] = 1.72 + planetId * 0.05
      sizes[particleIndex] = 1.62
      opacities[particleIndex] = 0.98
      accents[particleIndex] = 1
    })
    geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1))
    geometry.setAttribute('aSize', new BufferAttribute(sizes, 1))
    geometry.setAttribute('aOpacity', new BufferAttribute(opacities, 1))
    geometry.setAttribute('aAccent', new BufferAttribute(accents, 1))
    geometry.setAttribute('aPlanetId', new BufferAttribute(planetIds, 1))
    geometry.setAttribute('aPlanetSize', new BufferAttribute(planetSizes, 1))
    geometry.setAttribute('aLogoOnly', new BufferAttribute(logoOnly, 1))
    geometry.setAttribute('aMeteorId', new BufferAttribute(meteorIds, 1))

    particles = new Points(geometry, material)
    particles.frustumCulled = false
    scene.add(particles)

    void sampleLogo(particleCount, rostelecomLogoUrl).then((sample) => {
      if (disposed || version !== buildVersion || particles?.geometry !== geometry) return
      geometry.setAttribute('aLogo', new BufferAttribute(sample.positions, 3))
      geometry.setAttribute('aLogoColor', new BufferAttribute(sample.colors, 3))
      geometry.attributes.aLogo!.needsUpdate = true
      geometry.attributes.aLogoColor!.needsUpdate = true
    }).catch((cause: unknown) => {
      console.warn('Unable to sample the Rostelecom logo, using fallback target.', cause)
    })
  }

  buildParticles(runtime.quality)

  const scrollTween = gsap.to(state, {
    scroll: 1,
    ease: 'none',
    scrollTrigger: {
      trigger: container.parentElement,
      start: 'top top',
      end: 'bottom bottom',
      scrub: runtime.reducedMotion ? false : 0.65,
    },
  })

  let pulseTween: gsap.core.Tween | undefined
  let speakerTween: gsap.core.Timeline | gsap.core.Tween | undefined
  let meteorTween: gsap.core.Tween | undefined
  const raycaster = new Raycaster()
  const rayPointer = new Vector2()
  const rayDelta = new Vector3()
  const planetWorldPosition = new Vector3()
  const transformedPlanetPosition = new Vector3()
  const projectedPosition = new Vector3()
  const wheelCenterWorld = new Vector3()
  const wheelEdgeWorld = new Vector3()
  let currentShaderTime = 0
  let galaxyVisibility = 0
  let wheelVisibility = 0
  let logoVisibility = 0
  let pointerClientX = 0
  let pointerClientY = 0
  let pointerKnown = false
  let pointerBlocked = false
  let pointerHoveredPlanet = -1
  let keyboardPlanet = -1
  let pointerDownX = 0
  let pointerDownY = 0
  let pointerDownAt = 0
  let pointerDownPlanet = -1
  let galaxyWasInteractive = false
  let wheelDragging = false
  let wheelPointerId = -1
  let wheelLastAngle = 0
  let wheelLastMoveAt = 0
  let wheelVelocity = 0

  const canvas = renderer.domElement
  canvas.tabIndex = -1
  canvas.setAttribute('role', 'application')
  canvas.setAttribute('aria-label', 'Галактика со скрытыми сигналами. Используйте стрелки, Enter и Escape для исследования.')

  const getPlanetWorldPosition = (planetId: number, target: Vector3): Vector3 => {
    const targets = planetMorphTargets[planetId]
    if (!targets) return target.set(0, 0, 1000)

    target.copy(targets.nebula)
    target.lerp(targets.line, transitionAt(state.scroll, 0.14, 0.29))
    target.lerp(targets.galaxy, transitionAt(state.scroll, 0.35, 0.52))
    target.lerp(targets.wheel, transitionAt(state.scroll, 0.64, 0.79))

    const angle = currentShaderTime * 0.075
    const angleCos = Math.cos(angle)
    const angleSin = Math.sin(angle)
    const localX = target.x - GALAXY_CENTER[0]
    const localY = target.y - GALAXY_CENTER[1]
    const localZ = target.z - GALAXY_CENTER[2]
    // GLSL mat2 constructors are column-major. Keep this transform exactly in
    // sync with rotate2d() in cosmic.vert.glsl.
    const rotatedX = localX * angleCos + localY * angleSin
    const rotatedY = -localX * angleSin + localY * angleCos
    const tilt = 0.24
    const tiltCos = Math.cos(tilt)
    const tiltSin = Math.sin(tilt)
    const tiltedY = rotatedY * tiltCos + localZ * tiltSin
    const tiltedZ = -rotatedY * tiltSin + localZ * tiltCos
    transformedPlanetPosition.set(
      GALAXY_CENTER[0] + rotatedX,
      GALAXY_CENTER[1] + tiltedY,
      GALAXY_CENTER[2] + tiltedZ,
    )
    target.lerp(transformedPlanetPosition, galaxyVisibility)

    const particleIndex = PLANET_INDICES[planetId] ?? 0
    const seed = ((particleIndex * 16807) % 2147483647) / 2147483647
    const driftScale = 0.065 * (0.55 + getTransitionProgress(state.scroll) * 0.75)
    const driftX = Math.sin(currentShaderTime * 0.17 + seed * 17) * driftScale
    const driftY = Math.cos(currentShaderTime * 0.13 + seed * 23) * driftScale
    const driftZ = Math.sin(currentShaderTime * 0.11 + seed * 31) * driftScale

    target.x = (target.x + driftX) * aspectScale
    target.y += driftY
    target.z += driftZ
    return target
  }

  const isGalaxyInteractive = (): boolean => galaxyVisibility > 0.55 && state.scroll < 0.64

  const hitTestPlanet = (clientX: number, clientY: number): number => {
    if (!isGalaxyInteractive()) return -1
    rayPointer.set((clientX / window.innerWidth) * 2 - 1, -((clientY / window.innerHeight) * 2 - 1))
    camera.updateMatrixWorld()
    raycaster.setFromCamera(rayPointer, camera)
    const worldThreshold = coarsePointer ? 0.78 : 0.42
    const screenThreshold = coarsePointer ? 38 : 24
    let bestPlanet = -1
    let bestScreenDistance = Number.POSITIVE_INFINITY

    for (let planetId = 0; planetId < PLANET_POSITIONS.length; planetId += 1) {
      getPlanetWorldPosition(planetId, planetWorldPosition)
      const alongRay = rayDelta.copy(planetWorldPosition).sub(raycaster.ray.origin).dot(raycaster.ray.direction)
      if (alongRay <= 0) continue
      const worldDistance = raycaster.ray.distanceToPoint(planetWorldPosition)
      projectedPosition.copy(planetWorldPosition).project(camera)
      const screenX = (projectedPosition.x * 0.5 + 0.5) * window.innerWidth
      const screenY = (-projectedPosition.y * 0.5 + 0.5) * window.innerHeight
      const screenDistance = Math.hypot(clientX - screenX, clientY - screenY)
      if (worldDistance <= worldThreshold && screenDistance <= screenThreshold && screenDistance < bestScreenDistance) {
        bestPlanet = planetId
        bestScreenDistance = screenDistance
      }
    }
    return bestPlanet
  }

  const syncHover = (planetId: number): void => {
    if (state.hoveredPlanet === planetId) return
    state.hoveredPlanet = planetId
    material.uniforms.uHoveredPlanet!.value = planetId
  }

  const selectPlanet = (planetId: number): void => {
    state.selectedPlanet = planetId
    material.uniforms.uSelectedPlanet!.value = planetId
    container.dispatchEvent(new CustomEvent<number>('cosmicplanetselect', { detail: planetId }))
  }

  const syncTooltipPosition = (): void => {
    if (state.selectedPlanet < 0 || !isGalaxyInteractive()) return
    const tooltip = container.parentElement?.querySelector<HTMLElement>('[data-cosmic-tooltip]')
    if (!tooltip) return
    getPlanetWorldPosition(state.selectedPlanet, planetWorldPosition)
    projectedPosition.copy(planetWorldPosition).project(camera)
    const anchorX = (projectedPosition.x * 0.5 + 0.5) * window.innerWidth
    const anchorY = (-projectedPosition.y * 0.5 + 0.5) * window.innerHeight
    const safe = 12
    const gap = 18
    const width = tooltip.offsetWidth
    const height = tooltip.offsetHeight
    let left = anchorX + gap
    let top = anchorY - height - gap
    if (left + width > window.innerWidth - safe) left = anchorX - width - gap
    if (top < safe) top = anchorY + gap
    left = Math.min(window.innerWidth - width - safe, Math.max(safe, left))
    top = Math.min(window.innerHeight - height - safe, Math.max(safe, top))
    tooltip.style.left = `${left}px`
    tooltip.style.top = `${top}px`
    tooltip.style.visibility = 'visible'
  }

  const getWheelScreenMetrics = (): { x: number; y: number; radius: number } => {
    camera.updateMatrixWorld()
    wheelCenterWorld.set(WHEEL_CENTER[0] * aspectScale, WHEEL_CENTER[1], WHEEL_CENTER[2]).project(camera)
    wheelEdgeWorld.set((WHEEL_CENTER[0] + 4.65) * aspectScale, WHEEL_CENTER[1], WHEEL_CENTER[2]).project(camera)
    const centerX = (wheelCenterWorld.x * 0.5 + 0.5) * window.innerWidth
    const centerY = (-wheelCenterWorld.y * 0.5 + 0.5) * window.innerHeight
    const edgeX = (wheelEdgeWorld.x * 0.5 + 0.5) * window.innerWidth
    return { x: centerX, y: centerY, radius: Math.abs(edgeX - centerX) }
  }

  const isWheelInteractive = (): boolean => wheelVisibility > 0.48 && state.scroll < 0.91

  const hitTestWheel = (clientX: number, clientY: number): boolean => {
    if (!isWheelInteractive()) return false
    const wheel = getWheelScreenMetrics()
    const distance = Math.hypot(clientX - wheel.x, clientY - wheel.y)
    return distance >= wheel.radius * 0.12 && distance <= wheel.radius + 34
  }

  const getWheelPointerAngle = (clientX: number, clientY: number): number => {
    const wheel = getWheelScreenMetrics()
    return Math.atan2(clientY - wheel.y, clientX - wheel.x)
  }

  const normalizeAngleDelta = (delta: number): number => {
    if (delta > Math.PI) return delta - Math.PI * 2
    if (delta < -Math.PI) return delta + Math.PI * 2
    return delta
  }

  const setTargetState = (target: CosmicState): void => {
    state.scroll = STATE_PROGRESS[target]
  }

  const onPointerMove = (event: PointerEvent): void => {
    pointerClientX = event.clientX
    pointerClientY = event.clientY
    pointerKnown = true
    pointerBlocked = isInteractiveTarget(event.target)
    if (event.pointerType !== 'touch') keyboardPlanet = -1
    if (wheelDragging && event.pointerId === wheelPointerId) {
      event.preventDefault()
      const now = performance.now()
      const angle = getWheelPointerAngle(event.clientX, event.clientY)
      const angleDelta = normalizeAngleDelta(angle - wheelLastAngle)
      const elapsedSeconds = Math.max(1 / 120, (now - wheelLastMoveAt) / 1000)
      state.wheelRotation += angleDelta
      const instantVelocity = Math.max(-7, Math.min(7, angleDelta / elapsedSeconds))
      wheelVelocity = wheelVelocity * 0.32 + instantVelocity * 0.68
      wheelLastAngle = angle
      wheelLastMoveAt = now
      return
    }
    if (!coarsePointer && !runtime.reducedMotion) {
      pointerTarget.set((event.clientX / window.innerWidth) * 2 - 1, -((event.clientY / window.innerHeight) * 2 - 1))
    }
  }
  const onPointerDown = (event: PointerEvent): void => {
    pointerDownX = event.clientX
    pointerDownY = event.clientY
    pointerDownAt = performance.now()
    if (event.pointerType === 'mouse' && event.button === 0 && !isInteractiveTarget(event.target) && hitTestWheel(event.clientX, event.clientY)) {
      wheelDragging = true
      wheelPointerId = event.pointerId
      wheelLastAngle = getWheelPointerAngle(event.clientX, event.clientY)
      wheelLastMoveAt = pointerDownAt
      wheelVelocity = 0
      pointerDownPlanet = -1
      return
    }
    pointerDownPlanet = isInteractiveTarget(event.target)
      ? -1
      : hitTestPlanet(event.clientX, event.clientY)
  }
  const onPointerUp = (event: PointerEvent): void => {
    if (wheelDragging && event.pointerId === wheelPointerId) {
      wheelDragging = false
      wheelPointerId = -1
      pointerDownPlanet = -1
      return
    }
    if (isInteractiveTarget(event.target)) {
      pointerDownPlanet = -1
      return
    }
    const movement = Math.hypot(event.clientX - pointerDownX, event.clientY - pointerDownY)
    if (movement > 8 || performance.now() - pointerDownAt > 650) {
      pointerDownPlanet = -1
      return
    }
    if (hitTestLogo(event.clientX, event.clientY)) {
      pointerDownPlanet = -1
      triggerMeteor()
      return
    }
    const planetId = pointerDownPlanet >= 0
      ? pointerDownPlanet
      : hitTestPlanet(event.clientX, event.clientY)
    pointerDownPlanet = -1
    if (planetId >= 0) {
      selectPlanet(state.selectedPlanet === planetId ? -1 : planetId)
      canvas.focus({ preventScroll: true })
    } else if (state.selectedPlanet >= 0) {
      selectPlanet(-1)
    }
  }
  const onWindowBlur = (): void => {
    wheelDragging = false
    wheelPointerId = -1
    wheelVelocity = 0
  }
  const onCanvasFocus = (): void => {
    if (!isGalaxyInteractive()) return
    keyboardPlanet = state.selectedPlanet >= 0 ? state.selectedPlanet : 0
    syncHover(keyboardPlanet)
  }
  const onCanvasBlur = (): void => {
    keyboardPlanet = -1
    syncHover(pointerHoveredPlanet)
  }
  const onCanvasKeydown = (event: KeyboardEvent): void => {
    if (!isGalaxyInteractive()) return
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      const direction = event.key === 'ArrowRight' ? 1 : -1
      keyboardPlanet = (Math.max(0, keyboardPlanet) + direction + PLANET_POSITIONS.length) % PLANET_POSITIONS.length
      syncHover(keyboardPlanet)
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      const planetId = Math.max(0, keyboardPlanet)
      selectPlanet(state.selectedPlanet === planetId ? -1 : planetId)
      return
    }
    if (event.key === 'Escape' && state.selectedPlanet >= 0) {
      event.preventDefault()
      selectPlanet(-1)
    }
  }
  const onSpeakerFocus = (event: Event): void => {
    const index = (event as CustomEvent<number>).detail
    speakerTween?.kill()
    if (index < 0) {
      speakerTween = gsap.to(state, { speakerInfluence: 0, duration: 0.26, ease: 'power2.out' })
      return
    }

    const nextFocus = 0.1 + index * 0.24
    speakerTween = gsap.to(state, {
      speakerFocus: nextFocus,
      speakerInfluence: 1,
      duration: 0.32,
      ease: 'power2.out',
    })
  }
  const onFormFocus = (event: Event): void => {
    state.formFocus = (event as CustomEvent<number>).detail
  }
  const onComplete = (): void => {
    pulseTween?.kill()
    pulseTween = gsap.fromTo(state, { pulse: 0 }, { pulse: 1, duration: 0.85, ease: 'power2.out', yoyo: true, repeat: 1 })
  }
  const triggerMeteor = (): void => {
    if (state.meteorActive > 0.5) return
    const startX = -0.82 + Math.random() * 1.64
    const startY = 0.35 + Math.random() * 0.52
    const horizontalDirection = Math.random() < 0.5 ? -1 : 1
    const directionX = horizontalDirection * (0.55 + Math.random() * 0.65)
    const directionY = -(1.35 + Math.random() * 0.55)
    material.uniforms.uMeteorStart!.value.set(startX, startY)
    material.uniforms.uMeteorDirection!.value.set(directionX, directionY)
    state.meteorActive = 1
    state.meteorProgress = 0
    meteorTween = gsap.to(state, {
      meteorProgress: 1.18,
      duration: 1.15 + Math.random() * 0.35,
      ease: 'none',
      onComplete: () => {
        state.meteorActive = 0
        state.meteorProgress = 0
      },
    })
  }

  const hitTestLogo = (clientX: number, clientY: number): boolean => {
    if (logoVisibility < 0.8) return false
    camera.updateMatrixWorld()
    wheelCenterWorld.set(-8.3 * aspectScale, -4.1, 0).project(camera)
    wheelEdgeWorld.set(8.3 * aspectScale, 1.9, 0).project(camera)
    const left = (wheelCenterWorld.x * 0.5 + 0.5) * window.innerWidth
    const bottom = (-wheelCenterWorld.y * 0.5 + 0.5) * window.innerHeight
    const right = (wheelEdgeWorld.x * 0.5 + 0.5) * window.innerWidth
    const top = (-wheelEdgeWorld.y * 0.5 + 0.5) * window.innerHeight
    return clientX >= left && clientX <= right && clientY >= top && clientY <= bottom
  }
  const onPlanetClose = (): void => selectPlanet(-1)

  window.addEventListener('pointermove', onPointerMove, { passive: false })
  window.addEventListener('pointerdown', onPointerDown, { passive: true })
  window.addEventListener('pointerup', onPointerUp, { passive: true })
  window.addEventListener('blur', onWindowBlur)
  canvas.addEventListener('focus', onCanvasFocus)
  canvas.addEventListener('blur', onCanvasBlur)
  canvas.addEventListener('keydown', onCanvasKeydown)
  container.addEventListener('cosmicspeakerfocus', onSpeakerFocus)
  container.addEventListener('cosmicformfocus', onFormFocus)
  container.addEventListener('cosmiccomplete', onComplete)
  container.addEventListener('cosmicplanetclose', onPlanetClose)

  return {
    update: ({ elapsed, delta, reducedMotion }) => {
      if (!wheelDragging && Math.abs(wheelVelocity) > 0.0005) {
        state.wheelRotation += wheelVelocity * delta
        wheelVelocity *= reducedMotion ? 0 : Math.exp(-delta * 2.35)
      }
      pointerCurrent.lerp(pointerTarget, 0.04)
      currentShaderTime = elapsed * (reducedMotion ? 0.08 : 1)
      material.uniforms.uTime!.value = currentShaderTime
      material.uniforms.uScroll!.value = state.scroll
      material.uniforms.uTransition!.value = getTransitionProgress(state.scroll)
      material.uniforms.uPointerStrength!.value = coarsePointer || reducedMotion ? 0 : 1
      material.uniforms.uSpeakerFocus!.value = state.speakerFocus
      material.uniforms.uSpeakerInfluence!.value = state.speakerInfluence
      material.uniforms.uFormFocus!.value = state.formFocus
      material.uniforms.uPulse!.value = state.pulse
      material.uniforms.uHoveredPlanet!.value = state.hoveredPlanet
      material.uniforms.uSelectedPlanet!.value = state.selectedPlanet
      material.uniforms.uWheelRotation!.value = state.wheelRotation
      material.uniforms.uMeteorProgress!.value = state.meteorProgress
      material.uniforms.uMeteorActive!.value = state.meteorActive

      camera.position.x = pointerCurrent.x * (coarsePointer || reducedMotion ? 0 : 0.07)
      camera.position.y = pointerCurrent.y * (coarsePointer || reducedMotion ? 0 : 0.045)

      const galaxyIn = Math.min(1, Math.max(0, (state.scroll - 0.38) / 0.14))
      const galaxyOut = 1 - Math.min(1, Math.max(0, (state.scroll - 0.64) / 0.15))
      galaxyVisibility = galaxyIn * galaxyOut
      wheelVisibility = smoothstep(state.scroll, 0.67, 0.79) * (1 - smoothstep(state.scroll, 0.88, 0.98))
      logoVisibility = smoothstep(state.scroll, 0.9, 0.99)
      const galaxyInteractive = isGalaxyInteractive()
      canvas.tabIndex = galaxyInteractive ? 0 : -1
      canvas.setAttribute('aria-hidden', galaxyInteractive ? 'false' : 'true')

      if (galaxyInteractive) {
        pointerHoveredPlanet = pointerKnown && !pointerBlocked
          ? hitTestPlanet(pointerClientX, pointerClientY)
          : -1
        syncHover(document.activeElement === canvas && keyboardPlanet >= 0 ? keyboardPlanet : pointerHoveredPlanet)
        syncTooltipPosition()
      } else {
        pointerHoveredPlanet = -1
        syncHover(-1)
        if (galaxyWasInteractive && state.selectedPlanet >= 0) selectPlanet(-1)
        if (document.activeElement === canvas) canvas.blur()
      }
      galaxyWasInteractive = galaxyInteractive

      const wheelHover = pointerKnown && !pointerBlocked && hitTestWheel(pointerClientX, pointerClientY)
      if (container.parentElement) {
        container.parentElement.style.cursor = wheelDragging
          ? 'grabbing'
          : state.hoveredPlanet >= 0
            ? 'pointer'
            : wheelHover
              ? 'grab'
              : ''
      }
    },
    resize: (width, height) => {
      aspectScale = Math.min(1, (width / Math.max(1, height)) / 1.35)
      material.uniforms.uAspectScale!.value = aspectScale
    },
    setQuality: (quality, profile) => {
      buildParticles(quality)
      material.uniforms.uPixelRatio!.value = Math.min(devicePixelRatio, profile.dpr)
    },
    reset: () => {
      setTargetState('nebula')
      state.wheelRotation = 0
      wheelVelocity = 0
      window.scrollTo({ top: 0, behavior: runtime.reducedMotion ? 'auto' : 'smooth' })
    },
    stats: () => ({
      particles: particleCount,
      scrollProgress: state.scroll,
      section: getCosmicState(state.scroll),
      transitionProgress: getTransitionProgress(state.scroll),
    }),
    dispose: () => {
      disposed = true
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('blur', onWindowBlur)
      canvas.removeEventListener('focus', onCanvasFocus)
      canvas.removeEventListener('blur', onCanvasBlur)
      canvas.removeEventListener('keydown', onCanvasKeydown)
      container.removeEventListener('cosmicspeakerfocus', onSpeakerFocus)
      container.removeEventListener('cosmicformfocus', onFormFocus)
      container.removeEventListener('cosmiccomplete', onComplete)
      container.removeEventListener('cosmicplanetclose', onPlanetClose)
      if (container.parentElement) container.parentElement.style.cursor = ''
      pulseTween?.kill()
      speakerTween?.kill()
      meteorTween?.kill()
      scrollTween.scrollTrigger?.kill()
      scrollTween.kill()
      disposeObject(scene)
      material.dispose()
    },
  }
}
