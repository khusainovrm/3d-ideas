<script setup lang="ts">
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { onMounted, onUnmounted, ref } from 'vue'
import { useThreeScene } from '../../composables/useThreeScene'
import { useDebugPane } from '../../composables/useDebugPane'
import { createCosmicReflowScene } from './scene'

gsap.registerPlugin(ScrollTrigger)

const speakers = [
  { name: 'Майя Чен', role: 'VP Product · Arc Systems', talk: 'Технологии, которые адаптируются вместе с нами' },
  { name: 'Рави Менон', role: 'Design Partner · Field Office', talk: 'Навигация в условиях неопределённости' },
  { name: 'Амара Окойе', role: 'AI Research · North Lab', talk: 'Интеллект как общественная инфраструктура' },
  { name: 'Даниэль Ким', role: 'Creative Tech · Otherlight', talk: 'Интерфейсы после экрана' },
] as const

const testimonials = [
  { quote: 'Сильная программа и очень высокая концентрация полезных идей.', name: 'Анна Смирнова', role: 'Product Director, Forma · 2025' },
  { quote: 'Разговоры о будущем были конкретными, честными и применимыми.', name: 'Михаил Орлов', role: 'CEO, Detail · 2025' },
  { quote: 'После конференции остаются не только заметки, но и новое направление движения.', name: 'Софья Ли', role: 'Strategy Lead, Parallel · 2024' },
] as const

const planets = [
  { name: 'Сигнал 2046', message: 'Вы нашли сигнал из 2046 года.' },
  { name: 'Орбита идей', message: 'Здесь идеи выходят на орбиту.' },
  { name: 'Точка притяжения', message: 'Точка притяжения новых смыслов.' },
  { name: 'Тихий спутник', message: 'Иногда лучший маршрут начинается с паузы.' },
] as const

const page = ref<HTMLElement | null>(null)
const submitted = ref(false)
const activePlanet = ref<number | null>(null)
const { container, ready, error, metrics } = useThreeScene(createCosmicReflowScene)
const { debug, paneHost } = useDebugPane(metrics, {
  title: 'Cosmic reflow',
  bindings: [
    { key: 'fps', label: 'FPS' }, { key: 'dpr', label: 'DPR' }, { key: 'quality', label: 'Quality' },
    { key: 'particles', label: 'Particles' }, { key: 'calls', label: 'Draw calls' },
    { key: 'section', label: 'Cosmic state' }, { key: 'transitionProgress', label: 'Transition' },
    { key: 'scrollProgress', label: 'Scroll' },
  ],
})
defineExpose({ container, paneHost })

let animationContext: gsap.Context | undefined
const mobileSpeakerTriggers: ScrollTrigger[] = []

const dispatchSpeaker = (index: number): void => {
  container.value?.dispatchEvent(new CustomEvent<number>('cosmicspeakerfocus', { detail: index }))
}

const focusSpeaker = (index: number): void => {
  if (window.matchMedia('(hover: hover)').matches) dispatchSpeaker(index)
}

const focusField = (index: number): void => {
  container.value?.dispatchEvent(new CustomEvent<number>('cosmicformfocus', { detail: index }))
}

const submitRegistration = (): void => {
  submitted.value = true
  focusField(-1)
  container.value?.dispatchEvent(new CustomEvent('cosmiccomplete'))
}

const onPlanetSelect = (event: Event): void => {
  const planetId = (event as CustomEvent<number>).detail
  activePlanet.value = planetId >= 0 ? planetId : null
}

const closePlanet = (): void => {
  activePlanet.value = null
  container.value?.dispatchEvent(new CustomEvent('cosmicplanetclose'))
}

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key !== 'Escape' || activePlanet.value === null) return
  closePlanet()
}

onMounted(() => {
  document.documentElement.classList.add('cosmic-page-active')
  document.addEventListener('keydown', onKeydown)
  container.value?.addEventListener('cosmicplanetselect', onPlanetSelect)
  if (!page.value) return
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  animationContext = gsap.context(() => {
    if (!reducedMotion) {
      page.value?.querySelectorAll<HTMLElement>('.cosmic-reveal').forEach((element) => {
        gsap.fromTo(element, { autoAlpha: 0, y: 24 }, {
          autoAlpha: 1,
          y: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: { trigger: element, start: 'top 87%', once: true },
        })
      })
    }
  }, page.value)

  if (window.matchMedia('(pointer: coarse)').matches) {
    page.value.querySelectorAll<HTMLElement>('.cosmic-speaker').forEach((card, index) => {
      mobileSpeakerTriggers.push(ScrollTrigger.create({
        trigger: card,
        start: 'center 58%',
        end: 'center 42%',
        onEnter: () => dispatchSpeaker(index),
        onEnterBack: () => dispatchSpeaker(index),
      }))
    })
  }
})

onUnmounted(() => {
  document.documentElement.classList.remove('cosmic-page-active')
  document.removeEventListener('keydown', onKeydown)
  container.value?.removeEventListener('cosmicplanetselect', onPlanetSelect)
  mobileSpeakerTriggers.forEach((trigger) => trigger.kill())
  animationContext?.revert()
})
</script>

<template>
  <main ref="page" class="cosmic">
    <div ref="container" class="cosmic__canvas" />
    <div class="cosmic__aurora" aria-hidden="true" />
    <div class="cosmic__grain" aria-hidden="true" />

    <nav class="cosmic-nav" aria-label="Навигация">
      <RouterLink to="/">← Visual lab</RouterLink>
      <a href="#cosmic-top" class="cosmic-nav__mark">O / ∞</a>
      <a href="#cosmic-registration" class="cosmic-nav__cta">Регистрация</a>
    </nav>

    <div v-if="debug" ref="paneHost" class="cosmic-debug" />
    <div v-if="!ready && !error" class="cosmic-loading">Собираем туманность…</div>
    <div v-if="error" class="cosmic-loading cosmic-loading--error">{{ error }}</div>

    <div
      v-if="activePlanet !== null"
      data-cosmic-tooltip
      class="cosmic-tooltip"
      role="status"
      aria-live="polite"
      @click.stop
    >
      <small>Обнаружен сигнал · 0{{ activePlanet + 1 }}</small>
      <p>{{ planets[activePlanet]?.message }}</p>
    </div>
    <ul class="cosmic-sr-only" aria-label="Скрытые сигналы галактики">
      <li v-for="planet in planets" :key="planet.name">{{ planet.name }}: {{ planet.message }}</li>
    </ul>

    <section id="cosmic-top" class="cosmic-section cosmic-hero">
      <div class="cosmic-hero__copy">
        <p class="cosmic-eyebrow">Онлайн-конференция · 2026</p>
        <h1>ODYSSEY</h1>
        <p class="cosmic-hero__subtitle">Из туманности идей —<br />к новой системе координат.</p>
        <div class="cosmic-hero__date"><strong>20 ноября</strong><span>10:00–18:00 МСК · Online</span></div>
        <div class="cosmic-actions">
          <a href="#cosmic-registration" class="cosmic-button cosmic-button--primary">Зарегистрироваться <span>↗</span></a>
          <a href="#cosmic-about" class="cosmic-button">О конференции</a>
        </div>
      </div>
      <p class="cosmic-hero__note">Matter follows the journey <span>↓</span></p>
    </section>

    <section id="cosmic-about" class="cosmic-section cosmic-about">
      <div class="cosmic-panel cosmic-reveal">
        <p class="cosmic-index">01 / Рождение направления</p>
        <h2>О конференции</h2>
        <p class="cosmic-lead">Однодневная онлайн-конференция о технологиях, дизайне и решениях, которые определят следующую главу. Практики из разных индустрий делятся не прогнозами, а методами работы с неизвестностью.</p>
        <dl class="cosmic-stats">
          <div><dt>20+</dt><dd>спикеров</dd></div>
          <div><dt>8 часов</dt><dd>контента</dd></div>
          <div><dt>1 день</dt><dd>онлайн</dd></div>
        </dl>
      </div>
    </section>

    <section id="cosmic-speakers" class="cosmic-section cosmic-speakers">
      <header class="cosmic-heading cosmic-reveal">
        <p class="cosmic-index">02 / Линия маршрута</p>
        <h2>Спикеры</h2>
        <p>Четыре направления из двадцати. Каждый разговор меняет траекторию общего пути.</p>
      </header>
      <div class="cosmic-speakers__list">
        <article
          v-for="(speaker, index) in speakers"
          :key="speaker.name"
          class="cosmic-speaker cosmic-reveal"
          tabindex="0"
          @mouseenter="focusSpeaker(index)"
          @mouseleave="focusSpeaker(-1)"
          @focusin="dispatchSpeaker(index)"
          @focusout="dispatchSpeaker(-1)"
        >
          <div :class="['cosmic-speaker__photo', `cosmic-speaker__photo--${index + 1}`]" role="img" :aria-label="speaker.name" />
          <div class="cosmic-speaker__copy">
            <span>0{{ index + 1 }}</span>
            <h3>{{ speaker.name }}</h3>
            <p>{{ speaker.role }}</p>
            <strong>{{ speaker.talk }}</strong>
          </div>
        </article>
      </div>
    </section>

    <section id="cosmic-testimonials" class="cosmic-section cosmic-testimonials">
      <header class="cosmic-heading cosmic-heading--narrow cosmic-reveal">
        <p class="cosmic-index">03 / Галактика голосов</p>
        <h2>Отзывы участников</h2>
        <p>Исследуйте светящиеся планеты — у каждой спрятан свой сигнал.</p>
      </header>
      <div class="cosmic-quotes">
        <figure v-for="(testimonial, index) in testimonials" :key="testimonial.name" class="cosmic-quote cosmic-reveal">
          <span>Signal 0{{ index + 1 }}</span>
          <blockquote>«{{ testimonial.quote }}»</blockquote>
          <figcaption><strong>{{ testimonial.name }}</strong><small>{{ testimonial.role }}</small></figcaption>
        </figure>
      </div>
    </section>

    <section id="cosmic-registration" class="cosmic-section cosmic-registration">
      <div class="cosmic-registration__intro cosmic-reveal">
        <p class="cosmic-index">04 / Выбрать курс</p>
        <h2>Присоединяйтесь<br />к конференции</h2>
        <p>20 ноября 2026 · Online<br />Участие бесплатно</p>
      </div>

      <form v-if="!submitted" class="cosmic-form cosmic-reveal" @submit.prevent="submitRegistration">
        <p>Регистрация займёт меньше минуты.</p>
        <label>Имя<input name="name" autocomplete="name" required placeholder="Как к вам обращаться" @focus="focusField(0)" @blur="focusField(-1)" /></label>
        <label>Email<input name="email" type="email" autocomplete="email" required placeholder="name@company.com" @focus="focusField(1)" @blur="focusField(-1)" /></label>
        <div class="cosmic-form__row">
          <label>Компания<input name="company" autocomplete="organization" placeholder="Название" @focus="focusField(2)" @blur="focusField(-1)" /></label>
          <label>Должность<input name="role" autocomplete="organization-title" placeholder="Ваша роль" @focus="focusField(3)" @blur="focusField(-1)" /></label>
        </div>
        <label class="cosmic-consent"><input type="checkbox" required /><span>Согласен с обработкой персональных данных.</span></label>
        <button class="cosmic-button cosmic-button--primary" type="submit">Зарегистрироваться <span>↗</span></button>
      </form>

      <div v-else class="cosmic-success" role="status" aria-live="polite">
        <span>Курс подтверждён</span>
        <h3>До встречи<br />20 ноября.</h3>
        <p>Подтверждение отправлено на вашу почту.</p>
      </div>
    </section>

    <section id="cosmic-partners" class="cosmic-section cosmic-partners">
      <div class="cosmic-partners__content cosmic-reveal">
        <p class="cosmic-index">05 / Точка назначения</p>
        <h2>Генеральный<br />технологический партнёр</h2>
        <p class="cosmic-partners__hint">Частицы завершают маршрут, собираясь в знак партнёра.</p>
        <span class="cosmic-sr-only">Ростелеком</span>
      </div>
      <footer class="cosmic-footer">
        <div><strong>ODYSSEY</strong><span>Conference / 2026</span></div>
        <a href="#cosmic-registration">Зарегистрироваться ↑</a>
        <div><a href="#cosmic-top">Наверх</a><span>© 2026</span></div>
      </footer>
    </section>
  </main>
</template>

<style scoped>
.cosmic {
  --bg: #030309;
  --text: #f4f2f7;
  --muted: rgba(230, 228, 240, .58);
  --line: rgba(220, 225, 255, .16);
  --violet: #9c7be8;
  --cyan: #72dbe8;
  position: relative;
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  overflow-x: clip;
  isolation: isolate;
  color: var(--text);
  background: var(--bg);
  font-family: 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
}
:global(html.cosmic-page-active), :global(html.cosmic-page-active body) { max-width: 100%; overflow-x: hidden; overflow-x: clip; overscroll-behavior-x: none; }
.cosmic__canvas { position: fixed; z-index: -3; inset: 0; width: 100%; height: 100svh; }
.cosmic__canvas :deep(canvas) { display: block; width: 100%; height: 100%; }
.cosmic__aurora { position: fixed; z-index: -2; inset: 0; pointer-events: none; background: radial-gradient(circle at 70% 44%, rgba(70, 42, 117, .11), transparent 36rem), radial-gradient(circle at 25% 70%, rgba(21, 85, 104, .07), transparent 30rem); }
.cosmic__grain { position: fixed; z-index: -1; inset: 0; pointer-events: none; opacity: .08; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.82' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.22'/%3E%3C/svg%3E"); }
.cosmic-nav { position: fixed; z-index: 20; inset: 0 0 auto; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 20px clamp(20px, 4vw, 64px); background: linear-gradient(#030309ed, transparent); font: 9px ui-monospace, monospace; letter-spacing: .14em; text-transform: uppercase; }
.cosmic-nav a { color: inherit; text-decoration: none; }
.cosmic-nav__mark { font-weight: 700; }
.cosmic-nav__cta { justify-self: end; color: var(--cyan) !important; border-bottom: 1px solid currentColor; padding-bottom: 5px; }
.cosmic-debug { position: fixed; z-index: 30; top: 58px; right: 14px; width: 270px; }
.cosmic-loading { position: fixed; z-index: 40; inset: 0; display: grid; place-items: center; background: var(--bg); font: 9px ui-monospace, monospace; letter-spacing: .14em; text-transform: uppercase; }
.cosmic-loading--error { color: #e48d86; }
.cosmic-section { position: relative; z-index: 1; min-height: 115svh; padding: clamp(90px, 10vw, 160px) clamp(22px, 6vw, 96px); }
.cosmic-eyebrow, .cosmic-index { margin: 0 0 28px; color: var(--cyan); font: 9px/1.4 ui-monospace, monospace; letter-spacing: .15em; text-transform: uppercase; }
.cosmic-hero { min-height: 100svh; display: flex; align-items: center; }
.cosmic-hero__copy { width: min(920px, 100%); }
.cosmic-hero h1 { margin: 0; font-size: clamp(82px, 15vw, 220px); line-height: .75; letter-spacing: -.075em; font-weight: 500; }
.cosmic-hero__subtitle { margin: 42px 0; color: var(--muted); font-size: clamp(18px, 2vw, 27px); line-height: 1.25; font-weight: 300; }
.cosmic-hero__date { display: flex; gap: 28px; align-items: baseline; margin-bottom: 30px; }
.cosmic-hero__date strong { font-size: 20px; font-weight: 400; }
.cosmic-hero__date span { color: var(--muted); font-size: 12px; }
.cosmic-actions { display: flex; gap: 9px; flex-wrap: wrap; }
.cosmic-button { min-height: 48px; display: inline-flex; align-items: center; justify-content: space-between; gap: 38px; padding: 0 20px; color: var(--text); background: rgba(3,3,9,.58); border: 1px solid var(--line); text-decoration: none; font: 9px ui-monospace, monospace; letter-spacing: .1em; text-transform: uppercase; cursor: pointer; transition: color .2s, background .2s, border-color .2s; }
.cosmic-button:hover { border-color: rgba(255,255,255,.45); }
.cosmic-button--primary { color: #101016; background: var(--text); border-color: var(--text); }
.cosmic-button--primary:hover { background: white; }
.cosmic-hero__note { position: absolute; right: clamp(22px, 6vw, 96px); bottom: 28px; margin: 0; color: var(--muted); font: 8px ui-monospace, monospace; letter-spacing: .13em; text-transform: uppercase; }
.cosmic-hero__note span { margin-left: 14px; color: var(--cyan); }

.cosmic-about { display: flex; align-items: center; }
.cosmic-panel { width: min(610px, 48vw); padding: clamp(28px, 4vw, 56px); border: 1px solid var(--line); background: rgba(3,3,9,.77); backdrop-filter: blur(12px); }
.cosmic-panel h2, .cosmic-heading h2, .cosmic-registration h2, .cosmic-partners h2 { margin: 0; font-size: clamp(48px, 7vw, 104px); line-height: .88; letter-spacing: -.065em; font-weight: 300; }
.cosmic-lead { margin: 34px 0 52px; color: var(--muted); line-height: 1.75; font-size: 15px; }
.cosmic-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 0; padding-top: 22px; border-top: 1px solid var(--line); }
.cosmic-stats div { display: flex; flex-direction: column; gap: 7px; }
.cosmic-stats dt { font-size: clamp(24px, 3vw, 43px); letter-spacing: -.04em; }
.cosmic-stats dd { margin: 0; color: var(--muted); font: 8px ui-monospace, monospace; letter-spacing: .09em; text-transform: uppercase; }

.cosmic-speakers { min-height: 185svh; }
.cosmic-heading { display: grid; grid-template-columns: 1fr minmax(240px, 380px); align-items: end; gap: 50px; margin-bottom: clamp(60px, 10vw, 140px); }
.cosmic-heading .cosmic-index { grid-column: 1 / -1; margin-bottom: 0; }
.cosmic-heading > p:last-child { margin: 0; color: var(--muted); line-height: 1.6; }
.cosmic-speakers__list { width: min(760px, 62vw); margin-left: auto; border-top: 1px solid var(--line); }
.cosmic-speaker { display: grid; grid-template-columns: 190px 1fr; min-height: 220px; border-bottom: 1px solid var(--line); outline: none; background: rgba(3,3,9,.72); transition: background .3s, border-color .3s; }
.cosmic-speaker:hover, .cosmic-speaker:focus-visible { background: rgba(18,15,31,.9); border-color: rgba(114,219,232,.5); }
.cosmic-speaker__photo { background-image: url('../../assets/speakers-contact-sheet.webp'); background-size: 300% 200%; filter: grayscale(.55) contrast(1.08) hue-rotate(14deg); }
.cosmic-speaker__photo--1 { background-position: 0 0; }
.cosmic-speaker__photo--2 { background-position: 0 100%; }
.cosmic-speaker__photo--3 { background-position: 100% 0; }
.cosmic-speaker__photo--4 { background-position: 100% 100%; }
.cosmic-speaker__copy { position: relative; padding: 28px 32px; }
.cosmic-speaker__copy > span { position: absolute; top: 31px; right: 30px; color: var(--cyan); font: 8px ui-monospace, monospace; }
.cosmic-speaker h3 { margin: 0 0 7px; font-size: 26px; font-weight: 400; }
.cosmic-speaker p { margin: 0; color: var(--muted); font-size: 12px; }
.cosmic-speaker strong { display: block; margin-top: 53px; max-width: 360px; font-size: 15px; line-height: 1.45; font-weight: 400; }

.cosmic-testimonials { min-height: 190svh; }
.cosmic-heading--narrow { width: min(700px, 100%); display: block; }
.cosmic-heading--narrow h2 { line-height: .96; }
.cosmic-heading--narrow > p:last-child { margin-top: 24px; max-width: 340px; }
.cosmic-quotes { width: min(650px, 45vw); }
.cosmic-quote { min-height: 55svh; display: flex; flex-direction: column; justify-content: center; margin: 0; padding: 50px 0; border-top: 1px solid var(--line); }
.cosmic-quote > span { color: var(--cyan); font: 8px ui-monospace, monospace; letter-spacing: .13em; text-transform: uppercase; }
.cosmic-quote blockquote { margin: 35px 0 45px; font-size: clamp(29px, 3.5vw, 54px); line-height: 1.14; letter-spacing: -.045em; font-weight: 300; }
.cosmic-quote figcaption { display: flex; flex-direction: column; gap: 5px; }
.cosmic-quote figcaption strong { font-size: 12px; font-weight: 500; }
.cosmic-quote figcaption small { color: var(--muted); font: 9px ui-monospace, monospace; }

.cosmic-tooltip { position: fixed; z-index: 12; left: 12px; top: 12px; visibility: hidden; width: min(260px, calc(100vw - 40px)); padding: 16px 18px; color: var(--text); background: rgba(8,7,18,.94); border: 1px solid rgba(150,220,245,.34); backdrop-filter: blur(14px); box-shadow: 0 16px 50px rgba(0,0,0,.45); pointer-events: auto; }
.cosmic-tooltip small { color: var(--cyan); font: 7px ui-monospace, monospace; letter-spacing: .12em; text-transform: uppercase; }
.cosmic-tooltip p { margin: 9px 0 0; font-size: 14px; line-height: 1.45; }

.cosmic-registration { min-height: 155svh; display: grid; grid-template-columns: .9fr 1.1fr; align-items: center; gap: clamp(50px, 10vw, 150px); }
.cosmic-registration__intro > p:last-child { margin-top: 35px; color: var(--muted); line-height: 1.7; }
.cosmic-form, .cosmic-success { padding: clamp(28px, 4vw, 52px); color: #15151a; background: rgba(245,243,248,.96); }
.cosmic-form > p { margin: 0 0 35px; color: #656270; font-size: 13px; }
.cosmic-form label { display: flex; flex-direction: column; gap: 8px; margin-bottom: 25px; color: #676471; font: 8px ui-monospace, monospace; letter-spacing: .11em; text-transform: uppercase; }
.cosmic-form input:not([type='checkbox']) { padding: 10px 0; color: #15151a; background: transparent; border: 0; border-bottom: 1px solid #aca9b4; border-radius: 0; outline: none; font: 16px 'Helvetica Neue', sans-serif; text-transform: none; }
.cosmic-form input:focus { border-color: #563e86; }
.cosmic-form__row { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; }
.cosmic-consent { flex-direction: row !important; align-items: flex-start; gap: 10px !important; text-transform: none !important; letter-spacing: 0 !important; line-height: 1.5; }
.cosmic-consent input { accent-color: #64439e; }
.cosmic-form .cosmic-button { width: 100%; color: white; background: #17131f; border-color: #17131f; }
.cosmic-success > span { color: #70549f; font: 8px ui-monospace, monospace; letter-spacing: .12em; text-transform: uppercase; }
.cosmic-success h3 { margin: 28px 0; font-size: clamp(40px, 5vw, 68px); line-height: .95; letter-spacing: -.05em; font-weight: 300; }
.cosmic-success p { color: #64616c; }

.cosmic-partners { min-height: 125svh; display: flex; flex-direction: column; justify-content: space-between; padding-bottom: 34px; }
.cosmic-partners__content { max-width: 590px; }
.cosmic-partners h2 { font-size: clamp(40px, 5.2vw, 78px); }
.cosmic-partners__hint { max-width: 330px; margin-top: 28px; color: var(--muted); font-size: 13px; line-height: 1.6; }
.cosmic-footer { display: grid; grid-template-columns: 1fr auto 1fr; align-items: end; gap: 25px; padding-top: 28px; border-top: 1px solid var(--line); font: 8px ui-monospace, monospace; letter-spacing: .11em; text-transform: uppercase; }
.cosmic-footer > div { display: flex; gap: 18px; }
.cosmic-footer > div:first-child { flex-direction: column; gap: 6px; }
.cosmic-footer > div:last-child { justify-self: end; }
.cosmic-footer a { color: inherit; text-decoration: none; }
.cosmic-footer > a { color: var(--cyan); }
.cosmic-footer span { color: var(--muted); }
.cosmic-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

@media (max-width: 820px) {
  .cosmic-nav { grid-template-columns: 1fr auto; }
  .cosmic-nav__mark { display: none; }
  .cosmic-panel { width: min(620px, 76vw); }
  .cosmic-speakers__list { width: min(700px, 78vw); }
  .cosmic-quotes { width: min(600px, 64vw); }
  .cosmic-registration { grid-template-columns: 1fr; }
}

@media (max-width: 620px) {
  .cosmic-nav { padding: 17px 18px; }
  .cosmic-nav__cta { padding: 8px 10px; border: 1px solid var(--line); }
  .cosmic-section { min-height: 125svh; padding: 90px 18px; }
  .cosmic-hero { min-height: 100svh; align-items: flex-start; padding-top: 150px; }
  .cosmic-hero h1 { font-size: clamp(62px, 20vw, 90px); }
  .cosmic-hero__subtitle { margin-top: 28px; }
  .cosmic-hero__date { flex-direction: column; gap: 4px; margin-top: 44px; }
  .cosmic-actions, .cosmic-button { width: 100%; }
  .cosmic-hero__note { display: none; }
  .cosmic-about { align-items: flex-start; padding-top: 115px; }
  .cosmic-panel { width: 100%; padding: 25px 20px; backdrop-filter: none; }
  .cosmic-panel h2, .cosmic-heading h2, .cosmic-registration h2, .cosmic-partners h2 { font-size: 46px; }
  .cosmic-stats { gap: 7px; }
  .cosmic-stats dt { font-size: 25px; }
  .cosmic-heading { display: block; }
  .cosmic-heading h2 { margin-bottom: 20px; }
  .cosmic-speakers { min-height: 235svh; }
  .cosmic-speakers__list, .cosmic-quotes { width: 100%; }
  .cosmic-speaker { grid-template-columns: 112px 1fr; min-height: 190px; }
  .cosmic-speaker__copy { padding: 22px 18px; }
  .cosmic-speaker__copy > span { right: 18px; top: 24px; }
  .cosmic-speaker h3 { font-size: 20px; }
  .cosmic-speaker strong { margin-top: 40px; font-size: 13px; }
  .cosmic-testimonials { min-height: 205svh; }
  .cosmic-quote { min-height: 55svh; }
  .cosmic-registration { min-height: 175svh; align-content: center; gap: 60px; }
  .cosmic-form { padding: 28px 20px; }
  .cosmic-form__row { grid-template-columns: 1fr; gap: 0; }
  .cosmic-partners { min-height: 120svh; }
  .cosmic-partners__content { padding-top: 30px; }
  .cosmic-footer { grid-template-columns: 1fr auto; }
  .cosmic-footer > a { grid-row: 2; }
  .cosmic-footer > div:last-child { grid-row: 2; }
  .cosmic-tooltip { width: min(230px, calc(100vw - 32px)); }
}

@media (prefers-reduced-motion: reduce) {
  .cosmic-reveal { opacity: 1 !important; transform: none !important; }
  .cosmic-button, .cosmic-speaker { transition: none; }
}
</style>
