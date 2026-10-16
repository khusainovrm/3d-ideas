<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useThreeScene } from '../../composables/useThreeScene'
import { useDebugPane } from '../../composables/useDebugPane'
import { createLandingScene, landingControls } from './scene'

const particlesReady = ref(false)
const particleError = ref<string | null>(null)
const { container, ready, error, metrics, qualityMode, setQuality } = useThreeScene(createLandingScene(
  () => { particlesReady.value = true },
  (cause) => { particleError.value = cause.message },
  () => { particlesReady.value = false; particleError.value = null },
))
const { paneHost, debug, toggleDebug } = useDebugPane(metrics, {
  title: 'Particle field',
  setup: (pane) => {
    pane.addBinding(qualityMode, 'value', {
      label: 'Quality mode',
      options: { 'Auto': 'auto', 'Low · mobile': 'low', 'Medium': 'medium', 'Original': 'high' },
    }).on('change', (event) => setQuality(event.value))
    pane.addBinding(metrics, 'section', { readonly: true, label: 'Screen' })
    pane.addBinding(metrics, 'scrollProgress', { readonly: true, label: 'Scroll', min: 0, max: 1 })
    pane.addBinding(landingControls, 'radius', { min: 0.2, max: 3, label: 'Radius' })
    pane.addBinding(landingControls, 'force', { min: 0, max: 2, label: 'Force' })
    pane.addBinding(landingControls, 'ripple', { min: 0, max: 1.5, label: 'Ripple' })
    pane.addBinding(landingControls, 'pointSize', { min: 0.5, max: 4, label: 'Point size' })
    pane.addBinding(landingControls, 'brightness', { min: 0.2, max: 2, label: 'Brightness' })
    pane.addBinding(landingControls, 'motion', { min: 0, max: 1, label: 'Idle motion' })
  },
})
defineExpose({ container, paneHost })
</script>

<template>
  <main class="landing">
    <div class="landing__viewport">
    <div ref="container" class="landing__canvas" />
    <header class="landing__header">
      <RouterLink to="/">← Experiments</RouterLink>
      <span>{{ metrics.scrollProgress < 0.5 ? '01 / Dots' : '02 / Mountains' }}</span>
    </header>
    <div class="landing__hint">{{ metrics.scrollProgress < 0.5 ? 'Scroll down to the mountains ↓' : 'Scroll up to return to dots ↑' }}</div>
    <button class="landing__debug-toggle" type="button" @click="toggleDebug">{{ debug ? 'Close controls' : 'Debug controls' }}</button>
    <div v-if="debug" ref="paneHost" class="landing__debug" />
    <div v-if="(!ready || !particlesReady) && !error && !particleError" class="landing__status">Loading particles…</div>
    <div v-if="error || particleError" class="landing__status landing__status--error">{{ error || particleError }}</div>
    </div>
  </main>
</template>

<style scoped>
.landing { position: relative; width: 100%; height: 200svh; background: #000; color: #e6edf0; }
.landing__viewport { position: sticky; top: 0; width: 100%; height: 100svh; overflow: hidden; }
.landing__canvas { position: absolute; inset: 0; }
.landing__canvas :deep(canvas) { display: block; width: 100%; height: 100%; }
.landing__header { position: absolute; z-index: 2; top: 0; left: 0; right: 0; display: flex; justify-content: space-between; gap: 1rem; padding: 24px clamp(20px, 3vw, 48px); pointer-events: none; font: 10px ui-monospace, Menlo, monospace; letter-spacing: .16em; text-transform: uppercase; color: rgba(230,237,240,.56); }
.landing__header a { color: inherit; text-decoration: none; pointer-events: auto; }
.landing__header a:hover { color: white; }
.landing__hint { position: absolute; z-index: 2; left: clamp(20px, 3vw, 48px); bottom: 28px; pointer-events: none; font: 10px ui-monospace, Menlo, monospace; text-transform: uppercase; letter-spacing: .14em; color: rgba(230,237,240,.55); }
.landing__debug-toggle { position: absolute; z-index: 3; right: clamp(20px, 3vw, 48px); bottom: 20px; border: 1px solid rgba(255,255,255,.3); border-radius: 999px; background: rgba(0,0,0,.6); color: #e6edf0; padding: 9px 14px; cursor: pointer; font: 10px ui-monospace, Menlo, monospace; text-transform: uppercase; letter-spacing: .1em; }
.landing__debug-toggle:hover { border-color: white; }
.landing__debug { position: absolute; z-index: 4; right: 20px; top: 64px; width: 260px; }
.landing__status { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none; font: 12px ui-monospace, Menlo, monospace; letter-spacing: .12em; color: #aaa; }
.landing__status--error { color: #da8e7f; }
@media (max-width: 600px) { .landing__header span { display: none; } .landing__hint { max-width: 12rem; line-height: 1.6; } }
</style>
