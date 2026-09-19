import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  FogExp2,
  Line,
  Points,
  ShaderMaterial,
  Vector3,
} from 'three'
import type { SceneFactory } from '../../three/core/types'
import type { QualityLevel } from '../../three/core/quality'
import { disposeObject } from '../../three/utils/dispose'
import pointVertex from '../../three/shaders/soft-point.vert.glsl?raw'
import pointFragment from '../../three/shaders/soft-point.frag.glsl?raw'
import routeVertex from './shaders/route.vert.glsl?raw'
import routeFragment from './shaders/route.frag.glsl?raw'

gsap.registerPlugin(ScrollTrigger)

const COUNTS: Record<QualityLevel, number> = { low: 3200, medium: 7000, high: 12500 }

const routeCurve = new CatmullRomCurve3([
  new Vector3(0, 0, 5), new Vector3(-2.4, 1.2, -12), new Vector3(3.2, -0.6, -28),
  new Vector3(-3.7, 2.2, -45), new Vector3(1.1, 0.4, -62), new Vector3(0, 2.8, -82),
])

export const createStarNavigationScene: SceneFactory = (runtime) => {
  const { scene, camera, renderer } = runtime
  scene.background = new Color('#010307')
  scene.fog = new FogExp2('#010307', 0.012)
  camera.position.copy(routeCurve.getPointAt(0))
  camera.position.y += 0.6

  const starMaterial = new ShaderMaterial({
    vertexShader: pointVertex,
    fragmentShader: pointFragment,
    uniforms: {
      uTime: { value: 0 }, uSize: { value: renderer.getPixelRatio() * 2.1 },
      uSpeed: { value: runtime.reducedMotion ? 0.06 : 0.18 }, uProgress: { value: 1 },
      uColor: { value: new Color('#d8e6e2') },
    },
    transparent: true, depthWrite: false, blending: AdditiveBlending,
  })
  const routeMaterial = new ShaderMaterial({
    vertexShader: routeVertex, fragmentShader: routeFragment,
    uniforms: { uProgress: { value: 0 } }, transparent: true, depthWrite: false,
  })
  let stars: Points | undefined
  let count = 0

  const buildStars = (quality: QualityLevel): void => {
    if (stars) { scene.remove(stars); stars.geometry.dispose() }
    count = COUNTS[quality]
    const positions = new Float32Array(count * 3)
    const scale = new Float32Array(count)
    const phase = new Float32Array(count)
    const progress = new Float32Array(count)
    for (let i = 0; i < count; i += 1) {
      const index = i * 3
      positions[index] = (Math.random() - 0.5) * 44
      positions[index + 1] = (Math.random() - 0.42) * 26
      positions[index + 2] = 8 - Math.random() * 110
      scale[i] = Math.random() > 0.985 ? 2.4 : 0.4 + Math.random() * 0.7
      phase[i] = Math.random() * Math.PI * 2
      progress[i] = 0
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(positions, 3))
    geometry.setAttribute('aScale', new BufferAttribute(scale, 1))
    geometry.setAttribute('aPhase', new BufferAttribute(phase, 1))
    geometry.setAttribute('aProgress', new BufferAttribute(progress, 1))
    stars = new Points(geometry, starMaterial)
    scene.add(stars)
  }
  buildStars(runtime.quality)

  const routePoints = routeCurve.getPoints(240)
  const routeGeometry = new BufferGeometry().setFromPoints(routePoints)
  routeGeometry.setAttribute('aProgress', new BufferAttribute(Float32Array.from(routePoints, (_, index) => index / (routePoints.length - 1)), 1))
  const route = new Line(routeGeometry, routeMaterial)
  scene.add(route)

  const state = { progress: 0 }
  const tween = gsap.to(state, {
    progress: 1,
    ease: 'none',
    scrollTrigger: {
      trigger: runtime.container.parentElement,
      start: 'top top', end: 'bottom bottom', scrub: runtime.reducedMotion ? false : 1.2,
    },
  })

  const lookTarget = new Vector3()
  return {
    update: ({ elapsed }) => {
      starMaterial.uniforms.uTime!.value = elapsed
      const progress = runtime.reducedMotion ? 0.16 : state.progress
      routeMaterial.uniforms.uProgress!.value = Math.min(1, progress + 0.1)
      camera.position.copy(routeCurve.getPointAt(progress * 0.86))
      camera.position.y += 0.55
      lookTarget.copy(routeCurve.getPointAt(Math.min(1, progress * 0.86 + 0.035)))
      camera.lookAt(lookTarget)
    },
    setQuality: (quality, profile) => {
      buildStars(quality)
      starMaterial.uniforms.uSize!.value = Math.min(devicePixelRatio, profile.dpr) * 2.1
    },
    reset: () => window.scrollTo({ top: 0, behavior: runtime.reducedMotion ? 'auto' : 'smooth' }),
    stats: () => ({ particles: count }),
    dispose: () => { tween.scrollTrigger?.kill(); tween.kill(); disposeObject(scene); starMaterial.dispose(); routeMaterial.dispose() },
  }
}
