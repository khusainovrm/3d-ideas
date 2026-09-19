<script setup lang="ts">
import ExperimentStage from '../../components/ExperimentStage.vue'
import { experiments } from '../../config/experiments'
import { createShaderOceanScene } from './scene'
</script>

<template>
  <ExperimentStage :meta="experiments[3]" :factory="createShaderOceanScene">
    <div class="scene-caption"><p>Light has no reflection map here.<br />Only an approximation and a distant horizon.</p></div>
  </ExperimentStage>
</template>
