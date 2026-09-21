import { nextTick, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import type { Pane } from 'tweakpane'
import type { QualityLevel } from '../three/core/quality'

export interface RuntimeMetrics {
  fps: number
  dpr: number
  quality: QualityLevel
  particles: number
  calls: number
  triangles: number
  geometries: number
  textures: number
  scrollProgress: number
  section: string
  transitionProgress: number
  lineSamples: number
  surfaceRelief: number
  lightsCount: number
  cameraZ: number
  terrainSegments: number
  propsCount: number
  cameraProgress: number
  postprocessing: boolean
  shadows: boolean
}

export type DebugMetricKey = keyof RuntimeMetrics

export interface DebugBinding {
  key: DebugMetricKey
  label: string
}

const DEFAULT_BINDINGS: readonly DebugBinding[] = [
  { key: 'fps', label: 'FPS' },
  { key: 'dpr', label: 'DPR' },
  { key: 'quality', label: 'Quality' },
  { key: 'particles', label: 'Particles' },
  { key: 'calls', label: 'Draw calls' },
  { key: 'triangles', label: 'Triangles' },
]

export const useDebugPane = (
  metrics: RuntimeMetrics,
  options: { title?: string; bindings?: readonly DebugBinding[] } = {},
) => {
  const paneHost: Ref<HTMLElement | null> = ref(null)
  const debug = ref(window.location.hash === '#debug')
  let pane: Pane | undefined
  let refreshTimer = 0

  const syncHash = (): void => { debug.value = window.location.hash === '#debug' }

  const mountPane = async (): Promise<void> => {
    if (!debug.value || pane || !paneHost.value) return
    const { Pane: Tweakpane } = await import('tweakpane')
    if (!debug.value || !paneHost.value) return
    pane = new Tweakpane({ title: options.title ?? 'Runtime', container: paneHost.value })
    for (const binding of options.bindings ?? DEFAULT_BINDINGS) {
      pane.addBinding(metrics, binding.key, { readonly: true, label: binding.label })
    }
    refreshTimer = window.setInterval(() => pane?.refresh(), 400)
  }

  const unmountPane = (): void => {
    window.clearInterval(refreshTimer)
    pane?.dispose()
    pane = undefined
  }

  const toggleDebug = (): void => {
    if (debug.value) history.replaceState(null, '', `${location.pathname}${location.search}`)
    else location.hash = 'debug'
    syncHash()
  }

  watch(debug, async (enabled) => {
    if (!enabled) return unmountPane()
    await nextTick()
    await mountPane()
  })

  onMounted(() => {
    window.addEventListener('hashchange', syncHash)
    void mountPane()
  })

  onUnmounted(() => {
    window.removeEventListener('hashchange', syncHash)
    unmountPane()
  })

  return { debug, paneHost, toggleDebug }
}
