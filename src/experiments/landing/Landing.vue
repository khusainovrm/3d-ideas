<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useThreeScene } from '../../composables/useThreeScene'
import { useDebugPane } from '../../composables/useDebugPane'
import { createLandingScene, landingControls } from './scene'
import { boatControls } from './boat'
import { ballControls, ballState, threadControls } from './goldenThread'
import LandingProgram from './LandingProgram.vue'
import LandingRegistration from './LandingRegistration.vue'
import titleArt from './assets/design/title.webp'
import brand from './assets/design/partner-brand.webp'
import column from './assets/design/column.webp'
import bust from './assets/design/bust.webp'
import helmet from './assets/design/helmet.webp'
import rtk from './assets/design/rtk.webp'
import turbo from './assets/design/turbo.webp'
import divider from './assets/design/divider.webp'
import water from './assets/design/water.webp'
import glow from './assets/design/glow.webp'
import boatImage from './assets/boat.generated.webp'
import './landing.css'

let previousTitle = ''
onMounted(() => {
  previousTitle = document.title
  document.title = 'ИТ-одиссея — проектная исповедь · 18 ноября 2026'
})
onUnmounted(() => { document.title = previousTitle })

const menuOpen = ref(false)
const modal = ref<HTMLDialogElement | null>(null)
const modalTitle = ref('')
const modalText = ref('')
async function openPlaceholder(title: string, text = 'Документ готовится к публикации. Ссылка появится здесь перед открытием регистрации.') {
  modalTitle.value = title
  modalText.value = text
  await nextTick()
  modal.value?.showModal()
}
const reviews = [
  { name: 'Анастасия, проектный менеджер', text: 'Креативный подход! Драматический сценарий удерживает внимание и поднимает интерес, позволяет сопереживать участникам. Ростелеком — крутой!', image: bust },
  { name: 'Александр, аналитик', text: 'Это было потрясающе! Так интересно было слушать коллег. Вдохновляет, позволяет иначе на что-то посмотреть. Давно не получала такого удовольствия от мероприятий. Спасибо!', image: helmet },
  { name: 'Станислав, администратор проектов', text: 'Крутая идея, зажигательные рассказы спикеров. Это круче, чем офлайн!', image: helmet },
  { name: 'Александр, аналитик', text: 'Это было потрясающе! Так интересно было слушать коллег. Вдохновляет, позволяет иначе на что-то посмотреть. Давно не получала такого удовольствия от мероприятий. Спасибо!', image: helmet },
]


const particlesReady = ref(false)
const particleError = ref<string | null>(null)
const { container, ready, error, metrics, qualityMode, setQuality } = useThreeScene(createLandingScene(
  () => { particlesReady.value = true },
  (cause) => { particleError.value = cause.message },
  () => { particleError.value = null },
), 'orthographic')
const { paneHost, debug, toggleDebug } = useDebugPane(metrics, {
  title: 'Particle field',
  setup: (pane) => {
    pane.addBinding(qualityMode, 'value', {
      label: 'Quality mode',
      options: { 'Auto': 'auto', 'Low · mobile': 'low', 'Medium': 'medium', 'Original': 'high' },
    }).on('change', (event) => setQuality(event.value))
    pane.addBinding(metrics, 'section', { readonly: true, label: 'Screen' })
    pane.addBinding(metrics, 'scrollProgress', { readonly: true, label: 'Scroll', min: 0, max: 1 })
    pane.addBinding(landingControls, 'radius', { min: 0.2, max: 3, label: 'Radius' })
    pane.addBinding(landingControls, 'force', { min: 0, max: 2, label: 'Force' })
    pane.addBinding(landingControls, 'ripple', { min: 0, max: 1.5, label: 'Ripple' })
    pane.addBinding(landingControls, 'pointSize', { min: 0.5, max: 4, label: 'Point size' })
    pane.addBinding(landingControls, 'brightness', { min: 0.2, max: 2, label: 'Brightness' })
    pane.addBinding(landingControls, 'motion', { min: 0, max: 1, label: 'Idle motion' })
    const boatPane = pane.addFolder({ title: 'Boat', expanded: false })
    boatPane.addBinding(boatControls, 'visible', { label: 'Visible' })
    boatPane.addBinding(boatControls, 'height', { min: 0.08, max: 0.3, label: 'Size' })
    boatPane.addBinding(boatControls, 'response', { min: 0, max: 2, label: 'Storm response' })
    boatPane.addBinding(boatControls, 'x', { min: 0, max: 1, label: 'Position X' })
    boatPane.addBinding(boatControls, 'y', { min: 0, max: 1, label: 'Position Y' })
    const ballPane = pane.addFolder({ title: 'Шар', expanded: true })
    ballPane.addBinding(ballControls, 'visible', { label: 'Видимость' })
    ballPane.addBinding(ballControls, 'size', { min: 0.5, max: 1.5, step: 0.05, label: 'Размер' })
    ballPane.addBinding(ballControls, 'startX', { min: -0.15, max: 0.15, step: 0.005, label: 'Старт: сдвиг X' })
    ballPane.addBinding(ballControls, 'startY', { min: -0.1, max: 0.1, step: 0.005, label: 'Старт: сдвиг Y' })
    for (const axis of ['x', 'y', 'z'] as const) {
      ballPane.addBinding(ballState, axis, { readonly: true, format: value => value.toFixed(3), label: `Позиция ${axis.toUpperCase()}` })
    }
    ballPane.addBinding(ballState, 'progress', { readonly: true, min: 0, max: 1, label: 'Прогресс' })
    const threadPane = pane.addFolder({ title: 'Дорожка', expanded: true })
    threadPane.addBinding(threadControls, 'visible', { label: 'Видимость' })
    threadPane.addBinding(threadControls, 'width', { min: 0.3, max: 3, step: 0.1, label: 'Толщина' })
    threadPane.addBinding(threadControls, 'endX', { min: 0.08, max: 0.6, step: 0.01, label: 'Конец: X' })
    threadPane.addBinding(threadControls, 'shimmer', { min: 0, max: 2, step: 0.1, label: 'Мерцание' })
    threadPane.addBinding(threadControls, 'showFull', { label: 'Весь путь' })
  },
})
defineExpose({ container, paneHost })
</script>

<template>
  <main class="landing" @keydown.esc="menuOpen = false">
    <div id="top" class="landing__journey">
      <div class="landing__scene-track"><div class="landing__viewport"><div ref="container" class="landing__canvas" /></div></div>
      <header class="od-header">
        <a class="od-header__brand" href="#top" aria-label="Ростелеком — к началу страницы"><img :src="brand" alt="Ростелеком. Информационные технологии"></a>
        <button type="button" class="od-header__menu" :aria-expanded="menuOpen" aria-controls="od-navigation" @click="menuOpen = !menuOpen"><img :src="divider" alt="">{{ menuOpen ? 'Закрыть' : 'Меню' }}</button>
        <nav id="od-navigation" class="od-header__nav" :class="{ 'is-open': menuOpen }" aria-label="Основная навигация" @click="menuOpen = false">
          <a href="#about"><img :src="divider" alt="">О конференции</a>
          <a href="#program">Спикеры и программа</a>
          <a href="#reviews">Отзывы</a>
          <a href="#registration" class="od-outline">Регистрация</a>
        </nav>
      </header>
      <section class="od-hero od-section" aria-labelledby="hero-title">
        <div class="landing__sky-layout" aria-hidden="true" />
        <p class="od-hero__eyebrow">Проектная исповедь</p>
        <h1 id="hero-title"><img :src="titleArt" alt="ИТ-одиссея"></h1>
        <div class="od-hero__intro"><p>Онлайн-конференция о реальных<br class="desktop-only"> ИТ-кейсах в мире, где путь к результату не виден заранее</p><a href="#registration" class="od-ribbon">Регистрация</a></div>
        <div class="od-marquee" aria-label="Онлайн. 18 ноября 2026 в 11:00 по московскому времени"><div class="od-marquee__track"><span v-for="n in 4" :key="n" :aria-hidden="n > 1">онлайн <img :src="divider" alt="">18 ноября 2026 в 11:00 по мск<img :src="divider" alt=""></span></div></div>
      </section>
      <section class="od-mountains od-section" aria-labelledby="mountains-title">
        <div class="landing__mountain-layout" aria-hidden="true" />
        <div class="od-mountains__copy"><h2 id="mountains-title">Путь складывается<br><em>по ходу</em></h2><p>В процессе пути постоянно появляются новые вводные. Карта меняется — и каждый раз нужно выбирать ориентир, чтобы двигаться дальше</p></div>
      </section>
      <p v-if="(!ready || !particlesReady) && !error && !particleError" class="landing__status" role="status">Загружается звёздная карта…</p>
      <p v-if="error || particleError" class="landing__status" role="status">Не удалось загрузить анимацию. Вы можете продолжить знакомство с программой.</p>
    </div>

    <section id="about" class="od-about od-section" aria-labelledby="about-title">
      <img :src="column" class="od-about__column od-about__column--left" alt=""><img :src="column" class="od-about__column od-about__column--right" alt="">
      <div class="od-about__copy"><h2 id="about-title">Отправляемся<br><em>в ИТ-одиссею</em></h2><p>Реальные ИТ-истории о моментах, когда привычный курс уже не работал, а нового ещё не было. Разберём, как находили решение — и что открывалось после него</p></div>
      <dl class="od-about__stats"><div><dt>8</dt><dd><em>спикеров</em> с честными историями</dd></div><div><dt>5</dt><dd><em>часов пути</em> — с докладами, дискуссиями и интерактивами</dd></div><div><dt>1</dt><dd><em>интерактивное путешествие</em> вместо скучных лекций</dd></div></dl>
      <svg class="od-about__thread" viewBox="0 0 744 650" fill="none" aria-hidden="true"><path d="M760 0C760 100 600 60 620 90S830 135 710 160S580 200 700 230S560 330 20 490" stroke="#b28b18" /></svg>
    </section>

    <LandingProgram />

    <section id="reviews" class="od-reviews od-section" aria-labelledby="reviews-title">
      <h2 id="reviews-title">Отзывы или заголовок<br>в пару слов</h2>
      <div class="od-reviews__frame">
        <svg class="od-reviews__border" viewBox="0 0 1040 480" preserveAspectRatio="none" fill="none" aria-hidden="true"><path d="M44 1H996Q996 44 1039 44V436Q996 436 996 479H44Q44 436 1 436V44Q44 44 44 1Z" stroke="#a58422" /></svg>
        <figure v-for="(review, index) in reviews" :key="index" :class="['od-review', `od-review--${index}`]"><img :src="review.image" alt=""><figcaption>{{ review.name }}</figcaption><blockquote>{{ review.text }}</blockquote></figure>
      </div>
    </section>

    <LandingRegistration @policy="openPlaceholder('Политика обработки персональных данных')" />

    <section id="game" class="od-game od-section" aria-labelledby="game-title">
      <h2 id="game-title">Пока ждёшь — <em>различи<br>сигналы в шуме</em></h2>
      <div class="od-game__row"><div class="od-game__placeholder">Здесь будет<br>баннер с визуалом<br>игры</div><button class="od-outline" type="button" @click="openPlaceholder('Различи сигналы в шуме', 'Игра готовится к запуску. Здесь появится переход к интерактивному путешествию.')">К игре <span aria-hidden="true">›</span></button></div>
      <div class="od-game__sea" aria-hidden="true"><img :src="water" class="od-game__water" alt=""><img :src="boatImage" class="od-game__boat" alt=""></div>
    </section>

    <section class="od-partners od-section" aria-labelledby="partners-title"><img :src="glow" class="od-partners__glow" alt=""><h2 id="partners-title">Партнёры<br><span class="desktop-tablet-only">конференции</span><span class="mobile-only">мероприятия</span></h2><div class="od-partners__grid"><template v-for="n in 2" :key="n"><img :src="rtk" alt="РТК-ЦОД"><img :src="brand" alt="Ростелеком. Информационные технологии"><img :src="turbo" alt="Турбо облако"></template></div></section>

    <footer class="od-footer od-section"><div><button type="button" @click="openPlaceholder('Политика обработки персональных данных')">Политика обработки персональных данных</button><button type="button" @click="openPlaceholder('Условия обработки персональных данных')">Условия обработки персональных данных</button><button type="button" @click="openPlaceholder('Правила проведения акции')">Правила проведения акции</button></div><p>© Ростелеком 2026</p></footer>

    <button v-if="debug" class="landing__debug-toggle" type="button" @click="toggleDebug">Закрыть настройки</button>
    <div v-if="debug" ref="paneHost" class="landing__debug" />
    <dialog ref="modal" class="od-dialog" @click="($event.target === modal) && modal?.close()"><button type="button" class="od-dialog__close" aria-label="Закрыть" @click="modal?.close()">×</button><h2>{{ modalTitle }}</h2><p>{{ modalText }}</p><button class="od-outline" type="button" @click="modal?.close()">Понятно</button></dialog>
  </main>
</template>
