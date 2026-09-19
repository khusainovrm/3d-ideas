<script setup lang="ts">
import ExperimentStage from '../../components/ExperimentStage.vue'
import { experiments } from '../../config/experiments'
import { createOdysseyRouteScene } from './scene'
</script>

<template>
  <ExperimentStage :meta="experiments[2]" :factory="createOdysseyRouteScene" :scroll-length="360">
    <div class="scene-caption"><p>Sea · Fog · Storm · Stars · Light<br />The map is an emotional sequence.</p></div>
  </ExperimentStage>
</template>
