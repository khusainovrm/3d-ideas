<script setup lang="ts">
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { onMounted, onUnmounted, ref } from 'vue'
import { useThreeScene } from '../../composables/useThreeScene'
import { useDebugPane } from '../../composables/useDebugPane'
import { createParticleReflowScene } from './scene'

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

const partners = ['NORTHSTAR', 'SIGNAL', 'PARALLEL', 'ORBIT', 'TIDE', 'VECTOR', 'OTHERLIGHT', 'FIELD'] as const
const page = ref<HTMLElement | null>(null)
const submitted = ref(false)
const { container, ready, error, metrics } = useThreeScene(createParticleReflowScene)
const { debug, paneHost } = useDebugPane(metrics, {
  title: 'Reflow runtime',
  bindings: [
    { key: 'fps', label: 'FPS' }, { key: 'dpr', label: 'DPR' }, { key: 'quality', label: 'Quality' },
    { key: 'particles', label: 'Particles' }, { key: 'calls', label: 'Draw calls' }, { key: 'triangles', label: 'Triangles' },
    { key: 'section', label: 'Particle state' }, { key: 'transitionProgress', label: 'Transition' },
    { key: 'scrollProgress', label: 'Scroll' },
  ],
})
defineExpose({ container, paneHost })

let animationContext: gsap.Context | undefined
const mobileSpeakerTriggers: ScrollTrigger[] = []

const dispatchSpeaker = (index: number): void => {
  container.value?.dispatchEvent(new CustomEvent<number>('speakerfocus', { detail: index }))
}

const focusSpeaker = (index: number): void => {
  if (window.matchMedia('(hover: hover)').matches) dispatchSpeaker(index)
}

const focusField = (index: number): void => {
  container.value?.dispatchEvent(new CustomEvent<number>('formfocus', { detail: index }))
}

const submitRegistration = (): void => {
  submitted.value = true
  focusField(-1)
  container.value?.dispatchEvent(new CustomEvent('reflowcomplete'))
}

onMounted(() => {
  document.documentElement.classList.add('reflow-page-active')
  if (!page.value) return
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  animationContext = gsap.context(() => {
    if (!reducedMotion) {
      page.value?.querySelectorAll<HTMLElement>('.reflow-reveal').forEach((element) => {
        gsap.fromTo(element, { autoAlpha: 0, y: 26 }, {
          autoAlpha: 1, y: 0, duration: 0.8, ease: 'power2.out',
          scrollTrigger: { trigger: element, start: 'top 86%', once: true },
        })
      })
    }
  }, page.value)

  if (window.matchMedia('(pointer: coarse)').matches) {
    page.value.querySelectorAll<HTMLElement>('.reflow-speaker').forEach((card, index) => {
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
  document.documentElement.classList.remove('reflow-page-active')
  mobileSpeakerTriggers.forEach((trigger) => trigger.kill())
  animationContext?.revert()
})
</script>

<template>
  <main ref="page" class="reflow">
    <div ref="container" class="reflow__canvas" aria-hidden="true" />
    <div class="reflow__grain" aria-hidden="true" />

    <nav class="reflow-nav" aria-label="Навигация">
      <RouterLink to="/">← Visual lab</RouterLink>
      <a href="#reflow-top" class="reflow-nav__mark">O / 26</a>
      <a href="#reflow-registration" class="reflow-nav__cta">Регистрация</a>
    </nav>

    <div v-if="debug" ref="paneHost" class="reflow-debug" />
    <div v-if="!ready && !error" class="reflow-loading">Forming the first state…</div>
    <div v-if="error" class="reflow-loading reflow-loading--error">{{ error }}</div>

    <section id="reflow-top" class="reflow-section reflow-hero">
      <div class="reflow-hero__copy">
        <p class="reflow-eyebrow">Онлайн-конференция · 2026</p>
        <h1>ODYSSEY</h1>
        <p class="reflow-hero__subtitle">Путешествие через идеи,<br />технологии и будущее.</p>
        <div class="reflow-hero__date"><strong>20 ноября</strong><span>10:00–18:00 МСК · Online</span></div>
        <div class="reflow-actions">
          <a href="#reflow-registration" class="reflow-button reflow-button--primary">Зарегистрироваться <span>↗</span></a>
          <a href="#reflow-about" class="reflow-button">О конференции</a>
        </div>
      </div>
      <p class="reflow-hero__note">The journey is a reflow <span>↓</span></p>
    </section>

    <section id="reflow-about" class="reflow-section reflow-about">
      <div class="reflow-panel reflow-panel--left reflow-reveal">
        <p class="reflow-index">01 / Новая система координат</p>
        <h2>О конференции</h2>
        <p class="reflow-lead">Однодневная онлайн-конференция о технологиях, дизайне и решениях, которые определят следующую главу. Практики из разных индустрий делятся не прогнозами, а методами работы с неизвестностью.</p>
        <dl class="reflow-stats">
          <div><dt>20+</dt><dd>спикеров</dd></div>
          <div><dt>8 часов</dt><dd>контента</dd></div>
          <div><dt>1 день</dt><dd>онлайн</dd></div>
        </dl>
      </div>
      <p class="reflow-coordinate" aria-hidden="true">43.2° N / 18.4° E</p>
    </section>

    <section id="reflow-speakers" class="reflow-section reflow-speakers">
      <header class="reflow-heading reflow-reveal">
        <p class="reflow-index">02 / Навигационные точки</p>
        <h2>Спикеры</h2>
        <p>Четыре направления из двадцати. Каждый разговор — новая точка на карте.</p>
      </header>
      <div class="reflow-speakers__list">
        <article
          v-for="(speaker, index) in speakers"
          :key="speaker.name"
          class="reflow-speaker reflow-reveal"
          @mouseenter="focusSpeaker(index)"
          @mouseleave="focusSpeaker(-1)"
          @focusin="focusSpeaker(index)"
          @focusout="focusSpeaker(-1)"
        >
          <div :class="['reflow-speaker__photo', `reflow-speaker__photo--${index + 1}`]" role="img" :aria-label="speaker.name" />
          <div class="reflow-speaker__copy">
            <span>0{{ index + 1 }}</span>
            <h3>{{ speaker.name }}</h3>
            <p>{{ speaker.role }}</p>
            <strong>{{ speaker.talk }}</strong>
          </div>
        </article>
      </div>
    </section>

    <section id="reflow-testimonials" class="reflow-section reflow-testimonials">
      <header class="reflow-heading reflow-heading--narrow reflow-reveal">
        <p class="reflow-index">03 / Сигналы прошлых путешествий</p>
        <h2>Отзывы участников</h2>
      </header>
      <div class="reflow-quotes">
        <figure v-for="(testimonial, index) in testimonials" :key="testimonial.name" class="reflow-quote reflow-reveal">
          <span>Signal 0{{ index + 1 }}</span>
          <blockquote>«{{ testimonial.quote }}»</blockquote>
          <figcaption><strong>{{ testimonial.name }}</strong><small>{{ testimonial.role }}</small></figcaption>
        </figure>
      </div>
    </section>

    <section id="reflow-registration" class="reflow-section reflow-registration">
      <div class="reflow-registration__intro reflow-reveal">
        <p class="reflow-index">04 / Destination reached</p>
        <h2>Присоединяйтесь<br />к конференции</h2>
        <p>20 ноября 2026 · Online<br />Участие бесплатно</p>
      </div>

      <form v-if="!submitted" class="reflow-form reflow-reveal" @submit.prevent="submitRegistration">
        <p>Регистрация займёт меньше минуты.</p>
        <label>Имя<input name="name" autocomplete="name" required placeholder="Как к вам обращаться" @focus="focusField(0)" @blur="focusField(-1)" /></label>
        <label>Email<input name="email" type="email" autocomplete="email" required placeholder="name@company.com" @focus="focusField(1)" @blur="focusField(-1)" /></label>
        <div class="reflow-form__row">
          <label>Компания<input name="company" autocomplete="organization" placeholder="Название" @focus="focusField(2)" @blur="focusField(-1)" /></label>
          <label>Должность<input name="role" autocomplete="organization-title" placeholder="Ваша роль" @focus="focusField(3)" @blur="focusField(-1)" /></label>
        </div>
        <label class="reflow-consent"><input type="checkbox" required /><span>Согласен с обработкой персональных данных.</span></label>
        <button class="reflow-button reflow-button--primary" type="submit">Зарегистрироваться <span>↗</span></button>
      </form>

      <div v-else class="reflow-success" role="status" aria-live="polite">
        <span>Destination confirmed</span>
        <h3>До встречи<br />20 ноября.</h3>
        <p>Подтверждение отправлено на вашу почту.</p>
      </div>
    </section>

    <section id="reflow-partners" class="reflow-section reflow-partners">
      <div class="reflow-partners__content reflow-reveal">
        <p class="reflow-index">05 / Общая сеть</p>
        <h2>Партнёры конференции</h2>
        <div class="reflow-partners__grid">
          <span v-for="partner in partners" :key="partner">{{ partner }}</span>
        </div>
      </div>
      <footer class="reflow-footer">
        <div><strong>ODYSSEY</strong><span>Conference / 2026</span></div>
        <a href="#reflow-registration">Зарегистрироваться ↑</a>
        <div><a href="#">Telegram</a><a href="#">YouTube</a><span>© 2026</span></div>
      </footer>
    </section>
  </main>
</template>

<style scoped>
.reflow {
  --bg: #050505;
  --text: #f3f1ec;
  --muted: rgba(243, 241, 236, .55);
  --line: rgba(243, 241, 236, .16);
  --gold: #c9a86a;
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

:global(html.reflow-page-active),
:global(html.reflow-page-active body) {
  max-width: 100%;
  overflow-x: hidden;
  overflow-x: clip;
  overscroll-behavior-x: none;
}
.reflow__canvas { position: fixed; z-index: -2; inset: 0; width: 100%; height: 100svh; }
.reflow__canvas :deep(canvas) { display: block; width: 100%; height: 100%; }
.reflow__grain { position: fixed; z-index: -1; inset: 0; pointer-events: none; opacity: .09; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.22'/%3E%3C/svg%3E"); }
.reflow-nav { position: fixed; z-index: 10; inset: 0 0 auto; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 20px clamp(20px, 4vw, 64px); background: linear-gradient(#050505e8, transparent); font: 9px ui-monospace, monospace; letter-spacing: .14em; text-transform: uppercase; }
.reflow-nav a { color: inherit; text-decoration: none; }
.reflow-nav__mark { font-weight: 700; }
.reflow-nav__cta { justify-self: end; color: var(--gold) !important; border-bottom: 1px solid currentColor; padding-bottom: 5px; }
.reflow-debug { position: fixed; z-index: 20; top: 58px; right: 14px; width: 270px; }
.reflow-loading { position: fixed; z-index: 30; inset: 0; display: grid; place-items: center; background: var(--bg); font: 9px ui-monospace, monospace; letter-spacing: .14em; text-transform: uppercase; }
.reflow-loading--error { color: #c97d70; }
.reflow-section { position: relative; z-index: 1; min-height: 115svh; padding: clamp(90px, 10vw, 160px) clamp(22px, 6vw, 96px); }
.reflow-eyebrow, .reflow-index { margin: 0 0 28px; color: var(--gold); font: 9px/1.4 ui-monospace, monospace; letter-spacing: .15em; text-transform: uppercase; }
.reflow-hero { min-height: 100svh; display: flex; align-items: center; }
.reflow-hero__copy { width: min(920px, 100%); }
.reflow-hero h1 { margin: 0; font-size: clamp(82px, 15vw, 220px); line-height: .75; letter-spacing: -.075em; font-weight: 500; }
.reflow-hero__subtitle { margin: 42px 0; color: var(--muted); font-size: clamp(18px, 2vw, 27px); line-height: 1.25; font-weight: 300; }
.reflow-hero__date { display: flex; gap: 28px; align-items: baseline; margin-bottom: 30px; }
.reflow-hero__date strong { font-size: 20px; font-weight: 400; }
.reflow-hero__date span { color: var(--muted); font-size: 12px; }
.reflow-actions { display: flex; gap: 9px; flex-wrap: wrap; }
.reflow-button { min-height: 48px; display: inline-flex; align-items: center; justify-content: space-between; gap: 38px; padding: 0 20px; color: var(--text); background: rgba(5,5,5,.54); border: 1px solid var(--line); text-decoration: none; font: 9px ui-monospace, monospace; letter-spacing: .1em; text-transform: uppercase; cursor: pointer; transition: color .2s, background .2s, border-color .2s; }
.reflow-button:hover { border-color: rgba(255,255,255,.44); }
.reflow-button--primary { color: #111; background: var(--text); border-color: var(--text); }
.reflow-button--primary:hover { background: #fff; }
.reflow-hero__note { position: absolute; right: clamp(22px, 6vw, 96px); bottom: 28px; margin: 0; color: var(--muted); font: 8px ui-monospace, monospace; letter-spacing: .13em; text-transform: uppercase; }
.reflow-hero__note span { margin-left: 14px; color: var(--gold); }

.reflow-about { display: flex; align-items: center; }
.reflow-panel { width: min(610px, 48vw); padding: clamp(28px, 4vw, 56px); border: 1px solid var(--line); background: rgba(5,5,5,.78); backdrop-filter: blur(10px); }
.reflow-panel h2, .reflow-heading h2, .reflow-registration h2, .reflow-partners h2 { margin: 0; font-size: clamp(48px, 7vw, 104px); line-height: .88; letter-spacing: -.065em; font-weight: 300; }
.reflow-lead { margin: 34px 0 52px; color: var(--muted); line-height: 1.75; font-size: 15px; }
.reflow-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 0; padding-top: 22px; border-top: 1px solid var(--line); }
.reflow-stats div { display: flex; flex-direction: column; gap: 7px; }
.reflow-stats dt { font-size: clamp(24px, 3vw, 43px); letter-spacing: -.04em; }
.reflow-stats dd { margin: 0; color: var(--muted); font: 8px ui-monospace, monospace; letter-spacing: .09em; text-transform: uppercase; }
.reflow-coordinate { position: absolute; right: 6vw; bottom: 12%; color: rgba(243,241,236,.25); font: 8px ui-monospace, monospace; letter-spacing: .15em; }

.reflow-speakers { min-height: 185svh; }
.reflow-heading { display: grid; grid-template-columns: 1fr minmax(240px, 380px); align-items: end; gap: 50px; margin-bottom: clamp(60px, 10vw, 140px); }
.reflow-heading .reflow-index { grid-column: 1 / -1; margin-bottom: 0; }
.reflow-heading > p:last-child { margin: 0; color: var(--muted); line-height: 1.6; }
.reflow-speakers__list { width: min(760px, 62vw); margin-left: auto; border-top: 1px solid var(--line); }
.reflow-speaker { display: grid; grid-template-columns: 190px 1fr; min-height: 220px; border-bottom: 1px solid var(--line); background: rgba(5,5,5,.7); transition: background .3s; }
.reflow-speaker:hover { background: rgba(18,20,21,.86); }
.reflow-speaker__photo { background-image: url('../../assets/speakers-contact-sheet.webp'); background-size: 300% 200%; filter: grayscale(.5) contrast(1.08); }
.reflow-speaker__photo--1 { background-position: 0 0; }
.reflow-speaker__photo--2 { background-position: 0 100%; }
.reflow-speaker__photo--3 { background-position: 100% 0; }
.reflow-speaker__photo--4 { background-position: 100% 100%; }
.reflow-speaker__copy { position: relative; padding: 28px 32px; }
.reflow-speaker__copy > span { position: absolute; top: 31px; right: 30px; color: var(--gold); font: 8px ui-monospace, monospace; }
.reflow-speaker h3 { margin: 0 0 7px; font-size: 26px; font-weight: 400; }
.reflow-speaker p { margin: 0; color: var(--muted); font-size: 12px; }
.reflow-speaker strong { display: block; margin-top: 53px; max-width: 360px; font-size: 15px; line-height: 1.45; font-weight: 400; }

.reflow-testimonials { min-height: 170svh; }
.reflow-heading--narrow { width: min(700px, 100%); display: block; }
.reflow-heading--narrow h2 { line-height: .96; }
.reflow-quotes { width: min(760px, 66vw); margin-left: auto; }
.reflow-quote { min-height: 53svh; display: flex; flex-direction: column; justify-content: center; margin: 0; padding: 50px 0; border-top: 1px solid var(--line); }
.reflow-quote > span { color: var(--gold); font: 8px ui-monospace, monospace; letter-spacing: .13em; text-transform: uppercase; }
.reflow-quote blockquote { margin: 35px 0 45px; font-size: clamp(29px, 4vw, 56px); line-height: 1.14; letter-spacing: -.045em; font-weight: 300; }
.reflow-quote figcaption { display: flex; flex-direction: column; gap: 5px; }
.reflow-quote figcaption strong { font-size: 12px; font-weight: 500; }
.reflow-quote figcaption small { color: var(--muted); font: 9px ui-monospace, monospace; }

.reflow-registration { min-height: 145svh; display: grid; grid-template-columns: .9fr 1.1fr; align-items: center; gap: clamp(50px, 10vw, 150px); }
.reflow-registration__intro { align-self: center; }
.reflow-registration__intro > p:last-child { margin-top: 35px; color: var(--muted); line-height: 1.7; }
.reflow-form, .reflow-success { padding: clamp(28px, 4vw, 52px); color: #151717; background: rgba(243,241,236,.95); }
.reflow-form > p { margin: 0 0 35px; color: #626868; font-size: 13px; }
.reflow-form label { display: flex; flex-direction: column; gap: 8px; margin-bottom: 25px; color: #646968; font: 8px ui-monospace, monospace; letter-spacing: .11em; text-transform: uppercase; }
.reflow-form input:not([type='checkbox']) { padding: 10px 0; color: #151717; background: transparent; border: 0; border-bottom: 1px solid #aeb3af; border-radius: 0; outline: none; font: 16px 'Helvetica Neue', sans-serif; text-transform: none; }
.reflow-form input:focus { border-color: #151717; }
.reflow-form__row { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; }
.reflow-consent { flex-direction: row !important; align-items: flex-start; gap: 10px !important; text-transform: none !important; letter-spacing: 0 !important; line-height: 1.5; }
.reflow-consent input { accent-color: #1d2424; }
.reflow-form .reflow-button { width: 100%; color: white; background: #151717; border-color: #151717; }
.reflow-success > span { color: #7d693e; font: 8px ui-monospace, monospace; letter-spacing: .12em; text-transform: uppercase; }
.reflow-success h3 { margin: 28px 0; font-size: clamp(40px, 5vw, 68px); line-height: .95; letter-spacing: -.05em; font-weight: 300; }
.reflow-success p { color: #616866; }

.reflow-partners { min-height: 110svh; display: flex; flex-direction: column; justify-content: space-between; padding-bottom: 34px; }
.reflow-partners__content { margin: auto 0; }
.reflow-partners__grid { display: grid; grid-template-columns: repeat(4, 1fr); margin-top: 75px; border-top: 1px solid var(--line); border-left: 1px solid var(--line); }
.reflow-partners__grid span { min-height: 110px; display: grid; place-items: center; color: rgba(243,241,236,.65); border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); font: 10px ui-monospace, monospace; letter-spacing: .15em; }
.reflow-footer { display: grid; grid-template-columns: 1fr auto 1fr; align-items: end; gap: 25px; padding-top: 28px; border-top: 1px solid var(--line); font: 8px ui-monospace, monospace; letter-spacing: .11em; text-transform: uppercase; }
.reflow-footer > div { display: flex; gap: 18px; }
.reflow-footer > div:first-child { flex-direction: column; gap: 6px; }
.reflow-footer > div:last-child { justify-self: end; }
.reflow-footer a { color: inherit; text-decoration: none; }
.reflow-footer > a { color: var(--gold); }
.reflow-footer span { color: var(--muted); }

@media (max-width: 820px) {
  .reflow-nav { grid-template-columns: 1fr auto; }
  .reflow-nav__mark { display: none; }
  .reflow-panel { width: min(620px, 76vw); }
  .reflow-speakers__list, .reflow-quotes { width: min(700px, 78vw); }
  .reflow-registration { grid-template-columns: 1fr; }
}

@media (max-width: 620px) {
  .reflow-nav { padding: 17px 18px; }
  .reflow-nav__cta { padding: 8px 10px; border: 1px solid var(--line); }
  .reflow-section { min-height: 125svh; padding: 90px 18px; }
  .reflow-hero { min-height: 100svh; align-items: flex-start; padding-top: 150px; }
  .reflow-hero h1 { font-size: clamp(62px, 20vw, 90px); }
  .reflow-hero__subtitle { margin-top: 28px; }
  .reflow-hero__date { flex-direction: column; gap: 4px; margin-top: 44px; }
  .reflow-actions { width: 100%; }
  .reflow-button { width: 100%; }
  .reflow-hero__note { display: none; }
  .reflow-about { align-items: flex-start; padding-top: 115px; }
  .reflow-panel { width: 100%; padding: 25px 20px; backdrop-filter: none; }
  .reflow-panel h2, .reflow-heading h2, .reflow-registration h2, .reflow-partners h2 { font-size: 46px; }
  .reflow-stats { gap: 7px; }
  .reflow-stats dt { font-size: 25px; }
  .reflow-heading { display: block; }
  .reflow-heading h2 { margin-bottom: 20px; }
  .reflow-speakers { min-height: 240svh; }
  .reflow-speakers__list, .reflow-quotes { width: 100%; }
  .reflow-speaker { grid-template-columns: 112px 1fr; min-height: 190px; }
  .reflow-speaker__copy { padding: 22px 18px; }
  .reflow-speaker__copy > span { right: 18px; top: 24px; }
  .reflow-speaker h3 { font-size: 20px; }
  .reflow-speaker strong { margin-top: 40px; font-size: 13px; }
  .reflow-testimonials { min-height: 190svh; }
  .reflow-quote { min-height: 52svh; }
  .reflow-registration { min-height: 170svh; align-content: center; gap: 60px; }
  .reflow-form { padding: 28px 20px; }
  .reflow-form__row { grid-template-columns: 1fr; gap: 0; }
  .reflow-partners__grid { grid-template-columns: repeat(2, 1fr); margin-top: 50px; }
  .reflow-partners__grid span { min-height: 82px; font-size: 9px; }
  .reflow-footer { grid-template-columns: 1fr auto; }
  .reflow-footer > a { grid-row: 2; }
  .reflow-footer > div:last-child { grid-row: 2; }
  .reflow-footer > div:last-child a { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .reflow-reveal { opacity: 1 !important; transform: none !important; }
  .reflow-button, .reflow-speaker { transition: none; }
}
</style>
