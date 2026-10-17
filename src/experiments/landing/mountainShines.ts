import { Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, TextureLoader } from 'three'
import type { Scene } from 'three'
import shineUrl from './assets/shine.png?url'
import './mountainShines.css'
import { mountainPoint } from './mountainComposition'
import type { MountainFrame } from './mountainComposition'

const anchors = [
  { x: 0.205, y: 0.252, size: 0.7 },
  { x: 0.734, y: 0.298, size: 0.8 },
  { x: 0.345, y: 0.556, size: 0.65 },
  { x: 0.294, y: 0.908, size: 0.7 },
  { x: 0.814, y: 0.899, size: 1.2 },
]

export function createMountainShines(scene: Scene, container: HTMLElement, reducedMotion: boolean) {
  const overlay = document.createElement('div')
  overlay.className = 'landing-shines'
  container.append(overlay)
  const tooltip = document.createElement('div')
  tooltip.className = 'landing-shine-tooltip'
  tooltip.id = 'landing-shine-tooltip'
  tooltip.setAttribute('role', 'region')
  tooltip.setAttribute('aria-label', 'Информация о точке')
  tooltip.hidden = true
  const title = document.createElement('strong')
  const text = document.createElement('p')
  text.textContent = 'Здесь появится описание этой точки маршрута. Текст будет добавлен позже.'
  const closeButton = document.createElement('button')
  closeButton.type = 'button'
  closeButton.className = 'landing-shine-close'
  closeButton.textContent = '×'
  closeButton.setAttribute('aria-label', 'Закрыть подсказку')
  tooltip.append(title, text, closeButton)
  overlay.append(tooltip)
  const geometry = new PlaneGeometry(1, 20 / 46)
  let selected = -1
  let disposed = false
  let ready = false

  const markers = anchors.map((anchor, index) => {
    const material = new MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false })
    const mesh = new Mesh(geometry, material)
    mesh.name = `Mountain shine ${index + 1}`
    mesh.visible = false
    scene.add(mesh)
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'landing-shine-hit'
    button.setAttribute('aria-label', `Точка маршрута ${index + 1}`)
    button.setAttribute('aria-controls', tooltip.id)
    button.setAttribute('aria-expanded', 'false')
    button.hidden = true
    overlay.append(button)
    const marker = { anchor, mesh, material, button, hovered: false, focused: false }
    button.addEventListener('pointerenter', () => { marker.hovered = true })
    button.addEventListener('pointerleave', () => { marker.hovered = false })
    button.addEventListener('focus', () => { marker.focused = true })
    button.addEventListener('blur', () => { marker.focused = false })
    button.addEventListener('pointerdown', event => event.stopPropagation())
    button.addEventListener('click', event => {
      event.stopPropagation()
      select(selected === index ? -1 : index)
    })
    return marker
  })
  function select(index: number) {
    selected = index
    markers.forEach((marker, i) => marker.button.setAttribute('aria-expanded', String(index === i)))
    tooltip.hidden = index < 0
    if (index >= 0) title.textContent = `Точка маршрута ${index + 1}`
  }
  const close = () => {
    const index = selected
    select(-1)
    if (index >= 0) markers[index]!.button.focus({ preventScroll: true })
  }
  closeButton.addEventListener('click', close)
  tooltip.addEventListener('pointerdown', event => event.stopPropagation())
  const outside = (event: PointerEvent) => {
    if (event.target instanceof Node && !overlay.contains(event.target)) select(-1)
  }
  const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && selected >= 0) close() }
  window.addEventListener('pointerdown', outside)
  window.addEventListener('keydown', escape)
  const texturePromise = new TextureLoader().loadAsync(shineUrl).then(texture => {
    if (disposed) { texture.dispose(); return }
    texture.colorSpace = SRGBColorSpace
    markers.forEach(({ material }) => { material.map = texture; material.needsUpdate = true })
    ready = true
  })

  return {
    ready: texturePromise,
    update(time: number, visible: boolean, progress: number, width: number, height: number, frame?: MountainFrame) {
      const pixelWidth = container.clientWidth
      const pixelHeight = container.clientHeight
      markers.forEach(({ anchor, mesh, material, button, hovered, focused }, index) => {
        const position = mountainPoint(anchor.x, anchor.y, width, height, 0.8, frame)
        if (index === 3) position.x = (anchor.x - 0.5) * width
        const x = (position.x / width + 0.5) * pixelWidth
        const y = (0.5 - position.y / height - progress) * pixelHeight
        const shown = ready && visible && x > 24 && x < pixelWidth - 24 && y > 24 && y < pixelHeight - 24
        mesh.visible = shown
        button.hidden = !shown
        if (!shown && selected === index) select(-1)
        const frozen = reducedMotion || hovered || focused || selected === index
        const pulse = frozen ? 1 : 1 + 0.075 * Math.sin(time * 1.5 + index * 1.9)
        const size = Math.max(30, Math.min(52, pixelWidth * 0.05)) * anchor.size / 3
        mesh.position.copy(position)
        mesh.scale.setScalar(size * width / pixelWidth * pulse)
        material.opacity = frozen ? 1 : 0.86 + 0.14 * Math.sin(time * 1.8 + index * 2.3)
        button.style.left = `${x}px`
        button.style.top = `${y}px`
        if (selected === index) {
          const left = Math.max(12, Math.min(pixelWidth - tooltip.offsetWidth - 12, x + 22))
          let top = y + 22
          if (top + tooltip.offsetHeight > pixelHeight - 12) top = y - tooltip.offsetHeight - 22
          tooltip.style.left = `${left}px`
          tooltip.style.top = `${Math.max(12, top)}px`
        }
      })
    },
    reset: () => select(-1),
    dispose() {
      disposed = true
      window.removeEventListener('pointerdown', outside)
      window.removeEventListener('keydown', escape)
      overlay.remove()
      markers[0]?.material.map?.dispose()
      markers.forEach(({ mesh, material }) => { scene.remove(mesh); material.dispose() })
      geometry.dispose()
    },
  }
}
