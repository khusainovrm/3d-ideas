import type { Material, Object3D, Texture } from 'three'
import { Mesh, Points, Line } from 'three'

const disposeMaterial = (material: Material): void => {
  for (const value of Object.values(material)) {
    if (value && typeof value === 'object' && 'isTexture' in value) {
      ;(value as Texture).dispose()
    }
  }
  material.dispose()
}

export const disposeObject = (root: Object3D): void => {
  root.traverse((object) => {
    if (!(object instanceof Mesh || object instanceof Points || object instanceof Line)) return
    object.geometry.dispose()
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach(disposeMaterial)
  })
  root.clear()
}
