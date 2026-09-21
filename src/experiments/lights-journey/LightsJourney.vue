<script setup lang="ts">
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { onMounted, onUnmounted, ref } from 'vue'
import { useThreeScene } from '../../composables/useThreeScene'
import { useDebugPane } from '../../composables/useDebugPane'
import { createLightsJourneyScene } from './scene'

gsap.registerPlugin(ScrollTrigger)

const speakers = [
  { name: 'Майя Чен', role: 'VP Product · Arc Systems', talk: 'Технологии, которые становятся частью повседневности', portrait: 1 },
  { name: 'Рави Менон', role: 'Design Partner · Field Office', talk: 'Как видеть направление, пока карта ещё не готова', portrait: 2 },
  { name: 'Амара Окойе', role: 'Research Director · North Lab', talk: 'Новая инфраструктура человеческого знания', portrait: 3 },
  { name: 'Елена Восс', role: 'Climate Tech Lead · Tide', talk: 'Длинный горизонт решений', portrait: 5 },
] as const

const testimonials = [
  { quote: 'Одна из самых сильных конференций года — ясная программа и редкая концентрация полезных идей.', name: 'Анна Смирнова', meta: 'Product Director, Forma · участница 2025' },
  { quote: 'Не просто набор докладов, а пространство, в котором начинаешь видеть собственный маршрут.', name: 'Михаил Орлов', meta: 'CEO, Detail · участник 2025' },
  { quote: 'Разговоры продолжились далеко за пределами эфира. Это лучший показатель качества события.', name: 'Софья Ли', meta: 'Strategy Lead, Parallel · спикер 2024' },
] as const

const partners = ['NORTHSTAR', 'SIGNAL', 'COMMON GROUND', 'TIDE', 'PARALLEL', 'FIELD OFFICE', 'ARC SYSTEMS', 'OTHERLIGHT'] as const
const page = ref<HTMLElement | null>(null)
const submitted = ref(false)
const { container, ready, error, metrics } = useThreeScene(createLightsJourneyScene)
const { debug, paneHost } = useDebugPane(metrics, {
  title: 'Lights runtime',
  bindings: [
    { key: 'fps', label: 'FPS' }, { key: 'dpr', label: 'DPR' }, { key: 'quality', label: 'Quality' },
    { key: 'calls', label: 'Draw calls' }, { key: 'triangles', label: 'Triangles' },
    { key: 'section', label: 'Current section' }, { key: 'scrollProgress', label: 'Scroll progress' },
    { key: 'surfaceRelief', label: 'Surface relief' }, { key: 'lightsCount', label: 'Lights count' },
    { key: 'cameraZ', label: 'Camera Z' },
  ],
})
defineExpose({ container, paneHost })

let animationContext: gsap.Context | undefined
const mobileTriggers: ScrollTrigger[] = []

const dispatchSpeaker = (index: number): void => {
  container.value?.dispatchEvent(new CustomEvent<number>('lightspeakerfocus', { detail: index }))
}
const focusSpeaker = (index: number): void => {
  if (window.matchMedia('(hover: hover)').matches) dispatchSpeaker(index)
}
const focusField = (index: number): void => {
  container.value?.dispatchEvent(new CustomEvent<number>('lightformfocus', { detail: index }))
}
const submitRegistration = (): void => {
  submitted.value = true
  focusField(-1)
  container.value?.dispatchEvent(new CustomEvent('lightcomplete'))
}

onMounted(() => {
  document.documentElement.classList.add('lights-page-active')
  if (!page.value) return
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  animationContext = gsap.context(() => {
    if (reducedMotion) return
    page.value?.querySelectorAll<HTMLElement>('.lights-reveal').forEach((element) => {
      gsap.fromTo(element, { autoAlpha: 0, y: 32 }, {
        autoAlpha: 1, y: 0, duration: 1, ease: 'power2.out',
        scrollTrigger: { trigger: element, start: 'top 88%', once: true },
      })
    })
    page.value?.querySelectorAll<HTMLElement>('.lights-portrait').forEach((element) => {
      gsap.fromTo(element, { clipPath: 'inset(100% 0 0 0)' }, {
        clipPath: 'inset(0% 0 0 0)', duration: 1.15, ease: 'power3.inOut',
        scrollTrigger: { trigger: element, start: 'top 84%', once: true },
      })
    })
  }, page.value)

  if (window.matchMedia('(pointer: coarse)').matches) {
    page.value.querySelectorAll<HTMLElement>('.lights-speaker').forEach((speaker, index) => {
      mobileTriggers.push(ScrollTrigger.create({
        trigger: speaker, start: 'top 62%', end: 'bottom 38%',
        onEnter: () => dispatchSpeaker(index), onEnterBack: () => dispatchSpeaker(index),
        onLeave: () => dispatchSpeaker(-1), onLeaveBack: () => dispatchSpeaker(-1),
      }))
    })
  }
})

onUnmounted(() => {
  document.documentElement.classList.remove('lights-page-active')
  mobileTriggers.forEach((trigger) => trigger.kill())
  animationContext?.revert()
})
</script>

<template>
  <main ref="page" class="lights-page">
    <div ref="container" class="lights-canvas" aria-hidden="true" />

    <nav class="lights-nav" aria-label="Навигация">
      <RouterLink to="/">← Visual lab</RouterLink>
      <span>Odyssey / Conference 2026</span>
      <a href="#lights-register">Регистрация</a>
    </nav>
    <div v-if="debug" ref="paneHost" class="lights-debug" />
    <div v-if="!ready && !error" class="lights-status">Preparing the field…</div>
    <div v-if="error" class="lights-status lights-status--error">{{ error }}</div>

    <section id="lights-top" class="lights-section lights-hero">
      <div class="lights-hero__eyebrow">20 ноября · Online · участие бесплатно</div>
      <h1><span>ODYSSEY</span><small>Конференция 2026</small></h1>
      <div class="lights-hero__bottom">
        <p>Путешествие через идеи,<br />технологии и будущее.</p>
        <div class="lights-actions">
          <a class="lights-button lights-button--primary" href="#lights-register">Зарегистрироваться <b>↗</b></a>
          <a class="lights-button" href="#lights-about">Узнать подробнее</a>
        </div>
      </div>
      <p class="lights-scroll">First light <span>↓</span></p>
    </section>

    <section id="lights-about" class="lights-section lights-about">
      <header class="lights-heading lights-reveal"><p>01 — The field opens</p><h2>О конференции</h2></header>
      <div class="lights-about__copy lights-reveal">
        <p>Один день для людей, которые создают продукты, культуру и технологии с длинным горизонтом.</p>
        <p>Практики из разных индустрий сравнят маршруты и покажут решения, которые помогают двигаться через неопределённость — без информационного шума и общих прогнозов.</p>
      </div>
      <dl class="lights-metrics lights-reveal">
        <div><dt>20+</dt><dd>спикеров</dd></div>
        <div><dt>8</dt><dd>часов контента</dd></div>
        <div><dt>1</dt><dd>день онлайн</dd></div>
      </dl>
    </section>

    <section id="lights-speakers" class="lights-section lights-speakers">
      <header class="lights-heading lights-reveal"><p>02 — Beacons</p><h2>Спикеры</h2><span>Четыре направления из двадцати.<br />Каждый разговор — новый ориентир.</span></header>
      <div class="lights-speakers__list">
        <article
          v-for="(speaker, index) in speakers" :key="speaker.name"
          :class="['lights-speaker', { 'lights-speaker--right': index % 2 === 1 }]"
          tabindex="0"
          @mouseenter="focusSpeaker(index)" @mouseleave="focusSpeaker(-1)"
          @focusin="focusSpeaker(index)" @focusout="focusSpeaker(-1)"
        >
          <div :class="['lights-portrait', `lights-portrait--${speaker.portrait}`]" role="img" :aria-label="speaker.name" />
          <div class="lights-speaker__copy lights-reveal">
            <span>0{{ index + 1 }}</span>
            <h3>{{ speaker.name }}</h3>
            <p>{{ speaker.role }}</p>
            <strong>{{ speaker.talk }}</strong>
          </div>
        </article>
      </div>
    </section>

    <section id="lights-voices" class="lights-section lights-voices">
      <header class="lights-heading lights-reveal"><p>03 — Echoes of light</p><h2>Отзывы участников</h2></header>
      <div class="lights-quotes">
        <figure v-for="(item, index) in testimonials" :key="item.name" class="lights-quote lights-reveal">
          <span>0{{ index + 1 }}</span>
          <blockquote>«{{ item.quote }}»</blockquote>
          <figcaption><strong>{{ item.name }}</strong><small>{{ item.meta }}</small></figcaption>
        </figure>
      </div>
    </section>

    <section id="lights-register" class="lights-section lights-register">
      <div class="lights-register__intro lights-reveal">
        <p>04 — The destination</p>
        <h2>Присоединяйтесь<br />к конференции</h2>
        <span>20 ноября 2026<br />10:00–18:00 МСК · Online<br />Участие бесплатно</span>
      </div>
      <form v-if="!submitted" class="lights-form lights-reveal" @submit.prevent="submitRegistration">
        <label>Имя<input name="name" autocomplete="name" required placeholder="Как к вам обращаться" @focus="focusField(0)" @blur="focusField(-1)" /></label>
        <label>Email<input name="email" type="email" autocomplete="email" required placeholder="name@company.com" @focus="focusField(1)" @blur="focusField(-1)" /></label>
        <div><label>Компания<input name="company" autocomplete="organization" placeholder="Название" @focus="focusField(2)" @blur="focusField(-1)" /></label><label>Должность<input name="role" autocomplete="organization-title" placeholder="Ваша роль" @focus="focusField(3)" @blur="focusField(-1)" /></label></div>
        <label class="lights-consent"><input type="checkbox" required /><span>Согласен с обработкой персональных данных.</span></label>
        <button class="lights-button lights-button--primary" type="submit">Зарегистрироваться <b>↗</b></button>
      </form>
      <div v-else class="lights-success" role="status" aria-live="polite"><span>Маршрут подтверждён</span><h3>До встречи<br />20 ноября.</h3><p>Подтверждение отправлено на вашу почту.</p></div>
    </section>

    <section id="lights-partners" class="lights-section lights-partners">
      <div class="lights-partners__content lights-reveal">
        <header class="lights-heading"><p>05 — Constellation of support</p><h2>Партнёры конференции</h2></header>
        <div class="lights-partners__grid"><span v-for="partner in partners" :key="partner">{{ partner }}</span></div>
      </div>
      <footer class="lights-footer">
        <div><strong>ODYSSEY</strong><span>2026</span></div>
        <a href="#lights-register">Зарегистрироваться ↑</a>
        <div><a href="#">Telegram</a><a href="#">YouTube</a><span>© 2026</span></div>
      </footer>
    </section>
  </main>
</template>

<style scoped>
.lights-page {
  --ink: #f1efe9; --muted: rgba(241,239,233,.54); --hairline: rgba(241,239,233,.17); --gold: #bca06a;
  position: relative; width: 100%; max-width: 100%; overflow-x: hidden; overflow-x: clip; isolation: isolate;
  color: var(--ink); background: transparent; font-family: 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
}
:global(html.lights-page-active), :global(html.lights-page-active body) { max-width: 100%; overflow-x: hidden; overflow-x: clip; overscroll-behavior-x: none; background: #050608; }
.lights-canvas { position: fixed; z-index: -1; inset: 0; width: 100%; height: 100svh; background: #050608; }
.lights-canvas :deep(canvas) { display: block; width: 100%; height: 100%; }
.lights-nav { position: fixed; z-index: 20; inset: 0 0 auto; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 19px clamp(19px,4.8vw,76px); background: linear-gradient(#050608e8, transparent); font: 9px ui-monospace, monospace; letter-spacing: .14em; text-transform: uppercase; }
.lights-nav a { color: inherit; text-decoration: none; }.lights-nav > a:last-child { justify-self: end; color: var(--gold); border-bottom: 1px solid currentColor; padding-bottom: 5px; }
.lights-debug { position: fixed; z-index: 30; top: 58px; right: 14px; width: 275px; }.lights-status { position: fixed; z-index: 40; inset: 0; display: grid; place-items: center; background: #050608; font: 9px ui-monospace,monospace; letter-spacing: .15em; text-transform: uppercase; }.lights-status--error { color: #c98071; }
.lights-section { position: relative; z-index: 1; padding: clamp(100px,11vw,180px) clamp(20px,6vw,96px); }
.lights-hero { min-height: 100svh; display: flex; flex-direction: column; justify-content: center; }
.lights-hero__eyebrow,.lights-heading > p,.lights-register__intro > p { margin: 0; color: var(--gold); font: 9px ui-monospace,monospace; letter-spacing: .15em; text-transform: uppercase; }
.lights-hero h1 { display: flex; flex-direction: column; margin: 22px 0 0; font-size: clamp(74px,13.4vw,205px); line-height: .78; letter-spacing: -.075em; font-weight: 300; }
.lights-hero h1 small { align-self: flex-end; margin: 25px 1vw 0 0; font: 10px ui-monospace,monospace; letter-spacing: .16em; text-transform: uppercase; }
.lights-hero__bottom { display: flex; align-items: flex-end; justify-content: space-between; gap: 40px; margin-top: clamp(60px,8vw,115px); }.lights-hero__bottom > p { margin: 0; color: var(--muted); font-size: clamp(19px,2vw,29px); line-height: 1.3; letter-spacing: -.02em; }
.lights-actions { display: flex; gap: 8px; }.lights-button { min-height: 50px; display: inline-flex; align-items: center; justify-content: space-between; gap: 36px; padding: 0 20px; color: var(--ink); background: rgba(5,6,8,.72); border: 1px solid var(--hairline); border-radius: 0; font: 9px ui-monospace,monospace; letter-spacing: .1em; text-transform: uppercase; text-decoration: none; cursor: pointer; }.lights-button b { color: var(--gold); }.lights-button--primary { color: #12120f; background: var(--ink); border-color: var(--ink); }.lights-button--primary b { color: #725c35; }
.lights-scroll { position: absolute; right: 6vw; bottom: 24px; margin: 0; color: var(--muted); font: 8px ui-monospace,monospace; letter-spacing: .13em; text-transform: uppercase; }.lights-scroll span { margin-left: 15px; color: var(--gold); }
.lights-heading { display: grid; grid-template-columns: 1fr auto; align-items: end; gap: 30px; }.lights-heading > p { grid-column: 1 / -1; }.lights-heading h2,.lights-register h2 { margin: 24px 0 0; font-size: clamp(52px,7.7vw,112px); line-height: .88; letter-spacing: -.065em; font-weight: 300; }.lights-heading > span { max-width: 300px; color: var(--muted); line-height: 1.55; }
.lights-about { min-height: 130svh; }.lights-about__copy { display: grid; grid-template-columns: 1.2fr .7fr; gap: clamp(50px,10vw,160px); width: min(1100px,100%); margin: clamp(100px,13vw,190px) 0 0 auto; }.lights-about__copy p { margin: 0; color: var(--muted); line-height: 1.7; }.lights-about__copy p:first-child { color: var(--ink); font-size: clamp(27px,3.5vw,50px); line-height: 1.12; letter-spacing: -.04em; }
.lights-metrics { display: grid; grid-template-columns: repeat(3,1fr); width: min(780px,75%); margin: 120px 0 0 auto; padding-top: 25px; border-top: 1px solid var(--hairline); }.lights-metrics div { display: flex; flex-direction: column; gap: 8px; }.lights-metrics dt { font-size: clamp(38px,5vw,72px); letter-spacing: -.06em; }.lights-metrics dd { margin: 0; color: var(--muted); font: 9px ui-monospace,monospace; letter-spacing: .11em; text-transform: uppercase; }
.lights-speakers { min-height: 225svh; }.lights-speakers__list { display: flex; flex-direction: column; gap: clamp(100px,13vw,200px); margin-top: 150px; }.lights-speaker { width: min(1020px,90%); display: grid; grid-template-columns: minmax(300px,43vw) minmax(280px,430px); align-items: center; gap: clamp(40px,8vw,125px); outline: none; }.lights-speaker--right { align-self: flex-end; grid-template-columns: minmax(280px,430px) minmax(300px,43vw); }.lights-speaker--right .lights-portrait { grid-column: 2; }.lights-speaker--right .lights-speaker__copy { grid-column: 1; grid-row: 1; }
.lights-portrait { width: 100%; aspect-ratio: 4/5; background-image: linear-gradient(180deg,transparent 55%,rgba(5,6,8,.4)),url('../../assets/speakers-contact-sheet.webp'); background-size: 100%,300% 200%; filter: grayscale(.65) contrast(1.06); }.lights-portrait--1 { background-position: 0,0 0; }.lights-portrait--2 { background-position: 0,50% 0; }.lights-portrait--3 { background-position: 0,100% 0; }.lights-portrait--5 { background-position: 0,50% 100%; }
.lights-speaker__copy > span { color: var(--gold); font: 9px ui-monospace,monospace; }.lights-speaker h3 { margin: 45px 0 10px; font-size: clamp(40px,5vw,72px); line-height: .94; letter-spacing: -.055em; font-weight: 300; }.lights-speaker__copy p { margin: 0; color: var(--muted); }.lights-speaker strong { display: block; max-width: 400px; margin-top: 72px; font-size: 18px; line-height: 1.42; font-weight: 400; }
.lights-voices { min-height: 175svh; }.lights-quotes { width: min(1040px,84%); margin: 120px 0 0 auto; }.lights-quote { min-height: 52svh; display: grid; grid-template-columns: 75px 1fr; align-content: center; margin: 0; padding: 70px 0; border-top: 1px solid var(--hairline); }.lights-quote > span { color: var(--gold); font: 9px ui-monospace,monospace; }.lights-quote blockquote { margin: 0; font-size: clamp(35px,5vw,72px); line-height: 1.08; letter-spacing: -.05em; font-weight: 300; }.lights-quote figcaption { grid-column: 2; display: flex; flex-direction: column; gap: 7px; margin-top: 44px; }.lights-quote figcaption strong { font-size: 12px; font-weight: 500; }.lights-quote figcaption small { color: var(--muted); font: 9px ui-monospace,monospace; }
.lights-register { min-height: 145svh; display: grid; grid-template-columns: .9fr 1fr; align-items: center; gap: clamp(60px,11vw,170px); }.lights-register__intro > span { display: block; margin-top: 45px; color: var(--muted); line-height: 1.65; }.lights-form { padding-top: 28px; border-top: 1px solid var(--hairline); }.lights-form > label,.lights-form > div label { display: flex; flex-direction: column; gap: 9px; margin-bottom: 29px; color: var(--muted); font: 8px ui-monospace,monospace; letter-spacing: .12em; text-transform: uppercase; }.lights-form > div { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }.lights-form input:not([type='checkbox']) { padding: 12px 0; color: var(--ink); background: transparent; border: 0; border-bottom: 1px solid rgba(241,239,233,.33); border-radius: 0; outline: none; font: 17px 'Helvetica Neue',sans-serif; text-transform: none; }.lights-form input:focus { border-color: var(--gold); }.lights-consent { flex-direction: row !important; align-items: flex-start; gap: 10px !important; text-transform: none !important; letter-spacing: 0 !important; }.lights-consent input { accent-color: var(--gold); }.lights-form .lights-button { width: 100%; }.lights-success { padding-top: 30px; border-top: 1px solid var(--gold); }.lights-success > span { color: var(--gold); font: 9px ui-monospace,monospace; letter-spacing: .12em; text-transform: uppercase; }.lights-success h3 { margin: 35px 0; font-size: clamp(48px,7vw,92px); line-height: .9; letter-spacing: -.06em; font-weight: 300; }.lights-success p { color: var(--muted); }
.lights-partners { min-height: 112svh; display: flex; flex-direction: column; justify-content: space-between; padding-bottom: 34px; }.lights-partners__content { margin: auto 0; }.lights-partners__grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 58px 35px; margin-top: 100px; }.lights-partners__grid span { color: rgba(241,239,233,.67); font: 11px ui-monospace,monospace; letter-spacing: .14em; text-align: center; }.lights-footer { display: grid; grid-template-columns: 1fr auto 1fr; align-items: end; gap: 25px; padding-top: 30px; border-top: 1px solid var(--hairline); font: 8px ui-monospace,monospace; letter-spacing: .12em; text-transform: uppercase; }.lights-footer > div { display: flex; gap: 18px; }.lights-footer > div:first-child { flex-direction: column; gap: 6px; }.lights-footer > div:last-child { justify-self: end; }.lights-footer a { color: inherit; text-decoration: none; }.lights-footer > a { color: var(--gold); }.lights-footer span { color: var(--muted); }
@media (max-width: 820px) { .lights-nav { grid-template-columns: 1fr auto; }.lights-nav span { display:none; }.lights-register { grid-template-columns: 1fr; }.lights-speaker,.lights-speaker--right { width:100%; grid-template-columns:1fr 1fr; } }
@media (max-width: 620px) {
  .lights-nav { padding: 16px 18px; }.lights-nav > a:last-child { padding: 8px 10px; border: 1px solid var(--hairline); }.lights-section { padding: 90px 18px; }
  .lights-hero { justify-content: flex-start; padding-top: 145px; }.lights-hero h1 { font-size: clamp(68px,21vw,96px); line-height:.82; }.lights-hero h1 small { align-self:flex-start; }.lights-hero__bottom { flex-direction:column; align-items:stretch; margin-top:70px; }.lights-actions { flex-direction:column; }.lights-button { width:100%; }.lights-scroll { display:none; }
  .lights-heading { display:block; }.lights-heading h2,.lights-register h2 { font-size:49px; }.lights-heading > span { display:block; margin-top:30px; }.lights-about { min-height:145svh; }.lights-about__copy { grid-template-columns:1fr; gap:32px; margin-top:85px; }.lights-metrics { width:100%; margin-top:70px; }.lights-metrics dt { font-size:34px; }
  .lights-speakers { min-height:320svh; }.lights-speakers__list { margin-top:100px; gap:110px; }.lights-speaker,.lights-speaker--right { display:flex; flex-direction:column; gap:34px; }.lights-speaker--right .lights-portrait { order:0; }.lights-speaker--right .lights-speaker__copy { order:1; }.lights-portrait { aspect-ratio:4/4.8; }.lights-speaker h3 { margin-top:34px; }.lights-speaker strong { margin-top:38px; }
  .lights-voices { min-height:205svh; }.lights-quotes { width:100%; margin-top:80px; }.lights-quote { min-height:58svh; display:block; }.lights-quote blockquote { margin-top:42px; font-size:37px; }.lights-quote figcaption { margin-top:38px; }
  .lights-register { min-height:175svh; align-content:center; gap:90px; }.lights-form > div { grid-template-columns:1fr; gap:0; }.lights-partners__grid { grid-template-columns:repeat(2,1fr); gap:45px 18px; margin-top:70px; }.lights-footer { grid-template-columns:1fr auto; }.lights-footer > a,.lights-footer > div:last-child { grid-row:2; }.lights-footer > div:last-child a { display:none; }
}
@media (prefers-reduced-motion: reduce) { .lights-reveal { opacity:1 !important; transform:none !important; }.lights-portrait { clip-path:none !important; } }
</style>
