import assert from 'node:assert/strict'
import { PerspectiveCamera, Vector3 } from 'three'
import { LandingRoadCurve, landingCameraDistance, setLandingCamera } from '../src/experiments/ribbon-road/landingScrollCamera'
import { createRibbonGeometry } from '../src/experiments/ribbon-road/route'

const curve = new LandingRoadCurve()
const geometry = createRibbonGeometry(curve, 2000)
const positions = geometry.getAttribute('position')
const projected = new Vector3()
for (const [width, height] of [[1440, 900], [1280, 720], [390, 844], [844, 390]]) {
  const camera = new PerspectiveCamera(46, width! / height!, 0.08, 110)
  const distance = landingCameraDistance(geometry, camera.aspect)
  let maxX = 0
  let previousY = Infinity
  for (let step = 0; step <= 100; step++) {
    setLandingCamera(camera, step / 100, distance, curve)
    assert(camera.position.y <= previousY)
    assert.equal(camera.quaternion.angleTo(new PerspectiveCamera().quaternion), 0)
    previousY = camera.position.y
    let visible = 0
    for (let vertex = 0; vertex < positions.count; vertex++) {
      projected.fromBufferAttribute(positions, vertex).project(camera)
      if (Math.abs(projected.y) > 1) continue
      visible++
      maxX = Math.max(maxX, Math.abs(projected.x))
      assert(Math.abs(projected.x) <= 0.8, `Horizontal clipping at ${width}×${height}, progress ${step}%`)
      assert(Math.abs(projected.z) < 1, 'Depth clipping')
    }
    assert(visible > 0, `Empty frame at progress ${step}%`)
  }
  console.log(`${width}×${height}: 101 positions passed; max |NDC x| = ${maxX.toFixed(4)}`)
}
geometry.dispose()

// Uneven Y spacing and custom endpoints must survive coordinate export/import.
const coordinates = [[-3, 45, 2], [4, 41, -1], [-1, 12, 0], [2, -30, 3]] as const
const custom = new LandingRoadCurve(JSON.parse(JSON.stringify(coordinates)))
for (const [index, p] of coordinates.entries()) {
  const t = index / (coordinates.length - 1)
  assert(custom.getPoint(t).distanceTo(new Vector3(...p)) < 1e-9)
}
// The default track must actually climb within its loops.
let climbs = 0
for (let i = 1; i <= 2000; i++) {
  if (curve.getPoint(i / 2000).y > curve.getPoint((i - 1) / 2000).y) climbs++
}
assert(climbs > 100, 'Expected real loops with local climbs')
assert.throws(() => new LandingRoadCurve([[0, 2, 0], [0, 2, 0], [0, -1, 0]]))
assert.throws(() => new LandingRoadCurve([[0, 0, 0], [1, 0, 1]]))
assert.throws(() => new LandingRoadCurve([[0, 0, 0], [1, 1, 1]]))
assert.throws(() => new LandingRoadCurve([[0, 0, 0], [NaN, -1, 1]]))
console.log('Custom coordinate interpolation, JSON round-trip and invalid paths passed')
