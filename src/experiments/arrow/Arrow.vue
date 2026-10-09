<template>
  <main class="arrow-scene">
    <div ref="container" class="arrow-scene__canvas"/>
    <p v-if="error || loadError" class="arrow-scene__status">{{ error || loadError }}</p>
    <p v-else-if="!loaded" class="arrow-scene__status">Loading model…</p>
  </main>
</template>


<script setup lang="ts">
import {ref} from 'vue'
import {useThreeScene} from '../../composables/useThreeScene'
import {createArrowScene} from './scene'

const loaded = ref(false)
const loadError = ref('')
const {container, error} = useThreeScene((runtime) => createArrowScene(runtime, {
  onLoad: () => {
    loaded.value = true
  },
  onError: (message) => {
    loadError.value = message
  },
}))
defineExpose({container})
</script>


<style scoped>
.arrow-scene {
  position: relative;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: #020609;
}

.arrow-scene__canvas {
  width: 100%;
  height: 100%;
}

.arrow-scene__canvas :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

.arrow-scene__status {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  margin: 0;
  color: #a8b0af;
  font: 12px ui-monospace, monospace;
  letter-spacing: .08em;
  pointer-events: none;
}
</style>
