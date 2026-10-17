import { BufferAttribute, BufferGeometry, Color, AdditiveBlending, OrthographicCamera, Points, ShaderMaterial, Vector2 } from 'three'
import type { SceneFactory } from '../../three/core/types'
import type { QualityLevel } from '../../three/core/quality'
import { LANDING_PARTICLE_QUALITY, MOON_PATH_PARTICLE_QUALITY, MOUNTAIN_PARTICLE_QUALITY } from './particles.generated'
import lowDataUrl from './particles-low.generated.bin?url'
import mediumDataUrl from './particles-medium.generated.bin?url'
import dots3DataUrl from './particles-dots3.generated.bin?url'
import moonLowUrl from './moon-path-low.generated.bin?url'
import moonMediumUrl from './moon-path-medium.generated.bin?url'
import moonHighUrl from './moon-path-high.generated.bin?url'
import mountainLowUrl from './mountains-low.generated.bin?url'
import mountainMediumUrl from './mountains-medium.generated.bin?url'
import mountainHighUrl from './mountains-high.generated.bin?url'
import { loadParticleData } from './particleData'
import { boatControls, createLandingBoat } from './boat'
import { createGoldenThread } from './goldenThread'
import { createMountainShines } from './mountainShines'
import { mountainFrame } from './mountainComposition'
import type { MountainFrame } from './mountainComposition'
import vertexShader from './shaders/particles.vert.glsl?raw'
import fragmentShader from './shaders/particles.frag.glsl?raw'

const definitions = [
  { name: 'dots3', screen: 0, metadata: LANDING_PARTICLE_QUALITY,
    urls: { low: lowDataUrl, medium: mediumDataUrl, high: dots3DataUrl } },
  { name: 'moon path', screen: 0, metadata: MOON_PATH_PARTICLE_QUALITY,
    urls: { low: moonLowUrl, medium: moonMediumUrl, high: moonHighUrl } },
  { name: 'mountains', screen: 1, metadata: MOUNTAIN_PARTICLE_QUALITY,
    urls: { low: mountainLowUrl, medium: mountainMediumUrl, high: mountainHighUrl } },
] as const

export const landingControls = {
  radius: 1.15, force: 0.58, ripple: 0.75, pointSize: 1.0, brightness: 1.0, motion: 0.0,
}

export const createLandingScene = (
  onReady: () => void,
  onError: (cause: Error) => void,
  onLoading: () => void,
): SceneFactory<OrthographicCamera> => ({ scene, camera, renderer, container, quality, reducedMotion }) => {
  scene.background = new Color('#0d0807')
  camera.position.set(0, 0, 10)
  camera.lookAt(0, 0, 0)

  let activeQuality = quality
  let loading: AbortController | undefined
  let disposed = false
  let loaded = false
  let progress = 0
  let viewWidth = 1
  let viewHeight = 1
  const page = container.closest<HTMLElement>('.landing__journey')
  let heroPixels = 800
  let scrollPixels = 0
  let stageVisible = true
  let mountains: MountainFrame = mountainFrame(1, 1)
  const boatPlacement = () => {
    const mobile = container.clientWidth <= 600
    const tablet = container.clientWidth <= 1100
    const units = viewHeight / Math.max(1, container.clientHeight)
    const height = heroPixels * units * (mobile ? 0.188 : tablet ? 0.204 : 0.225) * boatControls.height / 0.18
    return {
      x: ((mobile ? 0.76 : tablet ? 0.80 : 0.86) + boatControls.x - 0.85 - 0.5) * viewWidth,
      y: viewHeight / 2 - heroPixels * units * (0.79 + boatControls.y - 0.85),
      height,
    }
  }
  const pointer = new Vector2()
  const target = new Vector2()
  let pointerActive = 0
  let targetActive = 0
  let pulseAge = 100
  const pulseOrigin = new Vector2()
  const viewport = new Vector2()
  const boat = createLandingBoat(scene)
  const goldenThread = createGoldenThread(scene)
  const mountainShines = createMountainShines(scene, container, reducedMotion)
  // Handle a texture error even if particle fetching is still in progress.
  const boatReady = boat.ready.then(() => null, (cause: unknown) => cause instanceof Error ? cause : new Error('Boat loading failed'))
  const goldReady = goldenThread.ready.then(() => null, (cause: unknown) => cause instanceof Error ? cause : new Error('Gold texture loading failed'))
  const shinesReady = mountainShines.ready.then(() => null, (cause: unknown) => cause instanceof Error ? cause : new Error('Shine texture loading failed'))
  let previousElapsed: number | undefined

  const layers = definitions.map((definition) => {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(0), 3))
    geometry.setDrawRange(0, 0)
    const material = new ShaderMaterial({
      vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: AdditiveBlending,
      uniforms: {
        uScale: { value: 1 }, uPointSize: { value: landingControls.pointSize },
        uViewport: { value: viewport }, uSampleSize: { value: 1 },
        uTime: { value: 0 }, uRadius: { value: landingControls.radius },
        uForce: { value: landingControls.force }, uRipple: { value: landingControls.ripple },
        uMotion: { value: landingControls.motion }, uBrightness: { value: landingControls.brightness },
        uPointerActive: { value: 0 }, uPointer: { value: new Vector2() },
        uPulseOrigin: { value: new Vector2() }, uPulseAge: { value: 100 },
      },
    })
    const points = new Points(geometry, material)
    points.visible = false
    points.frustumCulled = false
    scene.add(points)
    return { definition, points, material }
  })

  // UV of the reflection's upper edge in moon path.png (origin at top left).
  // Anchor the water to the hull instead of an independent responsive DOM frame.
  const placeMoonPath = (anchor: { x: number; y: number; height: number }) => {
    const moon = layers.find((layer) => layer.definition.name === 'moon path')!
    const metadata = moon.definition.metadata[activeQuality]
    const height = anchor.height / 0.225
    const width = height * metadata.width / metadata.height
    moon.points.position.set(anchor.x - (0.82 - 0.5) * width,
      anchor.y + (0.83 - 0.5) * height - anchor.height * 0.02, 0)
    moon.points.scale.x = 1
    moon.material.uniforms.uScale!.value = height
  }

  const syncScroll = (): void => {
    if (!page) return
    const rect = page.getBoundingClientRect()
    stageVisible = rect.bottom > 0 && rect.top < container.clientHeight
    const distance = Math.max(1, page.offsetHeight - container.clientHeight)
    scrollPixels = Math.max(0, Math.min(distance, -rect.top))
    const start = Math.max(0, heroPixels * (0.79 + boatControls.y - 0.85) - container.clientHeight * 0.8)
    progress = Math.max(0, Math.min(1, (scrollPixels - start) / Math.max(1, distance - start)))
    camera.position.y = -scrollPixels / Math.max(1, container.clientHeight) * viewHeight
  }
  const resize = (width: number, height: number): void => {
    viewHeight = camera.top - camera.bottom
    viewWidth = viewHeight * width / Math.max(1, height)
    heroPixels = page?.querySelector<HTMLElement>('.od-hero')?.offsetHeight ?? height
    const pageRect = page?.getBoundingClientRect()
    const frameFor = (selector: string): MountainFrame => {
      const rect = page?.querySelector<HTMLElement>(selector)?.getBoundingClientRect()
      if (!rect || !pageRect) return mountainFrame(viewWidth, viewHeight)
      const unit = viewHeight / Math.max(1, height)
      return { x: (rect.left - pageRect.left + rect.width / 2 - width / 2) * unit,
        y: viewHeight / 2 - (rect.top - pageRect.top + rect.height / 2) * unit,
        width: rect.width * unit, height: rect.height * unit }
    }
    mountains = frameFor('.landing__mountain-layout')
    for (const { definition, points, material } of layers) {
      if (definition.name === 'moon path') continue
      const { width: w, height: h } = definition.metadata[activeQuality]
      const frame = definition.name === 'mountains' ? mountains
        : frameFor('.landing__sky-layout')
      points.position.set(frame.x, frame.y, 0)
      points.scale.x = frame.width / (frame.height * (w / h))
      material.uniforms.uScale!.value = frame.height
    }
    placeMoonPath(boatPlacement())
    syncScroll()
  }
  resize(container.clientWidth, container.clientHeight)
  let scrollDirty = false
  const onScroll = () => { scrollDirty = true }
  window.addEventListener('scroll', onScroll, { passive: true })

  const placePointer = (event: PointerEvent): void => {
    const rect = container.getBoundingClientRect()
    target.set((event.clientX - rect.left) / rect.width * viewWidth - viewWidth / 2,
      viewHeight / 2 - (event.clientY - rect.top) / rect.height * viewHeight)
    targetActive = 1
  }
  let touchStart: { id: number; x: number; y: number; time: number } | undefined
  const onPointerLeave = (): void => { targetActive = 0 }
  const onPointerMove = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') {
      if (touchStart && Math.hypot(event.clientX - touchStart.x, event.clientY - touchStart.y) > 10) touchStart = undefined
      return
    }
    placePointer(event)
  }
  const onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') {
      touchStart = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp }
      targetActive = 0
      return
    }
    placePointer(event)
    pulseOrigin.set(target.x, target.y + camera.position.y)
    pulseAge = 0
  }
  const onPointerUp = (event: PointerEvent): void => {
    const start = touchStart
    touchStart = undefined
    if (!start || start.id !== event.pointerId || event.timeStamp - start.time > 500
      || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) return
    placePointer(event)
    targetActive = 0
    pulseOrigin.set(target.x, target.y + camera.position.y)
    pulseAge = 0
  }
  const onPointerCancel = (): void => { touchStart = undefined; targetActive = 0 }
  container.addEventListener('pointermove', onPointerMove, { passive: true })
  container.addEventListener('pointerleave', onPointerLeave)
  container.addEventListener('pointerdown', onPointerDown)
  container.addEventListener('pointerup', onPointerUp)
  container.addEventListener('pointercancel', onPointerCancel)

  const selectQuality = async (next: QualityLevel): Promise<void> => {
    loading?.abort()
    const request = new AbortController()
    loading = request
    onLoading()
    try {
      const data = await Promise.all(layers.map(async ({ definition }) => {
        const result = await loadParticleData(definition.urls[next], request.signal)
        const metadata = definition.metadata[next]
        if (result.width !== metadata.width || result.height !== metadata.height || result.count !== metadata.count) {
          throw new Error('Particle metadata mismatch')
        }
        return result
      }))
      const boatError = await boatReady
      const goldError = await goldReady
      const shinesError = await shinesReady
      if (disposed || request.signal.aborted) return
      if (boatError) throw boatError
      if (goldError) throw goldError
      if (shinesError) throw shinesError
      // Swap both screens together, then release all geometry from the previous level.
      layers.forEach(({ points }, i) => {
        const result = data[i]!
        const geometry = new BufferGeometry()
        geometry.setAttribute('position', new BufferAttribute(result.positions, 3))
        geometry.setAttribute('aLight', new BufferAttribute(result.light, 1))
        geometry.setAttribute('aPhase', new BufferAttribute(result.phase, 1))
        geometry.setDrawRange(0, result.count)
        const previous = points.geometry
        points.geometry = geometry
        previous.dispose()
      })
      activeQuality = next
      loaded = true
      pulseAge = 100
      targetActive = 0
      pointerActive = 0
      resize(container.clientWidth, container.clientHeight)
      onReady()
    } catch (cause) {
      if (!disposed && !request.signal.aborted) {
        request.abort()
        onError(cause instanceof Error ? cause : new Error('Particle loading failed'))
      }
    }
  }
  void selectQuality(quality)

  return {
    updateEveryFrame: true,
    update: ({ elapsed, delta }) => {
      if (scrollDirty) { syncScroll(); scrollDirty = false }
      scene.visible = stageVisible
      if (!stageVisible) return
      const response = 1 - Math.exp(-delta * 13)
      pointer.lerp(target, response)
      pointerActive += (targetActive - pointerActive) * response
      const motionDelta = previousElapsed === undefined ? delta : Math.min(0.1, Math.max(0, elapsed - previousElapsed))
      previousElapsed = elapsed
      if (pulseAge < 100) pulseAge += motionDelta
      const anchor = boatPlacement()
      placeMoonPath(anchor)
      renderer.getDrawingBufferSize(viewport)
      layers.forEach(({ definition, points, material }) => {
        points.visible = loaded && Math.abs(points.position.y - camera.position.y)
          < (viewHeight + material.uniforms.uScale!.value) / 2
        material.uniforms.uPointer!.value.set((pointer.x - points.position.x) / points.scale.x,
          pointer.y + camera.position.y - points.position.y)
        material.uniforms.uPulseOrigin!.value.set((pulseOrigin.x - points.position.x) / points.scale.x,
          pulseOrigin.y - points.position.y)
        material.uniforms.uPointerActive!.value = pointerActive
        material.uniforms.uPulseAge!.value = reducedMotion ? 100 : pulseAge
        material.uniforms.uTime!.value = reducedMotion ? 0 : elapsed
        material.uniforms.uSampleSize!.value = material.uniforms.uScale!.value
          / definition.metadata[activeQuality].height / viewHeight * viewport.y
        material.uniforms.uRadius!.value = landingControls.radius
        material.uniforms.uForce!.value = reducedMotion ? landingControls.force * 0.4 : landingControls.force
        material.uniforms.uRipple!.value = landingControls.ripple
        material.uniforms.uPointSize!.value = landingControls.pointSize
        material.uniforms.uBrightness!.value = landingControls.brightness
        material.uniforms.uMotion!.value = reducedMotion ? 0 : landingControls.motion
      })
      const moon = layers.find((layer) => layer.definition.name === 'moon path')!
      const moonMetadata = moon.definition.metadata[activeQuality]
      boat.update(motionDelta, moon.material.uniforms.uScale!.value, moonMetadata.width / moonMetadata.height,
        loaded, {
          time: reducedMotion ? 0 : elapsed,
          pointerX: pointer.x, pointerY: pointer.y + camera.position.y, pointerActive,
          radius: landingControls.radius, force: landingControls.force, ripple: landingControls.ripple,
          pulseX: pulseOrigin.x, pulseY: pulseOrigin.y, pulseAge: reducedMotion ? 100 : pulseAge,
        }, reducedMotion, viewWidth, anchor)
      goldenThread.update(progress, reducedMotion ? 0 : elapsed, loaded, viewWidth, viewHeight,
        anchor.x, anchor.y, anchor.height, { mountains, compact: container.clientWidth <= 1100,
          ballRadius: 16 * viewHeight / container.clientHeight,
          ballGap: container.clientWidth <= 600 ? 0.25 : container.clientWidth <= 1100 ? 0.36 : 0.45,
          bottomY: viewHeight / 2 - (page?.offsetHeight ?? container.clientHeight * 2) / container.clientHeight * viewHeight })
      mountainShines.update(elapsed, loaded, scrollPixels / container.clientHeight, viewWidth, viewHeight, mountains)
    },
    resize,
    setQuality: (next) => { void selectQuality(next) },
    reset: () => {
      boat.reset()
      mountainShines.reset()
      targetActive = 0
      pointerActive = 0
      pulseAge = 100
      if (page) window.scrollTo({ top: window.scrollY + page.getBoundingClientRect().top, behavior: 'auto' })
      syncScroll()
    },
    stats: () => ({
      particles: layers.reduce((sum, layer) => sum + (layer.points.visible ? layer.definition.metadata[activeQuality].count : 0), 0),
      section: progress < 0.5 ? 'dots3' : 'mountains',
      scrollProgress: progress, transitionProgress: progress,
    }),
    dispose: () => {
      disposed = true
      loading?.abort()
      boat.dispose()
      goldenThread.dispose()
      mountainShines.dispose()
      window.removeEventListener('scroll', onScroll)
      container.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('pointerleave', onPointerLeave)
      container.removeEventListener('pointerdown', onPointerDown)
      container.removeEventListener('pointerup', onPointerUp)
      container.removeEventListener('pointercancel', onPointerCancel)
      for (const { points, material } of layers) {
        scene.remove(points)
        points.geometry.dispose()
        material.dispose()
      }
    },
  }
}
