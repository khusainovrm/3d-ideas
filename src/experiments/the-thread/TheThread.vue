<script setup lang="ts">
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { onMounted, onUnmounted, ref } from 'vue'
import { useThreeScene } from '../../composables/useThreeScene'
import { useDebugPane } from '../../composables/useDebugPane'
import { createThreadScene } from './scene'

gsap.registerPlugin(ScrollTrigger)

const speakers = [
  { name: 'Майя Чен', role: 'VP Product', company: 'Arc Systems', talk: 'Технологии, которые становятся частью повседневности', portrait: 1 },
  { name: 'Томас Рид', role: 'Founder', company: 'Common Ground', talk: 'Как принимать решения с длинным горизонтом', portrait: 2 },
  { name: 'Амара Окойе', role: 'Research Director', company: 'North Lab', talk: 'Новая инфраструктура человеческого знания', portrait: 3 },
  { name: 'Елена Восс', role: 'Climate Tech Lead', company: 'Tide', talk: 'Системное мышление в меняющемся мире', portrait: 5 },
] as const

const testimonials = [
  { quote: 'Одна из немногих конференций, после которой действительно хочется что-то изменить в своей работе.', name: 'Анна Смирнова', meta: 'Product Director, Forma · участница 2025' },
  { quote: 'Никакого информационного шума. Только люди, идеи и разговоры, которым хочется дать больше времени.', name: 'Михаил Орлов', meta: 'CEO, Detail · участник 2025' },
  { quote: 'Редкое чувство общего направления — даже когда каждый из нас работает в совершенно разной области.', name: 'Софья Ли', meta: 'Strategy Lead, Parallel · спикер 2024' },
] as const

const partners = ['NORTHSTAR', 'SIGNAL', 'COMMON GROUND', 'TIDE', 'PARALLEL', 'FIELD OFFICE', 'ARC SYSTEMS', 'OTHERLIGHT'] as const

const page = ref<HTMLElement | null>(null)
const submitted = ref(false)
const { container, ready, error, metrics } = useThreeScene(createThreadScene)
const { debug, paneHost } = useDebugPane(metrics, {
  title: 'Thread runtime',
  bindings: [
    { key: 'fps', label: 'FPS' }, { key: 'dpr', label: 'DPR' }, { key: 'quality', label: 'Quality' },
    { key: 'calls', label: 'Draw calls' }, { key: 'triangles', label: 'Triangles' },
    { key: 'section', label: 'Journey state' }, { key: 'transitionProgress', label: 'Path transition' },
    { key: 'scrollProgress', label: 'Scroll' }, { key: 'lineSamples', label: 'Line samples' },
  ],
})
defineExpose({ container, paneHost })

let animationContext: gsap.Context | undefined
const mobileSpeakerTriggers: ScrollTrigger[] = []

const dispatchSpeaker = (index: number): void => {
  container.value?.dispatchEvent(new CustomEvent<number>('threadspeakerfocus', { detail: index }))
}
const focusSpeaker = (index: number): void => {
  if (window.matchMedia('(hover: hover)').matches) dispatchSpeaker(index)
}
const focusField = (index: number): void => {
  container.value?.dispatchEvent(new CustomEvent<number>('threadformfocus', { detail: index }))
}
const submitRegistration = (): void => {
  submitted.value = true
  focusField(-1)
  container.value?.dispatchEvent(new CustomEvent('threadcomplete'))
}

onMounted(() => {
  document.documentElement.classList.add('thread-page-active')
  if (!page.value) return
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  animationContext = gsap.context(() => {
    if (!reducedMotion) {
      page.value?.querySelectorAll<HTMLElement>('.thread-reveal').forEach((element) => {
        gsap.fromTo(element, { autoAlpha: 0, y: 28 }, {
          autoAlpha: 1, y: 0, duration: 0.9, ease: 'power2.out',
          scrollTrigger: { trigger: element, start: 'top 87%', once: true },
        })
      })
      page.value?.querySelectorAll<HTMLElement>('.thread-portrait').forEach((element) => {
        gsap.fromTo(element, { clipPath: 'inset(0 0 100% 0)' }, {
          clipPath: 'inset(0 0 0% 0)', duration: 1.1, ease: 'power3.inOut',
          scrollTrigger: { trigger: element, start: 'top 83%', once: true },
        })
      })
    }
  }, page.value)

  if (window.matchMedia('(pointer: coarse)').matches) {
    page.value.querySelectorAll<HTMLElement>('.thread-speaker').forEach((speaker, index) => {
      mobileSpeakerTriggers.push(ScrollTrigger.create({
        trigger: speaker, start: 'center 58%', end: 'center 42%',
        onEnter: () => dispatchSpeaker(index), onEnterBack: () => dispatchSpeaker(index),
      }))
    })
  }
})

onUnmounted(() => {
  document.documentElement.classList.remove('thread-page-active')
  mobileSpeakerTriggers.forEach((trigger) => trigger.kill())
  animationContext?.revert()
})
</script>

<template>
  <main ref="page" class="thread">
    <div ref="container" class="thread__canvas" aria-hidden="true" />

    <nav class="thread-nav" aria-label="Навигация">
      <RouterLink to="/">← Visual lab</RouterLink>
      <a href="#thread-top" class="thread-nav__name">The Odyssey / 26</a>
      <a href="#thread-registration" class="thread-nav__cta">Регистрация</a>
    </nav>

    <div v-if="debug" ref="paneHost" class="thread-debug" />
    <div v-if="!ready && !error" class="thread-loading">Drawing the route…</div>
    <div v-if="error" class="thread-loading thread-loading--error">{{ error }}</div>

    <section id="thread-top" class="thread-section thread-hero">
      <p class="thread-label">Online conference · 20.11.2026</p>
      <h1><span>THE</span><span>ODYSSEY</span></h1>
      <div class="thread-hero__details">
        <p>Путь через идеи,<br />технологии и будущее.</p>
        <p><strong>20 ноября</strong><br />10:00–18:00 МСК · Online</p>
      </div>
      <div class="thread-actions">
        <a href="#thread-registration" class="thread-button thread-button--primary">Зарегистрироваться <span>↗</span></a>
        <a href="#thread-about" class="thread-button">Узнать подробнее</a>
      </div>
      <span class="thread-scroll">One line · one journey <b>↓</b></span>
    </section>

    <section id="thread-about" class="thread-section thread-about">
      <header class="thread-section__header thread-reveal">
        <p class="thread-index">01 — About</p>
        <h2>О конференции</h2>
      </header>
      <div class="thread-about__content thread-reveal">
        <p class="thread-about__lead">Люди из разных индустрий встречаются на один день, чтобы сравнить маршруты и увидеть, куда ведут технологии прямо сейчас.</p>
        <p>Без общих прогнозов и перегруженных панелей. Только опыт, методы и решения, которые помогают двигаться через неопределённость.</p>
      </div>
      <dl class="thread-facts thread-reveal">
        <div><dt>20+</dt><dd>спикеров</dd></div>
        <div><dt>8</dt><dd>часов контента</dd></div>
        <div><dt>1</dt><dd>день онлайн</dd></div>
      </dl>
    </section>

    <section id="thread-speakers" class="thread-section thread-speakers">
      <header class="thread-section__header thread-reveal">
        <p class="thread-index">02 — Speakers</p>
        <h2>Спикеры</h2>
      </header>
      <div class="thread-speakers__list">
        <article
          v-for="(speaker, index) in speakers"
          :key="speaker.name"
          :class="['thread-speaker', { 'thread-speaker--reverse': index % 2 === 1 }]"
          @mouseenter="focusSpeaker(index)"
          @mouseleave="focusSpeaker(-1)"
          @focusin="focusSpeaker(index)"
          @focusout="focusSpeaker(-1)"
        >
          <div :class="['thread-portrait', `thread-portrait--${speaker.portrait}`]" role="img" :aria-label="speaker.name" />
          <div class="thread-speaker__copy thread-reveal">
            <p>0{{ index + 1 }}</p>
            <h3>{{ speaker.name }}</h3>
            <span>{{ speaker.role }}<br />{{ speaker.company }}</span>
            <strong>{{ speaker.talk }}</strong>
          </div>
        </article>
      </div>
    </section>

    <section id="thread-voices" class="thread-section thread-voices">
      <header class="thread-section__header thread-reveal">
        <p class="thread-index">03 — Voices</p>
        <h2>Отзывы участников</h2>
      </header>
      <div class="thread-voices__list">
        <figure v-for="(testimonial, index) in testimonials" :key="testimonial.name" class="thread-quote thread-reveal">
          <p>0{{ index + 1 }}</p>
          <blockquote>«{{ testimonial.quote }}»</blockquote>
          <figcaption><strong>{{ testimonial.name }}</strong><span>{{ testimonial.meta }}</span></figcaption>
        </figure>
      </div>
    </section>

    <section id="thread-registration" class="thread-section thread-registration">
      <div class="thread-registration__intro thread-reveal">
        <p class="thread-index">04 — Register</p>
        <h2>Присоединяйтесь</h2>
        <p>20 ноября 2026<br />Online · участие бесплатно</p>
      </div>

      <form v-if="!submitted" class="thread-form thread-reveal" @submit.prevent="submitRegistration">
        <label>Имя<input name="name" autocomplete="name" required placeholder="Как к вам обращаться" @focus="focusField(0)" @blur="focusField(-1)" /></label>
        <label>Email<input name="email" type="email" autocomplete="email" required placeholder="name@company.com" @focus="focusField(1)" @blur="focusField(-1)" /></label>
        <div>
          <label>Компания<input name="company" autocomplete="organization" placeholder="Название" @focus="focusField(2)" @blur="focusField(-1)" /></label>
          <label>Должность<input name="role" autocomplete="organization-title" placeholder="Ваша роль" @focus="focusField(3)" @blur="focusField(-1)" /></label>
        </div>
        <label class="thread-consent"><input type="checkbox" required /><span>Согласен с обработкой персональных данных.</span></label>
        <button type="submit" class="thread-button thread-button--primary">Зарегистрироваться <span>↗</span></button>
      </form>

      <div v-else class="thread-success" role="status" aria-live="polite">
        <span>Маршрут подтверждён</span>
        <h3>До встречи<br />20 ноября.</h3>
        <p>Подтверждение отправлено на вашу почту.</p>
      </div>
    </section>

    <section id="thread-partners" class="thread-section thread-partners">
      <div class="thread-partners__content thread-reveal">
        <p class="thread-index">05 — Partners</p>
        <h2>Партнёры</h2>
        <div class="thread-partners__grid">
          <span v-for="(partner, index) in partners" :key="partner" :style="{ '--offset': `${(index % 3) * 12}px` }">{{ partner }}</span>
        </div>
      </div>
      <footer class="thread-footer">
        <div><strong>THE ODYSSEY</strong><span>2026</span></div>
        <a href="#thread-registration">Зарегистрироваться ↑</a>
        <div><a href="#">Telegram</a><a href="#">YouTube</a><span>© 2026</span></div>
      </footer>
    </section>
  </main>
</template>

<style scoped>
.thread {
  --ink: #f0eee9;
  --muted: rgba(240, 238, 233, .55);
  --line: rgba(240, 238, 233, .18);
  --accent: #b59b69;
  position: relative;
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  overflow-x: clip;
  isolation: isolate;
  color: var(--ink);
  background: #050505;
  font-family: 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
}
:global(html.thread-page-active), :global(html.thread-page-active body) { max-width: 100%; overflow-x: hidden; overflow-x: clip; overscroll-behavior-x: none; }
.thread__canvas { position: fixed; z-index: -1; inset: 0; width: 100%; height: 100svh; }
.thread__canvas :deep(canvas) { display: block; width: 100%; height: 100%; }
.thread-nav { position: fixed; z-index: 10; inset: 0 0 auto; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 20px clamp(20px, 4.4vw, 70px); background: linear-gradient(#050505e8, transparent); font: 9px ui-monospace, monospace; letter-spacing: .14em; text-transform: uppercase; }
.thread-nav a { color: inherit; text-decoration: none; }
.thread-nav__name { font-weight: 700; }
.thread-nav__cta { justify-self: end; padding-bottom: 5px; color: var(--accent) !important; border-bottom: 1px solid currentColor; }
.thread-debug { position: fixed; z-index: 20; top: 60px; right: 14px; width: 270px; }
.thread-loading { position: fixed; z-index: 30; inset: 0; display: grid; place-items: center; background: #050505; font: 9px ui-monospace, monospace; letter-spacing: .15em; text-transform: uppercase; }
.thread-loading--error { color: #c98071; }
.thread-section { position: relative; z-index: 1; padding: clamp(95px, 11vw, 180px) clamp(22px, 6.2vw, 100px); }
.thread-label, .thread-index { margin: 0; color: var(--accent); font: 9px ui-monospace, monospace; letter-spacing: .15em; text-transform: uppercase; }
.thread-hero { min-height: 100svh; display: flex; flex-direction: column; justify-content: center; }
.thread-hero h1 { display: flex; flex-direction: column; margin: 0; font-size: clamp(78px, 13vw, 198px); line-height: .69; letter-spacing: -.075em; font-weight: 300; }
.thread-hero h1 span:last-child { align-self: flex-end; }
.thread-hero__details { display: flex; justify-content: space-between; width: min(760px, 68%); margin-top: 70px; color: var(--muted); line-height: 1.55; }
.thread-hero__details p { margin: 0; }
.thread-hero__details strong { color: var(--ink); font-weight: 400; }
.thread-actions { display: flex; gap: 9px; margin-top: 30px; }
.thread-button { min-height: 50px; display: inline-flex; align-items: center; justify-content: space-between; gap: 42px; padding: 0 21px; color: var(--ink); background: rgba(5,5,5,.65); border: 1px solid var(--line); border-radius: 0; font: 9px ui-monospace, monospace; letter-spacing: .1em; text-decoration: none; text-transform: uppercase; cursor: pointer; }
.thread-button--primary { color: #151513; background: var(--ink); border-color: var(--ink); }
.thread-scroll { position: absolute; right: 6.2vw; bottom: 28px; color: var(--muted); font: 8px ui-monospace, monospace; letter-spacing: .12em; text-transform: uppercase; }
.thread-scroll b { margin-left: 14px; color: var(--accent); }
.thread-section__header { margin-bottom: clamp(65px, 10vw, 140px); }
.thread-section__header h2, .thread-registration h2, .thread-partners h2 { margin: 26px 0 0; font-size: clamp(52px, 8vw, 116px); line-height: .88; letter-spacing: -.065em; font-weight: 300; }

.thread-about { min-height: 120svh; }
.thread-about__content { display: grid; grid-template-columns: 1.35fr .65fr; gap: clamp(60px, 12vw, 190px); width: min(1120px, 100%); margin-left: auto; }
.thread-about__content p { margin: 0; color: var(--muted); line-height: 1.7; }
.thread-about__content .thread-about__lead { color: var(--ink); font-size: clamp(25px, 3vw, 44px); line-height: 1.2; letter-spacing: -.035em; }
.thread-facts { display: grid; grid-template-columns: repeat(3, 1fr); width: min(800px, 70%); margin: 130px 0 0 auto; padding-top: 26px; border-top: 1px solid var(--line); }
.thread-facts div { display: flex; flex-direction: column; gap: 9px; }
.thread-facts dt { font-size: clamp(36px, 5vw, 70px); letter-spacing: -.05em; }
.thread-facts dd { margin: 0; color: var(--muted); font: 9px ui-monospace, monospace; letter-spacing: .1em; text-transform: uppercase; }

.thread-speakers { min-height: 240svh; }
.thread-speakers__list { display: flex; flex-direction: column; gap: 150px; }
.thread-speaker { display: grid; grid-template-columns: minmax(300px, 43vw) minmax(280px, 470px); align-items: center; gap: clamp(45px, 8vw, 130px); min-height: 560px; }
.thread-speaker--reverse { grid-template-columns: minmax(280px, 470px) minmax(300px, 43vw); align-self: flex-end; }
.thread-speaker--reverse .thread-portrait { grid-column: 2; }
.thread-speaker--reverse .thread-speaker__copy { grid-column: 1; grid-row: 1; }
.thread-portrait { width: 100%; aspect-ratio: 4 / 5; background-image: url('../../assets/speakers-contact-sheet.webp'); background-size: 300% 200%; filter: grayscale(.52) contrast(1.04); }
.thread-portrait--1 { background-position: 0 0; }
.thread-portrait--2 { background-position: 50% 0; }
.thread-portrait--3 { background-position: 100% 0; }
.thread-portrait--5 { background-position: 50% 100%; }
.thread-speaker__copy > p { margin: 0 0 60px; color: var(--accent); font: 9px ui-monospace, monospace; }
.thread-speaker h3 { margin: 0 0 12px; font-size: clamp(40px, 5vw, 72px); line-height: .95; letter-spacing: -.05em; font-weight: 300; }
.thread-speaker__copy > span { color: var(--muted); line-height: 1.5; }
.thread-speaker strong { display: block; max-width: 390px; margin-top: 75px; font-size: 17px; line-height: 1.45; font-weight: 400; }

.thread-voices { min-height: 180svh; }
.thread-voices__list { width: min(1020px, 82%); margin-left: auto; }
.thread-quote { min-height: 58svh; display: grid; grid-template-columns: 90px 1fr; align-content: center; margin: 0; border-top: 1px solid var(--line); }
.thread-quote > p { color: var(--accent); font: 9px ui-monospace, monospace; }
.thread-quote blockquote { margin: 0; font-size: clamp(36px, 5.4vw, 78px); line-height: 1.08; letter-spacing: -.05em; font-weight: 300; }
.thread-quote figcaption { grid-column: 2; display: flex; flex-direction: column; gap: 6px; margin-top: 44px; }
.thread-quote figcaption strong { font-size: 12px; font-weight: 500; }
.thread-quote figcaption span { color: var(--muted); font: 9px ui-monospace, monospace; }

.thread-registration { min-height: 140svh; display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: clamp(60px, 11vw, 170px); }
.thread-registration__intro > p:last-child { margin-top: 42px; color: var(--muted); line-height: 1.65; }
.thread-form { padding-top: 34px; border-top: 1px solid var(--line); }
.thread-form > label, .thread-form > div label { display: flex; flex-direction: column; gap: 9px; margin-bottom: 30px; color: var(--muted); font: 8px ui-monospace, monospace; letter-spacing: .12em; text-transform: uppercase; }
.thread-form > div { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
.thread-form input:not([type='checkbox']) { padding: 11px 0; color: var(--ink); background: transparent; border: 0; border-bottom: 1px solid rgba(240,238,233,.35); border-radius: 0; outline: none; font: 17px 'Helvetica Neue', sans-serif; text-transform: none; }
.thread-form input:focus { border-color: var(--accent); }
.thread-consent { flex-direction: row !important; align-items: flex-start; gap: 10px !important; text-transform: none !important; letter-spacing: 0 !important; }
.thread-consent input { accent-color: var(--accent); }
.thread-form .thread-button { width: 100%; }
.thread-success { padding-top: 35px; border-top: 1px solid var(--accent); }
.thread-success > span { color: var(--accent); font: 9px ui-monospace, monospace; letter-spacing: .12em; text-transform: uppercase; }
.thread-success h3 { margin: 35px 0; font-size: clamp(48px, 7vw, 94px); line-height: .9; letter-spacing: -.06em; font-weight: 300; }
.thread-success p { color: var(--muted); }

.thread-partners { min-height: 110svh; display: flex; flex-direction: column; justify-content: space-between; padding-bottom: 34px; }
.thread-partners__content { margin: auto 0; }
.thread-partners__grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 55px 40px; margin-top: 100px; }
.thread-partners__grid span { transform: translateY(var(--offset)); color: rgba(240,238,233,.68); font: 11px ui-monospace, monospace; letter-spacing: .14em; text-align: center; }
.thread-footer { display: grid; grid-template-columns: 1fr auto 1fr; align-items: end; gap: 25px; padding-top: 30px; border-top: 1px solid var(--line); font: 8px ui-monospace, monospace; letter-spacing: .12em; text-transform: uppercase; }
.thread-footer > div { display: flex; gap: 18px; }
.thread-footer > div:first-child { flex-direction: column; gap: 6px; }
.thread-footer > div:last-child { justify-self: end; }
.thread-footer a { color: inherit; text-decoration: none; }
.thread-footer > a { color: var(--accent); }
.thread-footer span { color: var(--muted); }

@media (max-width: 820px) {
  .thread-nav { grid-template-columns: 1fr auto; }
  .thread-nav__name { display: none; }
  .thread-speaker, .thread-speaker--reverse { grid-template-columns: 1fr 1fr; }
  .thread-registration { grid-template-columns: 1fr; }
}
@media (max-width: 620px) {
  .thread-nav { padding: 17px 18px; }
  .thread-nav__cta { padding: 8px 10px; border: 1px solid var(--line); }
  .thread-section { padding: 90px 18px; }
  .thread-hero { min-height: 100svh; justify-content: flex-start; padding-top: 150px; }
  .thread-hero h1 { font-size: clamp(65px, 21vw, 96px); line-height: .77; }
  .thread-hero h1 span:last-child { align-self: flex-start; }
  .thread-hero__details { flex-direction: column; gap: 30px; width: 100%; margin-top: 58px; }
  .thread-actions { flex-direction: column; width: 100%; }
  .thread-button { width: 100%; }
  .thread-scroll { display: none; }
  .thread-section__header h2, .thread-registration h2, .thread-partners h2 { font-size: 50px; }
  .thread-about { min-height: 135svh; }
  .thread-about__content { grid-template-columns: 1fr; gap: 34px; }
  .thread-facts { width: 100%; margin-top: 80px; }
  .thread-facts dt { font-size: 34px; }
  .thread-speakers { min-height: 310svh; }
  .thread-speakers__list { gap: 110px; }
  .thread-speaker, .thread-speaker--reverse { display: flex; flex-direction: column; min-height: auto; gap: 35px; }
  .thread-speaker--reverse .thread-portrait { order: 0; }
  .thread-speaker--reverse .thread-speaker__copy { order: 1; }
  .thread-portrait { aspect-ratio: 4 / 4.7; }
  .thread-speaker__copy > p { margin-bottom: 35px; }
  .thread-speaker strong { margin-top: 40px; }
  .thread-voices { min-height: 205svh; }
  .thread-voices__list { width: 100%; }
  .thread-quote { min-height: 61svh; display: block; padding: 70px 0; }
  .thread-quote blockquote { margin-top: 45px; font-size: 38px; }
  .thread-quote figcaption { margin-top: 38px; }
  .thread-registration { min-height: 175svh; align-content: center; gap: 90px; }
  .thread-form > div { grid-template-columns: 1fr; gap: 0; }
  .thread-partners__grid { grid-template-columns: repeat(2, 1fr); gap: 45px 20px; margin-top: 70px; }
  .thread-footer { grid-template-columns: 1fr auto; }
  .thread-footer > a { grid-row: 2; }
  .thread-footer > div:last-child { grid-row: 2; }
  .thread-footer > div:last-child a { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .thread-reveal { opacity: 1 !important; transform: none !important; }
  .thread-portrait { clip-path: none !important; }
}
</style>
