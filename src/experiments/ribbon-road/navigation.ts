export type RoadSectionId =
  | 'road-about'
  | 'road-program'
  | 'road-speakers'
  | 'road-registration'
  | 'road-partners'

export type NavigationShape = 'ring' | 'bars' | 'diamond' | 'cross' | 'grid'

export interface RoadNavigationSection {
  id: RoadSectionId
  label: string
  shape: NavigationShape
  className: string
  roadIndex: number
}

export const ROAD_NAV_SECTIONS: readonly RoadNavigationSection[] = [
  { id: 'road-about', label: 'О конференции', shape: 'ring', className: 'road-orbit--about', roadIndex: 0 },
  { id: 'road-program', label: 'Программа', shape: 'bars', className: 'road-orbit--program', roadIndex: 1 },
  { id: 'road-speakers', label: 'Спикеры', shape: 'diamond', className: 'road-orbit--speakers', roadIndex: 2 },
  { id: 'road-registration', label: 'Регистрация', shape: 'cross', className: 'road-orbit--registration', roadIndex: 3 },
  { id: 'road-partners', label: 'Партнёры', shape: 'grid', className: 'road-orbit--partners', roadIndex: 4 },
] as const

export const ORIGINAL_SECTION_ORDER: readonly RoadSectionId[] = ROAD_NAV_SECTIONS.map(({ id }) => id)

export const NAV_CONSTELLATION = {
  enabled: true,
  figureCount: 5,
  particlesPerFigure: 260,
  formationDelay: 0.25,
  formationDuration: 1.4,
  formationStagger: 0.1,
  hoverScale: 1.08,
  hoverBrightness: 1.65,
  hoverResponse: 9,
  selectedBrightness: 1.85,
  checkerColumns: 5,
  checkerStepX: 0.13,
  checkerStepY: 0.105,
  figureSize: 0.07,
  figureHitRadius: 58,
  pointerDistortionRadius: 96,
  pointerAttraction: 0.16,
  scrollDuration: 1.2,
} as const
