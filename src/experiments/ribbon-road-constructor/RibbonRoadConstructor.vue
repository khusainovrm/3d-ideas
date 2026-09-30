<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import type { SceneFactory } from '../../three/core/types'
import { useThreeScene } from '../../composables/useThreeScene'
import { useDebugPane } from '../../composables/useDebugPane'
import { createConstructorScene } from './scene'
import {
  DEFAULT_CAMERA,
  cloneNodes,
  createConstructorState,
  makeDefaultNodes,
  type CameraConfig,
  type InspectorTab,
  type RouteNode,
} from './model'

const STORAGE_KEY = 'odyssey.ribbon-road-constructor.v1'
const tabs: { id: InspectorTab; label: string }[] = [
  { id: 'nodes', label: 'Nodes' }, { id: 'road', label: 'Road' }, { id: 'ball', label: 'Ball' },
  { id: 'camera', label: 'Camera' }, { id: 'preview', label: 'Preview' }, { id: 'export', label: 'Export' },
]
const sections = [
  ['Hero', 0], ['About', 0.16], ['Program', 0.36], ['Speakers', 0.53],
  ['Registration', 0.78], ['Partners', 0.91], ['Footer', 1],
] as const

const state = reactive(createConstructorState())
const importOpen = ref(false)
const importText = ref('')
const importError = ref('')
const precision = ref(1)
const pointsPerLine = ref(1)
const trailingComma = ref(true)
const includeWrapper = ref(true)
const copyStatus = ref('')
const hasDraft = ref(false)
const draggedIndex = ref(-1)
const history = ref<RouteNode[][]>([cloneNodes(state.nodes)])
let saveTimer = 0
let statusTimer = 0

const selectedNode = computed(() => state.nodes[state.selectedIndex])
const canUndo = computed(() => state.historyIndex > 0)
const canRedo = computed(() => state.historyIndex < history.value.length - 1)
const currentSection = computed(() => {
  for (let index = sections.length - 1; index >= 0; index -= 1) if (state.progress >= sections[index]![1]) return sections[index]![0]
  return 'Hero'
})

const snapshot = (): RouteNode[] => cloneNodes(state.nodes)
const applySnapshot = (nodes: readonly RouteNode[]): void => {
  state.nodes.splice(0, state.nodes.length, ...cloneNodes(nodes))
  state.selectedIndex = Math.min(state.selectedIndex, state.nodes.length - 1)
  state.revision += 1
}
const recordHistory = (): void => {
  const next = snapshot()
  const current = history.value[state.historyIndex]
  if (current && JSON.stringify(current) === JSON.stringify(next)) return
  history.value.splice(state.historyIndex + 1)
  history.value.push(next)
  if (history.value.length > 50) history.value.shift()
  state.historyIndex = history.value.length - 1
}
const touch = (): void => { state.revision += 1; recordHistory() }
const undo = (): void => {
  if (!canUndo.value) return
  state.historyIndex -= 1
  applySnapshot(history.value[state.historyIndex]!)
}
const redo = (): void => {
  if (!canRedo.value) return
  state.historyIndex += 1
  applySnapshot(history.value[state.historyIndex]!)
}
const onSelect = (index: number): void => { state.selectedIndex = index }
const onTransformCommit = (): void => recordHistory()

const sceneFactory: SceneFactory = (runtime) => createConstructorScene({ state, onSelect, onTransformCommit })(runtime)
const { container, ready, error, metrics } = useThreeScene(sceneFactory)
const { debug, paneHost } = useDebugPane(metrics, {
  title: 'Route constructor',
  bindings: [
    { key: 'fps', label: 'FPS' }, { key: 'dpr', label: 'DPR' }, { key: 'quality', label: 'Quality' },
    { key: 'calls', label: 'Draw Calls' }, { key: 'triangles', label: 'Triangles' },
    { key: 'nodeCount', label: 'Node Count' }, { key: 'selectedNode', label: 'Selected Node' },
    { key: 'lineSamples', label: 'Geometry Steps' }, { key: 'scrollProgress', label: 'Scroll Progress' }, { key: 'ribbonProgress', label: 'Curve Progress' },
    { key: 'ballProgress', label: 'Ball Progress' }, { key: 'ballPosition', label: 'Ball Position' },
    { key: 'cameraPosition', label: 'Camera Position' }, { key: 'cameraTarget', label: 'Camera Target' },
    { key: 'editorMode', label: 'Mode' }, { key: 'dragging', label: 'Dragging' }, { key: 'historyIndex', label: 'History' },
  ],
})

defineExpose({ container, paneHost })

const makeNode = (position: { x: number; y: number; z: number }): RouteNode => ({
  id: `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
  position: { ...position },
})
const insertAfter = (): void => {
  const index = Math.max(0, state.selectedIndex)
  const current = state.nodes[index]
  const next = state.nodes[index + 1]
  if (!current) return
  const position = next ? {
    x: (current.position.x + next.position.x) / 2,
    y: (current.position.y + next.position.y) / 2,
    z: (current.position.z + next.position.z) / 2,
  } : { ...current.position, z: current.position.z - 5 }
  state.nodes.splice(index + 1, 0, makeNode(position)); state.selectedIndex = index + 1; touch()
}
const insertBefore = (): void => {
  const index = Math.max(0, state.selectedIndex)
  const current = state.nodes[index]
  const previous = state.nodes[index - 1]
  if (!current) return
  const position = previous ? {
    x: (current.position.x + previous.position.x) / 2,
    y: (current.position.y + previous.position.y) / 2,
    z: (current.position.z + previous.position.z) / 2,
  } : { ...current.position, z: current.position.z + 5 }
  state.nodes.splice(index, 0, makeNode(position)); state.selectedIndex = index; touch()
}
const appendNode = (): void => {
  const last = state.nodes[state.nodes.length - 1]
  const previous = state.nodes[state.nodes.length - 2]
  if (!last || !previous) return
  state.nodes.push(makeNode({
    x: last.position.x + last.position.x - previous.position.x,
    y: last.position.y + last.position.y - previous.position.y,
    z: last.position.z + last.position.z - previous.position.z,
  }))
  state.selectedIndex = state.nodes.length - 1; touch()
}
const prependNode = (): void => {
  const first = state.nodes[0]
  const next = state.nodes[1]
  if (!first || !next) return
  state.nodes.unshift(makeNode({
    x: first.position.x + first.position.x - next.position.x,
    y: first.position.y + first.position.y - next.position.y,
    z: first.position.z + first.position.z - next.position.z,
  }))
  state.selectedIndex = 0; touch()
}
const duplicateNode = (): void => {
  const node = selectedNode.value
  if (!node) return
  state.nodes.splice(state.selectedIndex + 1, 0, makeNode({ x: node.position.x + 0.4, y: node.position.y, z: node.position.z - 0.4 }))
  state.selectedIndex += 1; touch()
}
const deleteNode = (): void => {
  if (state.nodes.length <= 4 || state.selectedIndex < 0) return
  state.nodes.splice(state.selectedIndex, 1)
  state.selectedIndex = Math.min(state.selectedIndex, state.nodes.length - 1)
  touch()
}
const moveNode = (direction: -1 | 1): void => {
  const from = state.selectedIndex
  const to = from + direction
  if (from < 0 || to < 0 || to >= state.nodes.length) return
  const [node] = state.nodes.splice(from, 1)
  if (!node) return
  state.nodes.splice(to, 0, node); state.selectedIndex = to; touch()
}
const dropNode = (to: number): void => {
  const from = draggedIndex.value
  draggedIndex.value = -1
  if (from < 0 || from === to) return
  const [node] = state.nodes.splice(from, 1)
  if (!node) return
  state.nodes.splice(to, 0, node); state.selectedIndex = to; touch()
}
const focusSelected = (): void => { state.focusNonce += 1 }

const resetRoute = (): void => {
  if (!window.confirm('Вернуть исходный маршрут Ribbon Road?')) return
  state.nodes.splice(0, state.nodes.length, ...makeDefaultNodes())
  state.selectedIndex = 4; state.revision += 1; recordHistory()
}
const clearDraft = (): void => { localStorage.removeItem(STORAGE_KEY); hasDraft.value = false }
const restoreDraft = (): void => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return
  try {
    const saved = JSON.parse(raw) as { nodes?: RouteNode[]; camera?: CameraConfig; settings?: Partial<typeof state> }
    if (saved.nodes && saved.nodes.length >= 4) state.nodes.splice(0, state.nodes.length, ...cloneNodes(saved.nodes))
    if (saved.camera) Object.assign(state.camera, saved.camera)
    if (saved.settings) Object.assign(state, saved.settings)
    state.revision += 1
    history.value = [snapshot()]; state.historyIndex = 0
  } catch { localStorage.removeItem(STORAGE_KEY) }
}

const parseImport = (): RouteNode[] => {
  const text = importText.value.trim()
  let values: number[][] = []
  if (text.startsWith('[') && !text.includes('Vector3')) {
    const parsed = JSON.parse(text) as unknown
    if (!Array.isArray(parsed)) throw new Error('JSON должен быть массивом координат.')
    values = parsed as number[][]
  } else {
    const matches = [...text.matchAll(/new\s+Vector3\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/g)]
    values = matches.map((match) => [Number(match[1]), Number(match[2]), Number(match[3])])
  }
  if (values.length < 4) throw new Error('Нужно минимум четыре корректные точки.')
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]
    if (!value || value.length !== 3 || value.some((number) => !Number.isFinite(number) || Math.abs(number) > 10000)) throw new Error(`Некорректная точка #${index + 1}.`)
    const previous = values[index - 1]
    if (previous && value.every((number, axis) => number === previous[axis])) throw new Error(`Точки #${index} и #${index + 1} совпадают.`)
  }
  return values.map((value) => makeNode({ x: value[0]!, y: value[1]!, z: value[2]! }))
}
const applyImport = (): void => {
  try {
    const nodes = parseImport()
    state.nodes.splice(0, state.nodes.length, ...nodes); state.selectedIndex = 0; touch()
    importError.value = ''; importOpen.value = false
  } catch (cause) { importError.value = cause instanceof Error ? cause.message : 'Не удалось разобрать маршрут.' }
}

const vectorRows = computed(() => state.nodes.map((node, index) => {
  const p = node.position
  const comma = trailingComma.value || index < state.nodes.length - 1 ? ',' : ''
  return `new Vector3(${p.x.toFixed(precision.value)}, ${p.y.toFixed(precision.value)}, ${p.z.toFixed(precision.value)})${comma}`
}))
const vectorList = computed(() => {
  const rows: string[] = []
  for (let index = 0; index < vectorRows.value.length; index += pointsPerLine.value) rows.push(`  ${vectorRows.value.slice(index, index + pointsPerLine.value).join(' ')}`)
  return rows.join('\n')
})
const completeCurveCode = computed(() => `const makeCurve = (): CatmullRomCurve3 => new CatmullRomCurve3([\n${vectorList.value}\n], false, '${state.splineType}', ${state.tension.toFixed(2)})`)
const exportPreview = computed(() => includeWrapper.value ? completeCurveCode.value : vectorList.value)
const cameraCode = computed(() => `const CAMERA_CONFIG = ${JSON.stringify(state.camera, null, 2)}`)
const notifyCopied = (label: string): void => {
  copyStatus.value = `${label} скопирован`
  window.clearTimeout(statusTimer); statusTimer = window.setTimeout(() => { copyStatus.value = '' }, 1800)
}
const copy = async (text: string, label: string): Promise<void> => { await navigator.clipboard.writeText(text); notifyCopied(label) }
const downloadJson = (): void => {
  const blob = new Blob([JSON.stringify(state.nodes.map((node) => Object.values(node.position)), null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a')
  anchor.href = url; anchor.download = 'ribbon-road-route.json'; anchor.click(); URL.revokeObjectURL(url)
}

const applyPreset = (preset: string): void => {
  const presets: Record<string, Partial<CameraConfig>> = {
    production: DEFAULT_CAMERA,
    side: { heightOffset: 4.5, sideOffset: 5.5, distanceBehind: 1.5, lookAhead: 0.015, fov: 46 },
    behind: { heightOffset: 3.2, sideOffset: 0, distanceBehind: 8.5, lookAhead: 0.055, fov: 48 },
    editorial: { heightOffset: 9, sideOffset: 3, distanceBehind: 10, lookAhead: 0.07, fov: 40 },
    close: { heightOffset: 2.2, sideOffset: 1.2, distanceBehind: 4.2, lookAhead: 0.025, fov: 52 },
    wide: { heightOffset: 12, sideOffset: 7, distanceBehind: 16, lookAhead: 0.1, fov: 55 },
  }
  Object.assign(state.camera, presets[preset] ?? DEFAULT_CAMERA)
}

const jumpTo = (progress: number): void => { state.progress = progress; state.playing = false }
const onKey = (event: KeyboardEvent): void => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); return }
  if (event.key === 'Delete' || event.key === 'Backspace') deleteNode()
  if (event.key.toLowerCase() === 'f') focusSelected()
  if (event.key === 'Escape') state.selectedIndex = -1
  if (event.code === 'Space') { event.preventDefault(); state.playing = !state.playing }
}

watch(() => [state.nodes, state.camera, state.width, state.thickness, state.geometrySteps, state.tension, state.splineType, state.journeyStart, state.journeyEnd, state.ballRadius, state.ballGap, state.ballDamping, state.followScroll, state.showPoints, state.showPolygon, state.showSpline, state.showRibbon, state.showGrid, state.showAxes, state.showPortal, state.selectedIndex], () => {
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      nodes: state.nodes, camera: state.camera,
      settings: {
        width: state.width, thickness: state.thickness, geometrySteps: state.geometrySteps, tension: state.tension, splineType: state.splineType,
        journeyStart: state.journeyStart, journeyEnd: state.journeyEnd, ballRadius: state.ballRadius, ballGap: state.ballGap,
        ballDamping: state.ballDamping, followScroll: state.followScroll, showPoints: state.showPoints, showPolygon: state.showPolygon,
        showSpline: state.showSpline, showRibbon: state.showRibbon, showGrid: state.showGrid, showAxes: state.showAxes,
        showPortal: state.showPortal, selectedIndex: state.selectedIndex,
      },
    }))
    hasDraft.value = true
  }, 450)
}, { deep: true })

onMounted(() => {
  document.documentElement.classList.add('constructor-page-active')
  hasDraft.value = Boolean(localStorage.getItem(STORAGE_KEY))
  window.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  document.documentElement.classList.remove('constructor-page-active')
  window.removeEventListener('keydown', onKey)
  window.clearTimeout(saveTimer); window.clearTimeout(statusTimer)
})
</script>

<template>
  <main class="constructor">
    <div ref="container" class="constructor__canvas" />

    <header class="constructor-topbar">
      <RouterLink to="/" class="constructor-brand">← Visual lab</RouterLink>
      <div class="mode-switch" aria-label="Режим конструктора">
        <button :class="{ active: state.mode === 'edit' }" @click="state.mode = 'edit'">Edit</button>
        <button :class="{ active: state.mode === 'preview' }" @click="state.mode = 'preview'">Preview</button>
      </div>
      <div class="top-actions">
        <button :disabled="!canUndo" @click="undo">Undo</button><button :disabled="!canRedo" @click="redo">Redo</button>
        <button @click="resetRoute">Reset</button><button @click="importOpen = true">Import</button><button @click="state.tab = 'export'">Export</button>
      </div>
    </header>

    <aside class="constructor-panel">
      <div class="panel-tabs">
        <button v-for="tab in tabs" :key="tab.id" :class="{ active: state.tab === tab.id }" @click="state.tab = tab.id">{{ tab.label }}</button>
      </div>

      <div v-if="state.tab === 'nodes'" class="panel-body">
        <div class="panel-heading"><div><span>Route nodes</span><strong>{{ state.nodes.length }}</strong></div><button @click="insertAfter">+ Node</button></div>
        <div class="button-grid"><button @click="prependNode">Prepend</button><button @click="appendNode">Append</button></div>
        <div v-if="selectedNode" class="node-inspector">
          <p>#{{ String(state.selectedIndex + 1).padStart(2, '0') }} · {{ selectedNode.id }}</p>
          <div class="coordinate-grid">
            <label>X<input v-model.number="selectedNode.position.x" type="number" step="0.1" @change="touch" /></label>
            <label>Y<input v-model.number="selectedNode.position.y" type="number" step="0.1" @change="touch" /></label>
            <label>Z<input v-model.number="selectedNode.position.z" type="number" step="0.1" @change="touch" /></label>
          </div>
          <div class="button-grid">
            <button @click="insertBefore">Insert before</button><button @click="insertAfter">Insert after</button>
            <button @click="duplicateNode">Duplicate</button><button @click="focusSelected">Focus</button>
            <button @click="moveNode(-1)">Move earlier</button><button @click="moveNode(1)">Move later</button>
            <button class="danger" :disabled="state.nodes.length <= 4" @click="deleteNode">Delete</button>
          </div>
        </div>
        <div class="node-list">
          <button
            v-for="(node, index) in state.nodes" :key="node.id" draggable="true"
            :class="{ active: index === state.selectedIndex }"
            @click="state.selectedIndex = index"
            @dragstart="draggedIndex = index" @dragover.prevent @drop="dropNode(index)"
          ><span>{{ String(index + 1).padStart(2, '0') }}</span><b>{{ node.position.x.toFixed(1) }}, {{ node.position.y.toFixed(1) }}, {{ node.position.z.toFixed(1) }}</b></button>
        </div>
      </div>

      <div v-else-if="state.tab === 'road'" class="panel-body form-stack">
        <h2>Road geometry</h2>
        <label>Width <input v-model.number="state.width" type="range" min="0.5" max="6" step="0.05" @input="state.revision++" /><output>{{ state.width.toFixed(2) }}</output></label>
        <label>Thickness <input v-model.number="state.thickness" type="range" min="0.05" max="1" step="0.01" @input="state.revision++" /><output>{{ state.thickness.toFixed(2) }}</output></label>
        <label>Geometry steps <input v-model.number="state.geometrySteps" type="range" min="60" max="500" step="10" @input="state.revision++" /><output>{{ state.geometrySteps }}</output></label>
        <label>Tension <input v-model.number="state.tension" type="range" min="0" max="1" step="0.05" @input="state.revision++" /><output>{{ state.tension.toFixed(2) }}</output></label>
        <label>Spline type <select v-model="state.splineType" @change="state.revision++"><option value="centripetal">Centripetal</option><option value="catmullrom">Catmull–Rom</option><option value="chordal">Chordal</option></select></label>
        <label>Journey start <input v-model.number="state.journeyStart" type="range" min="0" max="0.4" step="0.01" /><output>{{ state.journeyStart.toFixed(2) }}</output></label>
        <label>Journey end <input v-model.number="state.journeyEnd" type="range" min="0.6" max="1" step="0.01" /><output>{{ state.journeyEnd.toFixed(2) }}</output></label>
        <h3>Helpers</h3>
        <label class="check"><input v-model="state.showPoints" type="checkbox" /> Control points</label>
        <label class="check"><input v-model="state.showPolygon" type="checkbox" /> Control polygon</label>
        <label class="check"><input v-model="state.showSpline" type="checkbox" /> Spline centerline</label>
        <label class="check"><input v-model="state.showRibbon" type="checkbox" /> Ribbon mesh</label>
        <label class="check"><input v-model="state.showPortal" type="checkbox" /> Portal marker</label>
        <label class="check"><input v-model="state.showGrid" type="checkbox" /> World grid</label>
        <label class="check"><input v-model="state.showAxes" type="checkbox" /> Axes helper</label>
        <div class="button-grid"><button @click="resetRoute">Reset route</button><button @click="clearDraft">Clear draft</button><button v-if="hasDraft" @click="restoreDraft">Restore autosave</button></div>
      </div>

      <div v-else-if="state.tab === 'ball'" class="panel-body form-stack">
        <h2>Ball</h2>
        <label class="check"><input v-model="state.ballVisible" type="checkbox" /> Visible</label>
        <label class="check"><input v-model="state.followScroll" type="checkbox" /> Follow scroll with inertia</label>
        <label>Radius <input v-model.number="state.ballRadius" type="range" min="0.1" max="1.2" step="0.01" @input="state.revision++" /><output>{{ state.ballRadius.toFixed(2) }}</output></label>
        <label>Surface gap <input v-model.number="state.ballGap" type="range" min="0" max="0.3" step="0.005" /><output>{{ state.ballGap.toFixed(3) }}</output></label>
        <label>Damping <input v-model.number="state.ballDamping" type="range" min="1" max="20" step="0.2" /><output>{{ state.ballDamping.toFixed(1) }}</output></label>
        <label>Progress <input v-model.number="state.progress" type="range" min="0" max="1" step="0.001" /><output>{{ state.progress.toFixed(3) }}</output></label>
      </div>

      <div v-else-if="state.tab === 'camera'" class="panel-body form-stack">
        <h2>Journey camera</h2>
        <label>FOV <input v-model.number="state.camera.fov" type="range" min="25" max="80" step="1" /><output>{{ state.camera.fov }}</output></label>
        <label>Height <input v-model.number="state.camera.heightOffset" type="range" min="0" max="12" step="0.1" /><output>{{ state.camera.heightOffset.toFixed(1) }}</output></label>
        <label>Side <input v-model.number="state.camera.sideOffset" type="range" min="-10" max="10" step="0.1" /><output>{{ state.camera.sideOffset.toFixed(1) }}</output></label>
        <label>Distance behind <input v-model.number="state.camera.distanceBehind" type="range" min="1" max="20" step="0.1" /><output>{{ state.camera.distanceBehind.toFixed(1) }}</output></label>
        <label>Look ahead <input v-model.number="state.camera.lookAhead" type="range" min="0" max="0.15" step="0.002" /><output>{{ state.camera.lookAhead.toFixed(3) }}</output></label>
        <label>Pointer parallax <input v-model.number="state.camera.pointerParallax" type="range" min="0" max="2" step="0.05" /><output>{{ state.camera.pointerParallax.toFixed(2) }}</output></label>
        <label>Damping <input v-model.number="state.camera.damping" type="range" min="0.5" max="20" step="0.1" /><output>{{ state.camera.damping.toFixed(1) }}</output></label>
        <label>Near <input v-model.number="state.camera.near" type="number" min="0.01" max="5" step="0.01" /></label>
        <label>Far <input v-model.number="state.camera.far" type="number" min="20" max="500" step="10" /></label>
        <h3>Presets</h3>
        <div class="button-grid presets"><button @click="applyPreset('production')">Production</button><button @click="applyPreset('side')">Hero side</button><button @click="applyPreset('behind')">Follow</button><button @click="applyPreset('editorial')">Editorial</button><button @click="applyPreset('close')">Close</button><button @click="applyPreset('wide')">Wide</button></div>
      </div>

      <div v-else-if="state.tab === 'preview'" class="panel-body form-stack">
        <h2>Live preview</h2>
        <button class="primary" @click="state.mode = 'preview'; state.playing = !state.playing">{{ state.playing ? 'Pause' : 'Play journey' }}</button>
        <button @click="jumpTo(0)">Reset to start</button>
        <div class="preview-stats"><span>Section <b>{{ currentSection }}</b></span><span>Scroll <b>{{ state.progress.toFixed(3) }}</b></span><span>Curve <b>{{ (state.journeyStart + state.progress * (state.journeyEnd - state.journeyStart)).toFixed(3) }}</b></span><span>Ball <b>{{ state.ballProgress.toFixed(3) }}</b></span><span>Lag <b>{{ Math.abs(state.ballProgress - (state.journeyStart + state.progress * (state.journeyEnd - state.journeyStart))).toFixed(3) }}</b></span></div>
        <h3>Jump to section</h3>
        <div class="button-grid"><button v-for="section in sections" :key="section[0]" @click="jumpTo(section[1])">{{ section[0] }}</button></div>
        <p class="hint">В Preview используйте колесо мыши над viewport или timeline внизу.</p>
      </div>

      <div v-else class="panel-body form-stack">
        <h2>Export</h2>
        <label>Precision <select v-model.number="precision"><option :value="1">1 decimal</option><option :value="2">2 decimals</option><option :value="3">3 decimals</option></select></label>
        <label>Points per line <select v-model.number="pointsPerLine"><option :value="1">1</option><option :value="2">2</option><option :value="3">3</option></select></label>
        <label class="check"><input v-model="trailingComma" type="checkbox" /> Include trailing comma</label>
        <label class="check"><input v-model="includeWrapper" type="checkbox" /> Include makeCurve wrapper</label>
        <textarea class="code-preview" readonly :value="exportPreview" />
        <button class="primary" @click="copy(vectorList, 'Vector3 list')">Copy Vector3 list</button>
        <button @click="copy(completeCurveCode, 'makeCurve')">Copy complete makeCurve()</button>
        <button @click="copy(JSON.stringify(state.nodes.map(node => Object.values(node.position)), null, 2), 'JSON')">Copy JSON</button>
        <button @click="downloadJson">Download JSON</button>
        <button @click="copy(cameraCode, 'Camera config')">Copy camera config</button>
        <p v-if="copyStatus" class="copy-status">{{ copyStatus }}</p>
      </div>
    </aside>

    <footer class="constructor-timeline">
      <button @click="state.playing = !state.playing; state.mode = 'preview'">{{ state.playing ? 'Ⅱ' : '▶' }}</button>
      <span>0.00</span>
      <div class="timeline-track">
        <input v-model.number="state.progress" type="range" min="0" max="1" step="0.001" @input="state.playing = false" />
        <i v-for="section in sections.slice(1, -1)" :key="section[0]" :style="{ left: `${section[1] * 100}%` }" :title="section[0]" />
      </div>
      <span>{{ state.progress.toFixed(3) }}</span>
      <b>{{ currentSection }}</b>
    </footer>

    <div v-if="importOpen" class="constructor-modal" @click.self="importOpen = false">
      <section><header><h2>Import route</h2><button @click="importOpen = false">×</button></header><textarea v-model="importText" placeholder="JSON или new Vector3(...)" /><p v-if="importError">{{ importError }}</p><button class="primary" @click="applyImport">Apply route</button></section>
    </div>
    <div v-if="debug" ref="paneHost" class="constructor-debug" />
    <div v-if="!ready && !error" class="constructor-status">Building editor…</div>
    <div v-if="error" class="constructor-status error">{{ error }}</div>
  </main>
</template>

<style scoped>
.constructor { --bg:#09090a; --panel:#111112ee; --ink:#e9e4dc; --muted:#8d8a84; --line:#323130; --accent:#ff6a13; position:fixed; inset:0; overflow:hidden; color:var(--ink); background:var(--bg); font-family:ui-monospace,'SFMono-Regular',Menlo,monospace; }
:global(html.constructor-page-active), :global(html.constructor-page-active body) { overflow:hidden; background:#09090a; }
.constructor__canvas { position:absolute; inset:52px 340px 58px 0; }
.constructor__canvas :deep(canvas) { display:block; width:100%; height:100%; touch-action:none; }
button, input, select, textarea { font:inherit; }
button { color:var(--ink); background:#181819; border:1px solid var(--line); padding:8px 10px; cursor:pointer; }
button:hover:not(:disabled), button.active { border-color:#817e78; background:#242423; }
button:disabled { opacity:.35; cursor:default; }
button.primary { color:#171512; background:var(--ink); border-color:var(--ink); }
button.danger { color:#ef8e7a; }
.constructor-topbar { position:absolute; z-index:10; inset:0 0 auto; height:52px; display:grid; grid-template-columns:1fr auto 1fr; align-items:center; padding:0 14px; background:#0d0d0e; border-bottom:1px solid var(--line); font-size:10px; text-transform:uppercase; letter-spacing:.1em; }
.constructor-brand { color:inherit; text-decoration:none; }
.mode-switch, .top-actions { display:flex; gap:5px; }
.top-actions { justify-self:end; }
.constructor-panel { position:absolute; z-index:8; top:52px; right:0; bottom:58px; width:340px; background:var(--panel); border-left:1px solid var(--line); backdrop-filter:blur(15px); overflow:hidden; }
.panel-tabs { display:grid; grid-template-columns:repeat(3,1fr); padding:8px; gap:4px; border-bottom:1px solid var(--line); }
.panel-tabs button { padding:7px 4px; font-size:9px; text-transform:uppercase; }
.panel-body { height:calc(100% - 78px); padding:16px; overflow:auto; }
.panel-body h2 { margin:0 0 18px; font-size:17px; font-weight:500; }
.panel-body h3 { margin:24px 0 10px; color:var(--muted); font-size:9px; text-transform:uppercase; letter-spacing:.12em; }
.panel-heading { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
.panel-heading div { display:flex; flex-direction:column; gap:3px; }
.panel-heading span, .node-inspector p { color:var(--muted); font-size:9px; text-transform:uppercase; }
.panel-heading strong { font-size:22px; font-weight:400; }
.node-inspector { padding:12px; margin-bottom:12px; border:1px solid var(--line); background:#0b0b0c; }
.node-inspector p { margin:0 0 12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.coordinate-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin-bottom:10px; }
.coordinate-grid label { color:var(--muted); font-size:9px; }
.coordinate-grid input { width:100%; margin-top:5px; padding:7px 5px; color:var(--ink); background:#171718; border:1px solid var(--line); }
.button-grid { display:grid; grid-template-columns:1fr 1fr; gap:5px; }
.button-grid button { font-size:9px; }
.node-list { display:flex; flex-direction:column; gap:3px; }
.node-list button { display:grid; grid-template-columns:30px 1fr; text-align:left; font-size:9px; }
.node-list button span { color:var(--accent); }.node-list button b { font-weight:400; color:var(--muted); }
.form-stack { display:flex; flex-direction:column; gap:9px; }
.form-stack > label:not(.check) { display:grid; grid-template-columns:95px 1fr 44px; gap:7px; align-items:center; color:var(--muted); font-size:9px; }
.form-stack input[type='range'] { width:100%; accent-color:var(--accent); }
.form-stack input[type='number'], .form-stack select { min-width:0; padding:7px; color:var(--ink); background:#171718; border:1px solid var(--line); }
.form-stack output { color:var(--ink); text-align:right; }.check { color:var(--muted); font-size:10px; }.check input { accent-color:var(--accent); }
.preview-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:5px; margin:8px 0; }.preview-stats span { display:flex; flex-direction:column; gap:5px; padding:9px; color:var(--muted); background:#171718; font-size:8px; }.preview-stats b { color:var(--ink); font-weight:400; }
.hint { color:var(--muted); font:10px/1.5 system-ui,sans-serif; }.code-preview { min-height:240px; resize:vertical; padding:10px; color:#d7d1c8; background:#080809; border:1px solid var(--line); font-size:9px; line-height:1.5; }.copy-status { color:var(--accent); font-size:10px; }
.constructor-timeline { position:absolute; z-index:10; inset:auto 0 0; height:58px; display:grid; grid-template-columns:36px 34px 1fr 50px 90px; align-items:center; gap:10px; padding:0 14px; background:#0d0d0e; border-top:1px solid var(--line); color:var(--muted); font-size:9px; }
.timeline-track { position:relative; }.timeline-track input { display:block; width:100%; accent-color:var(--accent); }.timeline-track i { position:absolute; top:3px; bottom:3px; width:1px; background:#777; pointer-events:none; }.constructor-timeline b { color:var(--ink); font-weight:400; text-align:right; }
.constructor-modal { position:absolute; z-index:30; inset:0; display:grid; place-items:center; background:#000a; }.constructor-modal section { width:min(620px,90vw); padding:18px; background:#121213; border:1px solid var(--line); }.constructor-modal header { display:flex; justify-content:space-between; align-items:center; }.constructor-modal h2 { margin:0;font-size:18px; }.constructor-modal textarea { width:100%; min-height:280px; margin:15px 0; padding:12px; color:var(--ink); background:#080809; border:1px solid var(--line); }.constructor-modal p { color:#e68772; font-size:10px; }
.constructor-debug { position:fixed; z-index:40; top:62px; left:14px; width:280px; }.constructor-status { position:absolute; z-index:25; inset:52px 340px 58px 0; display:grid; place-items:center; background:#09090a; color:var(--muted); font-size:10px; }.constructor-status.error { color:#e68772; }
@media (max-width:800px) { .constructor__canvas { right:0; bottom:48vh; }.constructor-panel { top:52vh; left:0; bottom:58px; width:100%; border-left:0; border-top:1px solid var(--line); }.constructor-topbar { grid-template-columns:1fr auto; }.mode-switch { display:none; }.constructor-status { right:0; bottom:48vh; }.constructor-timeline { grid-template-columns:34px 1fr 50px; }.constructor-timeline > span:first-of-type,.constructor-timeline b { display:none; } }
</style>
