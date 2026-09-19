import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { AdditiveBlending, BufferAttribute, BufferGeometry, CatmullRomCurve3, Color, Line, Points, ShaderMaterial, Vector3 } from 'three'
import type { SceneFactory } from '../../three/core/types'
import { disposeObject } from '../../three/utils/dispose'
import routeVertex from './shaders/route.vert.glsl?raw'
import routeFragment from './shaders/route.frag.glsl?raw'
import pointVertex from '../../three/shaders/soft-point.vert.glsl?raw'
import pointFragment from '../../three/shaders/soft-point.frag.glsl?raw'

gsap.registerPlugin(ScrollTrigger)

export const createOdysseyRouteScene: SceneFactory = (runtime) => {
  const { scene, camera } = runtime
  scene.background = new Color('#03070a')
  camera.position.set(0, 0.5, 13)

  const curve = new CatmullRomCurve3([
    new Vector3(-7, -2.5, 0), new Vector3(-4.2, 1.8, -1), new Vector3(-1.5, -0.8, 0),
    new Vector3(1.2, 2.5, -2), new Vector3(4.5, 0.2, 0), new Vector3(7, 2.2, -1),
  ])
  const samples = 420
  const points = curve.getPoints(samples)
  const progress = Float32Array.from(points, (_, index) => index / samples)
  const zones = Float32Array.from(points, (_, index) => (index / samples) * 4)
  const geometry = new BufferGeometry().setFromPoints(points)
  geometry.setAttribute('aProgress', new BufferAttribute(progress, 1))
  geometry.setAttribute('aZone', new BufferAttribute(zones, 1))

  const lineMaterial = new ShaderMaterial({
    vertexShader: routeVertex, fragmentShader: routeFragment,
    uniforms: { uProgress: { value: 0 }, uTime: { value: 0 } },
    transparent: true, depthWrite: false, blending: AdditiveBlending,
  })
  const line = new Line(geometry, lineMaterial)
  scene.add(line)

  const dotGeometry = geometry.clone()
  const scale = Float32Array.from(points, (_, index) => index % 42 === 0 ? 2.5 : 0.65)
  dotGeometry.setAttribute('aScale', new BufferAttribute(scale, 1))
  dotGeometry.setAttribute('aPhase', new BufferAttribute(Float32Array.from(points, () => Math.random() * 6.28), 1))
  const dotMaterial = new ShaderMaterial({
    vertexShader: pointVertex, fragmentShader: pointFragment,
    uniforms: { uTime: { value: 0 }, uSize: { value: 4 }, uSpeed: { value: 0.2 }, uProgress: { value: 0 }, uColor: { value: new Color('#c2ad72') } },
    transparent: true, depthWrite: false, blending: AdditiveBlending,
  })
  scene.add(new Points(dotGeometry, dotMaterial))

  const state = { progress: 0 }
  const tween = gsap.to(state, { progress: 1, ease: 'none', scrollTrigger: {
    trigger: runtime.container.parentElement, start: 'top top', end: 'bottom bottom', scrub: runtime.reducedMotion ? false : 1,
  } })

  return {
    update: ({ elapsed }) => {
      const value = runtime.reducedMotion ? 1 : state.progress
      lineMaterial.uniforms.uProgress!.value = value
      lineMaterial.uniforms.uTime!.value = elapsed
      dotMaterial.uniforms.uProgress!.value = value
      dotMaterial.uniforms.uTime!.value = elapsed
      camera.position.x = (value - 0.5) * 2.1
    },
    reset: () => window.scrollTo({ top: 0, behavior: runtime.reducedMotion ? 'auto' : 'smooth' }),
    stats: () => ({ particles: samples + 1 }),
    dispose: () => { tween.scrollTrigger?.kill(); tween.kill(); disposeObject(scene); lineMaterial.dispose(); dotMaterial.dispose() },
  }
}
