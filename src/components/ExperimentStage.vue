<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import type { Pane } from 'tweakpane'
import type { ExperimentMeta } from '../config/experiments'
import type { SceneFactory } from '../three/core/types'
import { useThreeScene } from '../composables/useThreeScene'

const props = defineProps<{
  meta: ExperimentMeta
  factory: SceneFactory
  scrollLength?: number
}>()

const { container, paused, ready, error, metrics, togglePause, reset } = useThreeScene(props.factory)
defineExpose({ container })
const paneHost = ref<HTMLElement | null>(null)
const debug = ref(window.location.hash === '#debug')
const scrollStyle = computed(() => ({ height: `${props.scrollLength ?? 100}vh` }))
let pane: Pane | undefined
let refreshTimer = 0

const syncHash = (): void => {
  debug.value = window.location.hash === '#debug'
}

const toggleDebug = (): void => {
  if (debug.value) history.replaceState(null, '', `${location.pathname}${location.search}`)
  else location.hash = 'debug'
  syncHash()
}

const mountPane = async (): Promise<void> => {
  if (!debug.value || pane || !paneHost.value) return
  const { Pane: Tweakpane } = await import('tweakpane')
  if (!debug.value || !paneHost.value) return
  pane = new Tweakpane({ title: 'Runtime', container: paneHost.value })
  pane.addBinding(metrics, 'fps', { readonly: true, label: 'FPS' })
  pane.addBinding(metrics, 'dpr', { readonly: true, label: 'DPR' })
  pane.addBinding(metrics, 'quality', { readonly: true, label: 'Quality' })
  pane.addBinding(metrics, 'particles', { readonly: true, label: 'Particles' })
  pane.addBinding(metrics, 'calls', { readonly: true, label: 'Calls' })
  pane.addBinding(metrics, 'triangles', { readonly: true, label: 'Triangles' })
  pane.addBinding(metrics, 'geometries', { readonly: true, label: 'Geometries' })
  pane.addBinding(metrics, 'textures', { readonly: true, label: 'Textures' })
  refreshTimer = window.setInterval(() => pane?.refresh(), 500)
}

const unmountPane = (): void => {
  window.clearInterval(refreshTimer)
  pane?.dispose()
  pane = undefined
}

watch(debug, async (isDebug) => {
  if (isDebug) {
    await nextTick()
    await mountPane()
  } else unmountPane()
})

onMounted(() => {
  window.addEventListener('hashchange', syncHash)
  void mountPane()
})

onUnmounted(() => {
  window.removeEventListener('hashchange', syncHash)
  unmountPane()
})
</script>

<template>
  <main class="experiment" :style="scrollStyle">
    <div ref="container" class="experiment__canvas" />

    <header class="experiment__header">
      <RouterLink to="/" class="quiet-link">← Experiments</RouterLink>
      <div class="experiment__identity">
        <span>{{ meta.index }}</span>
        <strong>{{ meta.title }}</strong>
      </div>
    </header>

    <div class="experiment__controls" aria-label="Experiment controls">
      <button type="button" @click="toggleDebug">Debug</button>
      <button type="button" @click="togglePause">{{ paused ? 'Play' : 'Pause' }}</button>
      <button type="button" @click="reset">Reset</button>
    </div>

    <div v-if="debug" ref="paneHost" class="experiment__debug" />
    <div v-if="!ready && !error" class="experiment__status">Entering the unknown…</div>
    <div v-if="error" class="experiment__status experiment__status--error">{{ error }}</div>
    <slot />
  </main>
</template>
