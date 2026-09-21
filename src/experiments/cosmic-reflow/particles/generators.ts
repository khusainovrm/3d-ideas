export type PositionWriter = (index: number, x: number, y: number, z?: number) => void

const createRandom = (seed: number): (() => number) => {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

const centeredNoise = (random: () => number): number => random() + random() + random() - 1.5

const createPositions = (
  count: number,
  seed: number,
  fill: (write: PositionWriter, random: () => number) => void,
): Float32Array => {
  const positions = new Float32Array(count * 3)
  const random = createRandom(seed)
  const write: PositionWriter = (index, x, y, z = 0) => {
    const offset = index * 3
    positions[offset] = x
    positions[offset + 1] = y
    positions[offset + 2] = z
  }
  fill(write, random)
  return positions
}

export const GALAXY_CENTER = [3.15, -0.1, 0] as const
export const WHEEL_CENTER = [-3.1, 0, 0] as const
export const PLANET_INDICES = [0, 1, 2, 3] as const

export const PLANET_POSITIONS = [
  [1.35, 0.3, 0.2],
  [-2.25, 0.95, -0.35],
  [3.05, -1.0, 0.15],
  [-3.7, -1.35, 0.45],
] as const

export const generateNebula = (count: number): Float32Array => createPositions(count, 7103, (write, random) => {
  for (let index = 0; index < count; index += 1) {
    const lobe = index % 5
    const angle = random() * Math.PI * 2 + lobe * 1.17
    const radius = Math.pow(random(), 1.7) * (3.3 + lobe * 0.45)
    const curl = angle + radius * 0.43
    const centerX = lobe < 2 ? 2.7 : 3.55
    const x = centerX + Math.cos(curl) * radius * 1.25 + centeredNoise(random) * 0.72
    const y = 0.15 + Math.sin(curl) * radius * 0.57 + centeredNoise(random) * 0.58
    const z = centeredNoise(random) * (1.2 + radius * 0.35) + Math.sin(curl * 1.7) * 0.45
    write(index, x, y, z)
  }
})

export const generateLine = (count: number): Float32Array => createPositions(count, 7207, (write, random) => {
  for (let index = 0; index < count; index += 1) {
    const t = index / Math.max(1, count - 1)
    const x = -7.8 + t * 15.8
    const y = -2.6 + t * 5.1 + Math.sin(t * Math.PI * 5.1) * 0.52
    const z = Math.sin(t * Math.PI * 3.0) * 0.85
    const width = index % 13 === 0 ? 0.28 : 0.075
    write(index, x + centeredNoise(random) * width, y + centeredNoise(random) * width, z + centeredNoise(random) * 0.18)
  }
})

export const generateGalaxy = (count: number): Float32Array => createPositions(count, 7309, (write, random) => {
  const arms = 4
  for (let index = 0; index < count; index += 1) {
    const planetId = PLANET_INDICES.indexOf(index as (typeof PLANET_INDICES)[number])
    if (planetId >= 0) {
      const planet = PLANET_POSITIONS[planetId]!
      write(index, GALAXY_CENTER[0] + planet[0], GALAXY_CENTER[1] + planet[1], GALAXY_CENTER[2] + planet[2])
      continue
    }
    const core = random() < 0.16
    const radius = core ? Math.pow(random(), 2.4) * 1.25 : Math.pow(random(), 0.72) * 5.15
    const arm = index % arms
    const armAngle = arm / arms * Math.PI * 2
    const angle = armAngle + radius * 1.34 + centeredNoise(random) * (0.18 + radius * 0.035)
    const thickness = core ? 0.42 : 0.1 + radius * 0.035
    write(index,
      GALAXY_CENTER[0] + Math.cos(angle) * radius + centeredNoise(random) * thickness,
      GALAXY_CENTER[1] + Math.sin(angle) * radius * 0.58 + centeredNoise(random) * thickness,
      centeredNoise(random) * (core ? 0.75 : 0.22 + radius * 0.055),
    )
  }
})

export const generateWheel = (count: number): Float32Array => createPositions(count, 7411, (write, random) => {
  const spokes = 8
  for (let index = 0; index < count; index += 1) {
    const selector = random()
    let radius: number
    let angle: number
    if (selector < 0.47) {
      radius = 3.65 + centeredNoise(random) * 0.22
      angle = random() * Math.PI * 2
    } else if (selector < 0.62) {
      radius = 3.12 + centeredNoise(random) * 0.12
      angle = random() * Math.PI * 2
    } else if (selector < 0.86) {
      angle = (index % spokes) / spokes * Math.PI * 2 + centeredNoise(random) * 0.02
      radius = 0.7 + random() * 4.28
    } else if (selector < 0.94) {
      radius = Math.sqrt(random()) * 0.82
      angle = random() * Math.PI * 2
    } else {
      angle = (index % spokes) / spokes * Math.PI * 2
      radius = 4.3 + centeredNoise(random) * 0.56
    }
    write(index,
      WHEEL_CENTER[0] + Math.cos(angle) * radius + centeredNoise(random) * 0.055,
      WHEEL_CENTER[1] + Math.sin(angle) * radius + centeredNoise(random) * 0.055,
      centeredNoise(random) * 0.22,
    )
  }
})

export interface LogoSample {
  positions: Float32Array
  colors: Float32Array
}

export const createFallbackLogo = (count: number): LogoSample => {
  const positions = createPositions(count, 7523, (write, random) => {
    for (let index = 0; index < count; index += 1) {
      const angle = random() * Math.PI * 2
      const radius = 2.2 + centeredNoise(random) * 0.18
      write(index, Math.cos(angle) * radius, Math.sin(angle) * radius, centeredNoise(random) * 0.08)
    }
  })
  return { positions, colors: new Float32Array(count * 3).fill(0.86) }
}

export const sampleLogo = async (count: number, source: string): Promise<LogoSample> => {
  const image = new Image()
  image.decoding = 'async'
  image.src = source
  await image.decode()

  const width = 900
  const height = Math.round(width * image.naturalHeight / image.naturalWidth)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Canvas 2D is unavailable for logo sampling')
  context.clearRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)
  const pixels = context.getImageData(0, 0, width, height).data
  const candidates: number[] = []
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const offset = (y * width + x) * 4
      if ((pixels[offset + 3] ?? 0) > 72) candidates.push(offset)
    }
  }
  if (!candidates.length) throw new Error('The Rostelecom logo mask is empty')

  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const random = createRandom(7617)
  const scale = 16.6 / width
  for (let index = 0; index < count; index += 1) {
    const offset = candidates[Math.floor(random() * candidates.length)] ?? candidates[0]!
    const pixel = offset / 4
    const x = pixel % width
    const y = Math.floor(pixel / width)
    const target = index * 3
    positions[target] = (x - width / 2) * scale + centeredNoise(random) * 0.018
    positions[target + 1] = (height / 2 - y) * scale - 1.1 + centeredNoise(random) * 0.018
    positions[target + 2] = centeredNoise(random) * 0.08
    colors[target] = (pixels[offset] ?? 255) / 255
    colors[target + 1] = (pixels[offset + 1] ?? 255) / 255
    colors[target + 2] = (pixels[offset + 2] ?? 255) / 255
  }
  return { positions, colors }
}
