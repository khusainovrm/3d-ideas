<script setup lang="ts">
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { onMounted, onUnmounted, ref } from 'vue'
import { useDebugPane } from '../../composables/useDebugPane'
import { useThreeScene } from '../../composables/useThreeScene'
import { createSummitJourneyScene } from './scene'

gsap.registerPlugin(ScrollTrigger)

const speakers = [
  { name: 'Майя Чен', role: 'VP Product', company: 'Arc Systems', topic: 'Технологии, которые становятся частью повседневности', portrait: 1 },
  { name: 'Рави Менон', role: 'Design Partner', company: 'Field Office', topic: 'Как видеть направление, пока карта ещё не готова', portrait: 2 },
  { name: 'Амара Окойе', role: 'Research Director', company: 'North Lab', topic: 'Новая инфраструктура человеческого знания', portrait: 3 },
  { name: 'Елена Восс', role: 'Climate Tech Lead', company: 'Tide', topic: 'Длинный горизонт решений', portrait: 5 },
] as const
const testimonials = [
  { quote: 'Сильная программа и очень точный подбор спикеров. Возвращаешься с ясностью, а не с папкой случайных заметок.', name: 'Анна Смирнова', company: 'Product Director, Forma', year: 'Участница 2025' },
  { quote: 'Редкий разговор о будущем без лишнего шума. Один день помог увидеть следующий год работы целиком.', name: 'Михаил Орлов', company: 'CEO, Detail', year: 'Участник 2025' },
  { quote: 'Маршрут оказался важнее финальной точки: лучшие идеи возникли между докладами и остались надолго.', name: 'Софья Ли', company: 'Strategy Lead, Parallel', year: 'Спикер 2024' },
] as const
const partners = ['NORTHSTAR', 'ARC SYSTEMS', 'COMMON GROUND', 'TIDE', 'PARALLEL', 'FIELD OFFICE', 'SIGNAL', 'OTHERLIGHT'] as const

const page = ref<HTMLElement | null>(null)
const submitted = ref(false)
const { container, ready, error, metrics } = useThreeScene(createSummitJourneyScene)
const { debug, paneHost } = useDebugPane(metrics, {
  title: 'Summit journey',
  bindings: [
    { key: 'fps', label: 'FPS' }, { key: 'dpr', label: 'DPR' }, { key: 'quality', label: 'Quality' },
    { key: 'calls', label: 'Draw Calls' }, { key: 'triangles', label: 'Triangles' },
    { key: 'terrainSegments', label: 'Terrain Segments' }, { key: 'propsCount', label: 'Props Count' },
    { key: 'section', label: 'Current Section' }, { key: 'cameraProgress', label: 'Camera Progress' },
    { key: 'scrollProgress', label: 'Scroll Progress' }, { key: 'postprocessing', label: 'Postprocessing Enabled' },
    { key: 'shadows', label: 'Shadows Enabled' },
  ],
})
defineExpose({ container, paneHost })

let context: gsap.Context | undefined
const speakerTriggers: ScrollTrigger[] = []
const focusSpeaker = (index: number): void => {
  container.value?.dispatchEvent(new CustomEvent<number>('summitspeakerfocus', { detail: index }))
}
const submit = (): void => {
  submitted.value = true
  container.value?.dispatchEvent(new CustomEvent('summitcomplete'))
}

onMounted(() => {
  document.documentElement.classList.add('summit-page-active')
  if (!page.value) return
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  context = gsap.context(() => {
    if (reducedMotion) return
    gsap.utils.toArray<HTMLElement>('.summit-reveal').forEach((element) => {
      gsap.fromTo(element, { autoAlpha: 0, y: 34 }, {
        autoAlpha: 1, y: 0, duration: 1.05, ease: 'power3.out',
        scrollTrigger: { trigger: element, start: 'top 87%', once: true },
      })
    })
    gsap.utils.toArray<HTMLElement>('.summit-speaker__image').forEach((element) => {
      gsap.fromTo(element, { clipPath: 'inset(0 0 100% 0)', scale: 1.04 }, {
        clipPath: 'inset(0 0 0% 0)', scale: 1, duration: 1.25, ease: 'power3.inOut',
        scrollTrigger: { trigger: element, start: 'top 82%', once: true },
      })
    })
  }, page.value)

  if (window.matchMedia('(pointer: coarse)').matches) {
    page.value.querySelectorAll<HTMLElement>('.summit-speaker').forEach((element, index) => {
      speakerTriggers.push(ScrollTrigger.create({
        trigger: element, start: 'top 65%', end: 'bottom 35%',
        onEnter: () => focusSpeaker(index), onEnterBack: () => focusSpeaker(index),
        onLeave: () => focusSpeaker(-1), onLeaveBack: () => focusSpeaker(-1),
      }))
    })
  }
})

onUnmounted(() => {
  document.documentElement.classList.remove('summit-page-active')
  speakerTriggers.forEach((trigger) => trigger.kill())
  context?.revert()
})
</script>

<template>
  <main ref="page" class="summit-page">
    <div ref="container" class="summit-canvas" aria-hidden="true" />
    <div class="summit-shade" aria-hidden="true" />
    <nav class="summit-nav" aria-label="Навигация по странице">
      <RouterLink to="/">Visual lab <span>↙</span></RouterLink>
      <span class="summit-nav__mark">The Odyssey · 2026</span>
      <a href="#summit-registration">Регистрация <span>↗</span></a>
    </nav>
    <div v-if="debug" ref="paneHost" class="summit-debug" />
    <div v-if="!ready && !error" class="summit-status">Готовим маршрут…</div>
    <div v-if="error" class="summit-status summit-status--error">{{ error }}</div>

    <section class="summit-section summit-hero" aria-labelledby="summit-title">
      <div class="summit-coordinate">56° 00′ N<br />37° 00′ E</div>
      <div class="summit-hero__title">
        <p>20 ноября · Online</p>
        <h1 id="summit-title">ОДИССЕЯ</h1>
        <span>Конференция 2026</span>
      </div>
      <div class="summit-hero__footer">
        <p>Путь через идеи,<br />технологии и будущее.</p>
        <div class="summit-actions">
          <a class="summit-button summit-button--light" href="#summit-registration">Зарегистрироваться <b>↗</b></a>
          <a class="summit-button" href="#summit-about">Начать путь <b>↓</b></a>
        </div>
      </div>
      <div class="summit-altitude"><span>Base camp</span><i /><b>00 / 05</b></div>
    </section>

    <section id="summit-about" class="summit-section summit-about" aria-labelledby="about-title">
      <header class="summit-heading summit-reveal">
        <p>01 / Первый подъём</p>
        <h2 id="about-title">О конференции</h2>
      </header>
      <div class="summit-about__body summit-reveal">
        <p class="summit-lead">Один день для тех, кто создаёт продукты, культуру и технологии с длинным горизонтом.</p>
        <p>Практики из разных индустрий сравнят маршруты и покажут решения, которые помогают двигаться через неопределённость. Без информационного шума и общих прогнозов.</p>
      </div>
      <dl class="summit-metrics summit-reveal">
        <div><dt>20+</dt><dd>спикеров</dd></div>
        <div><dt>8</dt><dd>часов контента</dd></div>
        <div><dt>1</dt><dd>день онлайн</dd></div>
      </dl>
    </section>

    <section class="summit-section summit-speakers" aria-labelledby="speakers-title">
      <header class="summit-heading summit-reveal">
        <p>02 / Гребень</p>
        <h2 id="speakers-title">Люди,<br />задающие ориентиры</h2>
        <span>Каждый разговор — отдельная точка на маршруте. В программе более двадцати голосов.</span>
      </header>
      <div class="summit-speakers__list">
        <article
          v-for="(speaker, index) in speakers" :key="speaker.name"
          :class="['summit-speaker', { 'summit-speaker--reverse': index % 2 === 1 }]" tabindex="0"
          @mouseenter="focusSpeaker(index)" @mouseleave="focusSpeaker(-1)"
          @focusin="focusSpeaker(index)" @focusout="focusSpeaker(-1)"
        >
          <div :class="['summit-speaker__image', `summit-speaker__image--${speaker.portrait}`]" role="img" :aria-label="speaker.name"><span>0{{ index + 1 }}</span></div>
          <div class="summit-speaker__copy summit-reveal">
            <p>{{ speaker.role }} · {{ speaker.company }}</p>
            <h3>{{ speaker.name }}</h3>
            <strong>{{ speaker.topic }}</strong>
            <i>View point — {{ 1240 + index * 180 }} m</i>
          </div>
        </article>
      </div>
    </section>

    <section class="summit-section summit-voices" aria-labelledby="voices-title">
      <header class="summit-heading summit-reveal">
        <p>03 / Долина эха</p>
        <h2 id="voices-title">Отзывы участников</h2>
      </header>
      <div class="summit-quotes">
        <figure v-for="(item, index) in testimonials" :key="item.name" class="summit-quote summit-reveal">
          <span>0{{ index + 1 }}</span>
          <blockquote>«{{ item.quote }}»</blockquote>
          <figcaption><strong>{{ item.name }}</strong><small>{{ item.company }}<br />{{ item.year }}</small></figcaption>
        </figure>
      </div>
    </section>

    <section id="summit-registration" class="summit-section summit-registration" aria-labelledby="registration-title">
      <div class="summit-registration__copy summit-reveal">
        <p>04 / Вершина · 20 ноября 2026</p>
        <h2 id="registration-title">Присоединяйтесь<br />к конференции</h2>
        <span>10:00–18:00 МСК · Online<br />Участие бесплатно</span>
      </div>
      <form v-if="!submitted" class="summit-form summit-reveal" @submit.prevent="submit">
        <label>Имя<input name="name" autocomplete="name" placeholder="Как к вам обращаться" required /></label>
        <label>Email<input name="email" autocomplete="email" type="email" placeholder="name@company.com" required /></label>
        <div><label>Компания<input name="company" autocomplete="organization" placeholder="Название" /></label><label>Должность<input name="position" autocomplete="organization-title" placeholder="Ваша роль" /></label></div>
        <label class="summit-check"><input type="checkbox" required /><span>Согласен с обработкой персональных данных</span></label>
        <button class="summit-button summit-button--gold" type="submit">Зарегистрироваться <b>↗</b></button>
      </form>
      <div v-else class="summit-success" role="status" aria-live="polite">
        <span>Маршрут подтверждён · 2 460 m</span><h3>Вы на вершине.</h3><p>Подтверждение участия отправлено на вашу почту.</p>
      </div>
    </section>

    <section class="summit-section summit-partners" aria-labelledby="partners-title">
      <div class="summit-partners__body summit-reveal">
        <header class="summit-heading"><p>05 / Верхнее плато</p><h2 id="partners-title">Партнёры конференции</h2></header>
        <div class="summit-partners__grid"><span v-for="partner in partners" :key="partner">{{ partner }}</span></div>
      </div>
      <footer class="summit-footer">
        <div><strong>ОДИССЕЯ</strong><span>2026</span></div>
        <p>Путь продолжается<br />за горизонтом.</p>
        <a href="#summit-registration">Зарегистрироваться ↑</a>
        <div><a href="#">Telegram</a><a href="#">YouTube</a><span>© 2026</span></div>
      </footer>
    </section>
  </main>
</template>

<style scoped>
.summit-page { --ivory:#ece8dd; --muted:rgba(236,232,221,.58); --line:rgba(236,232,221,.2); --gold:#bea369; position:relative; isolation:isolate; width:100%; overflow:hidden; color:var(--ivory); background:#071016; font-family:Inter,'Helvetica Neue',Arial,sans-serif; }
:global(html.summit-page-active),:global(html.summit-page-active body){ max-width:100%; overflow-x:hidden; background:#071016; scroll-behavior:smooth; }
.summit-canvas{position:fixed;z-index:-3;inset:0;width:100%;height:100svh;background:#071016}.summit-canvas :deep(canvas){display:block;width:100%;height:100%}
.summit-shade{position:fixed;z-index:-2;inset:0;pointer-events:none;background:linear-gradient(90deg,rgba(3,8,11,.6),transparent 48%,rgba(3,8,11,.13)),linear-gradient(0deg,rgba(4,8,10,.45),transparent 38%)}
.summit-nav{position:fixed;z-index:20;inset:0 0 auto;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:20px clamp(18px,4.7vw,72px);background:linear-gradient(#071016d9,transparent);font:9px ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase}.summit-nav a{color:inherit;text-decoration:none}.summit-nav>a:last-child{justify-self:end;color:var(--gold);border-bottom:1px solid currentColor;padding-bottom:5px}.summit-nav a span{margin-left:8px}
.summit-debug{position:fixed;z-index:40;top:58px;right:12px;width:278px}.summit-status{position:fixed;z-index:50;inset:0;display:grid;place-items:center;background:#071016;font:9px ui-monospace,monospace;letter-spacing:.16em;text-transform:uppercase}.summit-status--error{color:#d08f7c}
.summit-section{position:relative;z-index:1;padding:clamp(105px,11vw,175px) clamp(20px,6vw,92px)}
.summit-hero{min-height:120svh;display:flex;flex-direction:column;justify-content:center}.summit-coordinate{position:absolute;right:6vw;top:19%;color:var(--muted);font:8px/1.6 ui-monospace,monospace;letter-spacing:.14em;text-align:right}.summit-hero__title>p,.summit-heading>p,.summit-registration__copy>p{margin:0 0 18px;color:var(--gold);font:9px ui-monospace,monospace;letter-spacing:.15em;text-transform:uppercase}.summit-hero h1{margin:0;font-size:clamp(75px,14.7vw,224px);line-height:.74;letter-spacing:-.08em;font-weight:300}.summit-hero__title>span{display:block;margin:28px 1vw 0;text-align:right;font:10px ui-monospace,monospace;letter-spacing:.16em;text-transform:uppercase}.summit-hero__footer{display:flex;justify-content:space-between;align-items:flex-end;gap:50px;margin-top:clamp(70px,9vw,130px)}.summit-hero__footer>p{margin:0;color:var(--muted);font-size:clamp(19px,2vw,28px);line-height:1.35;letter-spacing:-.02em}.summit-actions{display:flex;gap:8px}.summit-button{min-height:52px;display:inline-flex;align-items:center;justify-content:space-between;gap:38px;padding:0 20px;color:var(--ivory);background:rgba(5,10,13,.64);border:1px solid var(--line);border-radius:0;font:9px ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;text-decoration:none;cursor:pointer}.summit-button b{color:var(--gold)}.summit-button--light{color:#11181a;background:var(--ivory);border-color:var(--ivory)}.summit-button--gold{width:100%;color:#101617;background:var(--gold);border-color:var(--gold)}.summit-altitude{position:absolute;bottom:35px;left:6vw;right:6vw;display:flex;align-items:center;gap:18px;color:var(--muted);font:8px ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase}.summit-altitude i{height:1px;flex:1;background:var(--line)}.summit-altitude b{color:var(--gold);font-weight:400}
.summit-heading{display:grid;grid-template-columns:1fr auto;align-items:end;gap:35px}.summit-heading>p{grid-column:1/-1}.summit-heading h2,.summit-registration h2{margin:0;font-size:clamp(54px,8.1vw,118px);line-height:.88;letter-spacing:-.065em;font-weight:300}.summit-heading>span{max-width:320px;color:var(--muted);line-height:1.6}.summit-about{min-height:140svh}.summit-about__body{width:min(1050px,88%);display:grid;grid-template-columns:1.3fr .7fr;gap:clamp(50px,9vw,145px);margin:clamp(100px,13vw,190px) 0 0 auto}.summit-about__body p{margin:0;color:var(--muted);line-height:1.7}.summit-about__body .summit-lead{color:var(--ivory);font-size:clamp(27px,3.5vw,51px);line-height:1.12;letter-spacing:-.04em}.summit-metrics{width:min(780px,78%);display:grid;grid-template-columns:repeat(3,1fr);margin:120px 0 0 auto;padding-top:24px;border-top:1px solid var(--line)}.summit-metrics div{display:flex;flex-direction:column;gap:8px}.summit-metrics dt{font-size:clamp(40px,5vw,70px);letter-spacing:-.06em}.summit-metrics dd{margin:0;color:var(--muted);font:9px ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase}
.summit-speakers{min-height:245svh}.summit-speakers__list{display:flex;flex-direction:column;gap:clamp(110px,14vw,210px);margin-top:150px}.summit-speaker{width:min(1080px,92%);display:grid;grid-template-columns:minmax(310px,44vw) minmax(280px,430px);align-items:center;gap:clamp(45px,8vw,125px);outline:none}.summit-speaker--reverse{align-self:flex-end;grid-template-columns:minmax(280px,430px) minmax(310px,44vw)}.summit-speaker--reverse .summit-speaker__image{grid-column:2}.summit-speaker--reverse .summit-speaker__copy{grid-column:1;grid-row:1}.summit-speaker__image{position:relative;width:100%;aspect-ratio:4/5;background-image:linear-gradient(180deg,transparent 56%,rgba(5,10,13,.62)),url('../../assets/speakers-contact-sheet.webp');background-size:100%,300% 200%;filter:grayscale(.7) sepia(.12) contrast(1.08)}.summit-speaker__image--1{background-position:0,0 0}.summit-speaker__image--2{background-position:0,50% 0}.summit-speaker__image--3{background-position:0,100% 0}.summit-speaker__image--5{background-position:0,50% 100%}.summit-speaker__image>span{position:absolute;left:18px;bottom:17px;color:var(--gold);font:9px ui-monospace,monospace}.summit-speaker__copy>p{margin:0;color:var(--gold);font:9px ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase}.summit-speaker h3{margin:35px 0 12px;font-size:clamp(45px,5.6vw,80px);line-height:.92;letter-spacing:-.06em;font-weight:300}.summit-speaker strong{display:block;max-width:420px;margin-top:65px;font-size:18px;line-height:1.45;font-weight:400}.summit-speaker i{display:block;margin-top:45px;color:var(--muted);font:8px ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase}
.summit-voices{min-height:175svh}.summit-quotes{width:min(1050px,85%);margin:110px 0 0 auto}.summit-quote{min-height:48svh;display:grid;grid-template-columns:75px 1fr;align-content:center;margin:0;padding:60px 0;border-top:1px solid var(--line)}.summit-quote>span{color:var(--gold);font:9px ui-monospace,monospace}.summit-quote blockquote{margin:0;font-size:clamp(34px,4.8vw,69px);line-height:1.08;letter-spacing:-.05em;font-weight:300}.summit-quote figcaption{grid-column:2;display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:45px}.summit-quote figcaption strong{font-size:12px;font-weight:500}.summit-quote figcaption small{color:var(--muted);font:9px/1.6 ui-monospace,monospace}
.summit-registration{min-height:155svh;display:grid;grid-template-columns:.95fr 1fr;align-items:center;gap:clamp(65px,11vw,170px)}.summit-registration__copy>span{display:block;margin-top:42px;color:var(--muted);line-height:1.7}.summit-form{padding-top:28px;border-top:1px solid var(--line)}.summit-form>label,.summit-form>div label{display:flex;flex-direction:column;gap:8px;margin-bottom:28px;color:var(--muted);font:8px ui-monospace,monospace;letter-spacing:.11em;text-transform:uppercase}.summit-form>div{display:grid;grid-template-columns:1fr 1fr;gap:28px}.summit-form input:not([type=checkbox]){padding:12px 0;color:var(--ivory);background:transparent;border:0;border-bottom:1px solid rgba(236,232,221,.35);border-radius:0;outline:0;font:17px 'Helvetica Neue',sans-serif;text-transform:none}.summit-form input:focus{border-color:var(--gold)}.summit-check{flex-direction:row!important;align-items:flex-start;gap:10px!important;letter-spacing:0!important;text-transform:none!important}.summit-check input{accent-color:var(--gold)}.summit-success{padding-top:30px;border-top:1px solid var(--gold)}.summit-success>span{color:var(--gold);font:9px ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase}.summit-success h3{margin:36px 0;font-size:clamp(54px,7vw,96px);line-height:.9;letter-spacing:-.06em;font-weight:300}.summit-success p{color:var(--muted)}
.summit-partners{min-height:118svh;display:flex;flex-direction:column;justify-content:space-between;padding-bottom:34px}.summit-partners__body{margin:auto 0}.summit-partners__grid{display:grid;grid-template-columns:repeat(4,1fr);gap:58px 30px;margin-top:100px}.summit-partners__grid span{color:rgba(236,232,221,.7);font:10px ui-monospace,monospace;letter-spacing:.14em;text-align:center}.summit-footer{display:grid;grid-template-columns:1fr 1fr auto 1fr;align-items:end;gap:30px;padding-top:28px;border-top:1px solid var(--line);font:8px ui-monospace,monospace;letter-spacing:.11em;text-transform:uppercase}.summit-footer>div{display:flex;gap:18px}.summit-footer>div:first-child{flex-direction:column;gap:5px}.summit-footer>div:last-child{justify-self:end}.summit-footer p{margin:0;color:var(--muted);line-height:1.5}.summit-footer a{color:inherit;text-decoration:none}.summit-footer>a{color:var(--gold)}.summit-footer span{color:var(--muted)}
@media(max-width:820px){.summit-nav{grid-template-columns:1fr auto}.summit-nav__mark{display:none}.summit-registration{grid-template-columns:1fr}.summit-speaker,.summit-speaker--reverse{width:100%;grid-template-columns:1fr 1fr}.summit-footer{grid-template-columns:1fr 1fr}.summit-footer>div:last-child{justify-self:start}}
@media(max-width:620px){.summit-nav{padding:16px 18px}.summit-nav>a:last-child{padding:8px 10px;border:1px solid var(--line)}.summit-section{padding:90px 18px}.summit-hero{min-height:112svh;justify-content:flex-start;padding-top:145px}.summit-coordinate{display:none}.summit-hero h1{font-size:clamp(66px,21vw,94px);line-height:.82}.summit-hero__title>span{text-align:left}.summit-hero__footer{flex-direction:column;align-items:stretch;margin-top:72px}.summit-actions{flex-direction:column}.summit-button{width:100%}.summit-altitude{left:18px;right:18px}.summit-heading{display:block}.summit-heading h2,.summit-registration h2{font-size:49px}.summit-heading>span{display:block;margin-top:30px}.summit-about{min-height:150svh}.summit-about__body{width:100%;grid-template-columns:1fr;gap:35px;margin-top:85px}.summit-metrics{width:100%;margin-top:70px}.summit-metrics dt{font-size:36px}.summit-speakers{min-height:335svh}.summit-speakers__list{margin-top:95px;gap:115px}.summit-speaker,.summit-speaker--reverse{display:flex;flex-direction:column;gap:35px}.summit-speaker--reverse .summit-speaker__image{order:0}.summit-speaker--reverse .summit-speaker__copy{order:1}.summit-speaker__image{aspect-ratio:4/4.8}.summit-speaker strong{margin-top:35px}.summit-speaker i{margin-top:30px}.summit-voices{min-height:210svh}.summit-quotes{width:100%;margin-top:80px}.summit-quote{min-height:58svh;display:block}.summit-quote blockquote{margin-top:40px;font-size:37px}.summit-quote figcaption{display:flex;flex-direction:column;margin-top:38px}.summit-registration{min-height:175svh;align-content:center;gap:90px}.summit-form>div{grid-template-columns:1fr;gap:0}.summit-partners__grid{grid-template-columns:repeat(2,1fr);gap:44px 15px;margin-top:70px}.summit-footer{grid-template-columns:1fr auto}.summit-footer>p{display:none}.summit-footer>a,.summit-footer>div:last-child{grid-row:2}.summit-footer>div:last-child a{display:none}}
@media(prefers-reduced-motion:reduce){.summit-reveal{opacity:1!important;transform:none!important}.summit-speaker__image{clip-path:none!important;transform:none!important}}
</style>
