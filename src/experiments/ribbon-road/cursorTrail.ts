import { CanvasTexture, LinearFilter, NoColorSpace } from 'three'

/** Low-resolution, screen-space displacement memory, like CursorAnimation.vue. */
export function createCursorTrail() {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!
  const brush = document.createElement('canvas')
  brush.width = brush.height = 128
  const brushContext = brush.getContext('2d')!
  const gradient = brushContext.createRadialGradient(64, 64, 0, 64, 64, 64)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.35, 'rgba(255,255,255,.65)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  brushContext.fillStyle = gradient
  brushContext.fillRect(0, 0, 128, 128)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = NoColorSpace
  texture.minFilter = texture.magFilter = LinearFilter
  texture.generateMipmaps = false
  let previousX = -1
  let previousY = -1
  const reset = () => {
    context.globalAlpha = 1
    context.globalCompositeOperation = 'source-over'
    context.fillStyle = '#000'
    context.fillRect(0, 0, canvas.width, canvas.height)
    previousX = previousY = -1
    texture.needsUpdate = true
  }
  const resize = (width: number, height: number) => {
    const scale = 512 / Math.max(width, height)
    const nextWidth = Math.max(1, Math.round(width * scale))
    const nextHeight = Math.max(1, Math.round(height * scale))
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      // WebGL texture storage is immutable. Unlocking scroll can resize the
      // viewport (scrollbar), so release the old allocation before uploading
      // the resized canvas. Keep the Texture object used by the shader uniform.
      texture.dispose()
      canvas.width = nextWidth
      canvas.height = nextHeight
    }
    reset()
  }
  const update = (
    delta: number, x: number, y: number, width: number, height: number,
    radius: number, decay: number, painting: boolean,
  ) => {
    context.globalCompositeOperation = 'source-over'
    context.globalAlpha = 1 - Math.exp(-delta / Math.max(0.05, decay))
    context.fillStyle = '#000'
    context.fillRect(0, 0, canvas.width, canvas.height)
    if (painting) {
      const distance = previousX < 0 ? 0 : Math.hypot(x - previousX, y - previousY)
      if (distance > 0.1) {
        const steps = Math.min(32, Math.max(1, Math.ceil(distance / Math.max(4, radius * 0.25))))
        context.globalCompositeOperation = 'lighten'
        // Normalizing by dt gives the same response at different frame rates.
        context.globalAlpha = Math.min(1, distance / Math.max(1, delta * 650))
        const rx = radius * canvas.width / width
        const ry = radius * canvas.height / height
        for (let i = 1; i <= steps; i++) {
          const px = (previousX + (x - previousX) * i / steps) * canvas.width / width
          const py = (previousY + (y - previousY) * i / steps) * canvas.height / height
          context.drawImage(brush, px - rx, py - ry, rx * 2, ry * 2)
        }
      }
      previousX = x
      previousY = y
    } else {
      previousX = previousY = -1
    }
    texture.needsUpdate = true
  }
  resize(window.innerWidth, window.innerHeight)
  return { texture, reset, resize, update, dispose: () => texture.dispose() }
}
