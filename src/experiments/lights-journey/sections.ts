export const LIGHT_SECTIONS = {
  hero: [0, 0.18],
  about: [0.18, 0.34],
  speakers: [0.34, 0.56],
  testimonials: [0.56, 0.72],
  registration: [0.72, 0.9],
  partners: [0.9, 1],
} as const

export type LightSection = keyof typeof LIGHT_SECTIONS

export const getLightSection = (progress: number): LightSection => {
  const entry = Object.entries(LIGHT_SECTIONS).find(([, range]) => progress >= range[0] && progress <= range[1])
  return (entry?.[0] as LightSection | undefined) ?? 'partners'
}

export const sectionValue = (progress: number, start: number, end: number): number =>
  Math.max(0, Math.min(1, (progress - start) / (end - start)))
