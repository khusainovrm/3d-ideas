import sharp from 'sharp'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const directory = new URL('../src/experiments/ribbon-road/', import.meta.url)
// Clockwise 270° = counterclockwise 90°. Keep the full source, including faint dust.
const { data, info } = await sharp(fileURLToPath(new URL('assets/cloud.webp', directory)))
  .rotate(270).resize(960, 540).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const luminance = Buffer.alloc(info.width * info.height)
for (let i = 0; i < luminance.length; i++) {
  const offset = i * info.channels
  luminance[i] = Math.round(data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722)
}
writeFileSync(new URL('heroCloudData.generated.ts', directory), `// Generated from cloud.webp, rotated 90° CCW. CPU vertex sampling only, no image overlay.
export const HERO_CLOUD_REFERENCE = {
  width: ${info.width}, height: ${info.height},
  data: '${luminance.toString('base64')}',
} as const
`)
console.log(`Generated ${info.width}×${info.height} luminance field`)
