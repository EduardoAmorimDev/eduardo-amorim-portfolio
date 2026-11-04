// Generates public/sky/clouds.webp, the Milky Way's cloud mask (task
// portfolio-lp-mobile, 1-3): the fractal noise the band used to compute live,
// rendered once as a seamless tile. Run: node scripts/milky-way-clouds.mjs
import { writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

// invariant: the tile is drawn at 768 CSS px (parallax-field.tsx), so 1152
// px keeps it under 2x magnification on a 3x screen.
const SIZE = 1152
// why: the noise frequencies the band had at 1440 px wide (0.09 x 0.06 per
// percent of a ~1440 x 1560 layer), per image px of a tile drawn at 768 px.
const FREQUENCY = '0.004167 0.00257'
const OUT = new URL('../public/sky/clouds.webp', import.meta.url)

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
  <filter id="clouds" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="${FREQUENCY}"
      numOctaves="4" seed="11" stitchTiles="stitch" />
    <feColorMatrix type="matrix"
      values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1.8 0 0 0 -0.35" />
  </filter>
  <rect width="${SIZE}" height="${SIZE}" filter="url(#clouds)" />
</svg>`

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: SIZE, height: SIZE },
  deviceScaleFactor: 1
})
await page.setContent(
  `<body style="margin:0;background:transparent">${svg}</body>`
)
const png = await page.screenshot({ omitBackground: true, type: 'png' })
const webp = await page.evaluate(async base64 => {
  const image = new Image()
  image.src = `data:image/png;base64,${base64}`
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('no 2D canvas')
  context.drawImage(image, 0, 0)
  // why: a luminance mask (white shows the band) compresses lossily, where
  // an alpha mask is stored losslessly at several times the size.
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
  const { data } = pixels
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] ?? 0
    data[i] = alpha
    data[i + 1] = alpha
    data[i + 2] = alpha
    data[i + 3] = 255
  }
  context.putImageData(pixels, 0, 0)
  return canvas.toDataURL('image/webp', 0.8).split(',')[1]
}, png.toString('base64'))
await browser.close()
if (!webp) throw new Error('no webp from the canvas')
await writeFile(OUT, Buffer.from(webp, 'base64'))
