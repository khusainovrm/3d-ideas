import {
  CurvePath, CubicBezierCurve3, Mesh, MeshBasicMaterial, PlaneGeometry, ShaderMaterial,
  SRGBColorSpace, TextureLoader, TubeGeometry, Vector3,
} from 'three'
import type { Scene } from 'three'
import ballUrl from './assets/ball.png?url'
import { mountainPoint } from './mountainComposition'
import type { MountainFrame } from './mountainComposition'

interface RouteComposition { mountains: MountainFrame; bottomY: number; compact?: boolean; ballRadius?: number; ballGap?: number }

const SEGMENTS = 900
const SIDES = 6
export const ballControls = { visible: true, size: 1, startX: 0.02, startY: 0 }
export const threadControls = { visible: true, width: 1, endX: 0.32, shimmer: 1, showFull: false }
export const ballState = { x: 0, y: 0, z: 0, progress: 0 }
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const fragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float noise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x),
                   mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
                   mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
  }
  void main() {
    float grain = noise(vPosition * 145.0);
    float patina = smoothstep(0.38, 0.76, noise(vPosition * 16.0) * 0.7 + grain * 0.3);
    vec3 gold = mix(vec3(0.76, 0.40, 0.035), vec3(0.22, 0.12, 0.025), patina * 0.7);
    vec3 n = normalize(vNormal + (grain - 0.5) * 0.09);
    vec3 light = normalize(vec3(-0.5, 0.75, 1.2));
    float diffuse = max(dot(n, light), 0.0);
    vec3 halfLight = normalize(light + vec3(0, 0, 1));
    float shine = pow(max(dot(n, halfLight), 0.0), mix(65.0, 28.0, patina));
    float glint = pow(max(0.0, sin(vPosition.y * 37.0 + vPosition.x * 23.0 - uTime * 1.1)), 24.0);
    vec3 color = gold * (0.35 + diffuse * 1.25) + vec3(1.0, 0.83, 0.42) * shine * (0.65 + glint * 0.7);
    float tarnish = smoothstep(0.25, 0.75, noise(vec3(vUv.x * 75.0, 4.0, 2.0)));
    float threadGlint = pow(max(0.0, sin(vUv.x * 95.0 - uTime * 0.7)), 36.0);
    color = color * (0.38 + 0.75 * tarnish) + vec3(0.5, 0.36, 0.1) * threadGlint;
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

/** The flat image follows the thread while keeping its original orientation. */
export function createGoldenThread(scene: Scene) {
  const ballMaterial = new MeshBasicMaterial({ transparent: true, alphaTest: 0.01, depthWrite: false, toneMapped: false })
  const threadMaterial = new ShaderMaterial({
    vertexShader, fragmentShader,
    uniforms: { uTime: { value: 0 } },
  })
  const ball = new Mesh(new PlaneGeometry(2, 2 * 128 / 124), ballMaterial)
  ball.name = 'Rolling gold ball'
  const thread = new Mesh(new TubeGeometry(), threadMaterial)
  thread.name = 'Patinated gold thread'
  ball.visible = thread.visible = false
  scene.add(ball, thread)
  let disposed = false
  let textureReady = false
  const ready = new TextureLoader().loadAsync(ballUrl).then((texture) => {
    if (disposed) { texture.dispose(); return }
    texture.colorSpace = SRGBColorSpace
    ballMaterial.map = texture
    ballMaterial.needsUpdate = true
    textureReady = true
  })
  let positions: Vector3[] = []
  let layoutKey = ''

  function layout(width: number, height: number, anchorX: number, anchorY: number, boatHeight: number, composition?: RouteComposition) {
    const key = [width, height, anchorX, anchorY, boatHeight, ballControls.size,
      ballControls.startX, ballControls.startY, threadControls.width, threadControls.endX,
      composition?.mountains.x, composition?.mountains.y, composition?.mountains.width,
      composition?.mountains.height, composition?.bottomY, composition?.compact,
      composition?.ballRadius, composition?.ballGap].join(':')
    if (layoutKey === key) return
    layoutKey = key
    const radius = (composition?.ballRadius ?? Math.min(width * 0.031, height * 0.026)) * ballControls.size
    ball.scale.setScalar(radius)
    const startX = Math.max(-width * 0.43, anchorX - boatHeight * (composition?.ballGap ?? 0.45) - radius + width * ballControls.startX)
    const verticalInset = radius * 128 / 124 + height * 0.015
    const desiredStartY = anchorY + radius * 0.65 - height * ballControls.startY
    const startY = composition ? desiredStartY : Math.max(-height / 2 + verticalInset,
      Math.min(height / 2 - verticalInset, desiredStartY))
    const z = 0.5
    const path = new CurvePath<Vector3>()
    const point = (x: number, y: number) => {
      const position = mountainPoint(x, y, width, height, z, composition?.mountains)
      // Wide screens enlarge the background image; the route must still fit
      // inside the two viewport heights through which the camera travels.
      if (!composition) position.y = (-0.56 - y * 0.95) * height
      return position
    }
    const entry = point(0.49, 0.007)
    if (composition?.compact) {
      // Pass along the right gutter while the introductory copy occupies the screen.
      const edgeX = width / 2 - radius - width * 0.01
      const span = startY - entry.y
      const upper = new Vector3(edgeX, startY - span * 0.18, z)
      const lower = new Vector3(edgeX, entry.y + span * 0.1, z)
      path.add(new CubicBezierCurve3(new Vector3(startX, startY, z),
        new Vector3(startX, startY - span * 0.08, z), new Vector3(edgeX, upper.y + span * 0.04, z), upper))
      path.add(new CubicBezierCurve3(upper, new Vector3(edgeX, upper.y - span * 0.15, z),
        new Vector3(edgeX, lower.y + span * 0.15, z), lower))
      path.add(new CubicBezierCurve3(lower, new Vector3(edgeX, entry.y + span * 0.03, z),
        new Vector3(entry.x + width * 0.1, entry.y + span * 0.02, z), entry))
    } else {
      path.add(new CubicBezierCurve3(new Vector3(startX, startY, z),
        new Vector3(startX - width * 0.20, startY - height * 0.07, z),
        new Vector3(entry.x - width * 0.28, entry.y + height * 0.035, z), entry))
    }
    // Independent Bezier handles preserve the asymmetric loops and sharp lower fold.
    const curves = [
      [0.49, 0.007, 0.42, 0.033, 0.37, 0.065, 0.37, 0.09],
      [0.37, 0.09, 0.60, 0.13, 0.86, 0.18, 0.854, 0.28],
      [0.854, 0.28, 0.85, 0.36, 0.51, 0.355, 0.51, 0.40],
      [0.51, 0.40, 0.47, 0.50, 0.91, 0.51, 0.89, 0.575],
      [0.89, 0.575, 0.88, 0.62, 0.68, 0.625, 0.537, 0.643],
      [0.537, 0.643, 0.76, 0.685, 0.88, 0.735, 0.91, 0.83],
    ]
    for (const c of curves) {
      path.add(new CubicBezierCurve3(point(c[0]!, c[1]!), point(c[2]!, c[3]!),
        point(c[4]!, c[5]!), point(c[6]!, c[7]!)))
    }
    const lowerLeft = new Vector3(width * (threadControls.endX - 0.5),
      Math.max(point(0.32, 0.95).y, (composition?.bottomY ?? -height * 1.5) + verticalInset), z)
    path.add(new CubicBezierCurve3(point(0.91, 0.83), point(0.94, 0.88),
      new Vector3(lowerLeft.x + width * 0.10, Math.max(point(0.42, 0.94).y, lowerLeft.y), z), lowerLeft))
    const horizontalLimit = width / 2 - radius - width * 0.01
    for (const curve of path.curves) {
      const bezier = curve as CubicBezierCurve3
      for (const vertex of [bezier.v0, bezier.v1, bezier.v2, bezier.v3]) {
        vertex.x = Math.max(-horizontalLimit, Math.min(horizontalLimit, vertex.x))
      }
    }
    path.arcLengthDivisions = SEGMENTS * 2
    // TubeGeometry uses arc-length sampling as well.
    positions = path.getSpacedPoints(SEGMENTS)
    const old = thread.geometry
    thread.geometry = new TubeGeometry(path, SEGMENTS,
      Math.min(width * 0.0017, height * 0.0013) * threadControls.width, SIDES, false)
    old.dispose()
  }

  return {
    ready,
    update(progress: number, time: number, visible: boolean, width: number, height: number,
      anchorX: number, anchorY: number, boatHeight: number, composition?: RouteComposition) {
      layout(width, height, anchorX, anchorY, boatHeight, composition)
      const scroll = Math.max(0, Math.min(1, progress))
      const targetY = positions[0]!.y + (positions[SEGMENTS]!.y - positions[0]!.y) * scroll
      // The path descends monotonically. Seek by height rather than arc length
      // so horizontal loops cannot send the ball ahead of the scrolling camera.
      let low = 0
      let high = SEGMENTS
      while (high - low > 1) {
        const middle = (low + high) >>> 1
        if (positions[middle]!.y > targetY) low = middle
        else high = middle
      }
      const index = low
      const drop = positions[index]!.y - positions[index + 1]!.y
      const fraction = drop > 0 ? Math.max(0, Math.min(1, (positions[index]!.y - targetY) / drop)) : 0
      const sample = index + fraction
      ball.position.lerpVectors(positions[index]!, positions[index + 1]!, fraction)
      ball.position.z += 0.06
      thread.geometry.setDrawRange(0, (threadControls.showFull ? SEGMENTS : Math.floor(sample)) * SIDES * 6)
      ball.visible = visible && textureReady && ballControls.visible
      thread.visible = visible && textureReady && threadControls.visible
      threadMaterial.uniforms.uTime!.value = time * threadControls.shimmer
      ballState.x = ball.position.x
      ballState.y = ball.position.y
      ballState.z = ball.position.z
      ballState.progress = scroll
    },
    dispose() {
      disposed = true
      scene.remove(ball, thread)
      ball.geometry.dispose()
      thread.geometry.dispose()
      ballMaterial.map?.dispose()
      ballMaterial.dispose()
      threadMaterial.dispose()
    },
  }
}
