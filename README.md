# Odyssey Visual Lab

Экспериментальный Vue/WebGL playground для исследования визуального языка фильма «Одиссея» (2026). Это набор независимых сцен, а не production-лендинг.

## Запуск

```bash
npm install
npm run dev
```

Production-проверка:

```bash
npm run build
npm run preview
```

Добавьте `#debug` к URL любой сцены, чтобы лениво загрузить Tweakpane с FPS, DPR, quality level, количеством частиц, draw calls, triangles, geometries и textures.

## Структура

```text
src/
  components/
    ExperimentStage.vue       # canvas, controls, debug pane
  composables/
    useThreeScene.ts          # WebGL lifecycle, RAF, resize, quality
    usePointer.ts             # reusable сглаженный pointer input
  config/
    experiments.ts            # единый каталог карточек
  experiments/
    sea-particles/            # Vue shell + scene.ts + GLSL
    star-navigation/
    odyssey-route/
    shader-ocean/
    golden-dust/
    storm-transition/
  router/
    index.ts                  # только lazy routes
  three/
    core/                     # contracts, quality, FPS monitor
    shaders/                  # переиспользуемые GLSL shaders
    utils/                    # disposal helpers
  views/
    CatalogView.vue
```

## Как добавить эксперимент

1. Создайте `src/experiments/my-experiment/MyExperiment.vue` и `scene.ts`.
2. Реализуйте `SceneFactory` из `src/three/core/types.ts`. Фабрика должна вернуть `update()` и `dispose()`; `reset()`, `resize()`, `setQuality()` и `stats()` опциональны.
3. В Vue-файле передайте factory и metadata в `ExperimentStage`.
4. Добавьте одну запись с metadata и `component: () => import(...)` в `src/config/experiments.ts`. Роутер и каталог прочитают её автоматически.

У каждой сцены собственный chunk. Tweakpane также импортируется динамически только для `#debug`.

## Performance presets

Глобальные настройки находятся в `src/three/core/quality.ts`:

- `dpr` — верхний предел device pixel ratio;
- `particleScale` и `segmentScale` — общие коэффициенты для новых сцен;
- `shaderDetail` — ветка сложности shader'а;
- `decorativeObjects` — бюджет второстепенных объектов;
- `postprocessing` — разрешение на postprocessing;
- `updateStride` — частота обновления CPU-side параметров.

Конкретные безопасные размеры геометрии (`COUNTS`, `SEGMENTS`, `RAIN`) лежат рядом с каждой сценой. Это намеренно: одна цифра не подходит одновременно для points, grid и rain.

## iPhone 8 Plus baseline

- Touch-устройство с компактным экраном стартует на `low`, DPR = 1.
- Два последовательных секундных замера ниже 30 FPS понижают качество; повторное понижение возможно после cooldown, повышения во время сессии нет.
- Low quality сокращает particles и subdivisions, отключает postprocessing и допускает обновление части CPU-side логики через кадр.
- Сцены используют `Points`, `BufferGeometry`, `PlaneGeometry` и shaders; нет shadow maps, reflection probes, texture downloads или CPU particle simulation.
- Resize выполняется через `ResizeObserver` и один `requestAnimationFrame`, а ScrollTrigger меняет только лёгкие state-параметры.
- При unmount останавливаются RAF/GSAP/ScrollTrigger, снимаются listeners, уничтожаются geometries/materials/textures, renderer и WebGL context.
- `prefers-reduced-motion` уменьшает wave/camera/particle motion и исключает scrub-анимацию.

При создании нового эффекта сначала удерживайте draw calls и transparent overdraw, затем масштабируйте количество частиц. Красивые 5 000 точек почти всегда полезнее 25 000 плохо различимых.
