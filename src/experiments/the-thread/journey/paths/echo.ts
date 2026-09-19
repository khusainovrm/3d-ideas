import { createPath } from './utils'

export const echoPath = (samples: number): Float32Array => createPath(samples, (t, index, write) => {
  const x = -12 + t * 24
  const envelope = Math.sin(t * Math.PI)
  const y = Math.sin(t * Math.PI * 2.25) * 2.2 * envelope
  const z = -Math.cos(t * Math.PI * 2) * 0.55
  write(index, x, y, z)
})
