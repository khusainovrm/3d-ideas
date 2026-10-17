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
import { createLandingBoat } from './boat'
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
  scene.background = new Color('#000000')
  camera.position.set(0, 0, 10)
  camera.lookAt(0, 0, 0)

  let activeQuality = quality
  let loading: AbortController | undefined
  let disposed = false
  let loaded = false
  let progress = 0
  let viewWidth = 1
  let viewHeight = 1
  const page = container.closest<HTMLElement>('.landing')
  const pointer = new Vector2()
  const target = new Vector2()
  let pointerActive = 0
  let targetActive = 0
  let pulseAge = 100
  const pulseOrigin = new Vector2()
  const viewport = new Vector2()
  const boat = createLandingBoat(scene)
  // Handle a texture error even if particle fetching is still in progress.
  const boatReady = boat.ready.then(() => null, (cause: unknown) => cause instanceof Error ? cause : new Error('Boat loading failed'))
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

  const syncScroll = (): void => {
    if (!page) return
    const distance = Math.max(1, page.offsetHeight - container.clientHeight)
    progress = Math.max(0, Math.min(1, -page.getBoundingClientRect().top / distance))
    camera.position.y = -progress * viewHeight
  }
  const resize = (width: number, height: number): void => {
    viewHeight = camera.top - camera.bottom
    viewWidth = viewHeight * width / Math.max(1, height)
    for (const { definition, points, material } of layers) {
      points.position.y = -definition.screen * viewHeight
      const { width: w, height: h } = definition.metadata[activeQuality]
      material.uniforms.uScale!.value = Math.max(viewHeight, viewWidth / (w / h))
    }
    syncScroll()
  }
  resize(container.clientWidth, container.clientHeight)
  window.addEventListener('scroll', syncScroll, { passive: true })

  const placePointer = (event: PointerEvent): void => {
    const rect = container.getBoundingClientRect()
    target.set((event.clientX - rect.left) / rect.width * viewWidth - viewWidth / 2,
      viewHeight / 2 - (event.clientY - rect.top) / rect.height * viewHeight)
    targetActive = 1
  }
  const onPointerLeave = (): void => { targetActive = 0 }
  const onPointerDown = (event: PointerEvent): void => {
    placePointer(event)
    pulseOrigin.set(target.x, target.y + camera.position.y)
    pulseAge = 0
  }
  container.addEventListener('pointermove', placePointer, { passive: true })
  container.addEventListener('pointerleave', onPointerLeave)
  container.addEventListener('pointerdown', onPointerDown)
  container.addEventListener('pointercancel', onPointerLeave)

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
      if (disposed || request.signal.aborted) return
      if (boatError) throw boatError
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
    update: ({ elapsed, delta }) => {
      const response = 1 - Math.exp(-delta * 13)
      pointer.lerp(target, response)
      pointerActive += (targetActive - pointerActive) * response
      const motionDelta = previousElapsed === undefined ? delta : Math.min(0.1, Math.max(0, elapsed - previousElapsed))
      previousElapsed = elapsed
      if (pulseAge < 100) pulseAge += motionDelta
      renderer.getDrawingBufferSize(viewport)
      layers.forEach(({ definition, points, material }) => {
        points.visible = loaded && (definition.screen === 0 ? progress < 1 : progress > 0)
        material.uniforms.uPointer!.value.set(pointer.x, pointer.y + camera.position.y - points.position.y)
        material.uniforms.uPulseOrigin!.value.set(pulseOrigin.x, pulseOrigin.y - points.position.y)
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
        loaded && progress < 1, {
          time: reducedMotion ? 0 : elapsed,
          pointerX: pointer.x, pointerY: pointer.y + camera.position.y, pointerActive,
          radius: landingControls.radius, force: landingControls.force, ripple: landingControls.ripple,
          pulseX: pulseOrigin.x, pulseY: pulseOrigin.y, pulseAge: reducedMotion ? 100 : pulseAge,
        }, reducedMotion)
    },
    resize,
    setQuality: (next) => { void selectQuality(next) },
    reset: () => {
      boat.reset()
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
      window.removeEventListener('scroll', syncScroll)
      container.removeEventListener('pointermove', placePointer)
      container.removeEventListener('pointerleave', onPointerLeave)
      container.removeEventListener('pointerdown', onPointerDown)
      container.removeEventListener('pointercancel', onPointerLeave)
      for (const { points, material } of layers) {
        scene.remove(points)
        points.geometry.dispose()
        material.dispose()
      }
    },
  }
}
