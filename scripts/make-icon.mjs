import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svg = readFileSync(join(root, 'build', 'icon.svg'))

const sizes = [16, 24, 32, 48, 64, 128, 256]
const buffers = []
for (const s of sizes) {
  buffers.push(await sharp(svg).resize(s, s).png().toBuffer())
}

// 512 png for window / linux
await sharp(svg).resize(512, 512).png().toFile(join(root, 'build', 'icon.png'))

const ico = await pngToIco(buffers)
writeFileSync(join(root, 'build', 'icon.ico'), ico)

console.log('Generated build/icon.ico and build/icon.png')
