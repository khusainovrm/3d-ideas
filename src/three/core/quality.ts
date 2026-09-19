export type QualityLevel = 'low' | 'medium' | 'high'

export interface QualityProfile {
  dpr: number
  particleScale: number
  segmentScale: number
  shaderDetail: number
  decorativeObjects: number
  postprocessing: boolean
  updateStride: number
}

export const QUALITY_PROFILES: Record<QualityLevel, QualityProfile> = {
  low: {
    dpr: 1,
    particleScale: 0.3,
    segmentScale: 0.45,
    shaderDetail: 0,
    decorativeObjects: 0,
    postprocessing: false,
    updateStride: 2,
  },
  medium: {
    dpr: 1.25,
    particleScale: 0.65,
    segmentScale: 0.7,
    shaderDetail: 1,
    decorativeObjects: 1,
    postprocessing: false,
    updateStride: 1,
  },
  high: {
    dpr: 1.5,
    particleScale: 1,
    segmentScale: 1,
    shaderDetail: 2,
    decorativeObjects: 2,
    postprocessing: true,
    updateStride: 1,
  },
}

const isTouchDevice = (): boolean =>
  navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches

export const detectQuality = (): QualityLevel => {
  const cores = navigator.hardwareConcurrency || 4
  const compact = Math.min(window.innerWidth, window.innerHeight) < 820
  const expensiveDpr = window.devicePixelRatio > 2

  if ((isTouchDevice() && compact) || cores <= 4) return 'low'
  if (cores <= 8 || expensiveDpr || window.innerWidth < 1280) return 'medium'
  return 'high'
}

export const lowerQuality = (quality: QualityLevel): QualityLevel => {
  if (quality === 'high') return 'medium'
  return 'low'
}
