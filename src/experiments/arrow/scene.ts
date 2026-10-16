import {
  AdditiveBlending, Box3, BufferAttribute, BufferGeometry, Color, DirectionalLight,
  DoubleSide, Group, HemisphereLight, MathUtils, Mesh, MeshStandardMaterial,
  Points, Raycaster, ShaderMaterial, Vector2, Vector3, LineSegments,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { ThreeRuntime, ExperimentScene, FrameInfo } from '../../three/core/types'
import { disposeObject } from '../../three/utils/dispose'
import arrowUrl from './assets/models/arrow.glb?url'

interface LoadEvents {
  onLoad(): void
  onError(message: string): void
}

// Each stream has its own bend, breadth and palette. Their overlap produces the
// broad, braided bands in the reference without relying on a flat image.
const streams = [
  { y: .83, bend: .25, slope: -.28, phase: -.55, spread: .31, count: 57, gold: .12 },
  { y: .37, bend: .31, slope: .20, phase: .58, spread: .24, count: 70, gold: .05 },
  { y: -.16, bend: .36, slope: -.14, phase: 1.8, spread: .34, count: 100, gold: .07 },
  { y: -.59, bend: .23, slope: .38, phase: -1.2, spread: .20, count: 59, gold: .54 },
  { y: -.82, bend: .19, slope: .25, phase: -.8, spread: .16, count: 40, gold: .27 },
]

const vertexShader = /* glsl */ `
  attribute float aStream;
  attribute float aPhase;
  attribute float aGold;
  attribute float aSize;
  varying vec3 vColor;
  varying float vAlpha;
  uniform float uTime;
  uniform float uAspect;
  uniform float uViewHeight;
  uniform float uStrike;
  uniform float uTip;
  uniform float uWake;
  uniform float uPoint;

  float streamY(float x, float lane, float stream, float phase) {
    float bend = stream < .5 ? .25 : stream < 1.5 ? .31 : stream < 2.5 ? .36 : stream < 3.5 ? .23 : .19;
    float slope = stream < .5 ? -.28 : stream < 1.5 ? .20 : stream < 2.5 ? -.14 : stream < 3.5 ? .38 : .25;
    float base = stream < .5 ? .83 : stream < 1.5 ? .37 : stream < 2.5 ? -.16 : stream < 3.5 ? -.59 : -.82;
    float curve = sin(x * 2.85 + phase + uTime * .20) * bend;
    curve += sin(x * 5.0 - phase * .7 - uTime * .11) * .052;
    curve += sin(x * 8.6 + lane * 5.0 + uTime * .27) * .008;
    return base + lane + slope * x + curve;
  }

  void main() {
    float x = position.x;
    if (aSize > 0.0) x = mod(x + uTime * .055 + 1.22, 2.44) - 1.22;
    float lane = position.y;
    float y = streamY(x, lane, aStream, aPhase);
    float reached = smoothstep(uTip - .08, uTip + .26, y);
    float nearShaft = exp(-pow(abs(x) / .20, 2.0));
    float push = uStrike * reached * nearShaft;
    // The split is strongest at the descending head; the wake closes gradually.
    float side = x < 0.0 ? -1.0 : 1.0;
    x += side * (.19 * push + .05 * uWake * nearShaft);
    y += side * sin(uTime * 6.0 + y * 5.0) * .018 * push;
    float ripple = uStrike * exp(-pow((y - uTip) / .23, 2.0));
    y += ripple * sin(x * 19.0 - uTime * 8.0) * .025;

    vec3 navy = mix(vec3(.023, .085, .14), vec3(.19, .37, .48), .5 + .5 * sin(aPhase * 4.0 + lane * 14.0));
    vec3 gold = mix(vec3(.42, .25, .13), vec3(1.0, .70, .36), .5 + .5 * sin(aPhase * 3.0));
    vColor = mix(navy, gold, aGold);
    vAlpha = mix(.40, .84, aGold) * (.72 + .28 * sin(aPhase * 7.0 + x * 12.0));
    vec4 mv = modelViewMatrix * vec4(x * uViewHeight * uAspect * .5, y * uViewHeight * .5, -1.0 - aStream * .001, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uPoint * aSize * (1.0 + .36 * push);
  }
`

const lineFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() { gl_FragColor = vec4(vColor, vAlpha); }
`
const pointFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float r = length(gl_PointCoord - .5);
    float halo = 1.0 - smoothstep(.05, .5, r);
    float core = 1.0 - smoothstep(.10, .28, r);
    gl_FragColor = vec4(vColor * (1.0 + core * .7), (halo * .32 + core * .68) * vAlpha);
  }
`

// Stable pseudo random values keep the composition identical on every visit.
const random = (seed: number): number => {
  const value = Math.sin(seed * 127.1 + 78.233) * 43758.5453
  return value - Math.floor(value)
}

function makeFlowGeometry(points: boolean): BufferGeometry {
  const positions: number[] = []
  const streamIds: number[] = []
  const phases: number[] = []
  const golds: number[] = []
  const sizes: number[] = []
  const add = (x: number, lane: number, id: number, phase: number, gold: number, size: number) => {
    positions.push(x, lane, 0)
    streamIds.push(id)
    phases.push(phase)
    golds.push(gold)
    sizes.push(size)
  }
  streams.forEach((stream, id) => {
    if (points) {
      const count = id === 2 ? 4200 : id === 3 ? 2700 : 1900
      for (let i = 0; i < count; i++) {
        const x = random(i * 5.13 + id * 810) * 2.38 - 1.19
        const lane = (random(i * 7.77 + id * 390) - .5) * stream.spread * 2.7
        const gold = random(i * 2.11 + id * 200) < (id === 3 ? .70 : .27) ? 1 : 0
        const size = .7 + Math.pow(random(i * 8.37 + id * 901), 4) * 3.5
        add(x, lane, id, stream.phase, gold, size)
      }
    } else {
      for (let j = 0; j < stream.count; j++) {
        const lane = (j / (stream.count - 1) - .5) * stream.spread * 2
        const phase = stream.phase + (random(j * 4.9 + id * 98) - .5) * .22
        const gold = random(j * 12.7 + id * 311) < stream.gold ? 1 : 0
        // Separate the two sides so a collision can visibly open a channel.
        for (const [start, end] of [[-1.22, -.00001], [.00001, 1.22]] as const) {
          const steps = 80
          for (let k = 0; k < steps; k++) {
            const x1 = start + (end - start) * k / steps
            const x2 = start + (end - start) * (k + 1) / steps
            add(x1, lane, id, phase, gold, 0)
            add(x2, lane, id, phase, gold, 0)
          }
        }
      }
    }
  })
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setAttribute('aStream', new BufferAttribute(new Float32Array(streamIds), 1))
  geometry.setAttribute('aPhase', new BufferAttribute(new Float32Array(phases), 1))
  geometry.setAttribute('aGold', new BufferAttribute(new Float32Array(golds), 1))
  geometry.setAttribute('aSize', new BufferAttribute(new Float32Array(sizes), 1))
  geometry.computeBoundingSphere()
  return geometry
}

export const createArrowScene = (runtime: ThreeRuntime, events: LoadEvents): ExperimentScene => {
  const { scene, camera, renderer } = runtime
  scene.background = new Color('#010307')
  camera.position.set(0, 0, 13)
  camera.lookAt(0, 0, 0)
  const viewHeight = 2 * Math.tan(MathUtils.degToRad(camera.fov) / 2) * camera.position.z
  const uniforms = {
    uTime: { value: 0 }, uAspect: { value: camera.aspect }, uViewHeight: { value: viewHeight },
    uStrike: { value: 0 }, uTip: { value: 2 }, uWake: { value: 0 }, uPoint: { value: 1 },
  }
  const lineMaterial = new ShaderMaterial({
    uniforms, vertexShader, fragmentShader: lineFragment, transparent: true,
    depthWrite: false, depthTest: true, blending: AdditiveBlending, side: DoubleSide,
  })
  const pointMaterial = new ShaderMaterial({
    uniforms, vertexShader, fragmentShader: pointFragment, transparent: true,
    depthWrite: false, depthTest: true, blending: AdditiveBlending,
  })
  const lines = new LineSegments(makeFlowGeometry(false), lineMaterial)
  const particles = new Points(makeFlowGeometry(true), pointMaterial)
  lines.frustumCulled = false
  particles.frustumCulled = false
  scene.add(lines, particles)

  scene.add(new HemisphereLight('#fff3de', '#334a64', 2.2))
  const light = new DirectionalLight('#ffe0a5', 3)
  light.position.set(3, 5, 7)
  scene.add(light)
  const rim = new DirectionalLight('#669cc4', 2.1)
  rim.position.set(-4, -1, 2)
  scene.add(rim)

  let model: Group | undefined
  let disposed = false
  let falling = false
  let fallTime = 0
  let recovering = false
  let recoverTime = 0
  const raycaster = new Raycaster()
  const pointer = new Vector2()
  const initialY = 2.55
  const finalY = -8.1
  const fallDuration = 1.65
  const loader = new GLTFLoader()
  loader.load(arrowUrl, (gltf) => {
    if (disposed) { disposeObject(gltf.scene); return }
    gltf.scene.traverse((object) => {
      if (!(object instanceof Mesh)) return
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      for (const material of materials) {
        if (!(material instanceof MeshStandardMaterial)) continue
        material.color.set('#e8ba69')
        material.metalness = .75
        material.roughness = .23
        material.needsUpdate = true
      }
    })
    model = new Group()
    const bounds = new Box3().setFromObject(gltf.scene)
    gltf.scene.position.sub(bounds.getCenter(new Vector3()))
    model.add(gltf.scene)
    model.scale.setScalar(2.15)
    model.position.set(0, initialY, 1.1)
    scene.add(model)
    events.onLoad()
  }, undefined, () => { if (!disposed) events.onError('Could not load arrow.glb') })

  const pointInCanvas = (event: PointerEvent) => {
    const bounds = renderer.domElement.getBoundingClientRect()
    pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1,
      -(event.clientY - bounds.top) / bounds.height * 2 + 1)
    raycaster.setFromCamera(pointer, camera)
  }
  const hitModel = (event: PointerEvent) => {
    if (!model) return false
    pointInCanvas(event)
    return raycaster.intersectObject(model, true).length > 0
  }
  const onMove = (event: PointerEvent) => {
    renderer.domElement.style.cursor = !falling && !recovering && hitModel(event) ? 'pointer' : 'default'
  }
  const onClick = (event: PointerEvent) => {
    if (!model || falling || recovering || !hitModel(event)) return
    falling = true
    fallTime = 0
    renderer.domElement.style.cursor = 'default'
  }
  renderer.domElement.addEventListener('pointermove', onMove)
  renderer.domElement.addEventListener('pointerdown', onClick)

  return {
    update: ({ elapsed, delta, reducedMotion }: FrameInfo) => {
      uniforms.uTime.value = reducedMotion ? 0 : elapsed
      uniforms.uPoint.value = Math.min(renderer.getPixelRatio(), 2) * 2.4
      if (falling && model) {
        fallTime += delta
        const t = Math.min(fallTime / fallDuration, 1)
        // Fast acceleration and a sustained pass through the full image.
        const travel = t * t * (3 - 2 * t)
        model.position.y = initialY + (finalY - initialY) * travel
        const tipWorldY = model.position.y - 2.12
        uniforms.uTip.value = tipWorldY / (viewHeight * .5)
        uniforms.uStrike.value = Math.min(1, fallTime * 4)
        uniforms.uWake.value = Math.min(1, fallTime * 2.5)
        if (t === 1) {
          falling = false
          recovering = true
          recoverTime = 0
        }
      } else if (recovering && model) {
        recoverTime += delta
        const fade = Math.max(0, 1 - recoverTime / 2.2)
        uniforms.uStrike.value = fade
        uniforms.uWake.value = fade
        if (recoverTime > 2.2) {
          model.position.y = initialY
          recovering = false
          uniforms.uTip.value = 2
        }
      }
    },
    resize: () => { uniforms.uAspect.value = camera.aspect },
    dispose: () => {
      disposed = true
      renderer.domElement.removeEventListener('pointermove', onMove)
      renderer.domElement.removeEventListener('pointerdown', onClick)
      renderer.domElement.style.cursor = ''
      disposeObject(scene)
    },
  }
}
