export interface ParticleData {
  width: number
  height: number
  count: number
  positions: Float32Array
  light: Float32Array
  phase: Float32Array
}

/** Decode LPT1: 16-byte header, then unsigned pixel-index deltas and luminance. */
export function decodeParticleData(buffer: ArrayBuffer): ParticleData {
  const bytes = new Uint8Array(buffer)
  if (bytes.length < 16 || bytes[0] !== 76 || bytes[1] !== 80 || bytes[2] !== 84 || bytes[3] !== 49) {
    throw new Error('Invalid particle data header')
  }
  const header = new DataView(buffer)
  const width = header.getUint32(4, true)
  const height = header.getUint32(8, true)
  const count = header.getUint32(12, true)
  if (!width || !height || count > width * height || count > (bytes.length - 16) / 2) {
    throw new Error('Invalid particle data dimensions')
  }
  const positions = new Float32Array(count * 3)
  const light = new Float32Array(count)
  const phase = new Float32Array(count)
  const aspect = width / height
  let offset = 16
  let pixel = 0
  for (let i = 0; i < count; i++) {
    let delta = 0
    let shift = 0
    let value: number
    do {
      if (offset >= bytes.length || shift > 28) throw new Error('Invalid particle position')
      value = bytes[offset++]!
      delta += (value & 127) * 2 ** shift
      shift += 7
    } while (value & 128)
    pixel += delta
    if (pixel >= width * height || offset >= bytes.length || (i > 0 && delta === 0)) {
      throw new Error('Invalid particle record')
    }
    const x = pixel % width
    const y = Math.floor(pixel / width)
    // Keep exactly the same Float32 values and ordering as the original records.
    positions[i * 3] = ((x + 0.5) / width - 0.5) * aspect
    positions[i * 3 + 1] = 0.5 - (y + 0.5) / height
    light[i] = bytes[offset++]! / 255
    phase[i] = ((Math.imul(i + 1, 1664525) + 1013904223) >>> 0) / 4294967296
  }
  if (offset !== bytes.length) throw new Error('Unexpected trailing particle data')
  return { width, height, count, positions, light, phase }
}

export async function loadParticleData(url: string, signal: AbortSignal): Promise<ParticleData> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`Particle loading failed (${response.status})`)
  let buffer: ArrayBuffer
  if (typeof DecompressionStream !== 'undefined' && response.body) {
    const stream = response.body.pipeThrough(new DecompressionStream('gzip'))
    buffer = await new Response(stream).arrayBuffer()
  } else {
    // Older Safari releases can load the same assets without native gzip streams.
    const { gunzipSync } = await import('fflate')
    const compressed = new Uint8Array(await response.arrayBuffer())
    if (signal.aborted) throw new DOMException('Particle loading cancelled', 'AbortError')
    buffer = new Uint8Array(gunzipSync(compressed)).buffer
  }
  if (signal.aborted) throw new DOMException('Particle loading cancelled', 'AbortError')
  return decodeParticleData(buffer)
}
