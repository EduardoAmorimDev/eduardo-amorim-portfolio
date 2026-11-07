// Renders the stills that stand in for the live scenes (task
// portfolio-lp-still-scenes): the hero's black hole in three window shapes,
// and the reach's phone, tablet (upright and turned) and laptop with the
// projects section on their screens, plus the floor they stand on. They are
// shot from the live page, so run it again whenever the black hole, the
// models or the projects section change.
// Run: npm run build && npm run start -- --port 3100, then
//      node scripts/render-stills.mjs http://localhost:3100
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'
import {
  LAPTOP_FRAME,
  PHONE_FRAME,
  TABLET_FRAME
} from '../components/organisms/notebook/devices.ts'
import {
  fitIn,
  isSideLayout,
  stageViewport
} from '../components/organisms/notebook/stages.ts'

const BASE = process.argv[2] ?? 'http://localhost:3100'
const OUT = new URL('../public/stills/', import.meta.url)
const MANIFEST = new URL('../lib/stills.json', import.meta.url)
// invariant: the canvases draw at most 2 buffer px per CSS px, so a shot
// gets its pixels from a large window at 2x, not from a denser screen.
const DPR = 2

// why: each shape is rendered at the size its window would draw at 2x, so
// no screen of that shape enlarges it (task 2); `maxAspect` is the widest
// window it serves. The phone's is a 430x932 window, shot at 1.5x its size.
const HERO = [
  {
    name: 'wide',
    width: 1800,
    height: 900,
    maxAspect: 100,
    widths: [3600, 2400, 1600]
  },
  {
    name: 'tablet',
    width: 820,
    height: 1180,
    maxAspect: 0.95,
    widths: [1640, 1100]
  },
  {
    name: 'phone',
    width: 645,
    height: 1398,
    maxAspect: 0.58,
    widths: [1290, 860]
  }
]
// why: the hero's image is the hero and the half screen below it where the
// lens dissolves into the sky (SPILL in gargantua.tsx).
const HERO_SCREENS = 1.5

// why: square windows lay the stage out stacked, where every device gets
// the most room; at 6x (the stage's ratio is raised for the shot) the
// laptop's screen is ~2150 px wide: enough for the zoom to end on a
// 1440x900 window at 2x without enlarging it past 1.5 (task 7). A device
// is never shot last, where its page takes the window's own shape: the
// tablet and the laptop in a phone's order, the phone in a laptop's.
const PASSES = [
  {
    stage: { width: 760, height: 760 },
    dpr: 6,
    devices: [
      { name: 'tablet', at: 0.145, frame: TABLET_FRAME, title: 'tablet' },
      {
        name: 'tabletLandscape',
        at: 0.215,
        frame: TABLET_FRAME,
        title: 'tablet'
      },
      { name: 'laptop', at: 0.415, frame: LAPTOP_FRAME, title: 'laptop' }
    ]
  },
  {
    stage: { width: 1100, height: 1100 },
    dpr: 5,
    devices: [{ name: 'phone', at: 0.18, frame: PHONE_FRAME, title: 'phone' }]
  }
]
const FLOORS = [
  { name: 'wide', width: 1920, height: 1080, widths: [1920, 1280] },
  { name: 'tall', width: 860, height: 1864, widths: [860] }
]

const ONLY = selector => `
  html, body, main, section, #hero { background: transparent !important; }
  body * { visibility: hidden !important; transition: none !important; }
  ${selector}, ${selector} * { visibility: visible !important; }
`

const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=gl',
    '--ignore-gpu-blocklist',
    '--enable-unsafe-swiftshader'
  ]
})

const open = async (viewport, scale, path, options = {}) => {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: scale,
    ...options
  })
  const page = await context.newPage()
  await page.addInitScript(() => {
    window.addEventListener('hero-ready', () => {
      window.heroDrawn = true
    })
  })
  await page.goto(`${BASE}${path}`, { waitUntil: 'load' })
  return { context, page }
}

/** The PNG `png` as WebP at each of `widths`, cropped to `crop` first. */
const encode = (page, png, widths, quality, crop = null) =>
  page.evaluate(
    async ({ source, widths, quality, crop }) => {
      const image = new Image()
      image.src = `data:image/png;base64,${source}`
      await image.decode()
      const box = crop ?? { x: 0, y: 0, w: image.width, h: image.height }
      return widths.map(width => {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = Math.round((box.h * width) / box.w)
        const context = canvas.getContext('2d')
        if (!context) throw new Error('no 2D canvas to encode with')
        context.imageSmoothingQuality = 'high'
        context.drawImage(
          image,
          box.x,
          box.y,
          box.w,
          box.h,
          0,
          0,
          canvas.width,
          canvas.height
        )
        return {
          width,
          height: canvas.height,
          data: canvas.toDataURL('image/webp', quality).split(',')[1]
        }
      })
    },
    { source: png.toString('base64'), widths, quality, crop }
  )

const save = async (name, encoded) => {
  const srcset = []
  for (const { width, data } of encoded) {
    const file = `${name}-${width}.webp`
    await writeFile(new URL(file, OUT), Buffer.from(data, 'base64'))
    srcset.push({ src: `/stills/${file}`, w: width })
  }
  return srcset
}

/** The box of pixels that are not clear, in the PNG's px, or null. */
const opaqueBox = (page, png) =>
  page.evaluate(async source => {
    const image = new Image()
    image.src = `data:image/png;base64,${source}`
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('no 2D canvas to measure with')
    context.drawImage(image, 0, 0)
    const { data } = context.getImageData(0, 0, image.width, image.height)
    let [left, top, right, bottom] = [image.width, image.height, -1, -1]
    for (let y = 0; y < image.height; y++)
      for (let x = 0; x < image.width; x++)
        if ((data[(y * image.width + x) * 4 + 3] ?? 0) > 6) {
          left = Math.min(left, x)
          right = Math.max(right, x)
          top = Math.min(top, y)
          bottom = Math.max(bottom, y)
        }
    return right < 0
      ? null
      : { x: left, y: top, w: right - left + 1, h: bottom - top + 1 }
  }, png.toString('base64'))

/** `inner` cut to `outer`, both in the PNG's px, relative to `outer`. */
const clipTo = (outer, inner) => {
  const x = Math.max(inner.x, outer.x)
  const y = Math.max(inner.y, outer.y)
  const right = Math.min(inner.x + inner.w, outer.x + outer.w)
  const bottom = Math.min(inner.y + inner.h, outer.y + outer.h)
  return {
    x: Math.round(x - outer.x),
    y: Math.round(y - outer.y),
    w: Math.round(right - x),
    h: Math.round(bottom - y)
  }
}

/** Scrolls the notebook to `progress` and lets the damped stage settle. */
const scrollNotebook = async (page, progress) => {
  await page.evaluate(p => {
    const section = document.getElementById('notebook')
    if (!section) throw new Error('no #notebook on the page')
    const top = section.getBoundingClientRect().top + scrollY
    const scrollable = section.offsetHeight - innerHeight
    window.scrollTo({ top: top + p * scrollable, behavior: 'instant' })
  }, progress)
  await page.waitForTimeout(3500)
}

await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })
const manifest = { hero: [], floor: [], devices: {} }

for (const shape of HERO) {
  const { width, height } = shape
  // why: a window two screens tall with the hero pinned to one, so the
  // canvas, a screen taller than the hero, is drawn whole at once.
  const { context, page } = await open(
    { width, height: height * 2 },
    DPR,
    '/?capture=hero',
    { reducedMotion: 'reduce' }
  )
  await page.addStyleTag({
    content: `${ONLY('[data-testid="hero-scene"]')}
      #hero { height: ${height}px !important; }
      [data-testid="hero-scene"] { height: ${height * 2}px !important; }`
  })
  await page.waitForFunction(() => window.heroDrawn === true, null, {
    timeout: 120_000
  })
  await page.waitForTimeout(1500)
  const png = await page.screenshot({
    clip: { x: 0, y: 0, width, height: height * HERO_SCREENS },
    omitBackground: true
  })
  const encoded = await encode(page, png, shape.widths, 0.92)
  const [largest] = encoded
  manifest.hero.push({
    name: shape.name,
    maxAspect: shape.maxAspect,
    width: largest.width,
    height: largest.height,
    srcset: await save(`hero-${shape.name}`, encoded)
  })
  await context.close()
}

for (const { stage, dpr, devices } of PASSES) {
  const { context, page } = await open(stage, dpr, '/?capture=devices')
  await page.addStyleTag({ content: ONLY('[data-testid="notebook-scene"]') })
  const viewport = stageViewport(stage)
  const pxPerUnit = (stage.height / viewport.height) * dpr
  for (const device of devices) {
    await scrollNotebook(page, device.at)
    const png = await page.screenshot({ omitBackground: true })
    const box = await opaqueBox(page, png)
    if (!box) throw new Error(`${device.name}: nothing drawn on stage`)
    const screen = await page.evaluate(title => {
      const frame = document.querySelector(`iframe[title$="on a ${title}"]`)
      if (!frame) throw new Error(`no ${title} page on the stage`)
      const { x, y, width, height } = frame.getBoundingClientRect()
      return { x, y, w: width, h: height }
    }, device.title)
    const fit = fitIn(viewport, device.frame, isSideLayout(stage))
    const encoded = await encode(
      page,
      png,
      [box.w, Math.round(box.w / 2)],
      0.9,
      box
    )
    manifest.devices[device.name] = {
      width: box.w,
      height: box.h,
      // why: the image's width in scene units at a fit of 1, which the
      // still carousel scales by the fit of the window it is shown in.
      unitsWide: box.w / (pxPerUnit * fit),
      // why: a page's box can reach past the glass that clips it, so the
      // screen is that box cut to the device's own.
      screen: clipTo(box, {
        x: screen.x * dpr,
        y: screen.y * dpr,
        w: screen.w * dpr,
        h: screen.h * dpr
      }),
      srcset: await save(`device-${device.name}`, encoded)
    }
  }
  await context.close()
}

for (const floor of FLOORS) {
  const { context, page } = await open(
    { width: floor.width, height: floor.height },
    1,
    '/?capture=floor'
  )
  await page.addStyleTag({ content: ONLY('[data-testid="notebook-scene"]') })
  await scrollNotebook(page, 0.18)
  const png = await page.screenshot({ omitBackground: true })
  const encoded = await encode(page, png, floor.widths, 0.85)
  manifest.floor.push({
    name: floor.name,
    width: floor.width,
    height: floor.height,
    srcset: await save(`floor-${floor.name}`, encoded)
  })
  await context.close()
}

await browser.close()
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`)
