<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import {
  Mesh, MeshBasicMaterial, OrthographicCamera, PlaneGeometry, Scene,
  SRGBColorSpace, TextureLoader, WebGLRenderer,
} from 'three'
import waterUrl from './assets/design/water.webp'
import boatUrl from './assets/boat.generated.webp'
import { BOAT_IMAGE } from './boat.generated'

const host = ref<HTMLElement | null>(null)
const ready = ref(false)
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
let renderer: WebGLRenderer | undefined
let observer: ResizeObserver | undefined
let visibility: IntersectionObserver | undefined
let frame = 0
let visible = false
const hovered = ref(false)
let width = 1
let height = 1
let boatX = 0
let boatY = 0
let boatHeight = 1
let targetOffset = 0
let offset = 0
let lastTime = 0
let geometry: PlaneGeometry | undefined
let waterGeometry: PlaneGeometry | undefined
let boatMaterial: MeshBasicMaterial | undefined
let waterMaterial: MeshBasicMaterial | undefined
let boat: Mesh | undefined
let water: Mesh | undefined

function layout() {
  if (!host.value || !renderer || !boat || !water || !geometry || !waterGeometry) return
  width = host.value.clientWidth
  height = host.value.clientHeight
  if (!width || !height) return
  const mobile = host.value.closest('.landing')!.clientWidth <= 600
  const tablet = host.value.closest('.landing')!.clientWidth <= 1100
  const camera = new OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 0.1, 20)
  camera.position.z = 10
  activeCamera = camera
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height, false)

  // The source water image is 1440×800. Keep its PDF composition and pin the
  // hull's waterline to the bright part of the texture at every breakpoint.
  const waterHeight = width * 800 / 1440
  water.scale.set(width, waterHeight, 1)
  water.position.set(0, -height / 2 - 80 + waterHeight / 2, 0)
  boatHeight = mobile ? 142 : tablet ? 165 : 210
  const boatWidth = boatHeight * BOAT_IMAGE.width / BOAT_IMAGE.height
  boat.scale.set(boatWidth, boatHeight, 1)
  const right = mobile ? 72 : 270
  const bottom = mobile ? 16 : 45
  boatX = width / 2 - right - boatWidth / 2
  boatY = -height / 2 + bottom + boatHeight * BOAT_IMAGE.waterlineFromBottom
  boat.position.set(boatX + offset, boatY, 0.1)
}

let activeCamera: OrthographicCamera | undefined
let activeScene: Scene | undefined
function tick(time: number) {
  if (!renderer || !activeCamera || !activeScene || !boat || !waterMaterial || !visible) return
  const dt = Math.min((time - lastTime) / 1000 || 0, 0.05)
  lastTime = time
  const ease = 1 - Math.exp(-dt * 3.5)
  offset += (targetOffset - offset) * ease
  targetOffset *= Math.exp(-dt * 0.55)
  const t = time / 1000
  const heave = reducedMotion ? 0 : Math.sin(t * 0.85) * (hovered.value ? 2.3 : 1.5)
  boat.position.set(boatX + offset, boatY + heave, 0.1)
  boat.rotation.z = reducedMotion ? 0 : Math.sin(t * 0.65 + 0.3) * (hovered.value ? 0.024 : 0.014)
  waterMaterial.opacity = reducedMotion ? 1 : 0.97 + Math.sin(t * 0.55) * 0.025
  renderer.render(activeScene, activeCamera)
  frame = requestAnimationFrame(tick)
}

function steer(event: MouseEvent) {
  if (!host.value) return
  if (event.detail === 0) {
    targetOffset = Math.min(36, targetOffset + 23)
    return
  }
  const rect = host.value.getBoundingClientRect()
  const clickX = event.clientX - rect.left - rect.width / 2
  targetOffset = Math.max(-36, Math.min(36, targetOffset + (clickX < boatX + offset ? -23 : 23)))
}
function steerWithKey(event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
  event.preventDefault()
  targetOffset = Math.max(-36, Math.min(36, targetOffset + (event.key === 'ArrowLeft' ? -23 : 23)))
}

onMounted(async () => {
  if (!host.value) return
  try {
    renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
    renderer.outputColorSpace = SRGBColorSpace
    renderer.setClearColor(0x000000, 0)
    renderer.domElement.setAttribute('aria-hidden', 'true')
    host.value.prepend(renderer.domElement)
    activeScene = new Scene()
    const [waterTexture, boatTexture] = await Promise.all([
      new TextureLoader().loadAsync(waterUrl), new TextureLoader().loadAsync(boatUrl),
    ])
    if (!host.value || !renderer) { waterTexture.dispose(); boatTexture.dispose(); return }
    waterTexture.colorSpace = SRGBColorSpace
    boatTexture.colorSpace = SRGBColorSpace
    waterGeometry = new PlaneGeometry(1, 1)
    waterMaterial = new MeshBasicMaterial({ map: waterTexture, transparent: true, depthWrite: false, toneMapped: false })
    water = new Mesh(waterGeometry, waterMaterial)
    activeScene.add(water)
    geometry = new PlaneGeometry(1, 1)
    geometry.translate(0, 0.5 - BOAT_IMAGE.waterlineFromBottom, 0)
    boatMaterial = new MeshBasicMaterial({ map: boatTexture, transparent: true, alphaTest: 0.005, depthWrite: false, toneMapped: false })
    boat = new Mesh(geometry, boatMaterial)
    activeScene.add(boat)
    layout()
    observer = new ResizeObserver(layout)
    observer.observe(host.value)
    visibility = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting
      if (visible && !frame) { lastTime = 0; frame = requestAnimationFrame(tick) }
      if (!visible) { cancelAnimationFrame(frame); frame = 0 }
    })
    visibility.observe(host.value)
    ready.value = true
  } catch {
    // The matching images below remain visible if WebGL cannot start.
  }
})

onUnmounted(() => {
  cancelAnimationFrame(frame)
  observer?.disconnect()
  visibility?.disconnect()
  geometry?.dispose()
  waterGeometry?.dispose()
  boatMaterial?.map?.dispose()
  waterMaterial?.map?.dispose()
  boatMaterial?.dispose()
  waterMaterial?.dispose()
  renderer?.dispose()
  renderer?.domElement.remove()
})
</script>

<template>
  <div ref="host" class="od-game__sea" :class="{ 'is-ready': ready }">
    <template v-if="!ready"><img :src="waterUrl" class="od-game__water" alt=""><img :src="boatUrl" class="od-game__boat" alt=""></template>
    <button class="od-game__boat-hit" type="button" aria-label="Слегка сдвинуть корабль: нажмите слева или справа" @mouseenter="hovered = true" @mouseleave="hovered = false" @focus="hovered = true" @blur="hovered = false" @click="steer" @keydown="steerWithKey" />
  </div>
</template>
