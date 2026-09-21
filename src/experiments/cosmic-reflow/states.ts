export type CosmicState = 'nebula' | 'line' | 'galaxy' | 'wheel' | 'rostelecom'

export const STATE_PROGRESS: Record<CosmicState, number> = {
  nebula: 0,
  line: 0.29,
  galaxy: 0.53,
  wheel: 0.77,
  rostelecom: 1,
}

export const getCosmicState = (progress: number): CosmicState => {
  if (progress < 0.22) return 'nebula'
  if (progress < 0.43) return 'line'
  if (progress < 0.67) return 'galaxy'
  if (progress < 0.89) return 'wheel'
  return 'rostelecom'
}

const TRANSITIONS = [
  [0.14, 0.29],
  [0.35, 0.52],
  [0.64, 0.79],
  [0.88, 0.98],
] as const

export const getTransitionProgress = (progress: number): number => {
  const active = TRANSITIONS.find(([start, end]) => progress >= start && progress <= end)
  if (!active) return 0
  return (progress - active[0]) / (active[1] - active[0])
}

