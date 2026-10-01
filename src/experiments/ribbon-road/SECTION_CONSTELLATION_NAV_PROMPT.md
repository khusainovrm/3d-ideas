# Промпт: навигация по секциям через фигуры из частиц

Ниже находится готовый технический промпт для реализации новой механики в Ribbon Road.

```text
Реализуй в Ribbon Road интерактивный выбор маршрута через фигуры из частиц. Это новая фича поверх существующего hero-облака и текущей анимации случайного появления частиц.

Контекст проекта

- Основной Vue-компонент:
  src/experiments/ribbon-road/RibbonRoad.vue
- Three.js-сцена:
  src/experiments/ribbon-road/scene.ts
- Генератор hero-облака:
  src/experiments/ribbon-road/heroCloud.ts
- Настройки сцены:
  src/experiments/ribbon-road/route.ts
- Шейдер частиц:
  src/experiments/ribbon-road/shaders/particles.vert.glsl
  src/experiments/ribbon-road/shaders/particles.frag.glsl
- Документация текущего hero-облака:
  src/experiments/ribbon-road/PARTICLE_CLOUD_PROMPT.md

Существующие секции и их исходный порядок:

1. road-about — О конференции
2. road-program — Программа
3. road-speakers — Спикеры
4. road-registration — Регистрация
5. road-partners — Партнёры

Hero имеет id road-top и всегда остаётся отдельным нулевым блоком.

Главный пользовательский сценарий

1. Пользователь открывает страницу и видит hero.
2. Вертикальный скролл изначально полностью заблокирован.
3. Существующее облако частиц появляется в случайном порядке в течение настроенного времени. Позиции и размеры частиц при этом не масштабируются.
4. После завершения появления облака часть его точек отделяется и плавно складывается в интерактивные фигуры.
5. Количество фигур и число частиц в каждой фигуре настраиваются.
6. Каждая фигура соответствует одной секции сайта.
7. Фигуры располагаются последовательно, со сдвигом вверх/вниз через одну — визуальный ритм как у шашечек на такси.
8. При hover или keyboard focus фигура становится ярче и немного увеличивается относительно собственного центра.
9. При клике на фигуру соответствующая секция становится первой после hero через CSS property order.
10. Остальные секции сохраняют исходный относительный порядок.
11. После применения order скролл разблокируется, и страница мягко прокручивается к выбранной секции, которая теперь является первым блоком после hero.
12. После завершения автоскролла пользователь может двигаться только вниз по маршруту. Вернуться обычным скроллом в hero нельзя: верхней границей становится выбранная секция.
13. В header появляется активная кнопка «Сбросить».
14. «Сбросить» возвращает исходный порядок секций, снимает ограничитель маршрута, прокручивает к hero, снова блокирует скролл и полностью повторяет hero-анимацию и сборку фигур.

Не заменяй эту механику обычным меню, карточками или DOM-анимацией псевдочастиц. Фигуры должны действительно собираться из части существующего Three.js particle buffer.

## Конфигурация

Добавь отдельный изменяемый объект конфигурации, например NAV_CONSTELLATION:

```ts
export const NAV_CONSTELLATION = {
  enabled: true,
  figureCount: 5,
  particlesPerFigure: 260,
  formationDelay: 0.25,
  formationDuration: 1.4,
  formationStagger: 0.1,
  hoverScale: 1.08,
  hoverBrightness: 1.65,
  hoverResponse: 9,
  selectedBrightness: 1.85,
  checkerColumns: 5,
  checkerStepX: 0.13,
  checkerStepY: 0.105,
  figureSize: 0.07,
  scrollDuration: 1.2,
} as const
```

Конкретные значения можно немного скорректировать после визуальной проверки, но все перечисленные параметры должны иметь единый очевидный источник настройки.

Создай типизированный реестр секций. Не дублируй списки id в нескольких файлах:

```ts
const ROAD_NAV_SECTIONS = [
  { id: 'road-about', label: 'О конференции', shape: 'ring' },
  { id: 'road-program', label: 'Программа', shape: 'bars' },
  { id: 'road-speakers', label: 'Спикеры', shape: 'diamond' },
  { id: 'road-registration', label: 'Регистрация', shape: 'cross' },
  { id: 'road-partners', label: 'Партнёры', shape: 'grid' },
] as const
```

`figureCount` ограничивается диапазоном от 1 до количества зарегистрированных секций. Если значение меньше количества секций, фигуры создаются для первых N элементов реестра. Предпочтительно также предусмотреть `enabled` у отдельной секции, но не усложняй UI без необходимости.

## State machine

Не собирай поведение из несвязанных boolean-флагов. Используй одно явное состояние:

```ts
type NavigationPhase =
  | 'locked-intro'
  | 'forming-figures'
  | 'awaiting-selection'
  | 'transitioning'
  | 'journey'
  | 'resetting'
```

Правила переходов:

```text
mount/ready
  → locked-intro

hero particle reveal complete
  → forming-figures

all navigation figures formed
  → awaiting-selection

figure click
  → transitioning

CSS order applied + autoscroll finished
  → journey

reset click
  → resetting

hero reached + state restored
  → locked-intro
```

Клики во время `forming-figures`, повторный клик во время `transitioning` и повторный reset во время `resetting` должны игнорироваться.

## Первоначальная блокировка скролла

При входе на страницу:

- сначала установи `window.scrollTo(0, 0)`;
- затем заблокируй вертикальную прокрутку;
- скролл должен быть заблокирован до выбора фигуры;
- wheel, touchmove, Space, PageDown, PageUp, Home, End и стрелки не должны сдвигать страницу;
- Tab и навигация с клавиатуры по интерактивным элементам должны продолжать работать;
- не блокируй клики, hover и focus;
- горизонтальный pointer input для Three.js оставь рабочим;
- сохрани исходные inline-стили `html` и `body`, чтобы точно восстановить их при unlock/unmount.

Сделай отдельный helper/composable наподобие `useScrollGate`, а не разбрасывай обработчики по компоненту.

Для iOS/Safari одного `overflow: hidden` недостаточно. Используй устойчивую схему:

- зафиксировать body через `position: fixed`;
- сохранить текущий scrollY в `top: -scrollY`;
- установить width: 100%;
- при unlock восстановить стили и прежний scrollY;
- обязательно удалить listeners и восстановить стили в `onUnmounted`.

Первоначальное состояние всегда начинается с hero. Если в URL присутствует hash секции, не обходи выбор маршрута автоматически, если отдельное поведение deep-link не будет явно добавлено позже.

## Завершение hero-анимации

Текущая анимация появления hero-частиц использует:

```ts
ROAD_INTRO.particleRevealDelay
ROAD_INTRO.particleRevealDuration
```

Не дублируй этот тайминг через независимый `setTimeout` во Vue. Three.js-сцена должна быть источником истины и один раз отправлять событие после завершения reveal:

```ts
container.dispatchEvent(new CustomEvent('roadherorevealcomplete'))
```

При reset событие должно снова стать доступным после перезапуска анимации.

После `roadherorevealcomplete` запусти стадию формирования фигур.

## Выбор частиц для фигур

Используй только часть существующих hero-частиц.

Требования:

- выбор детерминированный при одинаковом seed;
- одна частица не может принадлежать нескольким фигурам;
- количество выбранных точек равно:
  `figureCount × particlesPerFigure`;
- если доступных точек недостаточно, пропорционально уменьши `particlesPerFigure`, не создавая новый Points object;
- желательно брать частицы из разных областей hero-облака, а не вырезать заметную дыру из одного места;
- оставшиеся частицы продолжают образовывать исходное облако, можно слегка снизить их alpha после формирования фигур;
- не меняй aAbout, aProgram, aRegistration и aPartners;
- дополнительные hero-вершины по-прежнему должны исчезать при переходе к journey-состояниям.

Добавь geometry attributes, например:

```text
aNavTarget: vec3
aNavFigureIndex: float
aNavMembership: float
aNavSeed: float        // если существующего aSeed недостаточно
```

Если для hover-scale нужен центр фигуры, добавь `aNavFigureCenter: vec3` либо передавай центры через uniform array.

## Геометрия фигур

Каждая фигура — компактный читаемый glyph из точек, а не заполненный прямоугольник случайного шума.

Рекомендуемые шаблоны:

- `ring` — окружность с небольшим числом внутренних точек;
- `bars` — три вертикальные или горизонтальные полосы разной длины;
- `diamond` — ромб с более плотными углами;
- `cross` — знак/перекрестие с плотным центром;
- `grid` — небольшая модульная сетка.

Напиши детерминированные функции генерации target-позиций для каждой формы. Все функции должны принимать `count`, `seed`, `center`, `size` и возвращать одинаковое число vec3-точек.

Добавляй небольшой Gaussian jitter, чтобы фигуры оставались частью пылевого визуального языка сцены, но их силуэты были различимы.

Не создавай normals: сцена использует THREE.Points, normals здесь не участвуют.

## Раскладка «шашечки такси»

Фигуры выстраиваются в визуальный ряд по порядку ROAD_NAV_SECTIONS.

Их центры должны чередоваться между двумя строками:

```text
0: верхняя строка
1: нижняя строка
2: верхняя строка
3: нижняя строка
4: верхняя строка
```

То есть центры образуют шахматный/таксомоторный ритм, а не прямую горизонтальную линию и не текущую случайную orbit-раскладку.

Используй нормализованные координаты hero-плоскости или viewport и конфигурацию `checkerStepX`, `checkerStepY`, `figureSize`. Вся группа должна:

- оставаться преимущественно в правой части hero;
- не перекрывать основной заголовок и CTA;
- сохранять порядок слева направо;
- адаптироваться к viewport;
- на узких экранах переходить в 2–3 колонки, сохраняя шахматное чередование;
- иметь DOM hit area не меньше 44×44 CSS px.

После resize пересчитай figure centers и target positions либо используй координаты, не зависящие от пиксельного размера.

## Анимация формирования фигур

После появления исходного облака:

- выбранные частицы стартуют строго из своих текущих world/local позиций;
- двигаются в `aNavTarget` без скачка;
- фигуры собираются по очереди с `formationStagger`;
- внутри фигуры отдельные точки получают небольшой random delay;
- easing должен быть мягким, например cubic ease-in-out;
- длительность задаётся `formationDuration`;
- размер частиц не должен резко меняться;
- яркость во время движения не должна превышать финальную яркость;
- после сборки scene отправляет:

```ts
container.dispatchEvent(new CustomEvent('roadfiguresready'))
```

В шейдере используй отдельный `uNavFormationProgress`. Не переиспользуй `uHeroReveal`: reveal облака и formation фигур — две разные стадии.

Для stagger можно вычислять локальный progress так:

```text
figureStart = figureIndex × formationStagger
particleDelay = deterministicRandom × smallDelay
localProgress = normalized(globalProgress - figureStart - particleDelay)
```

Итоговая позиция выбранной частицы:

```text
mix(heroPosition, navTarget, easedLocalProgress)
```

Остальные частицы остаются в heroPosition.

## DOM-кнопки и доступность

Three.js-точки дают визуал, но интерактивные hit targets должны оставаться настоящими `<button>`.

Переиспользуй текущий `heroLinks`/`.road-orbit` слой, но:

- источник данных должен быть ROAD_NAV_SECTIONS;
- расположи кнопки поверх центров новых фигур;
- до `awaiting-selection` поставь `disabled` и `aria-hidden="true"` либо исключи их из tab order;
- после формирования включи кнопки;
- каждая кнопка получает понятный `aria-label`, например «Начать с раздела Регистрация»;
- keyboard focus должен визуально работать так же, как hover;
- после выбора кнопки фигуры больше не должны перехватывать ввод;
- при WebGL error покажи доступную DOM-навигацию и не оставляй пользователя навсегда в заблокированном состоянии.

Текстовые labels можно оставить рядом с фигурами, но они не должны заменять сами particle glyphs.

## Hover/focus

При pointer hover или keyboard focus:

- только соответствующая фигура становится ярче;
- фигура увеличивается примерно до `hoverScale` относительно собственного центра;
- увеличение не должно сдвигать центр;
- частицы облака, не входящие в фигуру, не меняются;
- переход плавный и frame-rate independent;
- при blur/mouseleave фигура возвращается в исходное состояние;
- не используй пересоздание BufferGeometry на hover.

Сохрани существующий event-подход `roadnavfocus`, но передавай figure index. В сцене храни сглаженные hover weights для всех фигур либо эквивалентную структуру.

Не ограничивай реализацию одним `uHoveredIndex` с мгновенным переключением. Яркость и scale должны плавно догонять target через delta-time damping или GSAP.

## Выбор секции и CSS order

Порядок секций должен меняться только CSS-свойством `order`. Не перемещай DOM nodes вручную и не создавай копии секций.

Сделай `.road` вертикальным flex-контейнером:

```css
.road {
  display: flex;
  flex-direction: column;
}

.road-hero {
  order: 0;
}

.road-section:not(.road-hero) {
  order: var(--section-order);
}
```

Fixed/absolute элементы canvas, grain, nav, debug и loading не должны влиять на flex layout.

Для каждой секции привяжи CSS custom property или inline order из Vue:

```vue
<section
  id="road-registration"
  class="road-section road-registration"
  :style="{ '--section-order': sectionOrder('road-registration') }"
>
```

Используй подходящий TypeScript type для CSS custom property, не отключай типизацию через глобальный `any`.

Алгоритм нового порядка:

```ts
const ORIGINAL_ORDER = [
  'road-about',
  'road-program',
  'road-speakers',
  'road-registration',
  'road-partners',
]

orderedSections = selectedId
  ? [selectedId, ...ORIGINAL_ORDER.filter(id => id !== selectedId)]
  : ORIGINAL_ORDER
```

Пример при выборе `road-registration`:

```text
road-top           order 0
road-registration  order 1
road-about         order 2
road-program       order 3
road-speakers      order 4
road-partners      order 5
```

После изменения order:

1. дождись `nextTick()`;
2. дождись как минимум одного `requestAnimationFrame`;
3. вызови `ScrollTrigger.refresh()`;
4. обнови измерения секций в Three.js-сцене;
5. только после этого вычисляй offsetTop выбранной секции и запускай автоскролл.

Не вычисляй target scroll position до layout refresh — после смены order она будет неверной.

## Связь порядка DOM с Three.js-сценой

Текущий `ROAD_SECTIONS` и `sectionAt()` используют фиксированные диапазоны scroll progress. После CSS reorder эти диапазоны больше не соответствуют видимым секциям.

Исправь это. После reorder передай сцене новый порядок через событие:

```ts
container.dispatchEvent(new CustomEvent('roadorderchange', {
  detail: { orderedSectionIds },
}))
```

Сцена должна пересчитать фактические границы секций из DOM (`offsetTop`, `offsetHeight`) после `ScrollTrigger.refresh()` и использовать их для:

- current section/debug metric;
- particle state;
- portal visibility/phase, если она семантически связана с конкретной секцией;
- других эффектов, привязанных к section id.

Не оставляй ситуацию, в которой на экране Registration, а debug и визуальное состояние считают, что пользователь находится в About.

Если текущий последовательный `uState` не позволяет морфить hero напрямую к произвольной первой секции, раздели выбор target state и progress. Используй явные from/to particle states вместо прохождения через все промежуточные состояния за один кадр.

## Unlock и мягкий переход

При клике по фигуре:

1. Зафиксируй выбранный section id.
2. Перейди в `transitioning`.
3. Визуально отметь выбранную фигуру.
4. Рассчитай новый CSS order.
5. Выполни `nextTick` → animation frame → `ScrollTrigger.refresh()`.
6. Разблокируй scroll gate.
7. Получи актуальный top выбранной секции.
8. Плавно прокрути к нему.
9. Уважай `prefers-reduced-motion`: в этом режиме используй мгновенную прокрутку.
10. После завершения установи выбранную секцию как минимально допустимую scroll-позицию journey.
11. Перейди в фазу `journey`.
12. Переведи keyboard focus на heading выбранной секции. При необходимости временно добавь `tabindex="-1"`.

Не используй обычный `scrollIntoView()` без контроля завершения. Нужен callback/promise, чтобы включить journey boundary только после фактического достижения цели. Можно использовать GSAP ScrollToPlugin, если он уже доступен и корректно подключён, либо собственную requestAnimationFrame-анимацию с отменой.

Если пользователь быстро повторно кликает, должен выполняться только первый переход.

## Запрет возврата в hero обычным скроллом

После перехода в `journey` выбранная секция становится логическим началом страницы.

Hero физически остаётся выше в DOM, но пользователь не может попасть туда через:

- wheel вверх;
- touch swipe вниз;
- PageUp;
- Home;
- ArrowUp;
- Space + Shift;
- scrollbar drag;
- программный hash jump из внутренних ссылок.

Храни `journeyFloorY`, вычисленный после CSS reorder и refresh.

Если `scrollY < journeyFloorY`, немедленно возвращай пользователя к `journeyFloorY`. Предотвращай событие заранее там, где это возможно, чтобы не возникало визуального дрожания. Учти небольшую погрешность 1–2 px.

При resize, смене шрифтов или изменении высоты контента пересчитывай `journeyFloorY` после `ScrollTrigger.refresh()`.

Не блокируй прокрутку вниз и не ломай обычные внутренние ссылки между разрешёнными секциями.

Вернуться в hero можно только через кнопку «Сбросить».

## Header и кнопка «Сбросить»

Текущий правый элемент header — `road-nav__cta` с текстом «Регистрация».

Поведение:

- в `locked-intro`, `forming-figures`, `awaiting-selection` он может оставаться CTA «Регистрация», но его клик должен выбирать фигуру Registration, а не обходить заблокированный flow через прямой scrollTo;
- в `transitioning` CTA становится disabled/inert;
- в `journey` CTA меняется на кнопку «Сбросить»;
- «Сбросить» визуально подсвечена orange/glow-состоянием и доступна с клавиатуры;
- используй настоящий `<button type="button">`, если элемент выполняет действие, а не навигацию;
- добавь `aria-label="Сбросить маршрут и вернуться к выбору секции"`.

Hero CTA «Зарегистрироваться» и «Узнать подробнее» при заблокированном scroll также должны вызывать тот же `selectSection(id)`, а не прямой `scrollTo`.

Во время journey внутренние ссылки могут работать как обычная навигация, но не должны позволять перейти выше journeyFloorY.

## Reset

Reset должен быть полностью повторяемым и не перезагружать страницу.

Последовательность:

1. Перейди в `resetting`.
2. Отмени активный autoscroll и hover tweens.
3. Отключи journey boundary.
4. Временно запрети пользовательский ввод, чтобы reset не конкурировал со скроллом.
5. Верни ORIGINAL_ORDER через CSS order.
6. Выполни `nextTick` → requestAnimationFrame → `ScrollTrigger.refresh()`.
7. Плавно прокрути к `road-top`; при reduced motion — мгновенно.
8. После достижения hero заблокируй скролл в позиции 0.
9. Сбрось selected section.
10. Сбрось hover/focus фигур.
11. Отправь Three.js-сцене `roadreset`.
12. Сцена должна:
    - обнулить случайный reveal;
    - вернуть выбранные частицы из фигур в исходное hero-облако без видимого старого кадра;
    - обнулить formation progress;
    - разрешить повторную отправку `roadherorevealcomplete` и `roadfiguresready`;
    - восстановить исходное состояние камеры/шара/дороги, если они успели измениться.
13. Перейди в `locked-intro` и повтори весь сценарий.

Не сбрасывай отправленную форму регистрации или введённые пользователем данные без отдельного требования. Reset относится к маршруту и визуальной сцене.

Очисти URL hash через History API, если он был установлен при выборе секции.

## Scene event protocol

Используй небольшой явный протокол событий между Vue и Three.js:

Scene → Vue:

```text
roadherorevealcomplete
roadfiguresready
```

Vue → Scene:

```text
roadnavfocus          detail: figureIndex или -1
roadnavselect         detail: { figureIndex, sectionId }
roadorderchange       detail: { orderedSectionIds }
roadreset
```

Все listeners должны удаляться в dispose/onUnmounted.

События completion отправляй ровно один раз за один цикл. После reset счётчики разрешают отправку повторно.

## Reduced motion

При `prefers-reduced-motion: reduce`:

- initial scroll lock сохраняется;
- частицы появляются сразу или коротким opacity fade без random stagger;
- фигуры формируются сразу;
- hover brightness работает, но hover scale можно отключить;
- autoscroll и reset scroll выполняются с behavior `auto`;
- CSS order, выбор секции, journey boundary и reset продолжают работать полностью.

## Ошибки и fallback

Пользователь не должен остаться на навсегда заблокированной странице.

Если:

- WebGL не создался;
- scene выбросила error;
- событие `roadfiguresready` не пришло за разумное fallback-время;

то:

- покажи доступные DOM-кнопки выбора секций;
- разреши выбрать секцию без particle formation;
- после выбора выполни тот же CSS order и journey flow;
- либо разблокируй обычный scroll, если даже DOM-навигация недоступна.

Не используй fallback timer как основной источник синхронизации — только как защиту от ошибки.

## Производительность

- Не создавай отдельный Mesh/Points для каждой частицы.
- Предпочтительно оставить один Points draw call.
- Не обновляй весь position buffer на CPU каждый кадр.
- Formation, hover scale и brightness вычисляй в shader через attributes/uniforms.
- Не пересоздавай BufferGeometry при hover/focus/click.
- Uniform arrays должны учитывать максимальный поддерживаемый figureCount; для пяти фигур это безопасно.
- Не увеличивай общее количество hero-частиц без необходимости.

## Debug

Добавь в runtime metrics/debug pane:

```text
navigationPhase
selectedSection
scrollLocked
journeyFloorY
figureCount
formationProgress
hoveredFigure
```

Добавь настройки NAV_CONSTELLATION в отдельную папку debug pane, если значения объекта изменяемые. Не добавляй bindings к readonly `as const` значениям без корректной типизации.

## Критерии приёмки

1. При первом открытии scrollY остаётся 0 при wheel, touch и keyboard scroll.
2. Hero-частицы сначала проходят существующий random fade-in.
3. До завершения fade-in фигуры не начинают формироваться.
4. В фигуры переходит только настроенная часть точек.
5. Количество фигур и particlesPerFigure действительно меняются конфигурацией.
6. Фигуры стоят в правильном порядке и образуют двухрядный checker/taxi rhythm.
7. Каждая фигура визуально соответствует своей DOM-кнопке и section id.
8. Hover/focus плавно увеличивает и подсвечивает только одну фигуру.
9. При клике Registration CSS order становится:
   hero → registration → about → program → speakers → partners.
10. Остальные секции сохраняют исходный относительный порядок.
11. Autoscroll начинается только после reflow и ScrollTrigger.refresh().
12. Пользователь оказывается у начала выбранной секции.
13. После перехода обычным скроллом нельзя вернуться в hero.
14. Скролл вниз работает нормально до конца страницы.
15. Header показывает активную кнопку «Сбросить».
16. Reset возвращает исходный порядок, hero и заблокированный scroll.
17. Hero reveal и formation фигур повторяются после каждого reset.
18. Повторные циклы select → journey → reset не накапливают listeners и tweens.
19. Resize не рассинхронизирует particle figures, DOM hit targets и journeyFloorY.
20. `prefers-reduced-motion` и keyboard navigation работают.
21. При ошибке WebGL страница не остаётся заблокированной.
22. `npm run build` проходит без TypeScript-ошибок.

## Обязательная визуальная и функциональная проверка

Проверь минимум следующие сценарии:

### Desktop 1280×720

- начальный заблокированный hero;
- конец random reveal;
- середина formation;
- готовые фигуры;
- hover каждой фигуры;
- выбор Registration;
- порядок DOM/CSS order;
- невозможность scroll выше Registration;
- reset и повторная анимация.

### Mobile 390×844

- scroll lock и touchmove;
- фигуры не перекрывают hero copy;
- hit targets минимум 44 px;
- выбор секции;
- journey boundary;
- reset.

### Keyboard

- Tab до каждой фигуры;
- Enter/Space выбирает секцию;
- hover-эффект повторяется на focus;
- PageUp/Home не возвращают к hero во время journey;
- focus после перехода находится в выбранной секции;
- reset доступен и возвращает фокус в hero navigation.

После реализации кратко перечисли созданные состояния, события, конфигурационные параметры и результаты проверок.
```

## Принятое толкование обратной прокрутки

Фраза «обратно пользователь с блока после hero не может проскроллить, текущий блок становится изначальным» трактуется так:

- hero остаётся в DOM и сохраняет `order: 0`;
- выбранная секция получает `order: 1`;
- после автоскролла её `offsetTop` становится минимально разрешённой scroll-позицией;
- попытки прокрутить выше блокируются;
- вернуться к hero можно только кнопкой «Сбросить».

Такой вариант сохраняет hero для повторного запуска, не создаёт дубликатов секций и выполняет требование переупорядочивания через CSS `order`.
