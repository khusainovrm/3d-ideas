import { Color, Fog, Mesh, PlaneGeometry, ShaderMaterial } from 'three'
import type { SceneFactory } from '../../three/core/types'
import type { QualityLevel } from '../../three/core/quality'
import { disposeObject } from '../../three/utils/dispose'
import vertexShader from './shaders/ocean.vert.glsl?raw'
import fragmentShader from './shaders/ocean.frag.glsl?raw'

const SEGMENTS: Record<QualityLevel, number> = { low: 72, medium: 112, high: 160 }

export const createShaderOceanScene: SceneFactory = (runtime) => {
  const { scene, camera } = runtime
  scene.background = new Color('#02070b')
  scene.fog = new Fog('#02070b', 12, 80)
  camera.position.set(0, 2.8, 8)
  camera.lookAt(0, 0, -20)

  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 1 },
      uMotion: { value: runtime.reducedMotion ? 0.25 : 1 },
      uDarkness: { value: 1 },
    },
  })
  let ocean: Mesh | undefined

  const build = (quality: QualityLevel): void => {
    if (ocean) {
      scene.remove(ocean)
      ocean.geometry.dispose()
    }
    ocean = new Mesh(new PlaneGeometry(110, 130, SEGMENTS[quality], SEGMENTS[quality]), material)
    ocean.rotation.x = -Math.PI / 2
    ocean.position.z = -42
    scene.add(ocean)
  }
  build(runtime.quality)

  return {
    update: ({ elapsed, reducedMotion }) => {
      material.uniforms.uTime!.value = elapsed * (reducedMotion ? 0.25 : 1)
      camera.position.x = Math.sin(elapsed * 0.08) * (reducedMotion ? 0.03 : 0.22)
    },
    setQuality: (quality) => build(quality),
    reset: () => camera.position.set(0, 2.8, 8),
    dispose: () => {
      disposeObject(scene)
      material.dispose()
    },
  }
}
