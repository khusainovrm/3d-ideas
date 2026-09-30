# ПРОМТ: ВИЗУАЛЬНЫЙ КОНСТРУКТОР МАРШРУТА RIBBON ROAD

Создай новую отдельную экспериментальную страницу в существующем проекте на:

- Vue 3;
- TypeScript;
- Three.js;
- GSAP;
- GSAP ScrollTrigger;
- GLSL shaders.

Новая страница должна быть визуальным редактором маршрута для существующего эксперимента `ribbon-road`.

Это не замена текущего лендинга и не изменение его маршрута. Конструктор должен находиться на отдельном route и использоваться как внутренний инструмент для настройки spline, камеры и движения шарика.

Предлагаемый route:

```txt
/experiments/ribbon-road-constructor
```

Главный результат работы конструктора — готовый TypeScript-массив `Vector3`, который можно напрямую вставить в метод `makeCurve()` эксперимента `ribbon-road`.

---

# ПЕРЕД РЕАЛИЗАЦИЕЙ

Изучи текущую реализацию:

```txt
src/experiments/ribbon-road/RibbonRoad.vue
src/experiments/ribbon-road/scene.ts
src/experiments/ribbon-road/shaders/*
```

Переиспользуй из неё:

- алгоритм построения объёмной дороги;
- ширину и толщину дороги;
- `CatmullRomCurve3`;
- алгоритм вычисления tangent, normal и right;
- шарик и fake physics;
- scroll progress;
- текущую камеру;
- quality profiles;
- renderer/lifecycle;
- `#debug`;
- resize/dispose utilities.

Не копируй большие независимые версии одной и той же логики. Если необходимо, вынеси общую геометрию маршрута, расчёт frame и ball movement в переиспользуемые модули внутри `src/experiments/ribbon-road/`.

Текущий route `ribbon-road` не должен сломаться или изменить поведение после рефакторинга.

---

# ОСНОВНАЯ ЗАДАЧА

Конструктор должен позволять:

1. Видеть объёмную ribbon-дорогу в Three.js.
2. Видеть все управляющие узлы spline как отдельные 3D-шарики.
3. Выбирать узел мышью.
4. Перетаскивать выбранный узел в пространстве.
5. Точно редактировать его координаты через UI.
6. Добавлять новые узлы.
7. Удалять существующие узлы.
8. Менять порядок узлов.
9. Видеть результат перестроения дороги в реальном времени.
10. Запускать live scroll-preview с шариком и камерой.
11. Настраивать камеру.
12. Получать готовый список `new Vector3(x, y, z)`.
13. Копировать результат в clipboard.

---

# СТРУКТУРА ЭКРАНА

Используй desktop-first layout внутреннего инструмента:

```txt
┌─────────────────────────────────────────────────────────────┐
│ Top bar: режим, undo/redo, reset, import, export            │
├──────────────────────────────────────────┬──────────────────┤
│                                          │                  │
│                                          │ Nodes / Camera   │
│            THREE.JS VIEWPORT             │ Inspector panel  │
│                                          │                  │
│                                          │                  │
├──────────────────────────────────────────┴──────────────────┤
│ Timeline / Scroll preview / Progress                         │
└─────────────────────────────────────────────────────────────┘
```

На узких экранах inspector может открываться как drawer, но основной target конструктора — desktop.

Не стилизовать инструмент как sci-fi HUD. Интерфейс должен быть спокойным, функциональным и соответствовать общей эстетике проекта.

---

# РЕЖИМЫ РАБОТЫ

Сделай два основных режима.

## 1. Edit mode

Режим редактирования spline:

- камера управляется orbit controls или аналогичным лёгким editor navigation;
- scroll страницы не управляет движением по дороге;
- видны управляющие узлы;
- доступны transform controls;
- можно добавлять, удалять и перемещать узлы;
- дорога перестраивается сразу после изменения.

## 2. Preview mode

Режим просмотра результата:

- editor handles и вспомогательные линии скрываются;
- используется камера из `ribbon-road`;
- работает шарик;
- доступен scroll progress;
- можно прокрутить весь маршрут и оценить композицию как на настоящей странице;
- можно поставить preview на pause;
- можно вручную перемещать progress через timeline slider.

Переключение Edit / Preview не должно пересоздавать WebGL renderer.

---

# УЗЛЫ МАРШРУТА

Источник данных:

```ts
interface RouteNode {
  id: string
  position: {
    x: number
    y: number
    z: number
  }
}
```

Первоначально загрузи актуальные точки из `makeCurve()` эксперимента `ribbon-road`.

Каждый узел отображается в сцене как небольшой шарик.

Визуальные состояния:

```txt
обычный узел        — нейтральный серый
hover               — светлый
selected            — оранжевый
первый узел         — отдельный маркер START
последний узел      — отдельный маркер END
служебное продолжение — приглушённый цвет
```

Рядом с выбранным узлом можно показывать DOM-label:

```txt
#08
x: 2.30
y: -1.50
z: -36.00
```

Не создавать отдельный draw call для каждого узла. Используй `InstancedMesh` для node handles, если это не мешает raycasting и selection.

---

# ВЫБОР И ПЕРЕМЕЩЕНИЕ УЗЛОВ

Используй Three.js raycasting для hover и selection.

После выбора узла должны появляться transform controls:

- X — красная ось;
- Y — зелёная ось;
- Z — синяя ось.

Нужны режимы:

```txt
Translate X
Translate Y
Translate Z
Translate XY / XZ / YZ
```

Можно использовать `TransformControls` из Three.js examples.

Во время drag:

- orbit controls временно блокируются;
- координаты узла обновляются в UI;
- spline и ribbon перестраиваются в реальном времени;
- шарик и камера используют обновлённую curve;
- не создавать новую geometry на каждый pointermove без ограничений.

Добавь throttling или обновление не чаще одного раза за animation frame.

После завершения drag выполнить окончательное обновление geometry и history state.

---

# INSPECTOR УЗЛА

Для выбранного узла показать:

```txt
Node index
Node id
X
Y
Z
```

Координаты должны редактироваться:

- через numeric input;
- через stepper;
- через drag по label, если это удобно;
- с configurable step, например `0.1`, `0.5`, `1`.

Добавь действия:

```txt
Duplicate node
Insert before
Insert after
Delete node
Move earlier
Move later
Focus camera on node
```

Нельзя удалить узлы ниже безопасного минимума для `CatmullRomCurve3`.

---

# ДОБАВЛЕНИЕ УЗЛОВ

Поддержи несколько сценариев.

## Insert between nodes

При выборе сегмента дороги пользователь может добавить точку между двумя существующими узлами.

Начальная позиция новой точки:

```ts
lerp(previous.position, next.position, 0.5)
```

## Append node

Добавить новую точку после последней, продолжая направление последних двух узлов.

Пример:

```ts
const direction = last.clone().sub(previous)
const next = last.clone().add(direction)
```

## Prepend node

Аналогично добавить точку до первой.

---

# УДАЛЕНИЕ И ПОРЯДОК

Удаление должно:

- требовать явного действия;
- обновлять spline;
- корректно выбирать соседний узел;
- попадать в undo history.

Изменение порядка:

- кнопки move earlier / move later;
- drag-and-drop списка узлов в inspector;
- после reorder маршрут перестраивается.

---

# ВСПОМОГАТЕЛЬНАЯ ВИЗУАЛИЗАЦИЯ

В Edit mode можно включать и выключать:

```txt
Control points
Control polygon
Spline centerline
Ribbon mesh
Ball
Camera helper
Portal marker
Section markers
World grid
Axes helper
```

Control polygon — тонкие линии между исходными управляющими точками.

Spline centerline — отдельная линия, показывающая результат интерполяции `CatmullRomCurve3`.

World grid должен быть нейтральным и не перекрывать дорогу.

---

# ПЕРЕСТРОЕНИЕ RIBBON

После изменения узлов:

1. Создать новую `CatmullRomCurve3`.
2. Перестроить ribbon geometry общей функцией из `ribbon-road`.
3. Пересчитать bounding sphere.
4. Обновить ball path.
5. Обновить camera path.
6. Обновить portal position.
7. Dispose старой geometry.

Не создавать новый материал и renderer при каждом изменении.

Сохранять:

- чёткие грани дороги;
- отдельные верх, низ и боковины;
- стабильный world-up frame;
- отсутствие видимого внутреннего каркаса;
- корректное положение шарика на верхней поверхности.

---

# ШАРИК

В сцене конструктора должен присутствовать тот же шарик, что и в `ribbon-road`.

Требования:

- молочный цвет;
- матовый материал;
- положение от той же curve;
- offset от реальной верхней поверхности;
- вращение от пройденной дистанции;
- отсутствие physics engine;
- fake physics и damping в Preview mode;
- в Edit mode можно фиксировать шарик на выбранном progress.

Добавь настройки:

```txt
Ball visible
Ball progress
Ball radius
Ball surface gap
Ball damping
Follow scroll
```

При изменении spline шарик не должен проваливаться внутрь дороги или оказываться сбоку.

---

# SCROLL PREVIEW

В Preview mode сделай виртуальный scroll-просмотр.

Должны работать оба способа:

## Настоящий scroll

Колесо мыши и trackpad меняют `scrollProgress` от `0` до `1`.

## Timeline slider

В нижней панели:

```txt
0.00 ─────────────●──────────── 1.00
```

Slider должен менять тот же источник progress.

Показывать:

```txt
Scroll Progress
Curve Progress
Ball Progress
Ball Lag
Current Section
```

Добавь кнопки:

```txt
Play preview
Pause
Reset to start
Jump to Hero
Jump to About
Jump to Program
Jump to Speakers
Jump to Registration
Jump to Partners
Jump to Footer
```

При автоматическом preview progress медленно идёт от `0` до `1`.

---

# SECTION MARKERS

Покажи на timeline существующие границы секций из `ROAD_SECTIONS`.

В 3D-сцене optional markers могут показывать точки spline, соответствующие:

```txt
Hero
About
Program
Speakers
Registration
Partners
Footer
```

Section markers не являются частью экспортируемого массива.

Они нужны только для проверки композиции камеры и дороги в разных фазах.

---

# НАСТРОЙКИ КАМЕРЫ

Добавь отдельную вкладку `Camera`.

Минимальные параметры:

```txt
FOV
Near
Far
Follow progress offset
Look-ahead distance
Height offset
Side offset
Distance behind ball
Pointer parallax strength
Camera damping
```

Если настройки меняются, результат должен сразу отображаться в Preview mode.

Также добавь:

```txt
Use editor camera
Use journey camera
Show camera helper
Lock camera to ball
Look at ball
Look ahead on curve
```

Для сложных параметров используй понятные подписи и безопасные диапазоны.

Пример диапазонов:

```txt
FOV: 25–80
Height offset: 0–12
Side offset: -10–10
Look ahead: 0–0.15
Pointer parallax: 0–2
Camera damping: 0–20
```

---

# CAMERA PRESETS

Добавь пресеты:

```txt
Hero side view
Follow from behind
High editorial view
Close ball tracking
Wide route overview
```

Пресет меняет только настройки камеры и не изменяет spline.

Должна быть возможность вернуть параметры к значениям текущего `ribbon-road`.

---

# IMPORT

Добавь textarea или dialog для импорта.

Поддерживаемый формат:

```ts
[
  new Vector3(-4.0, 7.0, 18),
  new Vector3(-3.5, 6.5, 13),
  new Vector3(-3.0, 6.0, 8),
]
```

Также можно поддержать JSON:

```json
[
  [-4, 7, 18],
  [-3.5, 6.5, 13],
  [-3, 6, 8]
]
```

Перед применением проверить:

- корректность чисел;
- минимальное количество узлов;
- отсутствие `NaN` и `Infinity`;
- разумный диапазон координат;
- отсутствие полностью совпадающих соседних точек.

При ошибке показать понятное сообщение и не разрушать текущий маршрут.

Не использовать `eval` для разбора TypeScript-кода.

---

# EXPORT

Основной результат:

```ts
const makeCurve = (): CatmullRomCurve3 => new CatmullRomCurve3([
  new Vector3(-4.0, 7.0, 18),
  new Vector3(-3.5, 6.5, 13),
  new Vector3(-3.0, 6.0, 8),
], false, 'centripetal', 0.5)
```

Добавь варианты экспорта:

```txt
Copy Vector3 list
Copy complete makeCurve()
Copy JSON
Download JSON
```

Настройки форматирования:

```txt
Precision: 1 / 2 / 3 decimal places
Points per line: 1 / 2 / 3
Include trailing comma
Include makeCurve wrapper
```

После copy показать краткое подтверждение.

---

# CAMERA EXPORT

Отдельно выводить объект настроек камеры:

```ts
const CAMERA_CONFIG = {
  fov: 46,
  heightOffset: 4.2,
  sideOffset: 0,
  distanceBehind: 7.4,
  lookAhead: 0.045,
  pointerParallax: 0.4,
  damping: 2.2,
}
```

Добавить кнопку:

```txt
Copy camera config
```

---

# HISTORY

Добавь undo/redo минимум на 50 действий.

В history должны попадать:

- перемещение узла после завершения drag;
- изменение координат через inspector;
- добавление;
- удаление;
- duplicate;
- reorder;
- import;
- reset.

Не добавлять отдельный history item на каждый pixel движения drag.

Горячие клавиши:

```txt
Cmd/Ctrl + Z       Undo
Cmd/Ctrl + Shift+Z Redo
Delete/Backspace   Delete selected node
F                  Focus selected node
Escape             Deselect / cancel
Space              Play / pause preview
```

Не перехватывать shortcut, если пользователь печатает в input или textarea.

---

# PERSISTENCE

Сохраняй рабочее состояние в `localStorage`:

```txt
route nodes
camera config
editor visibility settings
last selected node
```

Добавь:

```txt
Restore autosave
Reset to current ribbon-road route
Clear local draft
```

Не записывать изменения непосредственно в исходный `scene.ts` автоматически.

Конструктор только экспортирует результат. Изменение production route остаётся явным действием разработчика.

---

# UI-ПАНЕЛЬ

Можно использовать существующий Tweakpane только для runtime/debug параметров.

Основной editor UI лучше сделать на Vue, потому что нужны:

- список узлов;
- drag-and-drop;
- import/export dialogs;
- undo/redo;
- timeline;
- адаптивный inspector.

Предлагаемые вкладки:

```txt
Nodes
Road
Ball
Camera
Preview
Export
```

---

# ROAD SETTINGS

Вынеси в UI:

```txt
Width
Thickness
Spline type
Tension
Geometry steps
Journey start
Journey end
```

Для текущего проекта дефолты должны совпадать с `ribbon-road`.

При изменении width/thickness шарик должен автоматически оставаться на поверхности.

---

# PERFORMANCE

Редактирование должно оставаться плавным.

Стратегия:

- один WebGL renderer;
- одна ribbon mesh;
- один ball mesh;
- один `InstancedMesh` для handles;
- один line object для control polygon;
- один line object для spline preview;
- geometry rebuild не чаще одного раза за animation frame;
- low/medium/high quality profiles;
- reduced geometry во время активного drag;
- финальная geometry после pointerup;
- никаких physics engines.

Во время drag допустимо временно снижать количество spline samples.

---

# DEBUG

Debug mode вызывается только через:

```txt
#debug
```

Не использовать query params.

Показывать:

```txt
FPS
DPR
Quality
Draw Calls
Triangles
Node Count
Selected Node
Geometry Steps
Scroll Progress
Curve Progress
Ball Progress
Ball Position
Camera Position
Camera Target
Edit / Preview mode
Dragging
History index
```

Переиспользовать существующую debug panel проекта.

---

# ROUTING И КАТАЛОГ

Зарегистрируй новый experiment в существующем `src/config/experiments.ts`.

Пример:

```txt
Title: Ribbon Road Constructor
Description: Визуальный редактор spline-маршрута, камеры и движения шарика.
Technologies: Curve editor, TransformControls, Live preview
Load: Medium
```

Route должен работать при прямом открытии и после navigation из каталога.

---

# CLEANUP

При уходе со страницы:

- cancelAnimationFrame;
- kill GSAP timelines;
- kill ScrollTriggers;
- dispose OrbitControls;
- dispose TransformControls;
- удалить pointer/keyboard/wheel listeners;
- dispose ribbon geometry;
- dispose handles geometry/material;
- dispose line geometries/materials;
- dispose ball geometry/material;
- dispose helpers;
- dispose renderer resources через существующий lifecycle;
- не допускать memory leaks.

---

# UX-ТРЕБОВАНИЯ

Пользователь должен быстро понимать:

- какой узел выбран;
- где начало и конец маршрута;
- по какой оси он перемещает точку;
- как перейти в Preview;
- где находится шарик;
- какая секция сейчас просматривается;
- как скопировать результат;
- есть ли несохранённый local draft.

Опасные действия `Reset`, `Clear draft` и массовый import должны иметь подтверждение или возможность Undo.

---

# КРИТЕРИИ ГОТОВНОСТИ

Готовый результат должен позволять выполнить полный сценарий:

1. Открыть отдельный route конструктора.
2. Увидеть текущий маршрут `ribbon-road`.
3. Выбрать любой управляющий узел.
4. Переместить его мышью по нужной оси.
5. Изменить координаты через numeric inputs.
6. Добавить новый узел между существующими.
7. Удалить узел.
8. Отменить действие через Undo.
9. Переключиться в Preview mode.
10. Прокрутить путь от начала до конца.
11. Увидеть шарик, который корректно катится по изменённой дороге.
12. Настроить FOV, camera offset и look-ahead.
13. Вернуться в Edit mode без потери изменений.
14. Скопировать корректный `makeCurve()`.
15. Перезагрузить страницу и восстановить draft.

---

# ФИНАЛЬНЫЙ РЕЗУЛЬТАТ

Нужно реализовать полностью рабочую experiment-page, а не только UI-макет или архитектурное описание.

Обязательно должны быть:

- отдельный route;
- визуальная объёмная ribbon-дорога;
- редактируемые spline nodes;
- 3D handles;
- raycast selection;
- TransformControls;
- добавление и удаление узлов;
- изменение порядка;
- live geometry rebuild;
- Edit mode;
- Preview mode;
- scroll preview;
- timeline slider;
- молочный шарик;
- fake physics;
- camera settings;
- camera presets;
- import;
- export `Vector3[]`;
- export полного `makeCurve()`;
- export camera config;
- copy to clipboard;
- undo/redo;
- autosave в localStorage;
- quality levels;
- `#debug`;
- корректный cleanup.

Главный критерий:

**разработчик должен иметь возможность визуально собрать маршрут, сразу проехать по нему камерой и шариком, а затем одним действием получить готовый массив `Vector3` для production-метода `makeCurve()`.**
