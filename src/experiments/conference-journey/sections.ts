export const SECTIONS = {
  hero: [0, 0.18],
  about: [0.18, 0.32],
  speakers: [0.32, 0.55],
  testimonials: [0.55, 0.7],
  registration: [0.7, 0.9],
  partners: [0.9, 1],
} as const

export type JourneySection = keyof typeof SECTIONS

export const getJourneySection = (progress: number): JourneySection => {
  const entry = Object.entries(SECTIONS).find(([, range]) => progress >= range[0] && progress <= range[1])
  return (entry?.[0] as JourneySection | undefined) ?? 'partners'
}

export const rangeProgress = (value: number, start: number, end: number): number =>
  Math.max(0, Math.min(1, (value - start) / (end - start)))
