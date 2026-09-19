import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three'
import type { SceneFactory } from '../../three/core/types'
import type { QualityLevel } from '../../three/core/quality'
import { disposeObject } from '../../three/utils/dispose'
import { generateOcean } from './particles/generateOcean'
import { generateRoute } from './particles/generateRoute'
import { generateConstellation, getSpeakerGroup, SPEAKER_ANCHORS } from './particles/generateConstellation'
import { generateSignals } from './particles/generateSignals'
import { generateDestination } from './particles/generateDestination'
import { generateGrid } from './particles/generateGrid'
import { getParticleState, getTransitionProgress, STATE_PROGRESS, type ParticleState } from './states'
import vertexShader from './shaders/reflow.vert.glsl?raw'
import fragmentShader from './shaders/reflow.frag.glsl?raw'

gsap.registerPlugin(ScrollTrigger)

const PARTICLE_COUNTS: Record<QualityLevel, number> = {
  low: 4000,
  medium: 8000,
  high: 16000,
}

export const createParticleReflowScene: SceneFactory = (runtime) => {
  const { scene, camera, renderer, container } = runtime
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches
  const state = {
    scroll: 0,
    activeSpeaker: -1,
    interaction: 0,
    formFocus: -1,
    pulse: 0,
  }
  const pointerTarget = new Vector2()
  const pointerCurrent = new Vector2()
  const interactionPoint = new Vector3()

  scene.background = new Color('#050505')
  renderer.setClearColor('#050505', 1)
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
      uNoiseStrength: { value: runtime.reducedMotion ? 0.018 : 0.065 },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uAspectScale: { value: 1 },
      uPointer: { value: pointerCurrent },
      uPointerStrength: { value: 0 },
      uActiveSpeaker: { value: -1 },
      uInteractionPoint: { value: interactionPoint },
      uInteractionStrength: { value: 0 },
      uFormFocus: { value: -1 },
      uPulse: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
  })

  let particles: Points | undefined
  let particleCount = 0

  const buildParticles = (quality: QualityLevel): void => {
    if (particles) {
      scene.remove(particles)
      particles.geometry.dispose()
    }

    particleCount = PARTICLE_COUNTS[quality]
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(generateOcean(particleCount), 3))
    geometry.setAttribute('aAbout', new BufferAttribute(generateRoute(particleCount), 3))
    geometry.setAttribute('aSpeakers', new BufferAttribute(generateConstellation(particleCount), 3))
    geometry.setAttribute('aTestimonials', new BufferAttribute(generateSignals(particleCount), 3))
    geometry.setAttribute('aRegistration', new BufferAttribute(generateDestination(particleCount), 3))
    geometry.setAttribute('aPartners', new BufferAttribute(generateGrid(particleCount), 3))

    const seeds = new Float32Array(particleCount)
    const sizes = new Float32Array(particleCount)
    const opacity = new Float32Array(particleCount)
    const speaker = new Float32Array(particleCount)
    const accent = new Float32Array(particleCount)
    for (let index = 0; index < particleCount; index += 1) {
      const seed = ((index * 16807) % 2147483647) / 2147483647
      seeds[index] = seed
      sizes[index] = index === 0 ? 5.2 : 0.7 + ((index * 31) % 100) / 100 * 1.25
      opacity[index] = 0.3 + ((index * 47) % 100) / 100 * 0.64
      speaker[index] = getSpeakerGroup(index)
      accent[index] = index === 0 || index % 97 === 0 ? 1 : index % 17 === 0 ? 0.42 : 0
    }
    geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1))
    geometry.setAttribute('aSize', new BufferAttribute(sizes, 1))
    geometry.setAttribute('aOpacity', new BufferAttribute(opacity, 1))
    geometry.setAttribute('aSpeaker', new BufferAttribute(speaker, 1))
    geometry.setAttribute('aAccent', new BufferAttribute(accent, 1))

    particles = new Points(geometry, material)
    particles.frustumCulled = false
    scene.add(particles)
  }

  buildParticles(runtime.quality)

  const scrollTween = gsap.to(state, {
    scroll: 1,
    ease: 'none',
    scrollTrigger: {
      trigger: container.parentElement,
      start: 'top top',
      end: 'bottom bottom',
      scrub: runtime.reducedMotion ? false : 0.7,
    },
  })

  let interactionTween: gsap.core.Tween | undefined
  let pulseTween: gsap.core.Tween | undefined

  const setTargetState = (target: ParticleState): void => {
    state.scroll = STATE_PROGRESS[target]
  }

  const onPointerMove = (event: PointerEvent): void => {
    if (coarsePointer) return
    pointerTarget.set((event.clientX / window.innerWidth) * 2 - 1, -((event.clientY / window.innerHeight) * 2 - 1))
  }
  const onSpeakerFocus = (event: Event): void => {
    const index = (event as CustomEvent<number>).detail
    state.activeSpeaker = index
    interactionTween?.kill()
    interactionTween = gsap.to(state, { interaction: index >= 0 ? 1 : 0, duration: 0.38, ease: 'power2.out' })
  }
  const onFormFocus = (event: Event): void => {
    state.formFocus = (event as CustomEvent<number>).detail
  }
  const onComplete = (): void => {
    pulseTween?.kill()
    pulseTween = gsap.fromTo(state, { pulse: 0 }, { pulse: 1, duration: 0.8, ease: 'power2.out', yoyo: true, repeat: 1 })
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true })
  container.addEventListener('speakerfocus', onSpeakerFocus)
  container.addEventListener('formfocus', onFormFocus)
  container.addEventListener('reflowcomplete', onComplete)

  return {
    update: ({ elapsed, reducedMotion }) => {
      pointerCurrent.lerp(pointerTarget, 0.04)
      const anchor = SPEAKER_ANCHORS[Math.max(0, state.activeSpeaker)] ?? SPEAKER_ANCHORS[0]
      interactionPoint.set(anchor[0], anchor[1], anchor[2])

      material.uniforms.uTime!.value = elapsed * (reducedMotion ? 0.25 : 1)
      material.uniforms.uScroll!.value = state.scroll
      material.uniforms.uTransition!.value = getTransitionProgress(state.scroll)
      material.uniforms.uPointerStrength!.value = coarsePointer || reducedMotion ? 0 : 1
      material.uniforms.uActiveSpeaker!.value = state.activeSpeaker
      material.uniforms.uInteractionStrength!.value = state.interaction
      material.uniforms.uFormFocus!.value = state.formFocus
      material.uniforms.uPulse!.value = state.pulse

      camera.position.x = pointerCurrent.x * (coarsePointer || reducedMotion ? 0 : 0.08)
      camera.position.y = pointerCurrent.y * (coarsePointer || reducedMotion ? 0 : 0.05) + Math.sin(elapsed * 0.08) * 0.025
    },
    resize: (width, height) => {
      material.uniforms.uAspectScale!.value = Math.min(1, (width / Math.max(1, height)) / 1.15)
    },
    setQuality: (quality, profile) => {
      buildParticles(quality)
      material.uniforms.uPixelRatio!.value = Math.min(devicePixelRatio, profile.dpr)
    },
    reset: () => {
      setTargetState('hero')
      window.scrollTo({ top: 0, behavior: runtime.reducedMotion ? 'auto' : 'smooth' })
    },
    stats: () => ({
      particles: particleCount,
      scrollProgress: state.scroll,
      section: getParticleState(state.scroll),
      transitionProgress: getTransitionProgress(state.scroll),
    }),
    dispose: () => {
      window.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('speakerfocus', onSpeakerFocus)
      container.removeEventListener('formfocus', onFormFocus)
      container.removeEventListener('reflowcomplete', onComplete)
      interactionTween?.kill()
      pulseTween?.kill()
      scrollTween.scrollTrigger?.kill()
      scrollTween.kill()
      disposeObject(scene)
      material.dispose()
    },
  }
}
