import { createPath } from './utils'

export const networkPath = (samples: number): Float32Array => createPath(samples, (t, index, write) => {
  const x = -12 + t * 24
  const envelope = Math.pow(Math.sin(t * Math.PI), 0.7)
  const y = Math.sin(t * Math.PI * 5) * 1.25 * envelope
  const z = -Math.sin(t * Math.PI * 3) * 1.4 * envelope
  write(index, x, y, z)
})
