<script setup lang="ts">
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { onMounted, onUnmounted, ref } from 'vue'
import { useThreeScene } from '../../composables/useThreeScene'
import { useDebugPane } from '../../composables/useDebugPane'
import { createConferenceJourneyScene } from './scene'

gsap.registerPlugin(ScrollTrigger)

const speakers = [
  { name: 'Майя Чен', role: 'VP of Product', company: 'Arc Systems', talk: 'Технологии, которые становятся невидимыми' },
  { name: 'Томас Рид', role: 'Founder', company: 'Common Ground', talk: 'Как строить продукты для следующего десятилетия' },
  { name: 'Амара Окойе', role: 'AI Research Director', company: 'North Lab', talk: 'Интеллект как новая инфраструктура' },
  { name: 'Рави Менон', role: 'Design Partner', company: 'Field Office', talk: 'Дизайн решений в условиях неизвестности' },
  { name: 'Елена Восс', role: 'Climate Tech Lead', company: 'Tide', talk: 'Системное мышление для меняющегося мира' },
  { name: 'Даниэль Ким', role: 'Creative Technologist', company: 'Otherlight', talk: 'Новые интерфейсы между человеком и машиной' },
] as const

const testimonials = [
  {
    quote: 'Редкий формат, после которого остаются не только заметки, но и решения, которые хочется применить уже на следующий день.',
    author: 'Анна Смирнова', company: 'Product Director, Forma', edition: 'Участница конференции 2025',
  },
  {
    quote: 'Очень сильная программа без информационного шума. Разговоры о будущем были конкретными, честными и применимыми.',
    author: 'Михаил Орлов', company: 'CEO, Detail', edition: 'Участник конференции 2025',
  },
  {
    quote: 'Организаторам удалось соединить людей из разных индустрий в одну содержательную дискуссию.',
    author: 'Софья Ли', company: 'Strategy Lead, Parallel', edition: 'Спикер конференции 2024',
  },
] as const

const partners = ['NORTHSTAR', 'SIGNAL', 'ORBIT', 'VECTOR', 'POLARIS', 'STUDIO 27', 'TIDE'] as const

const page = ref<HTMLElement | null>(null)
const submitted = ref(false)
const { container, ready, error, metrics } = useThreeScene(createConferenceJourneyScene)
const { debug, paneHost } = useDebugPane(metrics, {
  title: 'Journey runtime',
  bindings: [
    { key: 'fps', label: 'FPS' }, { key: 'dpr', label: 'DPR' }, { key: 'quality', label: 'Quality' },
    { key: 'scrollProgress', label: 'Progress' }, { key: 'section', label: 'Section' },
    { key: 'particles', label: 'Particles' }, { key: 'calls', label: 'Draw calls' }, { key: 'triangles', label: 'Triangles' },
  ],
})
defineExpose({ container, paneHost })

let animationContext: gsap.Context | undefined

const focusSpeaker = (index: number): void => {
  if (window.matchMedia('(hover: hover)').matches) {
    container.value?.dispatchEvent(new CustomEvent<number>('speakerfocus', { detail: index }))
  }
}

const submitRegistration = (): void => {
  submitted.value = true
  container.value?.dispatchEvent(new CustomEvent('journeycomplete'))
}

onMounted(() => {
  if (!page.value || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  animationContext = gsap.context(() => {
    page.value?.querySelectorAll<HTMLElement>('.journey-reveal').forEach((element) => {
      gsap.fromTo(element,
        { autoAlpha: 0, y: 32, filter: 'blur(4px)' },
        { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.9, ease: 'power2.out', scrollTrigger: { trigger: element, start: 'top 84%', once: true } },
      )
    })
  }, page.value)
})

onUnmounted(() => {
  animationContext?.revert()
})
</script>

<template>
  <main ref="page" class="journey">
    <div ref="container" class="journey__canvas" aria-hidden="true" />
    <div class="journey__veil" aria-hidden="true" />

    <nav class="journey-nav" aria-label="Основная навигация">
      <RouterLink to="/" class="journey-nav__back">← Lab</RouterLink>
      <a href="#top" class="journey-nav__brand">Horizon / 26</a>
      <div class="journey-nav__right">
        <span>17 · 10 · 2026</span>
        <a href="#registration" class="journey-nav__cta">Регистрация</a>
      </div>
    </nav>

    <div v-if="debug" ref="paneHost" class="journey-debug" />
    <div v-if="!ready && !error" class="journey-loading">Preparing the horizon…</div>
    <div v-if="error" class="journey-loading journey-loading--error">{{ error }}</div>

    <section id="top" class="journey-section journey-hero">
      <div class="journey-hero__content">
        <p class="journey-kicker">Онлайн-конференция о технологиях и будущем</p>
        <h1>За пределами<br /><em>известного.</em></h1>
        <div class="journey-hero__meta">
          <p>17 октября 2026<br />10:00–18:00 МСК · Online</p>
          <p>A journey through technology,<br />ideas and the future.</p>
        </div>
        <div class="journey-actions">
          <a href="#registration" class="journey-button journey-button--primary">Зарегистрироваться <span>↗</span></a>
          <a href="#about" class="journey-button journey-button--quiet">Узнать подробнее</a>
        </div>
      </div>
      <p class="journey-scroll-cue">Scroll to begin <span>↓</span></p>
    </section>

    <section id="about" class="journey-section journey-about">
      <div class="journey-copy journey-reveal">
        <p class="journey-label">01 / О конференции</p>
        <h2>Один день, чтобы увидеть следующий горизонт.</h2>
        <p class="journey-lead">
          Horizon объединяет исследователей, основателей и дизайнеров, которые создают технологии с долгим горизонтом. Без шума и общих слов — только идеи, решения и честный разговор о будущем.
        </p>
        <dl class="journey-stats">
          <div><dt>20+</dt><dd>спикеров</dd></div>
          <div><dt>8</dt><dd>часов контента</dd></div>
          <div><dt>1</dt><dd>день</dd></div>
        </dl>
      </div>
    </section>

    <section id="speakers" class="journey-section journey-speakers">
      <header class="journey-section__header journey-reveal">
        <p class="journey-label">02 / Точки навигации</p>
        <h2>Спикеры</h2>
        <p>Люди, которые превращают неопределённость в направление.</p>
      </header>
      <div class="speakers-grid">
        <article
          v-for="(speaker, index) in speakers"
          :key="speaker.name"
          class="speaker-card journey-reveal"
          @mouseenter="focusSpeaker(index)"
          @mouseleave="focusSpeaker(-1)"
          @focusin="focusSpeaker(index)"
          @focusout="focusSpeaker(-1)"
        >
          <div :class="['speaker-card__photo', `speaker-card__photo--${index + 1}`]" role="img" :aria-label="`Портрет: ${speaker.name}`" />
          <div class="speaker-card__body">
            <p class="speaker-card__index">0{{ index + 1 }}</p>
            <h3>{{ speaker.name }}</h3>
            <p>{{ speaker.role }} · {{ speaker.company }}</p>
            <strong>{{ speaker.talk }}</strong>
          </div>
        </article>
      </div>
    </section>

    <section id="testimonials" class="journey-section journey-testimonials">
      <header class="journey-section__header journey-reveal">
        <p class="journey-label">03 / Предыдущий маршрут</p>
        <h2>Что говорили участники</h2>
      </header>
      <div class="testimonials-list">
        <figure v-for="testimonial in testimonials" :key="testimonial.author" class="testimonial journey-reveal">
          <blockquote>«{{ testimonial.quote }}»</blockquote>
          <figcaption>
            <strong>{{ testimonial.author }}</strong>
            <span>{{ testimonial.company }}</span>
            <small>{{ testimonial.edition }}</small>
          </figcaption>
        </figure>
      </div>
    </section>

    <section id="registration" class="journey-section journey-registration">
      <div class="registration-panel journey-reveal">
        <div class="registration-panel__intro">
          <p class="journey-label">04 / Точка назначения</p>
          <h2>Присоединяйтесь<br />к конференции</h2>
          <p>Участие бесплатно. После регистрации мы отправим подтверждение и ссылку на трансляцию.</p>
          <ul>
            <li><span>Дата</span>17 октября 2026</li>
            <li><span>Время</span>10:00–18:00 МСК</li>
            <li><span>Формат</span>Online</li>
          </ul>
        </div>

        <form v-if="!submitted" class="registration-form" @submit.prevent="submitRegistration">
          <label>Имя<input name="name" type="text" autocomplete="name" required placeholder="Как к вам обращаться" /></label>
          <label>Email<input name="email" type="email" autocomplete="email" required placeholder="name@company.com" /></label>
          <div class="registration-form__row">
            <label>Компания<input name="company" type="text" autocomplete="organization" placeholder="Название компании" /></label>
            <label>Должность<input name="role" type="text" autocomplete="organization-title" placeholder="Ваша роль" /></label>
          </div>
          <label class="registration-form__consent">
            <input type="checkbox" required />
            <span>Я согласен с обработкой персональных данных и правилами участия.</span>
          </label>
          <button type="submit" class="journey-button journey-button--primary">Зарегистрироваться <span>↗</span></button>
          <small>Никакого спама. Только важные обновления конференции.</small>
        </form>

        <div v-else class="registration-success" role="status" aria-live="polite">
          <span>Маршрут построен</span>
          <h3>Вы зарегистрированы.</h3>
          <p>Письмо с подтверждением уже направляется на вашу почту.</p>
        </div>
      </div>
    </section>

    <section id="partners" class="journey-section journey-partners">
      <div class="journey-partners__content journey-reveal">
        <p class="journey-label">05 / Вместе с нами</p>
        <h2>Партнёры конференции</h2>
        <div class="partners-grid" aria-label="Партнёры">
          <div v-for="partner in partners" :key="partner">{{ partner }}</div>
        </div>
      </div>
      <footer class="journey-footer">
        <div><strong>Horizon</strong><span>Odyssey Conference · 2026</span></div>
        <a href="#registration">Зарегистрироваться ↑</a>
        <div class="journey-footer__links"><a href="#">Telegram</a><a href="#">YouTube</a><span>© 2026</span></div>
      </footer>
    </section>
  </main>
</template>

<style scoped>
.journey {
  --paper: #e9eeeb;
  --mist: #a4b0af;
  --gold: #ba9c5d;
  --line: rgba(224, 235, 231, .16);
  position: relative;
  color: var(--paper);
  background: #031017;
  isolation: isolate;
  font-family: 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
}

.journey__canvas { position: fixed; z-index: -2; inset: 0; width: 100%; height: 100svh; }
.journey__canvas :deep(canvas) { display: block; width: 100%; height: 100%; }
.journey__veil { position: fixed; z-index: -1; inset: 0; pointer-events: none; background: linear-gradient(90deg, rgba(1, 6, 9, .45), transparent 55%), linear-gradient(0deg, rgba(1, 5, 8, .34), transparent 42%); }
.journey-nav { position: fixed; z-index: 10; inset: 0 0 auto; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 18px clamp(18px, 3.4vw, 54px); font: 10px/1 ui-monospace, monospace; letter-spacing: .13em; text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,.08); background: linear-gradient(#02080bbb, transparent); backdrop-filter: blur(4px); }
.journey-nav a { color: inherit; text-decoration: none; }
.journey-nav__back { color: #a7b0ae !important; }
.journey-nav__brand { font-weight: 600; }
.journey-nav__right { justify-self: end; display: flex; align-items: center; gap: 26px; color: #a7b0ae; }
.journey-nav__cta { padding-bottom: 5px; border-bottom: 1px solid var(--gold); color: var(--paper) !important; }
.journey-debug { position: fixed; z-index: 20; top: 64px; right: 14px; width: 270px; }
.journey-loading { position: fixed; z-index: 30; inset: 0; display: grid; place-items: center; background: #02090d; font: 10px ui-monospace, monospace; letter-spacing: .14em; text-transform: uppercase; }
.journey-loading--error { color: #d98977; }

.journey-section { position: relative; z-index: 1; width: 100%; padding: clamp(86px, 11vw, 170px) clamp(22px, 6vw, 96px); }
.journey-hero { min-height: 100svh; display: flex; align-items: center; padding-top: 120px; }
.journey-hero__content { width: min(1050px, 100%); }
.journey-kicker, .journey-label { margin: 0 0 34px; color: var(--gold); font: 10px/1.5 ui-monospace, monospace; letter-spacing: .15em; text-transform: uppercase; }
.journey-hero h1 { margin: 0; font-size: clamp(62px, 11vw, 164px); font-weight: 300; line-height: .76; letter-spacing: -.075em; }
.journey-hero h1 em { font-family: 'Iowan Old Style', Baskerville, Georgia, serif; font-weight: 300; color: #aebfbd; }
.journey-hero__meta { display: flex; gap: clamp(34px, 8vw, 120px); margin: clamp(44px, 7vw, 86px) 0 34px; color: #b2bcba; font-size: 13px; line-height: 1.65; }
.journey-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.journey-button { display: inline-flex; min-height: 50px; align-items: center; justify-content: center; gap: 42px; padding: 0 22px; color: var(--paper); border: 1px solid rgba(255,255,255,.18); border-radius: 2px; background: rgba(3,10,14,.26); font: 10px ui-monospace, monospace; letter-spacing: .11em; text-transform: uppercase; text-decoration: none; cursor: pointer; transition: background-color .25s, border-color .25s, color .25s; }
.journey-button--primary { color: #101413; background: #dce2dd; border-color: #dce2dd; }
.journey-button--primary:hover { background: #f3f2e9; border-color: #f3f2e9; }
.journey-button--quiet:hover { border-color: rgba(255,255,255,.5); }
.journey-scroll-cue { position: absolute; right: clamp(22px, 5vw, 80px); bottom: 30px; margin: 0; color: #8d9a99; font: 9px ui-monospace, monospace; letter-spacing: .12em; text-transform: uppercase; }
.journey-scroll-cue span { margin-left: 14px; color: var(--gold); }

.journey-about { min-height: 110svh; display: flex; align-items: center; justify-content: flex-end; }
.journey-copy { width: min(690px, 86%); padding: clamp(28px, 5vw, 62px); background: rgba(2, 9, 13, .58); border: 1px solid var(--line); backdrop-filter: blur(14px); }
.journey-copy h2, .journey-section__header h2, .registration-panel h2, .journey-partners h2 { margin: 0; font-size: clamp(42px, 6vw, 86px); line-height: .97; letter-spacing: -.055em; font-weight: 300; }
.journey-lead { max-width: 620px; margin: 35px 0 52px; color: #b9c1bf; font-size: clamp(15px, 1.5vw, 19px); line-height: 1.7; font-weight: 300; }
.journey-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 0; padding-top: 25px; border-top: 1px solid var(--line); }
.journey-stats div { display: flex; flex-direction: column; }
.journey-stats dt { font-size: clamp(36px, 5vw, 64px); font-weight: 300; letter-spacing: -.04em; }
.journey-stats dd { margin: 5px 0 0; color: var(--mist); font: 9px ui-monospace, monospace; letter-spacing: .1em; text-transform: uppercase; }

.journey-speakers { min-height: 160svh; padding-top: 150px; }
.journey-section__header { display: grid; grid-template-columns: minmax(260px, 1fr) minmax(220px, 420px); align-items: end; gap: 40px; margin-bottom: clamp(56px, 8vw, 112px); }
.journey-section__header .journey-label { grid-column: 1 / -1; margin-bottom: 0; }
.journey-section__header > p:last-child { color: var(--mist); line-height: 1.65; margin: 0; }
.speakers-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--line); border: 1px solid var(--line); }
.speaker-card { min-width: 0; background: rgba(2, 8, 12, .82); transition: background-color .3s; }
.speaker-card:hover { background: rgba(12, 24, 28, .92); }
.speaker-card__photo { aspect-ratio: 3 / 2; background-image: url('../../assets/speakers-contact-sheet.webp'); background-size: 300% 200%; filter: saturate(.62) contrast(.95); transition: filter .35s, transform .5s; }
.speaker-card:hover .speaker-card__photo { filter: saturate(.82) contrast(1.02); }
.speaker-card__photo--1 { background-position: 0 0; }
.speaker-card__photo--2 { background-position: 50% 0; }
.speaker-card__photo--3 { background-position: 100% 0; }
.speaker-card__photo--4 { background-position: 0 100%; }
.speaker-card__photo--5 { background-position: 50% 100%; }
.speaker-card__photo--6 { background-position: 100% 100%; }
.speaker-card__body { position: relative; min-height: 220px; padding: 28px; }
.speaker-card__index { position: absolute; top: 31px; right: 28px; margin: 0; color: var(--gold); font: 9px ui-monospace, monospace; }
.speaker-card h3 { margin: 0 0 8px; font-size: 24px; font-weight: 400; letter-spacing: -.025em; }
.speaker-card__body > p:not(.speaker-card__index) { margin: 0; color: var(--mist); font-size: 12px; }
.speaker-card strong { display: block; margin-top: 52px; max-width: 280px; font-size: 14px; line-height: 1.5; font-weight: 400; }

.journey-testimonials { min-height: 125svh; background: linear-gradient(90deg, rgba(1,7,10,.6), rgba(1,7,10,.12)); }
.testimonials-list { margin-left: auto; width: min(920px, 100%); }
.testimonial { display: grid; grid-template-columns: 1fr 230px; gap: 50px; margin: 0; padding: clamp(35px, 6vw, 75px) 0; border-top: 1px solid var(--line); }
.testimonial:last-child { border-bottom: 1px solid var(--line); }
.testimonial blockquote { margin: 0; font-family: 'Iowan Old Style', Baskerville, Georgia, serif; font-size: clamp(24px, 3vw, 42px); line-height: 1.25; font-weight: 300; }
.testimonial figcaption { display: flex; flex-direction: column; align-self: end; gap: 5px; font-size: 12px; color: var(--mist); }
.testimonial figcaption strong { color: var(--paper); font-weight: 500; }
.testimonial figcaption small { margin-top: 14px; font: 9px ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase; }

.journey-registration { min-height: 135svh; display: grid; place-items: center; }
.registration-panel { width: min(1180px, 100%); display: grid; grid-template-columns: .9fr 1.1fr; gap: clamp(50px, 8vw, 120px); padding: clamp(30px, 5vw, 72px); color: #172022; background: rgba(226, 231, 224, .94); box-shadow: 0 30px 120px rgba(0,0,0,.26); backdrop-filter: blur(18px); }
.registration-panel .journey-label { color: #806c3e; }
.registration-panel__intro > p:not(.journey-label) { max-width: 450px; margin: 28px 0 42px; color: #536061; line-height: 1.6; }
.registration-panel__intro ul { list-style: none; margin: 0; padding: 0; border-top: 1px solid rgba(20,35,37,.18); }
.registration-panel__intro li { display: flex; justify-content: space-between; padding: 13px 0; border-bottom: 1px solid rgba(20,35,37,.18); font-size: 13px; }
.registration-panel__intro li span { color: #687373; font: 9px ui-monospace, monospace; text-transform: uppercase; letter-spacing: .1em; }
.registration-form { display: flex; flex-direction: column; justify-content: center; gap: 24px; }
.registration-form label { display: flex; flex-direction: column; gap: 9px; color: #596363; font: 9px ui-monospace, monospace; letter-spacing: .11em; text-transform: uppercase; }
.registration-form input[type='text'], .registration-form input[type='email'] { width: 100%; padding: 12px 0; color: #142022; background: transparent; border: 0; border-bottom: 1px solid rgba(20,35,37,.28); border-radius: 0; outline: 0; font: 16px 'Helvetica Neue', sans-serif; text-transform: none; transition: border-color .2s; }
.registration-form input:focus { border-color: #5e6e6c; }
.registration-form__row { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; }
.registration-form__consent { flex-direction: row !important; align-items: flex-start; gap: 10px !important; line-height: 1.5; text-transform: none !important; letter-spacing: .02em !important; }
.registration-form__consent input { margin: 1px 0 0; accent-color: #283c3d; }
.registration-form .journey-button { width: 100%; color: white; background: #172628; border-color: #172628; }
.registration-form > small { color: #7d8584; text-align: center; font-size: 10px; }
.registration-success { align-self: center; padding: 45px; border: 1px solid rgba(20,35,37,.18); }
.registration-success span { color: #806c3e; font: 9px ui-monospace, monospace; letter-spacing: .12em; text-transform: uppercase; }
.registration-success h3 { margin: 25px 0 12px; font-size: clamp(34px, 4vw, 58px); font-weight: 300; letter-spacing: -.045em; }
.registration-success p { color: #596363; line-height: 1.6; }

.journey-partners { min-height: 100svh; display: flex; flex-direction: column; justify-content: space-between; padding-bottom: 34px; }
.journey-partners__content { margin: auto 0; }
.partners-grid { display: grid; grid-template-columns: repeat(4, 1fr); margin-top: 70px; border-top: 1px solid var(--line); border-left: 1px solid var(--line); }
.partners-grid div { min-height: 120px; display: grid; place-items: center; color: rgba(225,233,230,.63); border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); font: 12px ui-monospace, monospace; letter-spacing: .15em; }
.journey-footer { display: grid; grid-template-columns: 1fr auto 1fr; align-items: end; gap: 25px; padding-top: 34px; border-top: 1px solid var(--line); font: 9px ui-monospace, monospace; letter-spacing: .1em; text-transform: uppercase; }
.journey-footer > div:first-child { display: flex; flex-direction: column; gap: 8px; }
.journey-footer strong { font-size: 15px; }
.journey-footer span { color: var(--mist); }
.journey-footer a { color: inherit; text-decoration: none; }
.journey-footer > a { color: var(--gold); }
.journey-footer__links { justify-self: end; display: flex; gap: 20px; }

@media (max-width: 900px) {
  .journey-nav { grid-template-columns: 1fr auto; }
  .journey-nav__brand { display: none; }
  .journey-nav__right span { display: none; }
  .speakers-grid { grid-template-columns: repeat(2, 1fr); }
  .registration-panel { grid-template-columns: 1fr; }
  .partners-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 620px) {
  .journey-nav, .journey-copy, .registration-panel { backdrop-filter: none; }
  .journey__veil { background: linear-gradient(0deg, rgba(1,5,8,.55), transparent 55%); }
  .journey-nav { padding: 17px 18px; }
  .journey-nav__cta { padding: 9px 11px; border: 1px solid rgba(255,255,255,.24); }
  .journey-section { padding-inline: 18px; }
  .journey-hero { align-items: flex-end; padding-bottom: 90px; }
  .journey-hero h1 { font-size: clamp(57px, 19vw, 90px); }
  .journey-hero__meta { flex-direction: column; gap: 8px; margin: 42px 0 30px; }
  .journey-hero__meta p:last-child { display: none; }
  .journey-button { width: 100%; justify-content: space-between; }
  .journey-scroll-cue { display: none; }
  .journey-copy { width: 100%; padding: 27px 22px; }
  .journey-copy h2, .journey-section__header h2, .registration-panel h2, .journey-partners h2 { font-size: 42px; }
  .journey-stats { gap: 8px; }
  .journey-stats dt { font-size: 34px; }
  .journey-stats dd { font-size: 8px; }
  .journey-section__header { display: block; }
  .journey-section__header h2 { margin-bottom: 22px; }
  .speakers-grid { grid-template-columns: 1fr; }
  .speaker-card__body { min-height: 190px; }
  .testimonial { grid-template-columns: 1fr; gap: 25px; }
  .registration-panel { padding: 30px 20px; gap: 48px; }
  .registration-form__row { grid-template-columns: 1fr; gap: 24px; }
  .partners-grid div { min-height: 90px; font-size: 10px; }
  .journey-footer { grid-template-columns: 1fr auto; }
  .journey-footer > a { grid-row: 2; }
  .journey-footer__links { grid-row: 2; }
  .journey-footer__links a { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .journey-reveal { opacity: 1 !important; transform: none !important; filter: none !important; }
  .journey-button, .speaker-card, .speaker-card__photo { transition: none; }
}
</style>
