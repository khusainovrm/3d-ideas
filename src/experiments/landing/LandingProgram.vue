<script setup lang="ts">
import { computed, ref } from 'vue'
import wheel from './assets/design/wheel.webp'
import helmet from './assets/design/helmet.webp'
import arches from './assets/design/arches.webp'
import portrait from './assets/design/speaker.webp'
import portraitTwo from './assets/design/speaker-68.webp'
import portraitThree from './assets/design/speaker-74.webp'
const selected = ref(1)
const tab = ref<'talk' | 'speaker'>('talk')
const slots = ['10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00']
const time = computed(() => slots[selected.value]!)
const previous = computed(() => (selected.value + slots.length - 1) % slots.length)
const next = computed(() => (selected.value + 1) % slots.length)
const photos = [portraitTwo, portrait, portraitThree]
const gallery = computed(() => [previous.value, selected.value, next.value])
const step = (direction: number) => { selected.value = (selected.value + direction + slots.length) % slots.length; tab.value = 'talk' }
let touchX = 0
const endSwipe = (event: TouchEvent) => {
  const distance = event.changedTouches[0]!.clientX - touchX
  if (Math.abs(distance) > 40) step(distance < 0 ? 1 : -1)
}
</script>

<template>
  <section id="program" class="od-program od-section" aria-labelledby="program-title">
    <h2 id="program-title">Спикеры<br>и программа</h2>
    <div class="od-program__layout" @keydown.left.prevent="step(-1)" @keydown.right.prevent="step(1)">
      <div class="od-program__wheel" aria-label="Выбор выступления">
        <img :src="wheel" alt="" class="od-program__wheel-art">
        <img :src="helmet" alt="" class="od-program__helmet">
        <button class="od-program__time od-program__time--previous" :aria-label="`Выступление в ${slots[previous]}`" @click="step(-1)">{{ slots[previous] }}</button>
        <span class="od-program__time od-program__time--active" aria-live="polite">{{ time }}</span>
        <button class="od-program__time od-program__time--next" :aria-label="`Выступление в ${slots[next]}`" @click="step(1)">{{ slots[next] }}</button>
      </div>
      <div class="od-program__detail">
        <div class="od-program__portrait" @touchstart.passive="touchX = $event.touches[0]!.clientX" @touchend.passive="endSwipe">
          <img :src="arches" class="od-program__arches" alt="">
          <img :src="photos[selected % photos.length]" class="od-program__person" alt="Портрет спикера из макета">
          <div class="od-program__gallery"><button v-for="index in gallery" :key="index" type="button" :class="{ 'is-selected': index === selected }" :aria-label="`Выбрать выступление в ${slots[index]}`" @click="selected = index; tab = 'talk'"><img :src="photos[index % photos.length]" alt=""></button></div>
        </div>
        <div class="od-program__navigation">
          <button type="button" aria-label="Предыдущее выступление" @click="step(-1)">←</button>
          <p>Нажмите на сектор или используйте стрелки,<br class="mobile-only"> чтобы увидеть всех спикеров</p>
          <button type="button" aria-label="Следующее выступление" @click="step(1)">→</button>
        </div>
        <div class="od-program__tabs" role="tablist" aria-label="Информация о выступлении">
          <button id="talk-tab" type="button" role="tab" :aria-selected="tab === 'talk'" aria-controls="program-panel" @click="tab = 'talk'">Тема выступления</button>
          <button id="speaker-tab" type="button" role="tab" :aria-selected="tab === 'speaker'" aria-controls="program-panel" @click="tab = 'speaker'">О спикере</button>
        </div>
        <div id="program-panel" class="od-program__text" role="tabpanel" :aria-labelledby="tab === 'talk' ? 'talk-tab' : 'speaker-tab'" aria-live="polite">
          <template v-if="tab === 'talk'">
            <p class="od-program__slot">{{ time }}–{{ selected < slots.length - 1 ? slots[selected + 1] : '14:30' }}</p>
            <template v-if="selected === 1">
              <h3>Исповедь контроль-фрика: как подчинить тревожность и использовать её в работе</h3>
              <p>Тревога может быть драйвером для управленца — пока не начинает вредить: сжирать здоровье и личное время. На личном примере расскажу, как я искал пути сохранить эффективность без постоянного напряжения и переработок.</p>
              <p class="od-program__desktop-copy">Тревога может быть драйвером для управленца — пока не начинает вредить: сжирать здоровье и личное время. На личном примере расскажу, как я искал пути сохранить эффективность без постоянного напряжения и переработок.</p>
            </template>
            <template v-else><h3>Тема выступления уточняется</h3><p>Подробности этой встречи и имя спикера появятся здесь после публикации полной программы.</p></template>
          </template>
          <template v-else><h3>О спикере</h3><p>Имя, должность и биография спикера будут опубликованы вместе с полной программой конференции.</p></template>
        </div>
      </div>
    </div>
  </section>
</template>
