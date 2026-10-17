import { Group, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, TextureLoader } from 'three'
import type { Scene } from 'three'
import boatUrl from './assets/boat.generated.webp?url'
import { BOAT_IMAGE } from './boat.generated'
import { BoatMotion, type WaterInteraction } from './boatMotion'

export const boatControls = {
  visible: true,
  x: 0.805,
  y: 0.9,
  height: 0.18,
  response: 1.0,
}

export function createLandingBoat(scene: Scene) {
  const group = new Group()
  group.name = 'Moon path boat'
  group.visible = false
  scene.add(group)
  const aspect = BOAT_IMAGE.width / BOAT_IMAGE.height
  const geometry = new PlaneGeometry(aspect, 1)
  // Rotation pivot sits inside the hull at the waterline, well below the mast.
  geometry.translate(0, 0.5 - BOAT_IMAGE.waterlineFromBottom, 0)
  const material = new MeshBasicMaterial({ transparent: true, depthWrite: false, alphaTest: 0.005, toneMapped: false })
  const mesh = new Mesh(geometry, material)
  mesh.renderOrder = 5
  group.add(mesh)
  let disposed = false
  let textureReady = false
  const ready = new TextureLoader().loadAsync(boatUrl).then((texture) => {
    if (disposed) { texture.dispose(); return }
    texture.colorSpace = SRGBColorSpace
    material.map = texture
    material.needsUpdate = true
    textureReady = true
  })
  const motion = new BoatMotion()

  return {
    ready,
    update(delta: number, imageScale: number, imageAspect: number, visible: boolean,
      water: WaterInteraction, reducedMotion: boolean) {
      const anchorX = (boatControls.x - 0.5) * imageAspect * imageScale
      const anchorY = (0.5 - boatControls.y) * imageScale
      const height = boatControls.height * imageScale
      motion.update(delta, anchorX, anchorY, height * aspect, water, boatControls.response, reducedMotion)
      group.visible = textureReady && visible && boatControls.visible
      group.position.set(anchorX + motion.x, anchorY + motion.y, 0.15)
      group.scale.setScalar(height)
      group.rotation.z = motion.roll
    },
    reset: () => motion.reset(),
    dispose() {
      disposed = true
      scene.remove(group)
      geometry.dispose()
      material.map?.dispose()
      material.dispose()
    },
  }
}
