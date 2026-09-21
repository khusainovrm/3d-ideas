import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Mesh,
  PlaneGeometry,
  Points,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three'
import type { SceneFactory } from '../../three/core/types'
import type { QualityLevel } from '../../three/core/quality'
import { disposeObject } from '../../three/utils/dispose'
import { getLightSection, sectionValue } from './sections'
import surfaceVertexShader from './shaders/surface.vert.glsl?raw'
import surfaceFragmentShader from './shaders/surface.frag.glsl?raw'
import lightsVertexShader from './shaders/lights.vert.glsl?raw'
import lightsFragmentShader from './shaders/lights.frag.glsl?raw'

gsap.registerPlugin(ScrollTrigger)

const SURFACE_SEGMENTS: Record<QualityLevel, [number, number]> = {
  low: [46, 86], medium: [70, 124], high: [96, 168],
}
const LIGHT_COUNTS: Record<QualityLevel, number> = { low: 400, medium: 800, high: 1400 }

export const createLightsJourneyScene: SceneFactory = (runtime) => {
  const { scene, camera, container, renderer } = runtime
  const state = { scroll: 0, speaker: -1, speakerStrength: 0, formFocus: 0, pulse: -1 }
  const pointerTarget = new Vector2()
  const pointer = new Vector2()
  const lookTarget = new Vector3(0, 0.2, -46)
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches
  const baseColor = new Color('#050608')
  const warmColor = new Color('#0e0d0b')
  const currentColor = new Color(baseColor)

  scene.background = baseColor
  camera.fov = 48
  camera.near = 0.1
  camera.far = 260
  camera.position.set(0, 5.2, 18)
  camera.lookAt(lookTarget)
  camera.updateProjectionMatrix()

  const surfaceMaterial = new ShaderMaterial({
    vertexShader: surfaceVertexShader,
    fragmentShader: surfaceFragmentShader,
    side: DoubleSide,
    uniforms: {
      uTime: { value: 0 }, uScrollProgress: { value: 0 }, uRelief: { value: 0.72 },
      uMotion: { value: runtime.reducedMotion ? 0.2 : 1 }, uLightIntensity: { value: 0.8 },
      uColorMix: { value: 0 },
    },
  })
  const lightsMaterial = new ShaderMaterial({
    vertexShader: lightsVertexShader,
    fragmentShader: lightsFragmentShader,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uTime: { value: 0 }, uScrollProgress: { value: 0 }, uRelief: { value: 0.72 },
      uMotion: { value: runtime.reducedMotion ? 0.2 : 1 }, uPixelRatio: { value: renderer.getPixelRatio() },
      uLightIntensity: { value: 0.86 }, uSpeakerIndex: { value: -1 }, uSpeakerStrength: { value: 0 },
      uFormFocus: { value: 0 }, uPulse: { value: -1 },
    },
  })

  let surface: Mesh | undefined
  let lights: Points | undefined
  let lightsCount = 0

  const build = (quality: QualityLevel): void => {
    if (surface) { scene.remove(surface); surface.geometry.dispose() }
    if (lights) { scene.remove(lights); lights.geometry.dispose() }

    const [widthSegments, depthSegments] = SURFACE_SEGMENTS[quality]
    const surfaceGeometry = new PlaneGeometry(76, 180, widthSegments, depthSegments)
    surface = new Mesh(surfaceGeometry, surfaceMaterial)
    surface.rotation.x = -Math.PI / 2
    surface.position.z = -65
    surface.frustumCulled = false
    scene.add(surface)

    lightsCount = LIGHT_COUNTS[quality]
    const geometry = new BufferGeometry()
    const positions = new Float32Array(lightsCount * 3)
    const path = new Float32Array(lightsCount)
    const lane = new Float32Array(lightsCount)
    const seed = new Float32Array(lightsCount)
    const size = new Float32Array(lightsCount)
    const group = new Float32Array(lightsCount)
    for (let i = 0; i < lightsCount; i += 1) {
      const random = Math.random()
      path[i] = (i + random) / lightsCount
      lane[i] = Math.random() * 2 - 1
      seed[i] = Math.random() * 100
      size[i] = 5.0 + Math.random() * 4.5 + (i % 97 === 0 ? 4.5 : 0)
      group[i] = i % 4
    }
    geometry.setAttribute('position', new BufferAttribute(positions, 3))
    geometry.setAttribute('aPath', new BufferAttribute(path, 1))
    geometry.setAttribute('aLane', new BufferAttribute(lane, 1))
    geometry.setAttribute('aSeed', new BufferAttribute(seed, 1))
    geometry.setAttribute('aSize', new BufferAttribute(size, 1))
    geometry.setAttribute('aGroup', new BufferAttribute(group, 1))
    lights = new Points(geometry, lightsMaterial)
    lights.frustumCulled = false
    scene.add(lights)
  }
  build(runtime.quality)

  const scrollTween = gsap.to(state, {
    scroll: 1,
    ease: 'none',
    scrollTrigger: {
      trigger: container.parentElement,
      start: 'top top',
      end: 'bottom bottom',
      scrub: runtime.reducedMotion ? false : 0.9,
    },
  })
  let speakerTween: gsap.core.Tween | undefined
  let formTween: gsap.core.Tween | undefined
  let pulseTween: gsap.core.Tween | undefined

  const onPointerMove = (event: PointerEvent): void => {
    if (coarsePointer || runtime.reducedMotion) return
    pointerTarget.set((event.clientX / innerWidth) * 2 - 1, -((event.clientY / innerHeight) * 2 - 1))
  }
  const onSpeaker = (event: Event): void => {
    const index = (event as CustomEvent<number>).detail
    state.speaker = index
    speakerTween?.kill()
    speakerTween = gsap.to(state, { speakerStrength: index >= 0 ? 1 : 0, duration: 0.65, ease: 'sine.inOut' })
  }
  const onFormFocus = (event: Event): void => {
    const index = (event as CustomEvent<number>).detail
    formTween?.kill()
    formTween = gsap.to(state, { formFocus: index >= 0 ? 0.45 + index * 0.12 : 0, duration: 0.55, ease: 'sine.inOut' })
  }
  const onComplete = (): void => {
    pulseTween?.kill()
    state.pulse = 0
    pulseTween = gsap.to(state, { pulse: 1.05, duration: 1.75, ease: 'power2.inOut', onComplete: () => { state.pulse = -1 } })
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true })
  container.addEventListener('lightspeakerfocus', onSpeaker)
  container.addEventListener('lightformfocus', onFormFocus)
  container.addEventListener('lightcomplete', onComplete)

  return {
    update: ({ elapsed, reducedMotion }) => {
      pointer.lerp(pointerTarget, 0.025)
      const speakerRelief = sectionValue(state.scroll, 0.30, 0.39) * (1 - sectionValue(state.scroll, 0.56, 0.65))
      const destination = sectionValue(state.scroll, 0.67, 0.75) * (1 - sectionValue(state.scroll, 0.89, 0.97))
      const relief = 0.64 + speakerRelief * 1.25 - destination * 0.48
      const lightIntensity = 0.72 + speakerRelief * 0.34 + destination * 0.22
      const time = elapsed * (reducedMotion ? 0.12 : 1)

      surfaceMaterial.uniforms.uTime!.value = time
      surfaceMaterial.uniforms.uScrollProgress!.value = state.scroll
      surfaceMaterial.uniforms.uRelief!.value = relief
      surfaceMaterial.uniforms.uLightIntensity!.value = lightIntensity
      surfaceMaterial.uniforms.uColorMix!.value = destination
      lightsMaterial.uniforms.uTime!.value = time
      lightsMaterial.uniforms.uScrollProgress!.value = state.scroll
      lightsMaterial.uniforms.uRelief!.value = relief
      lightsMaterial.uniforms.uPixelRatio!.value = renderer.getPixelRatio()
      lightsMaterial.uniforms.uLightIntensity!.value = lightIntensity
      lightsMaterial.uniforms.uSpeakerIndex!.value = state.speaker
      lightsMaterial.uniforms.uSpeakerStrength!.value = state.speakerStrength
      lightsMaterial.uniforms.uFormFocus!.value = state.formFocus
      lightsMaterial.uniforms.uPulse!.value = state.pulse

      currentColor.copy(baseColor).lerp(warmColor, destination * 0.72)
      scene.background = currentColor
      const parallax = coarsePointer || reducedMotion ? 0 : 1
      camera.position.x = pointer.x * 0.32 * parallax
      camera.position.y = 5.2 + Math.sin(state.scroll * Math.PI) * 0.8 + pointer.y * 0.14 * parallax
      camera.position.z = 18 - state.scroll * (reducedMotion ? 4 : 15)
      lookTarget.set(pointer.x * 0.12 * parallax, 0.1 + destination * 0.45, -46 - state.scroll * 15)
      camera.lookAt(lookTarget)
    },
    resize: () => { lightsMaterial.uniforms.uPixelRatio!.value = renderer.getPixelRatio() },
    setQuality: (quality) => build(quality),
    reset: () => window.scrollTo({ top: 0, behavior: runtime.reducedMotion ? 'auto' : 'smooth' }),
    stats: () => ({
      section: getLightSection(state.scroll), scrollProgress: state.scroll,
      surfaceRelief: surfaceMaterial.uniforms.uRelief!.value as number,
      lightsCount, cameraZ: camera.position.z,
    }),
    dispose: () => {
      window.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('lightspeakerfocus', onSpeaker)
      container.removeEventListener('lightformfocus', onFormFocus)
      container.removeEventListener('lightcomplete', onComplete)
      speakerTween?.kill(); formTween?.kill(); pulseTween?.kill()
      scrollTween.scrollTrigger?.kill(); scrollTween.kill()
      disposeObject(scene)
      surfaceMaterial.dispose(); lightsMaterial.dispose()
    },
  }
}
