export type JourneyState = 'horizon' | 'route' | 'speakers' | 'echo' | 'destination' | 'network' | 'final'

export const JOURNEY_RANGES = {
  horizon: [0, 0.14],
  route: [0.14, 0.31],
  speakers: [0.31, 0.54],
  echo: [0.54, 0.7],
  destination: [0.7, 0.88],
  network: [0.88, 0.97],
  final: [0.97, 1],
} as const

export const getJourneyState = (progress: number): JourneyState => {
  const entry = Object.entries(JOURNEY_RANGES).find(([, range]) => progress >= range[0] && progress <= range[1])
  return (entry?.[0] as JourneyState | undefined) ?? 'final'
}

export const getPathTransition = (progress: number): number => {
  const transitions = [[0.09, 0.2], [0.27, 0.39], [0.5, 0.61], [0.66, 0.78], [0.84, 0.93], [0.94, 1]] as const
  const range = transitions.find(([start, end]) => progress >= start && progress <= end)
  return range ? (progress - range[0]) / (range[1] - range[0]) : 0
}
