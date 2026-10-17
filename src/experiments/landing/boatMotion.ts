export interface WaterInteraction {
  time: number
  pointerX: number
  pointerY: number
  pointerActive: number
  radius: number
  force: number
  ripple: number
  pulseX: number
  pulseY: number
  pulseAge: number
}

// The same radial hover field and travelling click wave as particles.vert.glsl.
// A single coherent phase represents the water under the rigid hull.
export function sampleWater(x: number, y: number, water: WaterInteraction) {
  const dx = x - water.pointerX, dy = y - water.pointerY
  const distance = Math.hypot(dx, dy)
  const inv = 1 / Math.max(distance, 0.001)
  const falloff = Math.exp(-Math.pow(distance / Math.max(water.radius, 0.01), 2) * 1.6) * water.pointerActive
  const wave = Math.sin(distance * 8 - water.time * 7)
  const radial = falloff * water.force * (0.54 + 0.46 * wave * water.ripple)
  const swirl = falloff * water.force * 0.22 * Math.sin(water.time * 2)
  const px = x - water.pulseX, py = y - water.pulseY
  const ring = Math.hypot(px, py)
  const pulse = Math.exp(-Math.pow((ring - water.pulseAge * 3.2) / 0.28, 2)) * Math.exp(-water.pulseAge * 0.65)
  const pulseForce = pulse * water.force * 0.8 / Math.max(ring, 0.001)
  return {
    x: dx * inv * radial - dy * inv * swirl + px * pulseForce,
    y: dy * inv * radial + dx * inv * swirl + py * pulseForce,
    energy: Math.min(1, (falloff + pulse) * water.force / 0.58),
  }
}

const clamp = (n: number, limit: number) => Math.max(-limit, Math.min(limit, n))

export class BoatMotion {
  x = 0
  y = 0
  roll = 0
  storm = 0
  private vx = 0
  private vy = 0
  private vr = 0

  update(delta: number, anchorX: number, anchorY: number, hullWidth: number,
    water: WaterInteraction, response: number, reducedMotion: boolean): void {
    const dt = Math.max(0, Math.min(delta, 0.1))
    const port = sampleWater(anchorX - hullWidth * 0.35, anchorY, water)
    const starboard = sampleWater(anchorX + hullWidth * 0.35, anchorY, water)
    const desiredStorm = reducedMotion ? 0 : Math.max(port.energy, starboard.energy) * response
    this.storm += (desiredStorm - this.storm) * (1 - Math.exp(-dt * (desiredStorm > this.storm ? 5 : 1.8)))
    const t = water.time
    // Small idle swell, then stronger heave and roll as local water is disturbed.
    const idleHeave = Math.sin(t * 1.15) * hullWidth * 0.016
    const heave = Math.sin(t * 5.1 + 0.8) * hullWidth * 0.075 * this.storm
    const tx = reducedMotion ? 0 : clamp((port.x + starboard.x) * 0.22 * response, hullWidth * 0.3)
    const ty = reducedMotion ? 0 : clamp(idleHeave + heave + (port.y + starboard.y) * 0.26 * response, hullWidth * 0.24)
    const slope = Math.atan2(starboard.y - port.y, hullWidth * 0.7)
    const tr = reducedMotion ? 0 : clamp(Math.sin(t * 0.85 + 0.4) * 0.025
      + slope * 0.5 * response + Math.sin(t * 4.3) * 0.15 * this.storm, 0.3)
    // Integrate a damped spring in small steps so quality/FPS changes cannot explode the motion.
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)))
    const step = dt / steps
    for (let i = 0; i < steps; i++) {
      this.vx += ((tx - this.x) * 35 - this.vx * 9) * step
      this.vy += ((ty - this.y) * 65 - this.vy * 10) * step
      this.vr += ((tr - this.roll) * 55 - this.vr * 8) * step
      this.x += this.vx * step
      this.y += this.vy * step
      this.roll += this.vr * step
    }
  }

  reset(): void {
    this.x = this.y = this.roll = this.storm = this.vx = this.vy = this.vr = 0
  }
}
