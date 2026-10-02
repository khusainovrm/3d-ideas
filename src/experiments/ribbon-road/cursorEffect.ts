import { reactive } from 'vue'

/** Live hero cursor controls. Duration is the trail's exponential decay time. */
export const HERO_CURSOR_EFFECT = reactive({
  enabled: false,
  intensity: 0.8,
  duration: 0.6,
  diameter: 32,
})
