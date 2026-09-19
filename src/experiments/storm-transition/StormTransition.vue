<script setup lang="ts">
import ExperimentStage from '../../components/ExperimentStage.vue'
import { experiments } from '../../config/experiments'
import { createStormTransitionScene } from './scene'
</script>

<template>
  <ExperimentStage :meta="experiments[5]" :factory="createStormTransitionScene" :scroll-length="500">
    <div class="scene-caption"><p>Calm is not the absence of danger.<br />Scroll through the weather.</p></div>
  </ExperimentStage>
</template>
