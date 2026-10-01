import {
  BALL_RADIUS,
  BALL_SURFACE_GAP,
  JOURNEY_END,
  JOURNEY_START,
  ROAD_INTRO,
  ROAD_POINT_VALUES,
  ROAD_THICKNESS,
  ROAD_WIDTH,
  type RibbonSplineType,
} from '../ribbon-road/route'

export type EditorMode = 'edit' | 'preview'
export type InspectorTab = 'nodes' | 'road' | 'ball' | 'intro' | 'camera' | 'preview' | 'export'

export interface RouteNode {
  id: string
  position: { x: number; y: number; z: number }
}

export interface CameraConfig {
  fov: number
  near: number
  far: number
  heightOffset: number
  sideOffset: number
  distanceBehind: number
  lookAhead: number
  pointerParallax: number
  damping: number
}

export interface IntroConfig {
  enabled: boolean
  triggerSectionId: string
  triggerViewportHeights: number
  transitionViewportHeights: number
  previewPageViewportHeights: number
  cameraLift: number
  roadRevealStart: number
  roadRevealEnd: number
  ballEntryStart: number
  ballEntryEnd: number
  ballStartProgressOffset: number
  ballArrivalProgress: number
  ballHandoffViewportHeights: number
  initialSideDistance: number
  initialSideHeight: number
}

export interface IntroPreviewState {
  start: number
  end: number
  progress: number
  roadReveal: number
  ballEntry: number
  ballHandoff: number
}

export interface ConstructorState {
  nodes: RouteNode[]
  mode: EditorMode
  tab: InspectorTab
  selectedIndex: number
  hoveredIndex: number
  revision: number
  focusNonce: number
  progress: number
  ballProgress: number
  playing: boolean
  dragging: boolean
  historyIndex: number
  width: number
  thickness: number
  geometrySteps: number
  tension: number
  splineType: RibbonSplineType
  journeyStart: number
  journeyEnd: number
  ballVisible: boolean
  ballRadius: number
  ballGap: number
  ballDamping: number
  followScroll: boolean
  showPoints: boolean
  showPolygon: boolean
  showSpline: boolean
  showRibbon: boolean
  showGrid: boolean
  showAxes: boolean
  showPortal: boolean
  camera: CameraConfig
  intro: IntroConfig
}

export const DEFAULT_POSITIONS = ROAD_POINT_VALUES

export const DEFAULT_CAMERA: CameraConfig = {
  fov: 46,
  near: 0.08,
  far: 150,
  heightOffset: 4.2,
  sideOffset: 0,
  distanceBehind: 7.4,
  lookAhead: 0.045,
  pointerParallax: 0.4,
  damping: 2.2,
}

export const DEFAULT_INTRO: IntroConfig = {
  enabled: ROAD_INTRO.enabled,
  triggerSectionId: ROAD_INTRO.triggerSectionId ?? '',
  triggerViewportHeights: ROAD_INTRO.triggerViewportHeights,
  transitionViewportHeights: ROAD_INTRO.transitionViewportHeights,
  previewPageViewportHeights: 8.5,
  cameraLift: ROAD_INTRO.cameraLift,
  roadRevealStart: ROAD_INTRO.roadRevealStart,
  roadRevealEnd: ROAD_INTRO.roadRevealEnd,
  ballEntryStart: ROAD_INTRO.ballEntryStart,
  ballEntryEnd: ROAD_INTRO.ballEntryEnd,
  ballStartProgressOffset: ROAD_INTRO.ballStartProgressOffset,
  ballArrivalProgress: ROAD_INTRO.ballArrivalProgress,
  ballHandoffViewportHeights: ROAD_INTRO.ballHandoffViewportHeights,
  initialSideDistance: ROAD_INTRO.initialSideDistance,
  initialSideHeight: ROAD_INTRO.initialSideHeight,
}

const INTRO_SECTION_PROGRESS: Record<string, number> = {
  'road-top': 0,
  'road-about': 0.16,
  'road-program': 0.36,
  'road-speakers': 0.53,
  'road-registration': 0.78,
  'road-partners': 0.91,
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))
const smoothstep = (start: number, end: number, value: number): number => {
  const x = clamp01((value - start) / Math.max(0.0001, end - start))
  return x * x * (3 - 2 * x)
}

export const getIntroPreviewState = (state: ConstructorState): IntroPreviewState => {
  if (!state.intro.enabled) return { start: 0, end: 0, progress: 1, roadReveal: 1, ballEntry: 1, ballHandoff: 1 }
  const pageViewportHeights = Math.max(1, state.intro.previewPageViewportHeights)
  const start = state.intro.triggerSectionId
    ? INTRO_SECTION_PROGRESS[state.intro.triggerSectionId] ?? 0
    : state.intro.triggerViewportHeights / pageViewportHeights
  const end = start + state.intro.transitionViewportHeights / pageViewportHeights
  const progress = smoothstep(start, end, state.progress)
  const handoffEnd = end + state.intro.ballHandoffViewportHeights / pageViewportHeights
  return {
    start,
    end,
    progress,
    roadReveal: smoothstep(state.intro.roadRevealStart, state.intro.roadRevealEnd, progress),
    ballEntry: smoothstep(state.intro.ballEntryStart, state.intro.ballEntryEnd, progress),
    ballHandoff: smoothstep(end, handoffEnd, state.progress),
  }
}

export const makeDefaultNodes = (): RouteNode[] => DEFAULT_POSITIONS.map((position, index) => ({
  id: `node-${index + 1}`,
  position: { x: position[0], y: position[1], z: position[2] },
}))

export const cloneNodes = (nodes: readonly RouteNode[]): RouteNode[] => nodes.map((node) => ({
  id: node.id,
  position: { ...node.position },
}))

export const createConstructorState = (): ConstructorState => ({
  nodes: makeDefaultNodes(),
  mode: 'edit',
  tab: 'nodes',
  selectedIndex: 4,
  hoveredIndex: -1,
  revision: 0,
  focusNonce: 0,
  progress: 0,
  ballProgress: 0.02,
  playing: false,
  dragging: false,
  historyIndex: 0,
  width: ROAD_WIDTH,
  thickness: ROAD_THICKNESS,
  geometrySteps: 240,
  tension: 0.5,
  splineType: 'centripetal',
  journeyStart: JOURNEY_START,
  journeyEnd: JOURNEY_END,
  ballVisible: true,
  ballRadius: BALL_RADIUS,
  ballGap: BALL_SURFACE_GAP,
  ballDamping: 4.6,
  followScroll: true,
  showPoints: true,
  showPolygon: true,
  showSpline: true,
  showRibbon: true,
  showGrid: true,
  showAxes: false,
  showPortal: true,
  camera: { ...DEFAULT_CAMERA },
  intro: { ...DEFAULT_INTRO },
})
