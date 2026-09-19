import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Points, ShaderMaterial } from 'three'
import type { SceneFactory } from '../../three/core/types'
import type { QualityLevel } from '../../three/core/quality'
import { disposeObject } from '../../three/utils/dispose'
import vertexShader from './shaders/dust.vert.glsl?raw'
import fragmentShader from './shaders/dust.frag.glsl?raw'

gsap.registerPlugin(ScrollTrigger)
const COUNTS: Record<QualityLevel, number> = { low: 1800, medium: 4200, high: 7600 }

export const createGoldenDustScene: SceneFactory = (runtime) => {
  const { scene, camera, renderer, container } = runtime
  scene.background = new Color('#040504')
  camera.position.set(0, 0, 7)
  const material = new ShaderMaterial({
    vertexShader, fragmentShader,
    uniforms: { uTime: { value: 0 }, uSize: { value: renderer.getPixelRatio() * 2.7 }, uScroll: { value: 0 } },
    transparent: true, depthWrite: false, blending: AdditiveBlending,
  })
  let dust: Points | undefined
  let count = 0

  const build = (quality: QualityLevel): void => {
    if (dust) { scene.remove(dust); dust.geometry.dispose() }
    count = COUNTS[quality]
    const positions = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    const phases = new Float32Array(count)
    for (let i = 0; i < count; i += 1) {
      const j = i * 3
      positions[j] = (Math.random() - 0.5) * 20
      positions[j + 1] = (Math.random() - 0.5) * 12
      positions[j + 2] = -Math.random() * 28
      scales[i] = Math.pow(Math.random(), 2) * 1.5 + 0.18
      phases[i] = Math.random() * Math.PI * 2
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(positions, 3))
    geometry.setAttribute('aScale', new BufferAttribute(scales, 1))
    geometry.setAttribute('aPhase', new BufferAttribute(phases, 1))
    dust = new Points(geometry, material)
    scene.add(dust)
  }
  build(runtime.quality)

  const pointer = { x: 0, y: 0, smoothX: 0, smoothY: 0 }
  const onPointer = (event: PointerEvent): void => {
    pointer.x = event.clientX / innerWidth - 0.5
    pointer.y = event.clientY / innerHeight - 0.5
  }
  container.addEventListener('pointermove', onPointer, { passive: true })
  const state = { scroll: 0 }
  const tween = gsap.to(state, { scroll: 1, ease: 'none', scrollTrigger: {
    trigger: container.parentElement, start: 'top top', end: 'bottom bottom', scrub: runtime.reducedMotion ? false : 1.4,
  } })

  return {
    update: ({ elapsed }) => {
      pointer.smoothX += (pointer.x - pointer.smoothX) * 0.025
      pointer.smoothY += (pointer.y - pointer.smoothY) * 0.025
      material.uniforms.uTime!.value = elapsed * (runtime.reducedMotion ? 0.2 : 1)
      material.uniforms.uScroll!.value = state.scroll
      camera.position.x = runtime.reducedMotion ? 0 : pointer.smoothX * 0.75
      camera.position.y = runtime.reducedMotion ? 0 : -pointer.smoothY * 0.45
      camera.position.z = 7 - state.scroll * (runtime.reducedMotion ? 0 : 2.5)
    },
    setQuality: (quality, profile) => { build(quality); material.uniforms.uSize!.value = Math.min(devicePixelRatio, profile.dpr) * 2.7 },
    reset: () => window.scrollTo({ top: 0, behavior: runtime.reducedMotion ? 'auto' : 'smooth' }),
    stats: () => ({ particles: count }),
    dispose: () => { container.removeEventListener('pointermove', onPointer); tween.scrollTrigger?.kill(); tween.kill(); disposeObject(scene); material.dispose() },
  }
}
