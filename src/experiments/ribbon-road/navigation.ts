import { PARTICLE_FIGURE_DATA } from './particleFigureData.generated'
import { reactive } from 'vue'

export type RoadSectionId =
  | 'road-about'
  | 'road-program'
  | 'road-speakers'
  | 'road-registration'
  | 'road-partners'

export type NavigationShape = 'diffuseCloud' | 'noisySphere' | 'lens' | 'starBurst' | 'solidSphere'

export interface RoadNavigationSection {
  id: RoadSectionId
  label: string
  shape: NavigationShape
  className: string
  roadIndex: number
  particleCount: number
  hitRadius: number
}

export const ROAD_NAV_SECTIONS: readonly RoadNavigationSection[] = [
  { id: 'road-about', label: 'О конференции', shape: 'diffuseCloud', className: 'road-orbit--about', roadIndex: 0, particleCount: PARTICLE_FIGURE_DATA.diffuseCloud.count, hitRadius: 62 },
  { id: 'road-program', label: 'Программа', shape: 'noisySphere', className: 'road-orbit--program', roadIndex: 1, particleCount: PARTICLE_FIGURE_DATA.noisySphere.count, hitRadius: 62 },
  { id: 'road-speakers', label: 'Спикеры', shape: 'lens', className: 'road-orbit--speakers', roadIndex: 2, particleCount: PARTICLE_FIGURE_DATA.lens.count, hitRadius: 60 },
  { id: 'road-registration', label: 'Регистрация', shape: 'starBurst', className: 'road-orbit--registration', roadIndex: 3, particleCount: PARTICLE_FIGURE_DATA.starBurst.count, hitRadius: 72 },
  { id: 'road-partners', label: 'Партнёры', shape: 'solidSphere', className: 'road-orbit--partners', roadIndex: 4, particleCount: PARTICLE_FIGURE_DATA.solidSphere.count, hitRadius: 64 },
] as const

export const ORIGINAL_SECTION_ORDER: readonly RoadSectionId[] = ROAD_NAV_SECTIONS.map(({ id }) => id)

export const NAV_CONSTELLATION = reactive({
  enabled: true,
  figureCount: 5,
  // 0–100: visible share of the ORIGINAL nebula after the figures form.
  // Independent of figure particle counts. 100 restores the complete background.
  nebulaRemainingPercent: 80,
  qualityParticleScale: { low: 0.6, medium: 0.8, high: 1 },
  formationDelay: 0.25,
  formationDuration: 1.4,
  formationStagger: 0.1,
  hoverScale: 1.08,
  hoverBrightness: 1.65,
  hoverResponse: 9,
  selectedBrightness: 1.85,
  layoutSeed: 20,
  layoutGap: 16,
  figureSize: 0.15,
  figureHitRadius: 58,
  scrollDuration: 1.2,
})
