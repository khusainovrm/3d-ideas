import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Euler,
  FogExp2,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Quaternion,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three'
import type { SceneFactory } from '../../three/core/types'
import type { QualityLevel } from '../../three/core/quality'
import { disposeObject } from '../../three/utils/dispose'
import flagVertexShader from './shaders/flag.vert.glsl?raw'
import flagFragmentShader from './shaders/flag.frag.glsl?raw'

gsap.registerPlugin(ScrollTrigger)

const TERRAIN_SEGMENTS: Record<QualityLevel, number> = { low: 64, medium: 88, high: 128 }
const PROP_COUNTS: Record<QualityLevel, { rocks: number; shrubs: number; flags: number; dust: number }> = {
  low: { rocks: 44, shrubs: 22, flags: 18, dust: 70 },
  medium: { rocks: 78, shrubs: 38, flags: 28, dust: 130 },
  high: { rocks: 118, shrubs: 54, flags: 40, dust: 210 },
}

const fract = (value: number): number => value - Math.floor(value)
const random = (seed: number): number => fract(Math.sin(seed * 127.17 + 41.73) * 43758.5453)
const pathX = (z: number): number => Math.sin(z * 0.047) * 6.2 + Math.sin(z * 0.019 + 1.7) * 3.6
const summitRise = (z: number): number => {
  const t = Math.max(0, Math.min(1, (-z - 12) / 220))
  return t * 24 - Math.exp(-Math.pow((z + 132) / 22, 2)) * 5.4
}
const terrainHeight = (x: number, z: number): number => {
  const rise = summitRise(z)
  const large = Math.sin(x * 0.105 + z * 0.026) * 2.5 + Math.cos(x * 0.19 - z * 0.021) * 1.4
  const ridge = Math.sin(x * 0.38 + z * 0.058) * 1.25 * Math.exp(-Math.pow((z + 93) / 54, 2))
  const trailCut = Math.exp(-Math.pow((x - pathX(z)) / 4.2, 2)) * 0.9
  return rise + large + ridge - trailCut
}

const sectionAt = (progress: number): string => {
  if (progress < 0.18) return 'Base Camp / Hero'
  if (progress < 0.34) return 'First Ascent / About'
  if (progress < 0.56) return 'Ridge / Speakers'
  if (progress < 0.72) return 'Valley of Echoes / Testimonials'
  if (progress < 0.90) return 'Summit / Registration'
  return 'Plateau / Partners'
}

export const createSummitJourneyScene: SceneFactory = (runtime) => {
  const { scene, camera, container, renderer } = runtime
  const state = { scroll: 0, speaker: -1, speakerStrength: 0, pulse: -1 }
  const pointerTarget = new Vector2()
  const pointer = new Vector2()
  const look = new Vector3()
  const cameraPoint = new Vector3()
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches
  const world = new Group()
  scene.add(world)
  renderer.shadowMap.enabled = runtime.quality === 'high'

  scene.background = new Color('#071016')
  scene.fog = new FogExp2('#0a151b', 0.017)
  camera.fov = 47
  camera.near = 0.1
  camera.far = 180
  camera.updateProjectionMatrix()

  const hemisphere = new HemisphereLight('#9bb3bf', '#121716', 1.55)
  const sun = new DirectionalLight('#dec898', 2.25)
  sun.position.set(-20, 38, 24)
  sun.castShadow = runtime.quality === 'high'
  sun.shadow.mapSize.set(768, 768)
  sun.shadow.camera.left = -28
  sun.shadow.camera.right = 28
  sun.shadow.camera.top = 28
  sun.shadow.camera.bottom = -28
  sun.shadow.camera.far = 100
  scene.add(hemisphere, sun)

  const terrainMaterial = new MeshStandardMaterial({
    vertexColors: true, flatShading: true, roughness: 0.94, metalness: 0.02,
  })
  const trailMaterial = new MeshStandardMaterial({
    color: '#b9aa83', emissive: '#3b3020', emissiveIntensity: 0.35,
    roughness: 0.88, flatShading: true, side: DoubleSide,
  })
  const rockMaterial = new MeshStandardMaterial({ color: '#344044', roughness: 1, flatShading: true })
  const shrubMaterial = new MeshStandardMaterial({ color: '#34483f', roughness: 1, flatShading: true })
  const poleMaterial = new MeshStandardMaterial({ color: '#8b816b', roughness: 0.9 })
  const flagMaterial = new ShaderMaterial({
    vertexShader: flagVertexShader, fragmentShader: flagFragmentShader, side: DoubleSide,
    uniforms: {
      uTime: { value: 0 }, uWind: { value: runtime.reducedMotion ? 0.22 : 1 },
      uCold: { value: new Color('#65777d') }, uWarm: { value: new Color('#c5a76a') },
      uWarmth: { value: 0 }, uGlow: { value: 0 },
    },
  })

  let terrain: Mesh | undefined
  let trail: Mesh | undefined
  let rocks: InstancedMesh | undefined
  let shrubs: InstancedMesh | undefined
  let poles: InstancedMesh | undefined
  let flags: InstancedMesh | undefined
  let dust: Points | undefined
  let segments = 0
  let propsCount = 0
  const beacons: Mesh[] = []
  let transientMaterials: Material[] = []

  const clearWorld = (): void => {
    for (const child of [...world.children]) {
      child.traverse((object) => {
        if ('geometry' in object && object.geometry instanceof BufferGeometry) object.geometry.dispose()
      })
      world.remove(child)
    }
    transientMaterials.forEach((material) => material.dispose())
    transientMaterials = []
    beacons.length = 0
  }

  const buildTrail = (): Mesh => {
    const samples = 230
    const positions: number[] = []
    const indices: number[] = []
    for (let i = 0; i <= samples; i += 1) {
      const z = 25 - (i / samples) * 270
      const x = pathX(z)
      const nextZ = z - 0.4
      const tangentX = pathX(nextZ) - x
      const length = Math.hypot(tangentX, -0.4)
      const nx = 0.4 / length
      const nz = tangentX / length
      const width = 1.28 + Math.sin(i * 0.49) * 0.12
      const y = terrainHeight(x, z) + 0.16
      positions.push(x - nx * width, y, z - nz * width, x + nx * width, y, z + nz * width)
      if (i < samples) {
        const a = i * 2
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
      }
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    return new Mesh(geometry, trailMaterial)
  }

  const build = (quality: QualityLevel): void => {
    clearWorld()
    segments = TERRAIN_SEGMENTS[quality]
    const base = new PlaneGeometry(74, 280, segments, segments)
    base.rotateX(-Math.PI / 2)
    const geometry = base.toNonIndexed()
    base.dispose()
    const position = geometry.getAttribute('position')
    const colors = new Float32Array(position.count * 3)
    const low = new Color('#172329')
    const high = new Color('#697064')
    const stone = new Color('#404b4b')
    const color = new Color()
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i)
      const z = position.getZ(i) - 110
      const y = terrainHeight(x, z)
      position.setXYZ(i, x, y, z)
      const elevation = Math.max(0, Math.min(1, (y + 5) / 32))
      color.copy(low).lerp(stone, 0.35 + elevation * 0.45).lerp(high, Math.max(0, elevation - 0.64) * 0.7)
      const variation = (random(i * 0.73) - 0.5) * 0.075
      colors[i * 3] = color.r + variation
      colors[i * 3 + 1] = color.g + variation
      colors[i * 3 + 2] = color.b + variation
    }
    geometry.setAttribute('color', new BufferAttribute(colors, 3))
    geometry.computeVertexNormals()
    terrain = new Mesh(geometry, terrainMaterial)
    terrain.receiveShadow = quality === 'high'
    world.add(terrain)

    trail = buildTrail()
    trail.receiveShadow = true
    world.add(trail)

    const counts = PROP_COUNTS[quality]
    rocks = new InstancedMesh(new IcosahedronGeometry(1, 0), rockMaterial, counts.rocks)
    shrubs = new InstancedMesh(new ConeGeometry(0.7, 1.6, 5), shrubMaterial, counts.shrubs)
    poles = new InstancedMesh(new CylinderGeometry(0.025, 0.035, 1.55, 5), poleMaterial, counts.flags)
    flags = new InstancedMesh(new PlaneGeometry(0.75, 0.42, 4, 1).translate(0.38, 0.42, 0), flagMaterial, counts.flags)

    const matrix = new Matrix4()
    const euler = new Euler()
    const quaternion = new Quaternion()
    const scale = new Vector3()
    for (let i = 0; i < counts.rocks; i += 1) {
      const z = 22 - random(i + 4) * 267
      const side = random(i + 18) > 0.5 ? 1 : -1
      const x = pathX(z) + side * (4 + random(i + 41) * 28)
      const s = 0.55 + random(i + 93) * (z < -70 && z > -155 ? 2.8 : 1.7)
      euler.set(random(i + 7) * 0.5, random(i + 26) * Math.PI, random(i + 34) * 0.35)
      quaternion.setFromEuler(euler)
      scale.set(s * (0.75 + random(i + 2) * 0.7), s, s * (0.8 + random(i + 8) * 0.6))
      matrix.compose(new Vector3(x, terrainHeight(x, z) + s * 0.42, z), quaternion, scale)
      rocks.setMatrixAt(i, matrix)
    }
    for (let i = 0; i < counts.shrubs; i += 1) {
      const z = 15 - random(i + 203) * 250
      const x = pathX(z) + (random(i + 317) > 0.5 ? 1 : -1) * (4 + random(i + 87) * 19)
      const s = 0.55 + random(i + 113) * 0.8
      quaternion.setFromAxisAngle(new Vector3(0, 1, 0), random(i) * Math.PI)
      matrix.compose(new Vector3(x, terrainHeight(x, z) + s * 0.65, z), quaternion, new Vector3(s, s, s))
      shrubs.setMatrixAt(i, matrix)
    }
    for (let i = 0; i < counts.flags; i += 1) {
      const t = i / Math.max(1, counts.flags - 1)
      const z = 2 - t * 226
      const x = pathX(z) + (i % 2 === 0 ? -2.2 : 2.2)
      const y = terrainHeight(x, z)
      const angle = Math.atan2(pathX(z - 0.5) - pathX(z), -0.5)
      quaternion.setFromAxisAngle(new Vector3(0, 1, 0), angle)
      matrix.compose(new Vector3(x, y + 0.78, z), quaternion, new Vector3(1, 1, 1))
      poles.setMatrixAt(i, matrix)
      matrix.compose(new Vector3(x, y + 0.78, z), quaternion, new Vector3(1, 1, 1))
      flags.setMatrixAt(i, matrix)
    }
    rocks.castShadow = quality === 'high'
    rocks.receiveShadow = true
    world.add(rocks, shrubs, poles, flags)

    const dustGeometry = new BufferGeometry()
    const dustPositions = new Float32Array(counts.dust * 3)
    for (let i = 0; i < counts.dust; i += 1) {
      const z = 20 - random(i + 713) * 260
      const x = pathX(z) + (random(i + 914) - 0.5) * 48
      dustPositions.set([x, terrainHeight(x, z) + 1.5 + random(i + 99) * 11, z], i * 3)
    }
    dustGeometry.setAttribute('position', new BufferAttribute(dustPositions, 3))
    const dustMaterial = new PointsMaterial({ color: '#bcae88', size: 0.055, transparent: true, opacity: 0.32, depthWrite: false })
    transientMaterials.push(dustMaterial)
    dust = new Points(dustGeometry, dustMaterial)
    world.add(dust)

    const beaconZ = [-72, -91, -112, -134]
    beaconZ.forEach((z, index) => {
      const x = pathX(z) + (index % 2 ? 5.2 : -5.2)
      const material = new MeshBasicMaterial({ color: '#bba16d', transparent: true, opacity: 0.48 })
      transientMaterials.push(material)
      const beacon = new Mesh(new IcosahedronGeometry(0.32, 1), material)
      beacon.position.set(x, terrainHeight(x, z) + 1.2, z)
      beacon.scale.setScalar(0.7)
      beacons.push(beacon)
      world.add(beacon)
    })
    propsCount = counts.rocks + counts.shrubs + counts.flags * 2 + counts.dust + beacons.length
    rocks.instanceMatrix.needsUpdate = shrubs.instanceMatrix.needsUpdate = poles.instanceMatrix.needsUpdate = flags.instanceMatrix.needsUpdate = true
  }

  build(runtime.quality)

  const curveZ = [18, -19, -55, -91, -129, -164, -201, -229]
  const cameraCurve = new CatmullRomCurve3(curveZ.map((z, index) => {
    const x = pathX(z) + [4, -3, 4, -5, 5, -3, 3, 7][index]!
    return new Vector3(x, terrainHeight(x, z) + [5.8, 6.5, 7, 8.5, 6.2, 8.5, 7.2, 9][index]!, z)
  }), false, 'catmullrom', 0.52)
  const targetCurve = new CatmullRomCurve3(curveZ.map((z) => {
    const ahead = z - 12
    return new Vector3(pathX(ahead), terrainHeight(pathX(ahead), ahead) + 1.4, ahead)
  }), false, 'catmullrom', 0.48)

  const scrollTween = gsap.to(state, {
    scroll: 1, ease: 'none',
    scrollTrigger: { trigger: container.parentElement, start: 'top top', end: 'bottom bottom', scrub: runtime.reducedMotion ? false : 0.8 },
  })
  let speakerTween: gsap.core.Tween | undefined
  let pulseTween: gsap.core.Tween | undefined
  const onPointer = (event: PointerEvent): void => {
    if (coarsePointer || runtime.reducedMotion) return
    pointerTarget.set((event.clientX / innerWidth) * 2 - 1, -((event.clientY / innerHeight) * 2 - 1))
  }
  const onSpeaker = (event: Event): void => {
    const index = (event as CustomEvent<number>).detail
    state.speaker = index
    speakerTween?.kill()
    speakerTween = gsap.to(state, { speakerStrength: index >= 0 ? 1 : 0, duration: 0.5, ease: 'sine.out' })
  }
  const onComplete = (): void => {
    pulseTween?.kill()
    state.pulse = 0
    pulseTween = gsap.to(state, { pulse: 1, duration: 2.15, ease: 'power2.inOut', onComplete: () => { state.pulse = -1 } })
  }
  window.addEventListener('pointermove', onPointer, { passive: true })
  container.addEventListener('summitspeakerfocus', onSpeaker)
  container.addEventListener('summitcomplete', onComplete)

  return {
    update: ({ elapsed, reducedMotion }) => {
      pointer.lerp(pointerTarget, 0.025)
      const p = Math.max(0, Math.min(1, state.scroll))
      cameraCurve.getPointAt(p, cameraPoint)
      targetCurve.getPointAt(Math.min(1, p + 0.018), look)
      const parallax = coarsePointer || reducedMotion ? 0 : 1
      camera.position.copy(cameraPoint)
      camera.position.x += pointer.x * 0.55 * parallax
      camera.position.y += pointer.y * 0.25 * parallax
      look.x += pointer.x * 0.22 * parallax
      camera.lookAt(look)

      const warmth = Math.max(0, (p - 0.63) / 0.37)
      flagMaterial.uniforms.uTime!.value = elapsed * (reducedMotion ? 0.15 : 1)
      flagMaterial.uniforms.uWarmth!.value = warmth
      flagMaterial.uniforms.uGlow!.value = state.pulse < 0 ? 0 : Math.sin(state.pulse * Math.PI) * 1.8
      trailMaterial.emissiveIntensity = 0.34 + (state.pulse < 0 ? 0 : Math.sin(state.pulse * Math.PI) * 1.5)
      sun.color.set('#dec898').lerp(new Color('#ffe1a4'), warmth * 0.75)
      sun.intensity = 2.15 + warmth * 0.8
      if (scene.fog instanceof FogExp2) {
        scene.fog.density = 0.018 - warmth * 0.006 + Math.sin(elapsed * 0.12) * 0.0005
        scene.fog.color.set('#0a151b').lerp(new Color('#25271f'), warmth * 0.64)
      }
      ;(scene.background as Color).set('#071016').lerp(new Color('#26291f'), warmth * 0.58)
      dust?.rotation.set(0, Math.sin(elapsed * 0.06) * 0.008, 0)
      beacons.forEach((beacon, index) => {
        const active = index === state.speaker ? state.speakerStrength : 0
        const echo = p > 0.56 && p < 0.72 ? (Math.sin(elapsed * 1.15 + index * 1.7) * 0.5 + 0.5) * 0.32 : 0
        beacon.scale.setScalar(0.72 + active * 1.15 + echo)
        ;(beacon.material as MeshBasicMaterial).opacity = 0.36 + active * 0.62 + echo * 0.25
      })
    },
    setQuality: (quality) => {
      renderer.shadowMap.enabled = quality === 'high'
      sun.castShadow = quality === 'high'
      build(quality)
    },
    stats: () => ({
      section: sectionAt(state.scroll), scrollProgress: state.scroll, cameraProgress: state.scroll,
      terrainSegments: segments, propsCount, cameraZ: camera.position.z,
      postprocessing: false, shadows: renderer.shadowMap.enabled,
    }),
    dispose: () => {
      window.removeEventListener('pointermove', onPointer)
      container.removeEventListener('summitspeakerfocus', onSpeaker)
      container.removeEventListener('summitcomplete', onComplete)
      speakerTween?.kill()
      pulseTween?.kill()
      scrollTween.scrollTrigger?.kill()
      scrollTween.kill()
      disposeObject(scene)
    },
  }
}
