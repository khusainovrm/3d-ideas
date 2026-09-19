import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Color, DoubleSide, Mesh, ShaderMaterial, Vector2 } from 'three'
import type { SceneFactory } from '../../three/core/types'
import type { QualityLevel } from '../../three/core/quality'
import { disposeObject } from '../../three/utils/dispose'
import { buildRibbonGeometry } from './journey/buildRibbon'
import { horizonPath } from './journey/paths/horizon'
import { routePath } from './journey/paths/route'
import { speakersPath } from './journey/paths/speakers'
import { echoPath } from './journey/paths/echo'
import { destinationPath } from './journey/paths/destination'
import { networkPath } from './journey/paths/network'
import { finalPath } from './journey/paths/final'
import { getJourneyState, getPathTransition } from './journey/states'
import vertexShader from './shaders/thread.vert.glsl?raw'
import fragmentShader from './shaders/thread.frag.glsl?raw'

gsap.registerPlugin(ScrollTrigger)

const SAMPLE_COUNTS: Record<QualityLevel, number> = { low: 220, medium: 360, high: 520 }

export const createThreadScene: SceneFactory = (runtime) => {
  const { scene, camera, container } = runtime
  const baseColor = new Color('#050505')
  const destinationColor = new Color('#11100e')
  const currentColor = new Color(baseColor)
  const pointerTarget = new Vector2()
  const pointerCurrent = new Vector2()
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches
  const state = {
    scroll: 0,
    reveal: 0.06,
    speakerIndex: -1,
    interaction: 0,
    formTension: 0,
    pulse: -1,
  }

  scene.background = currentColor
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
      uProgress: { value: 0 },
      uReveal: { value: 0.06 },
      uIntensity: { value: 1 },
      uWave: { value: runtime.reducedMotion ? 0.15 : 1 },
      uDepth: { value: 1 },
      uAccent: { value: 0.08 },
      uPulse: { value: -1 },
      uSpeakerIndex: { value: -1 },
      uInteractionStrength: { value: 0 },
      uFormTension: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  })

  let ribbon: Mesh | undefined
  let lineSamples = 0

  const buildRibbon = (quality: QualityLevel): void => {
    if (ribbon) {
      scene.remove(ribbon)
      ribbon.geometry.dispose()
    }
    lineSamples = SAMPLE_COUNTS[quality]
    const geometry = buildRibbonGeometry(lineSamples, [
      { name: 'position', centers: horizonPath(lineSamples) },
      { name: 'aRoute', centers: routePath(lineSamples) },
      { name: 'aSpeakers', centers: speakersPath(lineSamples) },
      { name: 'aEcho', centers: echoPath(lineSamples) },
      { name: 'aDestination', centers: destinationPath(lineSamples) },
      { name: 'aNetwork', centers: networkPath(lineSamples) },
      { name: 'aFinal', centers: finalPath(lineSamples) },
    ])
    ribbon = new Mesh(geometry, material)
    ribbon.frustumCulled = false
    scene.add(ribbon)
  }

  buildRibbon(runtime.quality)

  const scrollTween = gsap.to(state, {
    scroll: 1,
    ease: 'none',
    scrollTrigger: {
      trigger: container.parentElement,
      start: 'top top',
      end: 'bottom bottom',
      scrub: runtime.reducedMotion ? false : 0.85,
    },
  })
  const revealTween = gsap.to(state, { reveal: 1, duration: runtime.reducedMotion ? 0.4 : 2.8, ease: 'power2.inOut' })
  let interactionTween: gsap.core.Tween | undefined
  let formTween: gsap.core.Tween | undefined
  let pulseTween: gsap.core.Tween | undefined

  const onPointerMove = (event: PointerEvent): void => {
    if (coarsePointer) return
    pointerTarget.set((event.clientX / innerWidth) * 2 - 1, -((event.clientY / innerHeight) * 2 - 1))
  }
  const onSpeakerFocus = (event: Event): void => {
    const index = (event as CustomEvent<number>).detail
    state.speakerIndex = index
    interactionTween?.kill()
    interactionTween = gsap.to(state, { interaction: index >= 0 ? 1 : 0, duration: 0.55, ease: 'sine.inOut' })
  }
  const onFormFocus = (event: Event): void => {
    const index = (event as CustomEvent<number>).detail
    formTween?.kill()
    formTween = gsap.to(state, { formTension: index >= 0 ? 0.45 + index * 0.12 : 0, duration: 0.5, ease: 'sine.inOut' })
  }
  const onComplete = (): void => {
    pulseTween?.kill()
    state.pulse = 0
    pulseTween = gsap.to(state, { pulse: 1.06, duration: 1.65, ease: 'power2.inOut', onComplete: () => { state.pulse = -1 } })
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true })
  container.addEventListener('threadspeakerfocus', onSpeakerFocus)
  container.addEventListener('threadformfocus', onFormFocus)
  container.addEventListener('threadcomplete', onComplete)

  return {
    update: ({ elapsed, reducedMotion }) => {
      pointerCurrent.lerp(pointerTarget, 0.035)
      const registrationLight = Math.max(0, Math.min(1, (state.scroll - 0.67) / 0.12)) * (1 - Math.max(0, Math.min(1, (state.scroll - 0.89) / 0.08)))
      currentColor.copy(baseColor).lerp(destinationColor, registrationLight)
      scene.background = currentColor

      material.uniforms.uTime!.value = elapsed * (reducedMotion ? 0.18 : 1)
      material.uniforms.uProgress!.value = state.scroll
      material.uniforms.uReveal!.value = state.reveal
      material.uniforms.uDepth!.value = 0.82 + Math.sin(state.scroll * Math.PI) * 0.18
      material.uniforms.uAccent!.value = 0.08 + registrationLight * 0.82
      material.uniforms.uPulse!.value = state.pulse
      material.uniforms.uSpeakerIndex!.value = state.speakerIndex
      material.uniforms.uInteractionStrength!.value = state.interaction
      material.uniforms.uFormTension!.value = state.formTension

      const parallax = coarsePointer || reducedMotion ? 0 : 1
      camera.position.x = pointerCurrent.x * 0.045 * parallax
      camera.position.y = pointerCurrent.y * 0.035 * parallax
      camera.position.z = 16 - state.scroll * (reducedMotion ? 0.08 : 0.32)
      camera.rotation.y = state.scroll * 0.008 + pointerCurrent.x * 0.003 * parallax
    },
    setQuality: (quality) => buildRibbon(quality),
    reset: () => window.scrollTo({ top: 0, behavior: runtime.reducedMotion ? 'auto' : 'smooth' }),
    stats: () => ({
      section: getJourneyState(state.scroll),
      scrollProgress: state.scroll,
      transitionProgress: getPathTransition(state.scroll),
      lineSamples,
    }),
    dispose: () => {
      window.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('threadspeakerfocus', onSpeakerFocus)
      container.removeEventListener('threadformfocus', onFormFocus)
      container.removeEventListener('threadcomplete', onComplete)
      interactionTween?.kill()
      formTween?.kill()
      pulseTween?.kill()
      revealTween.kill()
      scrollTween.scrollTrigger?.kill()
      scrollTween.kill()
      disposeObject(scene)
      material.dispose()
    },
  }
}
