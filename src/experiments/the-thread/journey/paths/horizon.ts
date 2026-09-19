import { createPath } from './utils'

export const horizonPath = (samples: number): Float32Array => createPath(samples, (t, index, write) => {
  const x = -12 + t * 24
  const y = -0.65 + Math.sin(t * Math.PI * 2) * 0.055
  const z = -Math.sin(t * Math.PI) * 0.45
  write(index, x, y, z)
})
