import { createPath } from './utils'

export const finalPath = (samples: number): Float32Array => createPath(samples, (t, index, write) => {
  write(index, -12 + t * 24, 0.5, -0.15 + t * -0.35)
})
