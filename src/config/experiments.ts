import type { Component } from 'vue'

export type LoadLevel = 'Low' | 'Medium' | 'High'

export interface ExperimentMeta {
  slug: string
  index: string
  title: string
  description: string
  technologies: readonly string[]
  load: LoadLevel
  component: () => Promise<{ default: Component }>
}

export const experiments = [
  {
    slug: 'sea-particles', index: '01', title: 'Sea Particles',
    description: 'Абстрактное море из точек: низкая камера, блики и бесконечный дрейф.',
    technologies: ['Points', 'GLSL', 'BufferGeometry'], load: 'Medium',
    component: () => import('../experiments/sea-particles/SeaParticles.vue'),
  },
  {
    slug: 'star-navigation', index: '02', title: 'Navigation Stars',
    description: 'Ночная навигация сквозь звёздное поле и пространственный маршрут.',
    technologies: ['GPU particles', 'ScrollTrigger', 'GLSL'], load: 'Medium',
    component: () => import('../experiments/star-navigation/StarNavigation.vue'),
  },
  {
    slug: 'odyssey-route', index: '03', title: 'Odyssey Route',
    description: 'Пять состояний пути, сведённые в одну возникающую линию.',
    technologies: ['Line shader', 'Fog', 'GSAP'], load: 'Low',
    component: () => import('../experiments/odyssey-route/OdysseyRoute.vue'),
  },
  {
    slug: 'shader-ocean', index: '04', title: 'Shader Ocean',
    description: 'Процедурная вода без текстур, отражений и тяжёлого постпроцессинга.',
    technologies: ['Vertex displacement', 'Fresnel', 'Noise'], load: 'Medium',
    component: () => import('../experiments/shader-ocean/ShaderOcean.vue'),
  },
  {
    slug: 'golden-dust', index: '05', title: 'Golden Dust',
    description: 'Едва заметная золотая пыль — сдержанный свет в глубокой темноте.',
    technologies: ['Points', 'Pointer drift', 'GLSL'], load: 'Low',
    component: () => import('../experiments/golden-dust/GoldenDust.vue'),
  },
  {
    slug: 'storm-transition', index: '06', title: 'Storm Transition',
    description: 'Scroll-переход от штиля к шторму и обратно одной GPU-сценой.',
    technologies: ['ScrollTrigger', 'Rain particles', 'GLSL'], load: 'High',
    component: () => import('../experiments/storm-transition/StormTransition.vue'),
  },
  {
    slug: 'conference-journey', index: '07', title: 'Conference Journey',
    description: 'Полноценный конференционный лендинг как непрерывное путешествие к горизонту.',
    technologies: ['Conversion UI', 'ScrollTrigger', 'Shader ocean'], load: 'Medium',
    component: () => import('../experiments/conference-journey/ConferenceJourney.vue'),
  },
  {
    slug: 'particle-reflow', index: '08', title: 'Particle Reflow',
    description: 'Конференционный лендинг, где одна система точек проходит путь от моря до точки назначения.',
    technologies: ['GPU morphing', 'One Points system', 'ScrollTrigger'], load: 'Medium',
    component: () => import('../experiments/particle-reflow/ParticleReflow.vue'),
  },
] as const satisfies readonly ExperimentMeta[]

export const getExperiment = (slug: string): ExperimentMeta | undefined =>
  experiments.find((experiment) => experiment.slug === slug)
