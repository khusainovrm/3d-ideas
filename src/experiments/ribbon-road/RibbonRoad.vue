<template>
  <main ref="page" :class="['road', `road--${navigationPhase}`]">
    <div ref="container" class="road__canvas" aria-hidden="true"/>
    <div class="road__grain" aria-hidden="true"/>

    <nav class="road-nav" aria-label="Основная навигация">
      <RouterLink to="/">← Visual lab</RouterLink>
      <button type="button" class="road-nav__mark" @click="scrollTo('road-top')">O / 26</button>
      <button
          type="button"
          class="road-nav__cta"
          :class="{'road-nav__cta--reset': navigationPhase === 'journey'}"
          :disabled="navigationPhase !== 'journey'"
          :aria-label="navigationPhase === 'journey' ? 'Сбросить маршрут и вернуться к выбору секции' : 'Сначала выберите фигуру маршрута'"
          @click="resetJourney"
      >{{ navigationPhase === 'journey' ? 'Сбросить' : 'Выберите маршрут' }}</button>
    </nav>

    <div v-if="debug" ref="paneHost" class="road-debug"/>
    <div v-if="!ready && !error" class="road-loading">Прокладываем маршрут…</div>
    <div v-if="error" class="road-loading road-loading--error">{{ error }}</div>

    <section id="road-top" class="road-section road-hero">
      <div class="road-hero__copy">
        <p class="road-kicker">Онлайн-конференция · 20.11.2026</p>
        <h1><span>ODYSSEY</span><small>Конференция 2026</small></h1>
        <p class="road-hero__lead">Путешествие через идеи,<br/>технологии и будущее.</p>
        <p class="road-hero__date"><strong>20 ноября</strong><span>10:00–18:00 МСК · Online</span>
        </p>
      </div>

      <div
          v-show="navigationPhase === 'awaiting-selection'"
          class="road-figure-labels"
          aria-hidden="true"
      >
        <span
            v-for="(link, index) in visibleHeroLinks"
            :key="link.target"
            :class="['road-figure-label', link.className, {'road-figure-label--ready': figuresReady}]"
            :style="figureLabelStyle(index)"
        >{{ link.label }}</span>
      </div>
      <p class="road-hero__hint">Выберите фигуру маршрута <b>↓</b></p>
    </section>

    <section id="road-about" class="road-section road-about" :style="{order: sectionOrder('road-about')}">
      <header class="road-heading road-reveal">
        <p class="road-index">01 / О конференции</p>
        <h2>Двигаться<br/>в неизвестное</h2>
      </header>
      <div class="road-about__copy road-reveal">
        <p>ODYSSEY — однодневная конференция для тех, кто создаёт продукты, технологии и культуру
          завтрашнего дня.</p>
        <p>Вместо прогнозов — реальные маршруты практиков. Вместо информационного шума — идеи,
          которые меняют направление.</p>
      </div>
      <dl class="road-facts road-reveal">
        <div>
          <dt>20+</dt>
          <dd>спикеров</dd>
        </div>
        <div>
          <dt>8</dt>
          <dd>часов контента</dd>
        </div>
        <div>
          <dt>1</dt>
          <dd>день online</dd>
        </div>
      </dl>
    </section>

    <section id="road-program" class="road-section road-program" :style="{order: sectionOrder('road-program')}">
      <header class="road-heading road-reveal">
        <p class="road-index">02 / Ключевые темы</p>
        <h2>Программа</h2>
        <p>Три линии разговора, которые складываются в один маршрут.</p>
      </header>
      <div class="road-program__list">
        <article v-for="topic in topics" :key="topic.index" class="road-topic road-reveal">
          <span>{{ topic.index }}</span>
          <time>{{ topic.time }}</time>
          <h3>{{ topic.title }}</h3>
          <p>{{ topic.text }}</p>
        </article>
      </div>
    </section>

    <section id="road-speakers" class="road-section road-speakers" :style="{order: sectionOrder('road-speakers')}">
      <header class="road-heading road-heading--speakers road-reveal">
        <p class="road-index">03 / Фиолетовая зона</p>
        <h2>Спикеры</h2>
        <p>Люди, которые уже прокладывают путь через перемены.</p>
      </header>
      <div class="road-speakers__grid">
        <article v-for="(speaker, index) in speakers" :key="speaker.name"
                 class="road-speaker road-reveal">
          <div :class="['road-speaker__photo', `road-speaker__photo--${speaker.portrait}`]"
               role="img" :aria-label="speaker.name"/>
          <div class="road-speaker__number">0{{ index + 1 }}</div>
          <h3>{{ speaker.name }}</h3>
          <p>{{ speaker.role }}<br/>{{ speaker.company }}</p>
          <strong>{{ speaker.talk }}</strong>
        </article>
      </div>
    </section>

    <section id="road-registration" class="road-section road-registration" :style="{order: sectionOrder('road-registration')}">
      <div class="road-registration__intro road-reveal">
        <p class="road-index">04 / Точка назначения</p>
        <h2>Присоединяйтесь<br/>к конференции</h2>
        <p><strong>20 ноября 2026</strong><br/>Online · участие бесплатно</p>
      </div>

      <form v-if="!submitted" class="road-form road-reveal" @submit.prevent="submitRegistration">
        <label><span>Имя</span><input name="name" autocomplete="name" required
                                      placeholder="Как к вам обращаться"/></label>
        <label><span>Email</span><input name="email" type="email" autocomplete="email" required
                                        placeholder="name@company.com"/></label>
        <div>
          <label><span>Компания</span><input name="company" autocomplete="organization"
                                             placeholder="Название"/></label>
          <label><span>Должность</span><input name="role" autocomplete="organization-title"
                                              placeholder="Ваша роль"/></label>
        </div>
        <label class="road-consent"><input type="checkbox" required/><span>Согласен с обработкой персональных данных.</span></label>
        <button class="road-button road-button--primary" type="submit">Зарегистрироваться <b>↗</b>
        </button>
      </form>

      <div v-else class="road-success" role="status" aria-live="polite">
        <span>Маршрут подтверждён</span>
        <h3>До встречи<br/>20 ноября.</h3>
        <p>Подтверждение отправлено на вашу почту.</p>
      </div>
    </section>

    <section id="road-partners" class="road-section road-partners" :style="{order: sectionOrder('road-partners')}">
      <div class="road-partners__content road-reveal">
        <p class="road-index">05 / Вместе в пути</p>
        <h2>Партнёры</h2>
        <div class="road-partners__grid">
          <span v-for="partner in partners" :key="partner">{{ partner }}</span>
        </div>
      </div>
      <footer class="road-footer">
        <div><strong>THE ODYSSEY</strong><span>2026</span></div>
        <a href="#road-registration" @click.prevent="scrollTo('road-registration')">Зарегистрироваться
          ↑</a>
        <div><a href="#">Telegram</a><a href="#">YouTube</a><span>© 2026</span></div>
      </footer>
    </section>
  </main>
</template>

<script setup lang="ts">
import gsap from 'gsap'
import {ScrollTrigger} from 'gsap/ScrollTrigger'
import {computed, nextTick, onMounted, onUnmounted, ref, watch} from 'vue'
import {useThreeScene} from '../../composables/useThreeScene'
import {useDebugPane} from '../../composables/useDebugPane'
import {createRibbonRoadScene} from './scene'
import {BALL_APPEARANCE, PARTICLE_CONNECTIONS, RIBBON_ROAD_FEATURES, ROAD_APPEARANCE} from './route'
import {NAV_CONSTELLATION, ORIGINAL_SECTION_ORDER, ROAD_NAV_SECTIONS, type RoadSectionId} from './navigation'
import {createScrollGate} from './useScrollGate'
import {HERO_CURSOR_EFFECT} from './cursorEffect'

gsap.registerPlugin(ScrollTrigger)

const speakers = [
  {
    name: 'Анна Миронова',
    role: 'Chief Product Officer',
    company: 'North / AI',
    talk: 'Как проектировать системы с длинным горизонтом',
    portrait: 1
  },
  {
    name: 'Илья Соколов',
    role: 'Founder',
    company: 'Common Era',
    talk: 'Технологии после эпохи интерфейсов',
    portrait: 2
  },
  {
    name: 'Майя Чен',
    role: 'Research Director',
    company: 'Arc Systems',
    talk: 'Новые маршруты человеческого знания',
    portrait: 3
  },
  {
    name: 'Амара Окойе',
    role: 'Climate Tech Lead',
    company: 'Tide',
    talk: 'Решения для мира, который меняется быстрее нас',
    portrait: 5
  },
] as const

const topics = [
  {
    time: '10:20',
    index: '01',
    title: 'Человек + система',
    text: 'Как создавать технологии, которые усиливают выбор, а не заменяют его.'
  },
  {
    time: '12:40',
    index: '02',
    title: 'Новый интеллект',
    text: 'От отдельных AI-инструментов к новой рабочей среде и культуре решений.'
  },
  {
    time: '15:10',
    index: '03',
    title: 'Длинный горизонт',
    text: 'Дизайн, климат и инфраструктура как единая система координат.'
  },
] as const

const partners = ['ROSTELECOM', 'NORTH / AI', 'ARC SYSTEMS', 'TIDE', 'COMMON ERA', 'SIGNAL', 'PARALLEL', 'FIELD OFFICE'] as const
const heroLinks = ROAD_NAV_SECTIONS.map(({id: target, label, className}) => ({target, label, className}))
const visibleHeroLinks = computed(() => heroLinks.slice(
  0,
  Math.max(1, Math.min(NAV_CONSTELLATION.figureCount, heroLinks.length)),
))

type NavigationPhase =
  | 'locked-intro'
  | 'forming-figures'
  | 'awaiting-selection'
  | 'transitioning'
  | 'journey'
  | 'resetting'

const page = ref<HTMLElement | null>(null)
const submitted = ref(false)
const navigationPhase = ref<NavigationPhase>('locked-intro')
const selectedSection = ref<RoadSectionId | null>(null)
const figuresReady = ref(false)
const figureLabelPositions = ref<readonly {x: number; y: number; labelOffset: number}[]>([])
const journeyFloorY = ref(0)
const {container, ready, error, metrics} = useThreeScene(createRibbonRoadScene)
const orderedSections = computed<readonly RoadSectionId[]>(() => selectedSection.value
  ? [selectedSection.value, ...ORIGINAL_SECTION_ORDER.filter((id) => id !== selectedSection.value)]
  : ORIGINAL_SECTION_ORDER)
const sectionOrder = (id: RoadSectionId): number => orderedSections.value.indexOf(id) + 1
const figureLabelStyle = (index: number): Record<string, string> => {
  const position = figureLabelPositions.value[index]
  return position
    ? {left: `${position.x}px`, top: `${position.y + position.labelOffset}px`}
    : {visibility: 'hidden'}
}
const {debug, paneHost} = useDebugPane(metrics, {
  title: 'Ribbon Road runtime',
  bindings: [
    {key: 'fps', label: 'FPS'}, {key: 'dpr', label: 'DPR'}, {key: 'quality', label: 'Quality'},
    {key: 'calls', label: 'Draw Calls'}, {key: 'triangles', label: 'Triangles'},
    {key: 'section', label: 'Current Section'}, {key: 'scrollProgress', label: 'Scroll Progress'},
    {key: 'transitionProgress', label: 'Intro Progress'}, {
      key: 'ribbonProgress',
      label: 'Ribbon Progress'
    }, {key: 'particleState', label: 'Particle State'},
    {key: 'particlesVisible', label: 'Particles Visible'}, {
      key: 'purplePhase',
      label: 'Purple Phase Active'
    },
    {key: 'ballProgress', label: 'Ball Progress'}, {key: 'ballVelocity', label: 'Ball Velocity'},
    {key: 'ballPosition', label: 'Ball Position'}, {key: 'ballLag', label: 'Ball Lag'},
    {key: 'ballRotationSpeed', label: 'Ball Rotation Speed'},
    {key: 'navigationPhase', label: 'Navigation Phase'},
    {key: 'selectedSection', label: 'Selected Section'},
    {key: 'scrollLocked', label: 'Scroll Locked'},
    {key: 'journeyFloorY', label: 'Journey Floor'},
    {key: 'formationProgress', label: 'Formation Progress'},
    {key: 'hoveredFigure', label: 'Hovered Figure'},
    {key: 'figureCount', label: 'Figure Count'},
    {key: 'activeRoadIndex', label: 'Active Road'},
  ],
  setup: (pane) => {
    const hero = pane.addFolder({title: 'Hero · созвездие', expanded: true})
    hero.addBinding(NAV_CONSTELLATION, 'nebulaRemainingPercent', {label: 'Туманность, %', min: 0, max: 100, step: 1})
    hero.addBinding(NAV_CONSTELLATION, 'figureCount', {label: 'Количество фигур', min: 1, max: ROAD_NAV_SECTIONS.length, step: 1})
    hero.addBinding(NAV_CONSTELLATION, 'figureSize', {label: 'Размер фигур', min: 0.04, max: 0.3, step: 0.005})
    hero.addBinding(NAV_CONSTELLATION, 'layoutSeed', {label: 'Вариант раскладки', min: 0, max: 10000, step: 1})
    hero.addBinding(NAV_CONSTELLATION, 'layoutGap', {label: 'Зазор, px', min: 0, max: 64, step: 1})
    const formation = hero.addFolder({title: 'Сборка фигур', expanded: false})
    formation.addBinding(NAV_CONSTELLATION, 'formationDelay', {label: 'Задержка, с', min: 0, max: 3, step: 0.05})
    formation.addBinding(NAV_CONSTELLATION, 'formationDuration', {label: 'Длительность, с', min: 0.1, max: 6, step: 0.1})
    formation.addBinding(NAV_CONSTELLATION, 'formationStagger', {label: 'Интервал фигур, с', min: 0, max: 0.6, step: 0.01})
    formation.addButton({title: 'Повторить анимацию hero'}).on('click', () => {
      if (window.scrollY > window.innerHeight * 0.1) return
      figuresReady.value = false
      navigationPhase.value = 'locked-intro'
      scrollGate.lock(0)
      container.value?.dispatchEvent(new CustomEvent('roadreset'))
      syncNavigationMetrics()
      armNavigationFallback()
    })
    const interaction = hero.addFolder({title: 'Взаимодействие', expanded: false})
    interaction.addBinding(NAV_CONSTELLATION, 'hoverScale', {label: 'Увеличение', min: 1, max: 1.4, step: 0.01})
    interaction.addBinding(NAV_CONSTELLATION, 'hoverBrightness', {label: 'Яркость акцента', min: 0.5, max: 3, step: 0.05})
    interaction.addBinding(NAV_CONSTELLATION, 'hoverResponse', {label: 'Скорость отклика', min: 1, max: 25, step: 0.5})
    interaction.addBinding(NAV_CONSTELLATION, 'selectedBrightness', {label: 'Яркость выбора', min: 0.5, max: 3, step: 0.05})
    const cursor = hero.addFolder({title: 'Анимация курсора', expanded: true})
    cursor.addBinding(HERO_CURSOR_EFFECT, 'enabled', {label: 'Ховер туманности'})
    cursor.addBinding(HERO_CURSOR_EFFECT, 'intensity', {label: 'Интенсивность', min: 0, max: 0.4, step: 0.01})
    cursor.addBinding(HERO_CURSOR_EFFECT, 'duration', {label: 'Затухание, с', min: 0.1, max: 3, step: 0.05})
    cursor.addBinding(HERO_CURSOR_EFFECT, 'diameter', {label: 'Диаметр, px', min: 32, max: 400, step: 2})
    interaction.addBinding(NAV_CONSTELLATION, 'scrollDuration', {label: 'Переход к секции, с', min: 0, max: 4, step: 0.1})
    const density = hero.addFolder({title: 'Плотность по качеству', expanded: false})
    for (const level of ['low', 'medium', 'high'] as const) {
      density.addBinding(NAV_CONSTELLATION.qualityParticleScale, level, {label: level, min: 0.2, max: 1, step: 0.05})
    }
    const features = pane.addFolder({title: 'Feature toggles', expanded: false})
    features.addBinding(RIBBON_ROAD_FEATURES, 'cinematic3DCamera', {label: 'Cinematic 3D camera'})
    features.addBinding(RIBBON_ROAD_FEATURES, 'horizontalPointerCamera', {label: 'Horizontal camera follow'})
    features.addBinding(RIBBON_ROAD_FEATURES, 'particleConnections', {label: 'Particle connections'})
    features.addBinding(PARTICLE_CONNECTIONS, 'fadeDuration', {
      label: 'Line fade, sec',
      min: 0.2,
      max: 8,
      step: 0.1,
    })

    const road = pane.addFolder({title: 'Road', expanded: false})
    road.addBinding(ROAD_APPEARANCE, 'width', {label: 'Width', min: 0.4, max: 5, step: 0.025})
    road.addBinding(ROAD_APPEARANCE, 'thickness', {
      label: 'Thickness',
      min: 0.04,
      max: 1,
      step: 0.01
    })
    road.addBinding(ROAD_APPEARANCE, 'color', {label: 'Color', view: 'color'})

    const ball = pane.addFolder({title: 'Ball', expanded: false})
    ball.addBinding(BALL_APPEARANCE, 'radius', {label: 'Radius', min: 0.15, max: 1.2, step: 0.01})
    ball.addBinding(BALL_APPEARANCE, 'shape', {
      label: 'Shape',
      options: {Sphere: 'sphere', Faceted: 'faceted', 'Low poly': 'lowPoly'},
    })
    ball.addBinding(BALL_APPEARANCE, 'color', {label: 'Color', view: 'color'})
  },
})
defineExpose({container, paneHost})

let animationContext: gsap.Context | undefined
const scrollGate = createScrollGate()
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
let fallbackTimer = 0
let scrollFrame = 0
let scrollResolve: (() => void) | undefined
let journeyResizeFrame = 0
let previousScrollRestoration: ScrollRestoration = 'auto'
let cleanupSceneEvents = (): void => {}

const syncNavigationMetrics = (): void => {
  metrics.navigationPhase = navigationPhase.value
  metrics.selectedSection = selectedSection.value ?? ''
  metrics.scrollLocked = scrollGate.locked
  metrics.journeyFloorY = journeyFloorY.value
}

const armNavigationFallback = (): void => {
  window.clearTimeout(fallbackTimer)
  fallbackTimer = window.setTimeout(() => {
    if (navigationPhase.value === 'locked-intro' || navigationPhase.value === 'forming-figures') {
      figuresReady.value = false
      navigationPhase.value = 'journey'
      scrollGate.unlock()
      syncNavigationMetrics()
    }
  }, Math.max(9000, (NAV_CONSTELLATION.formationDelay + NAV_CONSTELLATION.formationDuration + 5) * 1000))
}

const cancelScrollAnimation = (): void => {
  cancelAnimationFrame(scrollFrame)
  scrollFrame = 0
  scrollResolve?.()
  scrollResolve = undefined
}

const animateScrollTo = (targetY: number, duration: number): Promise<void> => {
  cancelScrollAnimation()
  if (reducedMotionQuery.matches || duration <= 0) {
    window.scrollTo(0, targetY)
    return Promise.resolve()
  }
  const startY = window.scrollY
  const distance = targetY - startY
  const startedAt = performance.now()
  return new Promise((resolve) => {
    scrollResolve = resolve
    const tick = (now: number): void => {
      const progress = Math.min(1, (now - startedAt) / (duration * 1000))
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2
      window.scrollTo(0, startY + distance * eased)
      if (progress < 1) {
        scrollFrame = requestAnimationFrame(tick)
      } else {
        scrollFrame = 0
        scrollResolve = undefined
        resolve()
      }
    }
    scrollFrame = requestAnimationFrame(tick)
  })
}

const refreshOrderedLayout = async (): Promise<void> => {
  await nextTick()
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  ScrollTrigger.refresh()
  container.value?.dispatchEvent(new CustomEvent('roadorderchange', {
    detail: {orderedSectionIds: [...orderedSections.value]},
  }))
}

const scrollTo = (target: string): void => {
  const element = document.getElementById(target)
  if (!element) return
  const targetY = element.offsetTop
  void animateScrollTo(targetY, NAV_CONSTELLATION.scrollDuration)
}

const selectSection = async (target: RoadSectionId): Promise<void> => {
  if (navigationPhase.value !== 'awaiting-selection' && navigationPhase.value !== 'journey') return
  const figureIndex = ROAD_NAV_SECTIONS.findIndex(({id}) => id === target)
  if (figureIndex < 0 || figureIndex >= NAV_CONSTELLATION.figureCount) return
  const roadIndex = ROAD_NAV_SECTIONS[figureIndex]?.roadIndex ?? figureIndex
  navigationPhase.value = 'transitioning'
  selectedSection.value = target
  container.value?.dispatchEvent(new CustomEvent('roadnavselect', {
    detail: {figureIndex, roadIndex, sectionId: target},
  }))
  syncNavigationMetrics()
  await refreshOrderedLayout()
  scrollGate.unlock()
  syncNavigationMetrics()
  const element = document.getElementById(target)
  if (!element) {
    navigationPhase.value = 'awaiting-selection'
    figuresReady.value = true
    scrollGate.lock(0)
    syncNavigationMetrics()
    return
  }
  await animateScrollTo(element.offsetTop, NAV_CONSTELLATION.scrollDuration)
  journeyFloorY.value = 0
  navigationPhase.value = 'journey'
  history.replaceState(history.state, '', `#${target}`)
  syncNavigationMetrics()
  const heading = element.querySelector<HTMLElement>('h1, h2, h3')
  if (heading) {
    heading.tabIndex = -1
    heading.focus({preventScroll: true})
  }
}

const resetJourney = async (): Promise<void> => {
  if (navigationPhase.value !== 'journey') return
  navigationPhase.value = 'resetting'
  journeyFloorY.value = 0
  figuresReady.value = false
  selectedSection.value = null
  syncNavigationMetrics()
  cancelScrollAnimation()
  await refreshOrderedLayout()
  await animateScrollTo(0, NAV_CONSTELLATION.scrollDuration)
  window.scrollTo(0, 0)
  scrollGate.lock(0)
  container.value?.dispatchEvent(new CustomEvent('roadreset'))
  history.replaceState(history.state, '', `${location.pathname}${location.search}`)
  navigationPhase.value = 'locked-intro'
  syncNavigationMetrics()
  armNavigationFallback()
}

const submitRegistration = (): void => {
  submitted.value = true
  container.value?.dispatchEvent(new CustomEvent('roadcomplete'))
}

onMounted(() => {
  document.documentElement.classList.add('road-page-active')
  previousScrollRestoration = history.scrollRestoration
  history.scrollRestoration = 'manual'
  window.scrollTo(0, 0)
  scrollGate.lock(0)
  syncNavigationMetrics()
  const onHeroRevealComplete = (): void => {
    if (navigationPhase.value !== 'locked-intro') return
    navigationPhase.value = 'forming-figures'
    syncNavigationMetrics()
  }
  const onFiguresReady = (): void => {
    if (navigationPhase.value !== 'forming-figures' && navigationPhase.value !== 'locked-intro') return
    figuresReady.value = true
    navigationPhase.value = 'awaiting-selection'
    syncNavigationMetrics()
  }
  const onFigureSelect = (event: Event): void => {
    const sectionId = (event as CustomEvent<{sectionId?: RoadSectionId}>).detail?.sectionId
    if (sectionId) void selectSection(sectionId)
  }
  const onFigureLayout = (event: Event): void => {
    const positions = (event as CustomEvent<{positions?: {x: number; y: number; labelOffset: number}[]}>).detail?.positions
    if (positions) figureLabelPositions.value = positions
  }
  container.value?.addEventListener('roadherorevealcomplete', onHeroRevealComplete)
  container.value?.addEventListener('roadfiguresready', onFiguresReady)
  container.value?.addEventListener('roadfigureselect', onFigureSelect)
  container.value?.addEventListener('roadfigurelayout', onFigureLayout)
  armNavigationFallback()
  cleanupSceneEvents = (): void => {
    container.value?.removeEventListener('roadherorevealcomplete', onHeroRevealComplete)
    container.value?.removeEventListener('roadfiguresready', onFiguresReady)
    container.value?.removeEventListener('roadfigureselect', onFigureSelect)
    container.value?.removeEventListener('roadfigurelayout', onFigureLayout)
  }
  if (!page.value) return
  const reducedMotion = reducedMotionQuery.matches
  animationContext = gsap.context(() => {
    if (reducedMotion) return
    page.value?.querySelectorAll<HTMLElement>('.road-reveal').forEach((element) => {
      gsap.fromTo(element, {autoAlpha: 0, y: 34}, {
        autoAlpha: 1, y: 0, duration: 1.05, ease: 'power3.out',
        scrollTrigger: {trigger: element, start: 'top 88%', once: true},
      })
    })
    page.value?.querySelectorAll<HTMLElement>('.road-speaker__photo').forEach((element) => {
      gsap.fromTo(element, {clipPath: 'inset(100% 0 0 0)'}, {
        clipPath: 'inset(0% 0 0 0)', duration: 1.15, ease: 'power3.inOut',
        scrollTrigger: {trigger: element, start: 'top 84%', once: true},
      })
    })
  }, page.value)
})

onUnmounted(() => {
  cleanupSceneEvents()
  window.clearTimeout(fallbackTimer)
  cancelScrollAnimation()
  cancelAnimationFrame(journeyResizeFrame)
  scrollGate.dispose()
  window.removeEventListener('wheel', onJourneyWheel)
  window.removeEventListener('touchmove', onJourneyTouchMove)
  window.removeEventListener('keydown', onJourneyKey)
  window.removeEventListener('resize', refreshJourneyFloor)
  history.scrollRestoration = previousScrollRestoration
  document.documentElement.classList.remove('road-page-active')
  animationContext?.revert()
})

const onJourneyWheel = (event: WheelEvent): void => {
  if (navigationPhase.value === 'transitioning' || navigationPhase.value === 'resetting') {
    event.preventDefault()
    return
  }
}
const onJourneyTouchMove = (event: TouchEvent): void => {
  if (navigationPhase.value === 'transitioning' || navigationPhase.value === 'resetting') {
    event.preventDefault()
    return
  }
}
const onJourneyKey = (event: KeyboardEvent): void => {
  if ((navigationPhase.value === 'transitioning' || navigationPhase.value === 'resetting')
    && ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) {
    event.preventDefault()
    return
  }
}

const refreshJourneyFloor = (): void => {
  cancelAnimationFrame(journeyResizeFrame)
  journeyResizeFrame = requestAnimationFrame(() => {
    ScrollTrigger.refresh()
    journeyFloorY.value = 0
    metrics.journeyFloorY = 0
  })
}

window.addEventListener('wheel', onJourneyWheel, {passive: false})
window.addEventListener('touchmove', onJourneyTouchMove, {passive: false})
window.addEventListener('keydown', onJourneyKey)
window.addEventListener('resize', refreshJourneyFloor, {passive: true})

watch(error, (value) => {
  if (!value || navigationPhase.value === 'journey') return
  figuresReady.value = false
  navigationPhase.value = 'journey'
  scrollGate.unlock()
  syncNavigationMetrics()
})
</script>


<style scoped>
.road {
  --ink: #ede8e0;
  --muted: rgba(237, 232, 224, .58);
  --line: rgba(237, 232, 224, .2);
  --orange: #ff6a13;
  --violet: #8b78ff;
  position: relative;
  display: flex;
  flex-direction: column;
  isolation: isolate;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  color: var(--ink);
  font-family: 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
}

:global(html.road-page-active), :global(html.road-page-active body) {
  max-width: 100%;
  overflow-x: hidden;
  overflow-x: clip;
  overscroll-behavior-x: none;
  background: #070708;
}

.road__canvas {
  position: fixed;
  z-index: 0;
  inset: 0;
  width: 100%;
  height: 100svh;
}

.road__canvas :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

.road__grain {
  position: fixed;
  z-index: 1;
  inset: 0;
  pointer-events: none;
  opacity: .17;
  mix-blend-mode: soft-light;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.82' numOctaves='2' stitchTiles='stitchTiles'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E");
}

.road-nav {
  position: fixed;
  z-index: 20;
  inset: 0 0 auto;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 19px clamp(20px, 4.5vw, 72px);
  background: linear-gradient(rgba(7, 7, 8, .84), transparent);
  font: 9px ui-monospace, monospace;
  letter-spacing: .14em;
  text-transform: uppercase;
}

.road-nav a, .road-nav button {
  color: inherit;
  text-decoration: none;
}

.road-nav button {
  padding: 0;
  background: none;
  border: 0;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  cursor: pointer;
}

.road-nav button:disabled {
  cursor: default;
  opacity: .45;
}

.road-nav__mark {
  font-weight: 700;
}

.road-nav__cta {
  justify-self: end;
  padding-bottom: 5px;
  color: var(--orange) !important;
  border-bottom: 1px solid currentColor;
}

.road-nav__cta--reset {
  color: #ff8a43 !important;
  text-shadow: 0 0 12px rgba(255, 106, 19, .72);
}

.road-debug {
  position: fixed;
  z-index: 30;
  top: 58px;
  right: 14px;
  width: 280px;
  max-height: calc(100dvh - 72px);
  overflow-y: auto;
}

.road-loading {
  position: fixed;
  z-index: 40;
  inset: 0;
  display: grid;
  place-items: center;
  background: #070708;
  font: 9px ui-monospace, monospace;
  letter-spacing: .15em;
  text-transform: uppercase;
}

.road-loading--error {
  color: #e18775;
}

.road-section {
  position: relative;
  z-index: 2;
  padding: clamp(96px, 11vw, 170px) clamp(22px, 6vw, 96px);
}

.road-hero {
  order: 0;
}

.road-kicker, .road-index {
  margin: 0;
  color: var(--orange);
  font: 9px/1.4 ui-monospace, monospace;
  letter-spacing: .14em;
  text-transform: uppercase;
}

.road-heading h2, .road-registration h2, .road-partners h2 {
  margin: 22px 0 0;
  font-size: clamp(60px, 10vw, 150px);
  line-height: .78;
  letter-spacing: -.065em;
  font-weight: 400;
  text-transform: uppercase;
  -webkit-text-stroke: 1px var(--ink);
  color: transparent;
}

.road-heading > p:last-child {
  max-width: 430px;
  margin: 35px 0 0 auto;
  color: var(--muted);
  font-size: 15px;
  line-height: 1.65;
}

.road-hero {
  min-height: 100svh;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.road-hero__copy {
  position: relative;
  z-index: 3;
  width: min(690px, 63vw);
}

.road-hero h1 {
  display: flex;
  flex-direction: column;
  margin: 18px 0 0;
  line-height: .82;
}

.road-hero h1 > span {
  font-size: clamp(74px, 12vw, 178px);
  letter-spacing: -.075em;
  font-weight: 500;
}

.road-hero h1 small {
  margin-top: 17px;
  font: 400 clamp(17px, 2.2vw, 30px)/1 ui-monospace, monospace;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.road-hero__lead {
  margin: 34px 0 0;
  max-width: 480px;
  color: var(--muted);
  font-size: clamp(19px, 2vw, 28px);
  line-height: 1.25;
}

.road-hero__date {
  display: flex;
  align-items: baseline;
  gap: 26px;
  margin: 26px 0;
}

.road-hero__date strong {
  font-size: 20px;
  font-weight: 500;
}

.road-hero__date span {
  color: var(--muted);
  font-size: 12px;
}

.road-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.road-button {
  min-height: 49px;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 36px;
  padding: 0 19px;
  color: var(--ink);
  background: rgba(7, 7, 8, .58);
  border: 1px solid var(--line);
  border-radius: 0;
  font: 9px ui-monospace, monospace;
  letter-spacing: .09em;
  text-decoration: none;
  text-transform: uppercase;
  cursor: pointer;
  transition: background .25s, color .25s, border-color .25s;
}

.road-button:hover {
  border-color: rgba(255, 255, 255, .55);
}

.road-button--primary {
  color: #111;
  background: var(--ink);
  border-color: var(--ink);
}

.road-button--primary:hover {
  background: #fff;
}

.road-figure-labels {
  position: absolute;
  z-index: 4;
  inset: 0;
  display: block !important;
  pointer-events: none;
}

.road-figure-label {
  position: absolute;
  display: block;
  color: rgba(237, 232, 224, .62);
  font: 8px ui-monospace, monospace;
  letter-spacing: .06em;
  white-space: nowrap;
  opacity: 0;
  transform: translateX(-50%);
  transition: opacity .45s;
}

.road-figure-label--ready {
  opacity: 1;
}

.road-orbit--about {
  left: 15%;
  top: 35%;
}

.road-orbit--program {
  left: 32%;
  top: 55%;
}

.road-orbit--speakers {
  left: 49%;
  top: 35%;
}

.road-orbit--registration {
  left: 66%;
  top: 55%;
}

.road-orbit--partners {
  left: 83%;
  top: 35%;
}

.road-hero__hint {
  position: absolute;
  right: 6vw;
  bottom: 26px;
  color: var(--muted);
  font: 8px ui-monospace, monospace;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.road-hero__hint b {
  margin-left: 13px;
  color: var(--orange);
}

.road-about {
  min-height: 120svh;
}

.road-about .road-heading {
  width: min(860px, 100%);
}

.road-about__copy {
  display: grid;
  grid-template-columns: 1.25fr .75fr;
  gap: clamp(45px, 10vw, 160px);
  width: min(980px, 75%);
  margin: 100px 0 0 auto;
}

.road-about__copy p {
  margin: 0;
  color: var(--muted);
  line-height: 1.72;
}

.road-about__copy p:first-child {
  color: var(--ink);
  font-size: clamp(22px, 2.7vw, 40px);
  line-height: 1.22;
  letter-spacing: -.03em;
}

.road-facts {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  width: min(760px, 70%);
  margin: 100px 0 0 auto;
  padding-top: 24px;
  border-top: 1px solid var(--line);
}

.road-facts div {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.road-facts dt {
  font-size: clamp(36px, 5vw, 72px);
  letter-spacing: -.05em;
}

.road-facts dd {
  margin: 0;
  color: var(--muted);
  font: 9px ui-monospace, monospace;
  text-transform: uppercase;
}

.road-program {
  min-height: 130svh;
}

.road-program .road-heading {
  width: min(1040px, 100%);
  margin-bottom: 90px;
}

.road-program__list {
  width: min(1050px, 83%);
  margin-left: auto;
  border-top: 1px solid var(--line);
}

.road-topic {
  display: grid;
  grid-template-columns: 55px 90px 1fr 1fr;
  gap: 28px;
  align-items: baseline;
  padding: 42px 0;
  border-bottom: 1px solid var(--line);
}

.road-topic > span, .road-topic time {
  color: var(--orange);
  font: 9px ui-monospace, monospace;
}

.road-topic h3 {
  margin: 0;
  font-size: clamp(28px, 3.4vw, 49px);
  font-weight: 400;
  letter-spacing: -.04em;
}

.road-topic p {
  margin: 0;
  color: var(--muted);
  line-height: 1.6;
}

.road-speakers {
  min-height: 220svh;
  padding-top: 130px;
}

.road-speakers::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 3% 0;
  background: linear-gradient(180deg, transparent, rgba(55, 26, 118, .24) 12%, rgba(55, 26, 118, .22) 88%, transparent);
  pointer-events: none;
}

.road-heading--speakers {
  margin-bottom: 110px;
}

.road-heading--speakers .road-index {
  color: #b9adff;
}

.road-speakers__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(80px, 11vw, 170px) clamp(24px, 7vw, 105px);
  width: min(1180px, 100%);
  margin: 0 auto;
}

.road-speaker:nth-child(even) {
  margin-top: 170px;
}

.road-speaker__photo {
  width: 100%;
  aspect-ratio: 4 / 5;
  margin-bottom: 20px;
  background-image: url('../../assets/speakers-contact-sheet.webp');
  background-size: 300% 200%;
  filter: grayscale(.7) sepia(.15) hue-rotate(215deg) contrast(1.06);
}

.road-speaker__photo--1 {
  background-position: 0 0;
}

.road-speaker__photo--2 {
  background-position: 50% 0;
}

.road-speaker__photo--3 {
  background-position: 100% 0;
}

.road-speaker__photo--5 {
  background-position: 50% 100%;
}

.road-speaker__number {
  margin-bottom: 30px;
  color: #b9adff;
  font: 9px ui-monospace, monospace;
}

.road-speaker h3 {
  margin: 0 0 8px;
  font-size: clamp(32px, 4.2vw, 62px);
  line-height: .95;
  letter-spacing: -.05em;
  font-weight: 400;
}

.road-speaker > p {
  margin: 0;
  color: rgba(237, 232, 224, .58);
  line-height: 1.45;
}

.road-speaker strong {
  display: block;
  max-width: 390px;
  margin-top: 40px;
  font-size: 16px;
  line-height: 1.45;
  font-weight: 400;
}

.road-registration {
  min-height: 140svh;
  display: grid;
  grid-template-columns: .85fr 1.15fr;
  align-items: center;
  gap: clamp(60px, 10vw, 160px);
}

.road-registration h2 {
  font-size: clamp(48px, 7vw, 104px);
  line-height: .88;
}

.road-registration__intro > p:last-child {
  margin-top: 40px;
  color: var(--muted);
  line-height: 1.7;
}

.road-registration__intro strong {
  color: var(--ink);
  font-size: 18px;
  font-weight: 400;
}

.road-form {
  padding: 32px;
  background: rgba(7, 7, 8, .8);
  border: 1px solid var(--line);
  backdrop-filter: blur(13px);
}

.road-form > label, .road-form > div {
  display: block;
  margin-bottom: 25px;
}

.road-form > div {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.road-form label > span {
  display: block;
  margin-bottom: 8px;
  color: var(--muted);
  font: 9px ui-monospace, monospace;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.road-form input:not([type='checkbox']) {
  width: 100%;
  padding: 11px 0 13px;
  color: var(--ink);
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--line);
  border-radius: 0;
  outline: none;
  font-size: 16px;
}

.road-form input:not([type='checkbox']):focus {
  border-color: var(--orange);
}

.road-form input::placeholder {
  color: rgba(237, 232, 224, .25);
}

.road-form .road-consent {
  display: flex;
  align-items: center;
  gap: 10px;
}

.road-form .road-consent span {
  display: inline;
  margin: 0;
  text-transform: none;
  letter-spacing: 0;
}

.road-form .road-button {
  width: 100%;
}

.road-success {
  padding: 45px;
  border: 1px solid var(--orange);
  background: rgba(7, 7, 8, .82);
}

.road-success > span {
  color: var(--orange);
  font: 9px ui-monospace, monospace;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.road-success h3 {
  margin: 35px 0;
  font-size: clamp(48px, 7vw, 92px);
  line-height: .9;
  letter-spacing: -.06em;
  font-weight: 400;
}

.road-success p {
  color: var(--muted);
}

.road-partners {
  min-height: 115svh;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-bottom: 35px;
}

.road-partners__content {
  margin-top: auto;
  margin-bottom: 130px;
}

.road-partners__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  margin-top: 75px;
  border-top: 1px solid var(--line);
  border-left: 1px solid var(--line);
}

.road-partners__grid span {
  min-height: 112px;
  display: grid;
  place-items: center;
  padding: 18px;
  border-right: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  color: rgba(237, 232, 224, .72);
  font: 10px ui-monospace, monospace;
  letter-spacing: .06em;
  text-align: center;
}

.road-footer {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: end;
  gap: 25px;
  padding-top: 28px;
  border-top: 1px solid var(--line);
  font: 9px ui-monospace, monospace;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.road-footer > div {
  display: flex;
  gap: 15px;
}

.road-footer > div:first-child {
  flex-direction: column;
  gap: 4px;
}

.road-footer > div:last-child {
  justify-content: flex-end;
}

.road-footer a {
  color: inherit;
  text-decoration: none;
}

.road-footer > a {
  color: var(--orange);
}

@media (max-width: 820px) {
  .road-nav {
    grid-template-columns: 1fr 1fr;
  }

  .road-nav__mark {
    display: none;
  }

  .road-hero {
    align-items: flex-start;
    padding-top: 20svh;
  }

  .road-hero__copy {
    width: 100%;
  }

  .road-hero h1 > span {
    font-size: clamp(67px, 20vw, 130px);
  }

  .road-orbit--about {
    left: 0;
    top: 4%;
  }

  .road-orbit--program {
    left: 37%;
    top: 25%;
  }

  .road-orbit--speakers {
    left: 70%;
    top: 4%;
  }

  .road-orbit--registration {
    left: 17%;
    top: 62%;
  }

  .road-orbit--partners {
    left: 57%;
    top: 77%;
  }

  .road-hero__hint {
    display: none;
  }

  .road-about__copy {
    grid-template-columns: 1fr;
    width: 100%;
    margin-top: 70px;
    gap: 28px;
  }

  .road-facts {
    width: 100%;
  }

  .road-program__list {
    width: 100%;
  }

  .road-topic {
    grid-template-columns: 40px 62px 1fr;
    gap: 12px;
  }

  .road-topic p {
    grid-column: 3;
  }

  .road-speakers {
    min-height: 200svh;
  }

  .road-speakers__grid {
    gap: 80px 16px;
  }

  .road-speaker:nth-child(even) {
    margin-top: 90px;
  }

  .road-speaker strong {
    font-size: 13px;
    margin-top: 25px;
  }

  .road-registration {
    grid-template-columns: 1fr;
    align-content: center;
  }

  .road-form {
    padding: 24px;
  }

  .road-partners__grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .road-footer {
    grid-template-columns: 1fr auto;
  }

  .road-footer > div:last-child {
    display: none;
  }
}

@media (max-width: 520px) {
  .road-section {
    padding-left: 19px;
    padding-right: 19px;
  }

  .road-hero {
    padding-top: 15svh;
  }

  .road-hero__lead {
    margin-top: 24px;
    font-size: 17px;
  }

  .road-hero__date {
    flex-direction: column;
    gap: 6px;
    margin: 18px 0;
  }

  .road-actions {
    width: min(320px, 100%);
  }

  .road-button {
    width: 100%;
  }

  .road-heading h2 {
    font-size: clamp(49px, 16vw, 78px);
  }

  .road-registration h2 {
    font-size: 9.7vw;
    line-height: .94;
  }

  .road-facts dt {
    font-size: 34px;
  }

  .road-facts dd {
    font-size: 7px;
  }

  .road-topic {
    grid-template-columns: 32px 1fr;
  }

  .road-topic time {
    display: none;
  }

  .road-topic p {
    grid-column: 2;
    font-size: 13px;
  }

  .road-speakers__grid {
    grid-template-columns: 1fr;
  }

  .road-speaker:nth-child(even) {
    margin-top: 0;
  }

  .road-speaker {
    width: 84%;
  }

  .road-speaker:nth-child(even) {
    margin-left: auto;
  }

  .road-form > div {
    grid-template-columns: 1fr;
  }

  .road-partners__grid span {
    min-height: 86px;
    font-size: 8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .road-figure-label {
    transition: none;
  }
}
</style>
