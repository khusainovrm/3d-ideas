import {
  BALL_RADIUS,
  BALL_SURFACE_GAP,
  JOURNEY_END,
  JOURNEY_START,
  ROAD_POINT_VALUES,
  ROAD_THICKNESS,
  ROAD_WIDTH,
  type RibbonSplineType,
} from '../ribbon-road/route'

export type EditorMode = 'edit' | 'preview'
export type InspectorTab = 'nodes' | 'road' | 'ball' | 'camera' | 'preview' | 'export'

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
})
