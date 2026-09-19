<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { ExperimentMeta } from '../config/experiments'
import type { SceneFactory } from '../three/core/types'
import { useThreeScene } from '../composables/useThreeScene'
import { useDebugPane } from '../composables/useDebugPane'

const props = defineProps<{
  meta: ExperimentMeta
  factory: SceneFactory
  scrollLength?: number
}>()

const { container, paused, ready, error, metrics, togglePause, reset } = useThreeScene(props.factory)
const { paneHost, debug, toggleDebug } = useDebugPane(metrics)
defineExpose({ container, paneHost })
const scrollStyle = computed(() => ({ height: `${props.scrollLength ?? 100}vh` }))
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
