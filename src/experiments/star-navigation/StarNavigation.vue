<script setup lang="ts">
import ExperimentStage from '../../components/ExperimentStage.vue'
import { experiments } from '../../config/experiments'
import { createStarNavigationScene } from './scene'
</script>

<template>
  <ExperimentStage :meta="experiments[1]" :factory="createStarNavigationScene" :scroll-length="420">
    <div class="scene-caption"><p>Follow what cannot be named.<br />Scroll to cross the night.</p></div>
  </ExperimentStage>
</template>
