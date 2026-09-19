import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  Line,
  MathUtils,
  Mesh,
  PlaneGeometry,
  Points,
  ShaderMaterial,
  Vector3,
} from 'three'
import type { SceneFactory } from '../../three/core/types'
import type { QualityLevel } from '../../three/core/quality'
import { disposeObject } from '../../three/utils/dispose'
import { getJourneySection, rangeProgress } from './sections'
import oceanVertex from './shaders/ocean.vert.glsl?raw'
import oceanFragment from './shaders/ocean.frag.glsl?raw'
import horizonVertex from './shaders/horizon.vert.glsl?raw'
import horizonFragment from './shaders/horizon.frag.glsl?raw'
import routeVertex from './shaders/route.vert.glsl?raw'
import routeFragment from './shaders/route.frag.glsl?raw'
import starsVertex from './shaders/stars.vert.glsl?raw'
import starsFragment from './shaders/stars.frag.glsl?raw'
import atmosphereVertex from './shaders/atmosphere.vert.glsl?raw'
import atmosphereFragment from './shaders/atmosphere.frag.glsl?raw'

gsap.registerPlugin(ScrollTrigger)

const OCEAN_SEGMENTS: Record<QualityLevel, number> = { low: 56, medium: 88, high: 128 }
const STAR_COUNTS: Record<QualityLevel, number> = { low: 1500, medium: 3000, high: 5000 }
const ATMOSPHERE_COUNTS: Record<QualityLevel, number> = { low: 400, medium: 900, high: 1500 }

const smooth = (value: number, start: number, end: number): number =>
  MathUtils.smoothstep(value, start, end)

const sampleKeyframes = (progress: number, values: readonly number[]): number => {
  const scaled = Math.min(0.9999, progress) * (values.length - 1)
  const index = Math.floor(scaled)
  return MathUtils.lerp(values[index] ?? values[0] ?? 0, values[index + 1] ?? values[values.length - 1] ?? 0, scaled - index)
}

export const createConferenceJourneyScene: SceneFactory = (runtime) => {
  const { scene, camera, renderer, container } = runtime
  const state = { progress: 0, focus: -1, completion: 0 }
  const heroColor = new Color('#031017')
  const nightColor = new Color('#01040b')
  const arrivalColor = new Color('#17242a')
  const currentColor = new Color()
  const fogColor = new Color()
  const lookTarget = new Vector3()

  scene.background = currentColor.copy(heroColor)
  camera.position.set(0, 1.25, 8)
  camera.fov = 46
  camera.far = 240
  camera.updateProjectionMatrix()

  const oceanMaterial = new ShaderMaterial({
    vertexShader: oceanVertex,
    fragmentShader: oceanFragment,
    uniforms: {
      uTime: { value: 0 },
      uWaveStrength: { value: 0.72 },
      uProgress: { value: 0 },
      uNight: { value: 0 },
      uLight: { value: 0.18 },
      uMotion: { value: runtime.reducedMotion ? 0.28 : 1 },
      uFogColor: { value: fogColor.copy(heroColor) },
      uFogDensity: { value: 0.02 },
    },
  })
  const horizonMaterial = new ShaderMaterial({
    vertexShader: horizonVertex,
    fragmentShader: horizonFragment,
    uniforms: { uIntensity: { value: 0.16 }, uNight: { value: 0 }, uFinish: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
  const routeMaterial = new ShaderMaterial({
    vertexShader: routeVertex,
    fragmentShader: routeFragment,
    uniforms: { uReveal: { value: 0 }, uOpacity: { value: 0 }, uLift: { value: 0 }, uFinish: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
  const starsMaterial = new ShaderMaterial({
    vertexShader: starsVertex,
    fragmentShader: starsFragment,
    uniforms: {
      uTime: { value: 0 }, uOpacity: { value: 0 }, uSize: { value: renderer.getPixelRatio() * 2.5 }, uFocus: { value: -1 },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
  const atmosphereMaterial = new ShaderMaterial({
    vertexShader: atmosphereVertex,
    fragmentShader: atmosphereFragment,
    uniforms: {
      uTime: { value: 0 }, uSize: { value: renderer.getPixelRatio() * 2.2 }, uOpacity: { value: 0.55 }, uBurst: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })

  let ocean: Mesh | undefined
  let stars: Points | undefined
  let atmosphere: Points | undefined
  let particleCount = 0

  const buildOcean = (quality: QualityLevel): void => {
    if (ocean) {
      scene.remove(ocean)
      ocean.geometry.dispose()
    }
    const segments = OCEAN_SEGMENTS[quality]
    ocean = new Mesh(new PlaneGeometry(100, 180, segments, segments), oceanMaterial)
    ocean.rotation.x = -Math.PI / 2
    ocean.position.set(0, 0, -66)
    scene.add(ocean)
  }

  const buildStars = (quality: QualityLevel): void => {
    if (stars) {
      scene.remove(stars)
      stars.geometry.dispose()
    }
    const count = STAR_COUNTS[quality]
    const positions = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    const phases = new Float32Array(count)
    const speakers = new Float32Array(count).fill(-1)
    const navigationPositions = [
      [-7, 7, -34], [-2.5, 10, -42], [4.5, 6, -38],
      [-5, 13, -57], [1.2, 15, -64], [7, 11, -52],
    ] as const
    for (let index = 0; index < count; index += 1) {
      const offset = index * 3
      const navigation = navigationPositions[index]
      positions[offset] = navigation?.[0] ?? (Math.random() - 0.5) * 70
      positions[offset + 1] = navigation?.[1] ?? 2 + Math.random() * 31
      positions[offset + 2] = navigation?.[2] ?? -18 - Math.random() * 100
      scales[index] = navigation ? 3 : Math.random() > 0.985 ? 1.8 : 0.35 + Math.random() * 0.75
      phases[index] = Math.random() * Math.PI * 2
      if (navigation) speakers[index] = index
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(positions, 3))
    geometry.setAttribute('aScale', new BufferAttribute(scales, 1))
    geometry.setAttribute('aPhase', new BufferAttribute(phases, 1))
    geometry.setAttribute('aSpeaker', new BufferAttribute(speakers, 1))
    stars = new Points(geometry, starsMaterial)
    scene.add(stars)
  }

  const buildAtmosphere = (quality: QualityLevel): void => {
    if (atmosphere) {
      scene.remove(atmosphere)
      atmosphere.geometry.dispose()
    }
    const count = ATMOSPHERE_COUNTS[quality]
    const positions = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    const phases = new Float32Array(count)
    for (let index = 0; index < count; index += 1) {
      const offset = index * 3
      positions[offset] = (Math.random() - 0.5) * 38
      positions[offset + 1] = 0.3 + Math.random() * 8
      positions[offset + 2] = 4 - Math.random() * 90
      scales[index] = 0.25 + Math.random() * 0.8
      phases[index] = Math.random() * Math.PI * 2
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(positions, 3))
    geometry.setAttribute('aScale', new BufferAttribute(scales, 1))
    geometry.setAttribute('aPhase', new BufferAttribute(phases, 1))
    atmosphere = new Points(geometry, atmosphereMaterial)
    scene.add(atmosphere)
    particleCount = count + STAR_COUNTS[quality]
  }

  buildOcean(runtime.quality)
  buildStars(runtime.quality)
  buildAtmosphere(runtime.quality)

  const horizon = new Mesh(new PlaneGeometry(95, 30, 1, 1), horizonMaterial)
  horizon.position.set(0, 6, -92)
  horizon.renderOrder = 1
  scene.add(horizon)

  const routeCurve = new CatmullRomCurve3([
    new Vector3(0, 0.07, 5), new Vector3(-1.6, 0.08, -10), new Vector3(2.1, 0.1, -26),
    new Vector3(-2.8, 0.13, -43), new Vector3(1.2, 0.18, -62), new Vector3(0, 0.28, -86),
  ])
  const routePoints = routeCurve.getPoints(220)
  const routeGeometry = new BufferGeometry().setFromPoints(routePoints)
  routeGeometry.setAttribute('aProgress', new BufferAttribute(Float32Array.from(routePoints, (_, index) => index / 220), 1))
  const route = new Line(routeGeometry, routeMaterial)
  route.renderOrder = 2
  scene.add(route)

  const scrollTween = gsap.to(state, {
    progress: 1,
    ease: 'none',
    scrollTrigger: {
      trigger: container.parentElement,
      start: 'top top',
      end: 'bottom bottom',
      scrub: runtime.reducedMotion ? false : 0.8,
    },
  })
  let finishTween: gsap.core.Tween | undefined

  const onSpeakerFocus = (event: Event): void => {
    state.focus = (event as CustomEvent<number>).detail
  }
  const onJourneyComplete = (): void => {
    finishTween?.kill()
    finishTween = gsap.fromTo(state, { completion: 0 }, { completion: 1, duration: 1.15, ease: 'power2.out', yoyo: true, repeat: 1 })
  }
  container.addEventListener('speakerfocus', onSpeakerFocus)
  container.addEventListener('journeycomplete', onJourneyComplete)

  return {
    update: ({ elapsed }) => {
      const progress = state.progress
      const nightIn = smooth(progress, 0.28, 0.43)
      const nightOut = smooth(progress, 0.56, 0.73)
      const night = nightIn * (1 - nightOut)
      const arrival = smooth(progress, 0.64, 0.9)
      const testimonialsCalm = smooth(progress, 0.52, 0.61) * (1 - smooth(progress, 0.68, 0.76))
      const routeFirst = smooth(progress, 0.14, 0.34)
      const routeFade = 1 - smooth(progress, 0.5, 0.6)
      const routeReturn = smooth(progress, 0.66, 0.77)
      const routeOpacity = Math.max(routeFirst * routeFade, routeReturn) * 0.62

      currentColor.copy(heroColor).lerp(nightColor, night)
      currentColor.lerp(arrivalColor, arrival * 0.78)
      fogColor.copy(currentColor)
      scene.background = currentColor

      oceanMaterial.uniforms.uTime!.value = elapsed * (runtime.reducedMotion ? 0.28 : 1)
      oceanMaterial.uniforms.uProgress!.value = progress
      oceanMaterial.uniforms.uNight!.value = night
      oceanMaterial.uniforms.uLight!.value = 0.16 + arrival * 0.84
      oceanMaterial.uniforms.uWaveStrength!.value = 0.72 - testimonialsCalm * 0.34 - arrival * 0.18
      oceanMaterial.uniforms.uFogDensity!.value = 0.021 + night * 0.009 - arrival * 0.011
      oceanMaterial.uniforms.uFogColor!.value.copy(fogColor)

      horizonMaterial.uniforms.uIntensity!.value = 0.14 + arrival * 0.9 + state.completion * 0.16
      horizonMaterial.uniforms.uNight!.value = night
      horizonMaterial.uniforms.uFinish!.value = state.completion
      routeMaterial.uniforms.uReveal!.value = Math.max(rangeProgress(progress, 0.14, 0.43), routeReturn)
      routeMaterial.uniforms.uOpacity!.value = routeOpacity
      routeMaterial.uniforms.uLift!.value = night * 8.5
      routeMaterial.uniforms.uFinish!.value = state.completion
      starsMaterial.uniforms.uTime!.value = elapsed
      starsMaterial.uniforms.uOpacity!.value = night * 0.92
      starsMaterial.uniforms.uFocus!.value = state.focus
      atmosphereMaterial.uniforms.uTime!.value = elapsed * (runtime.reducedMotion ? 0.2 : 1)
      atmosphereMaterial.uniforms.uOpacity!.value = 0.48 + smooth(progress, 0.12, 0.28) * 0.22 - night * 0.24
      atmosphereMaterial.uniforms.uBurst!.value = state.completion

      const cameraY = sampleKeyframes(progress, [1.25, 2.4, 4.5, 2.1, 4.7, 4.9])
      const cameraZ = 8 - progress * (runtime.reducedMotion ? 5 : 19)
      camera.position.x = Math.sin(elapsed * 0.07) * (runtime.reducedMotion ? 0.025 : 0.12)
      camera.position.y += (cameraY - camera.position.y) * 0.035
      camera.position.z += (cameraZ - camera.position.z) * 0.025
      lookTarget.set(0, night * 5.2 + arrival * 1.2, camera.position.z - 42)
      camera.lookAt(lookTarget)
    },
    setQuality: (quality, profile) => {
      buildOcean(quality)
      buildStars(quality)
      buildAtmosphere(quality)
      starsMaterial.uniforms.uSize!.value = Math.min(devicePixelRatio, profile.dpr) * 2.5
      atmosphereMaterial.uniforms.uSize!.value = Math.min(devicePixelRatio, profile.dpr) * 2.2
    },
    reset: () => window.scrollTo({ top: 0, behavior: runtime.reducedMotion ? 'auto' : 'smooth' }),
    stats: () => ({ particles: particleCount, scrollProgress: state.progress, section: getJourneySection(state.progress) }),
    dispose: () => {
      container.removeEventListener('speakerfocus', onSpeakerFocus)
      container.removeEventListener('journeycomplete', onJourneyComplete)
      finishTween?.kill()
      scrollTween.scrollTrigger?.kill()
      scrollTween.kill()
      disposeObject(scene)
      oceanMaterial.dispose()
      horizonMaterial.dispose()
      routeMaterial.dispose()
      starsMaterial.dispose()
      atmosphereMaterial.dispose()
    },
  }
}
