import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, FogExp2, Mesh, PlaneGeometry, Points, ShaderMaterial } from 'three'
import type { SceneFactory } from '../../three/core/types'
import type { QualityLevel } from '../../three/core/quality'
import { disposeObject } from '../../three/utils/dispose'
import stormVertex from './shaders/storm.vert.glsl?raw'
import stormFragment from './shaders/storm.frag.glsl?raw'
import rainVertex from './shaders/rain.vert.glsl?raw'
import rainFragment from './shaders/rain.frag.glsl?raw'

gsap.registerPlugin(ScrollTrigger)
const SEGMENTS: Record<QualityLevel, number> = { low: 64, medium: 96, high: 136 }
const RAIN: Record<QualityLevel, number> = { low: 900, medium: 2100, high: 4200 }

export const createStormTransitionScene: SceneFactory = (runtime) => {
  const { scene, camera, renderer } = runtime
  const sky = new Color('#071219')
  scene.background = sky
  scene.fog = new FogExp2(sky, 0.015)
  camera.position.set(0, 2.5, 8)
  camera.lookAt(0, 0, -18)

  const oceanMaterial = new ShaderMaterial({
    vertexShader: stormVertex, fragmentShader: stormFragment,
    uniforms: { uTime: { value: 0 }, uStorm: { value: 0 }, uCalm: { value: 1 }, uMotion: { value: runtime.reducedMotion ? 0.28 : 1 } },
  })
  const rainMaterial = new ShaderMaterial({
    vertexShader: rainVertex, fragmentShader: rainFragment,
    uniforms: { uTime: { value: 0 }, uStorm: { value: 0 }, uSize: { value: renderer.getPixelRatio() * 4 } },
    transparent: true, depthWrite: false, blending: AdditiveBlending,
  })
  let ocean: Mesh | undefined
  let rain: Points | undefined
  let rainCount = 0

  const build = (quality: QualityLevel): void => {
    if (ocean) { scene.remove(ocean); ocean.geometry.dispose() }
    if (rain) { scene.remove(rain); rain.geometry.dispose() }
    ocean = new Mesh(new PlaneGeometry(110, 120, SEGMENTS[quality], SEGMENTS[quality]), oceanMaterial)
    ocean.rotation.x = -Math.PI / 2
    ocean.position.z = -40
    scene.add(ocean)
    rainCount = RAIN[quality]
    const positions = new Float32Array(rainCount * 3)
    const speeds = new Float32Array(rainCount)
    for (let i = 0; i < rainCount; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 36
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20
      positions[i * 3 + 2] = 4 - Math.random() * 52
      speeds[i] = 0.5 + Math.random()
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(positions, 3))
    geometry.setAttribute('aSpeed', new BufferAttribute(speeds, 1))
    rain = new Points(geometry, rainMaterial)
    scene.add(rain)
  }
  build(runtime.quality)

  const state = { storm: 0 }
  const timeline = gsap.timeline({ scrollTrigger: {
    trigger: runtime.container.parentElement, start: 'top top', end: 'bottom bottom', scrub: runtime.reducedMotion ? false : 1.2,
  } })
  timeline.to(state, { storm: 1, ease: 'power1.in', duration: 0.56 }).to(state, { storm: 0, ease: 'power2.out', duration: 0.44 })

  return {
    update: ({ elapsed }) => {
      const storm = runtime.reducedMotion ? 0.12 : state.storm
      oceanMaterial.uniforms.uTime!.value = elapsed
      oceanMaterial.uniforms.uStorm!.value = storm
      oceanMaterial.uniforms.uCalm!.value = 1 - storm * 0.72
      rainMaterial.uniforms.uTime!.value = elapsed
      rainMaterial.uniforms.uStorm!.value = storm
      sky.setRGB(0.027 * (1 - storm * 0.72), 0.071 * (1 - storm * 0.78), 0.095 * (1 - storm * 0.75))
      if (scene.fog instanceof FogExp2) scene.fog.density = 0.015 + storm * 0.036
      camera.position.y = 2.5 + Math.sin(elapsed * (0.25 + storm)) * storm * 0.12
    },
    setQuality: (quality, profile) => { build(quality); rainMaterial.uniforms.uSize!.value = Math.min(devicePixelRatio, profile.dpr) * 4 },
    reset: () => window.scrollTo({ top: 0, behavior: runtime.reducedMotion ? 'auto' : 'smooth' }),
    stats: () => ({ particles: rainCount }),
    dispose: () => { timeline.scrollTrigger?.kill(); timeline.kill(); disposeObject(scene); oceanMaterial.dispose(); rainMaterial.dispose() },
  }
}
