import { createPath } from './utils'

export const destinationPath = (samples: number): Float32Array => createPath(samples, (t, index, write) => {
  const centerX = -3.2
  const radiusX = 4.2
  const radiusY = 3.55

  if (t < 0.18) {
    const local = t / 0.18
    write(index, -12 + local * (8.8 - radiusX), 0, -0.3 * local)
    return
  }
  if (t < 0.78) {
    const local = (t - 0.18) / 0.6
    const angle = Math.PI + local * Math.PI * 2
    write(index, centerX + Math.cos(angle) * radiusX, Math.sin(angle) * radiusY, -0.3 + Math.sin(local * Math.PI) * 0.75)
    return
  }
  const local = (t - 0.78) / 0.22
  write(index, centerX - radiusX + local * (12 - centerX + radiusX), 0, -0.3 * (1 - local))
})
