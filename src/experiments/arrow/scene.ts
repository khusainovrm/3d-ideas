import { Box3, Color, DirectionalLight, Group, HemisphereLight, MathUtils, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { ThreeRuntime, ExperimentScene } from '../../three/core/types'
import { disposeObject } from '../../three/utils/dispose'
import arrowUrl from './assets/models/arrow.glb?url'

interface LoadEvents {
  onLoad(): void
  onError(message: string): void
}

export const createArrowScene = (runtime: ThreeRuntime, events: LoadEvents): ExperimentScene => {
  const { scene, camera, renderer } = runtime
  scene.background = new Color('#020609')
  camera.position.set(0, 0, 6)

  scene.add(new HemisphereLight('#ffffff', '#526071', 2))
  const light = new DirectionalLight('#ffffff', 2.5)
  light.position.set(3, 5, 6)
  scene.add(light)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.update()

  let disposed = false
  const loader = new GLTFLoader()
  loader.load(arrowUrl, (gltf) => {
    if (disposed) {
      disposeObject(gltf.scene)
      return
    }

    gltf.scene.traverse((object) => {
      if (!(object instanceof Mesh)) return
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      for (const material of materials) {
        if (!(material instanceof MeshStandardMaterial)) continue
        material.color.set('#d8aa4c')
        material.metalness = 0.7
        material.roughness = 0.28
        material.needsUpdate = true
      }
    })

    const model = new Group()
    model.add(gltf.scene)
    const bounds = new Box3().setFromObject(model)
    const center = bounds.getCenter(new Vector3())
    gltf.scene.position.sub(center)
    scene.add(model)

    const size = bounds.getSize(new Vector3())
    const radius = Math.max(size.length() / 2, 0.01)
    const verticalFov = MathUtils.degToRad(camera.fov)
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect)
    const distance = radius / Math.sin(Math.min(verticalFov, horizontalFov) / 2) * 1.25
    camera.position.set(0, 0, distance)
    camera.near = Math.max(0.01, distance / 1000)
    camera.far = Math.max(500, distance * 10)
    camera.updateProjectionMatrix()
    controls.minDistance = radius * 0.6
    controls.maxDistance = distance * 4
    controls.update()
    events.onLoad()
  }, undefined, () => {
    if (!disposed) events.onError('Could not load arrow.glb')
  })

  return {
    update: () => controls.update(),
    dispose: () => {
      disposed = true
      controls.dispose()
      disposeObject(scene)
    },
  }
}
