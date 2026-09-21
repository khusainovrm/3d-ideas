import type { Clock, PerspectiveCamera, Scene, WebGLRenderer } from 'three'
import type { QualityLevel, QualityProfile } from './quality'

export interface FrameInfo {
  elapsed: number
  delta: number
  reducedMotion: boolean
}

export interface SceneStats {
  particles?: number
  scrollProgress?: number
  section?: string
  transitionProgress?: number
  lineSamples?: number
  surfaceRelief?: number
  lightsCount?: number
  cameraZ?: number
  terrainSegments?: number
  propsCount?: number
  cameraProgress?: number
  postprocessing?: boolean
  shadows?: boolean
}

export interface ThreeRuntime {
  renderer: WebGLRenderer
  scene: Scene
  camera: PerspectiveCamera
  clock: Clock
  container: HTMLElement
  quality: QualityLevel
  profile: QualityProfile
  reducedMotion: boolean
}

export interface ExperimentScene {
  update(frame: FrameInfo): void
  resize?(width: number, height: number): void
  setQuality?(quality: QualityLevel, profile: QualityProfile): void
  reset?(): void
  stats?(): SceneStats
  dispose(): void
}

export type SceneFactory = (runtime: ThreeRuntime) => ExperimentScene
