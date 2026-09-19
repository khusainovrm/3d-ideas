import { createPath } from './utils'

export const routePath = (samples: number): Float32Array => createPath(samples, (t, index, write) => {
  const x = -11.5 + t * 23
  const y = 3.2 - t * 6.4 + Math.sin(t * Math.PI * 3) * 0.55
  const z = -Math.sin(t * Math.PI) * 5.5
  write(index, x, y, z)
})
