import { createPath } from './utils'

export const speakersPath = (samples: number): Float32Array => createPath(samples, (t, index, write) => {
  const x = -11.5 + t * 23
  const encounters = Math.sin(t * Math.PI * 4) * 1.75
  const calm = Math.sin(t * Math.PI) * 0.45
  const z = -1.2 - Math.pow(Math.sin(t * Math.PI * 2), 2) * 2.2
  write(index, x, encounters + calm, z)
})
