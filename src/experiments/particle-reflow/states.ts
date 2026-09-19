export type ParticleState = 'hero' | 'about' | 'speakers' | 'testimonials' | 'registration' | 'partners'

export const JOURNEY_STATES: Record<ParticleState, { start: number; end: number }> = {
  hero: { start: 0, end: 0.15 },
  about: { start: 0.15, end: 0.32 },
  speakers: { start: 0.32, end: 0.55 },
  testimonials: { start: 0.55, end: 0.7 },
  registration: { start: 0.7, end: 0.9 },
  partners: { start: 0.9, end: 1 },
}

export const STATE_PROGRESS: Record<ParticleState, number> = {
  hero: 0,
  about: 0.25,
  speakers: 0.45,
  testimonials: 0.62,
  registration: 0.82,
  partners: 1,
}

export const getParticleState = (progress: number): ParticleState => {
  if (progress < 0.18) return 'hero'
  if (progress < 0.37) return 'about'
  if (progress < 0.56) return 'speakers'
  if (progress < 0.72) return 'testimonials'
  if (progress < 0.91) return 'registration'
  return 'partners'
}

const TRANSITIONS = [
  [0.1, 0.25], [0.3, 0.45], [0.5, 0.62], [0.68, 0.82], [0.88, 1],
] as const

export const getTransitionProgress = (progress: number): number => {
  const active = TRANSITIONS.find(([start, end]) => progress >= start && progress <= end)
  if (!active) return 0
  return (progress - active[0]) / (active[1] - active[0])
}
