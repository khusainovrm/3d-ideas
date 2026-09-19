import { onMounted, onUnmounted, reactive, ref, shallowRef } from 'vue'
import {
  Clock,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  SRGBColorSpace,
} from 'three'
import type { ExperimentScene, SceneFactory } from '../three/core/types'
import { detectQuality, lowerQuality, QUALITY_PROFILES, type QualityLevel } from '../three/core/quality'
import { FpsMonitor } from '../three/core/FpsMonitor'

export const useThreeScene = (factory: SceneFactory) => {
  const container = ref<HTMLElement | null>(null)
  const paused = ref(false)
  const ready = ref(false)
  const error = shallowRef<string | null>(null)
  const metrics = reactive({
    fps: 60,
    dpr: 1,
    quality: 'low' as QualityLevel,
    particles: 0,
    calls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
  })

  let renderer: WebGLRenderer | undefined
  let experiment: ExperimentScene | undefined
  let animationFrame = 0
  let resizeFrame = 0
  let observer: ResizeObserver | undefined
  let monitor: FpsMonitor | undefined
  let camera: PerspectiveCamera | undefined
  let clock: Clock | undefined
  let quality: QualityLevel = 'low'
  let frameIndex = 0
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const applyQuality = (next: QualityLevel): void => {
    if (next === quality) return
    quality = next
    const profile = QUALITY_PROFILES[quality]
    metrics.quality = quality
    metrics.dpr = Math.min(window.devicePixelRatio, profile.dpr)
    renderer?.setPixelRatio(metrics.dpr)
    if (renderer && container.value) {
      renderer.setSize(container.value.clientWidth, container.value.clientHeight, false)
    }
    experiment?.setQuality?.(quality, profile)
  }

  const resize = (): void => {
    if (!renderer || !camera || !container.value) return
    cancelAnimationFrame(resizeFrame)
    resizeFrame = requestAnimationFrame(() => {
      if (!renderer || !camera || !container.value) return
      const { clientWidth: width, clientHeight: height } = container.value
      camera.aspect = width / Math.max(1, height)
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, QUALITY_PROFILES[quality].dpr))
      experiment?.resize?.(width, height)
    })
  }

  const animate = (): void => {
    if (!renderer || !camera || !clock || !experiment) return
    animationFrame = requestAnimationFrame(animate)
    const rawDelta = Math.min(clock.getDelta(), 0.1)
    monitor?.tick(rawDelta)
    metrics.fps = monitor?.fps ?? 60

    if (!paused.value) {
      frameIndex += 1
      const profile = QUALITY_PROFILES[quality]
      if (frameIndex % profile.updateStride === 0) {
        experiment.update({ elapsed: clock.elapsedTime, delta: rawDelta, reducedMotion })
      }
      renderer.render(rendererScene, camera)
    }

    const info = renderer.info
    metrics.calls = info.render.calls
    metrics.triangles = info.render.triangles
    metrics.geometries = info.memory.geometries
    metrics.textures = info.memory.textures
    metrics.particles = experiment.stats?.().particles ?? 0
  }

  let rendererScene = new Scene()

  onMounted(() => {
    if (!container.value) return
    try {
      quality = detectQuality()
      const profile = QUALITY_PROFILES[quality]
      renderer = new WebGLRenderer({
        antialias: quality !== 'low',
        alpha: false,
        powerPreference: 'high-performance',
        depth: true,
        stencil: false,
      })
      renderer.outputColorSpace = SRGBColorSpace
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, profile.dpr))
      renderer.setSize(container.value.clientWidth, container.value.clientHeight, false)
      container.value.appendChild(renderer.domElement)

      rendererScene = new Scene()
      camera = new PerspectiveCamera(48, 1, 0.05, 500)
      clock = new Clock()
      metrics.quality = quality
      metrics.dpr = renderer.getPixelRatio()
      experiment = factory({
        renderer,
        scene: rendererScene,
        camera,
        clock,
        container: container.value,
        quality,
        profile,
        reducedMotion,
      })
      monitor = new FpsMonitor(() => applyQuality(lowerQuality(quality)))
      observer = new ResizeObserver(resize)
      observer.observe(container.value)
      resize()
      ready.value = true
      animate()
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'WebGL initialization failed'
    }
  })

  onUnmounted(() => {
    cancelAnimationFrame(animationFrame)
    cancelAnimationFrame(resizeFrame)
    observer?.disconnect()
    experiment?.dispose()
    renderer?.renderLists.dispose()
    renderer?.dispose()
    renderer?.forceContextLoss()
    renderer?.domElement.remove()
    renderer = undefined
    experiment = undefined
  })

  return {
    container,
    paused,
    ready,
    error,
    metrics,
    togglePause: () => { paused.value = !paused.value },
    reset: () => experiment?.reset?.(),
  }
}
