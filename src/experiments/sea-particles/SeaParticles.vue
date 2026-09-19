<script setup lang="ts">
import ExperimentStage from '../../components/ExperimentStage.vue'
import { experiments } from '../../config/experiments'
import { createSeaParticlesScene } from './scene'
</script>

<template>
  <ExperimentStage :meta="experiments[0]" :factory="createSeaParticlesScene">
    <div class="scene-caption"><p>A surface remembered as points.<br />No textures. No shore.</p></div>
  </ExperimentStage>
</template>
