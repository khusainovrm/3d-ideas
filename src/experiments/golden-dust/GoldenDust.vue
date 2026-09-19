<script setup lang="ts">
import ExperimentStage from '../../components/ExperimentStage.vue'
import { experiments } from '../../config/experiments'
import { createGoldenDustScene } from './scene'
</script>

<template>
  <ExperimentStage :meta="experiments[4]" :factory="createGoldenDustScene" :scroll-length="260">
    <div class="scene-caption"><p>Not treasure. A trace.<br />Move slowly through what remains.</p></div>
  </ExperimentStage>
</template>
