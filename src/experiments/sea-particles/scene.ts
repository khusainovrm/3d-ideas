import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  FogExp2,
  Points,
  ShaderMaterial,
} from 'three'
import type { SceneFactory } from '../../three/core/types'
import type { QualityLevel, QualityProfile } from '../../three/core/quality'
import { disposeObject } from '../../three/utils/dispose'
import vertexShader from './shaders/sea.vert.glsl?raw'
import fragmentShader from './shaders/sea.frag.glsl?raw'

const COUNTS: Record<QualityLevel, number> = { low: 5200, medium: 10500, high: 18000 }

export const createSeaParticlesScene: SceneFactory = (runtime) => {
  const { scene, camera, renderer } = runtime
  scene.background = new Color('#03090d')
  scene.fog = new FogExp2('#03090d', 0.027)
  camera.position.set(0, 1.55, 6.5)
  camera.rotation.x = -0.055

  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uPointSize: { value: renderer.getPixelRatio() * 2.1 },
      uMotion: { value: runtime.reducedMotion ? 0.25 : 1 },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })

  let points: Points | undefined
  let particleCount = 0

  const build = (quality: QualityLevel): void => {
    if (points) {
      scene.remove(points)
      points.geometry.dispose()
    }
    particleCount = COUNTS[quality]
    const side = Math.floor(Math.sqrt(particleCount))
    particleCount = side * side
    const positions = new Float32Array(particleCount * 3)
    const glints = new Float32Array(particleCount)
    let cursor = 0
    for (let z = 0; z < side; z += 1) {
      for (let x = 0; x < side; x += 1) {
        const index = cursor * 3
        positions[index] = (x / (side - 1) - 0.5) * 42 + (Math.random() - 0.5) * 0.12
        positions[index + 1] = 0
        positions[index + 2] = 5 - (z / (side - 1)) * 68 + (Math.random() - 0.5) * 0.12
        glints[cursor] = Math.random() > 0.965 ? Math.random() : Math.random() * 0.18
        cursor += 1
      }
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(positions, 3))
    geometry.setAttribute('aGlint', new BufferAttribute(glints, 1))
    points = new Points(geometry, material)
    scene.add(points)
  }

  build(runtime.quality)

  return {
    update: ({ elapsed, delta, reducedMotion }) => {
      material.uniforms.uTime!.value = elapsed
      const speed = reducedMotion ? 0.04 : 0.22
      camera.position.z -= delta * speed
      if (camera.position.z < 2.5) camera.position.z = 6.5
      camera.position.y = 1.55 + Math.sin(elapsed * 0.35) * (reducedMotion ? 0.01 : 0.045)
    },
    setQuality: (quality, profile: QualityProfile) => {
      build(quality)
      material.uniforms.uPointSize!.value = Math.min(devicePixelRatio, profile.dpr) * 2.1
    },
    reset: () => camera.position.set(0, 1.55, 6.5),
    stats: () => ({ particles: particleCount }),
    dispose: () => {
      disposeObject(scene)
      material.dispose()
    },
  }
}
