import { Vector3 } from 'three'

export interface MountainFrame { x: number; y: number; width: number; height: number }

// The supplied mockup shows the right-hand mountain group of the source image.
// Keep the route, stars and particle image in the same coordinate system.
export function mountainFrame(width: number, height: number) {
  const aspect = 3840 / 2134
  const imageHeight = Math.max(height, width / aspect)
  // Keep the whole mountain group visible on portrait screens.
  const imageWidth = Math.min(imageHeight * aspect, width / 0.485)
  return { x: (width - imageWidth) / 2, y: -height, width: imageWidth, height: imageHeight }
}

export function mountainPoint(x: number, y: number, width: number, height: number, z = 0.5, frame = mountainFrame(width, height)) {
  const imageX = 0.515 + x * 0.485
  const imageY = 0.06 + y * 0.95
  return new Vector3(frame.x + (imageX - 0.5) * frame.width,
    frame.y + (0.5 - imageY) * frame.height, z)
}
