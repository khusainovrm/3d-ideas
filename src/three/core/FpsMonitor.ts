export class FpsMonitor {
  private frameCount = 0
  private elapsed = 0
  private lowSamples = 0
  private cooldownSamples = 0

  fps = 60

  constructor(private readonly onSustainedLowFps: () => void) {}

  tick(delta: number): void {
    this.frameCount += 1
    this.elapsed += delta

    if (this.elapsed < 1) return

    this.fps = Math.round(this.frameCount / this.elapsed)
    if (this.cooldownSamples > 0) this.cooldownSamples -= 1
    this.lowSamples = this.fps < 30 ? this.lowSamples + 1 : 0
    this.frameCount = 0
    this.elapsed = 0

    if (this.lowSamples >= 2 && this.cooldownSamples === 0) {
      this.lowSamples = 0
      this.cooldownSamples = 3
      this.onSustainedLowFps()
    }
  }
}
