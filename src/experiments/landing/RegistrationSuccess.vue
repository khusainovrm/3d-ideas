<script setup lang="ts">
import { ref } from 'vue'
import coinFront from './assets/design/coin-front.webp'
import coinBack from './assets/design/coin-back.webp'

defineProps<{ name: string }>()
const dialog = ref<HTMLDialogElement | null>(null)
const flipped = ref(false)
function show() {
  flipped.value = false
  dialog.value?.showModal()
}
function turn() { flipped.value = !flipped.value }
defineExpose({ show })
</script>

<template>
  <dialog ref="dialog" class="od-success" aria-labelledby="od-success-title">
    <div class="od-success__shell">
      <section class="od-success__panel">
        <button type="button" class="od-success__close" aria-label="Закрыть" @click="dialog?.close()">×</button>
        <h2 id="od-success-title">Регистрация<br>прошла <span>успешно</span></h2>
        <p>Спасибо за регистрацию! Вся важная информация придёт вам на почту: напоминания, обновления и ссылка на конференцию.</p>
        <p>Пока ждёте старта конференции, проверьте свою удачу.</p>
        <button v-if="!flipped" type="button" class="od-success__turn" @click="turn">Повернуть монету <span aria-hidden="true">⟳</span></button>
        <button type="button" class="od-success__coin" :class="{ 'is-flipped': flipped }" :aria-label="flipped ? 'Повернуть монету лицевой стороной' : 'Повернуть монету обратной стороной'" @click="turn">
          <span class="od-success__coin-face od-success__coin-front"><img :src="coinFront" alt=""></span>
          <span class="od-success__coin-face od-success__coin-back" :style="{ backgroundImage: `url(${coinBack})` }"><strong>{{ name }}</strong><span>Твой путь только начинается. Даже когда карта меняется, ты найдёшь свой ориентир.</span></span>
        </button>
        <p class="od-success__demo">Демонстрационный экран: данные пока не отправляются, письма не приходят.</p>
      </section>
    </div>
  </dialog>
</template>

<style scoped>
.od-success { position: fixed; inset: 0; width: min(1440px, 100vw); height: 100dvh; max-width: none; max-height: none; margin: auto; padding: 0; border: 0; background: transparent; color: #e7e5e3; font-family: 'Helvetica Neue', Arial, sans-serif; }
.od-success::backdrop { background: rgba(0, 0, 0, .16); }
.od-success__shell { display: flex; justify-content: flex-end; width: 100%; height: 100%; background: linear-gradient(90deg, transparent 48%, #0a0706 52%); }
.od-success__panel { position: relative; width: 50%; height: 100%; min-height: 680px; padding: 92px 68px 42px; overflow: hidden; background: radial-gradient(ellipse at 76% 3%, #282527 0%, transparent 38%), radial-gradient(ellipse at 74% 91%, #262327 0%, transparent 34%), #080706; }
.od-success__close { position: absolute; top: 99px; right: 70px; padding: 0; border: 0; background: transparent; color: #d9d9d9; font: 300 36px/1 Arial, sans-serif; cursor: pointer; }
.od-success h2 { margin: 0 0 27px; max-width: 520px; font-size: clamp(28px, 2.5vw, 36px); line-height: 1.25; font-weight: 400; text-transform: uppercase; letter-spacing: .015em; }
.od-success h2 span { color: #d09d28; }
.od-success__panel > p:not(.od-success__demo) { max-width: 445px; margin: 0 0 24px; font-size: clamp(16px, 1.6vw, 23px); line-height: 1.44; color: #d0cdca; }
.od-success__panel > p:nth-of-type(2) { display: none; }
.od-success__turn { position: absolute; bottom: 108px; left: 68px; padding: 0; border: 0; background: transparent; color: #c69726; font-size: 24px; cursor: pointer; }
.od-success__turn span { margin-left: 26px; font-size: 43px; vertical-align: middle; }
.od-success__coin { position: absolute; top: 47%; right: 32%; width: 190px; aspect-ratio: 1; padding: 0; border: 0; border-radius: 50%; background: none; cursor: pointer; transform-style: preserve-3d; transition: transform .8s cubic-bezier(.2,.7,.2,1); }
.od-success__coin.is-flipped { transform: rotateY(180deg); }
.od-success__coin-face { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; border-radius: 50%; backface-visibility: hidden; }
.od-success__coin-front img { display: block; width: 100%; height: 100%; object-fit: cover; }
.od-success__coin-back { padding: 12%; background-position: center; background-size: cover; color: #211103; text-align: center; text-transform: uppercase; transform: rotateY(180deg); }
.od-success__coin-back strong { max-width: 100%; margin-bottom: 7px; overflow-wrap: anywhere; font-size: clamp(11px, 1vw, 15px); line-height: 1.1; }
.od-success__coin-back > span { font-size: clamp(9px, .8vw, 12px); line-height: 1.1; font-weight: 700; }
.od-success__demo { position: absolute; bottom: 20px; left: 68px; right: 68px; margin: 0; color: #a19b91; font-size: 11px; line-height: 1.3; }
@media (max-width: 900px) {
  .od-success__shell { background: #080706; }
  .od-success__panel { width: 100%; min-height: 0; padding: 88px 32px 24px; background: radial-gradient(ellipse at 45% 50%, #17110c 0%, transparent 52%), #080706; }
  .od-success__close { top: 26px; right: 45px; font-size: 29px; }
  .od-success h2 { max-width: 320px; margin-bottom: 27px; font-size: 28px; line-height: 1.15; }
  .od-success h2 span { display: block; }
  .od-success__panel > p:not(.od-success__demo) { max-width: 326px; margin-bottom: 30px; font-size: 15px; line-height: 1.85; }
  .od-success__panel > p:nth-of-type(2) { display: block; max-width: 285px; }
  .od-success__turn { left: 32px; bottom: 174px; min-width: 184px; min-height: 42px; padding: 8px 14px; border: 1px solid #d3d0cc; border-radius: 3px; color: #e7e5e3; font-size: 15px; font-weight: 600; }
  .od-success__turn span { display: none; }
  .od-success__coin { top: auto; bottom: 34px; right: 42px; width: 126px; }
  .od-success__coin-back strong { font-size: 10px; }
  .od-success__coin-back > span { font-size: 8px; }
  .od-success__demo { bottom: 14px; left: 32px; right: 185px; font-size: 9px; }
}
@media (max-height: 600px) and (max-width: 900px) {
  .od-success__panel { padding-top: 45px; }
  .od-success__close { top: 12px; }
  .od-success__panel > p:not(.od-success__demo) { margin-bottom: 15px; line-height: 1.55; }
  .od-success__turn { bottom: 150px; }
  .od-success__coin { bottom: 20px; width: 115px; }
}
@media (prefers-reduced-motion: reduce) { .od-success__coin { transition: none; } }
</style>
