// Renders the stills that stand in for the live scenes (tasks
// portfolio-lp-still-scenes and portfolio-lp-device-gate): the hero's black
// hole and the contact's globe in three window shapes each, and the reach's
// phone, tablet (upright and turned) and laptop with the projects section
// on their screens, plus the floor they stand on. They are shot from the
// live page, so run it again whenever a scene or the projects change.
// Run: npm run build && npm run start -- --port 3100, then
//      node scripts/render-stills.mjs http://localhost:3100 [target...]
// where a target is hero, devices, floor or globe; none renders them all.
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
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
const TARGETS = ['hero', 'devices', 'floor', 'globe']
const asked = process.argv.slice(3)
for (const target of asked)
  if (!TARGETS.includes(target))
    throw new Error(`unknown target ${target}; one of ${TARGETS.join(', ')}`)
const renders = new Set(asked.length > 0 ? asked : TARGETS)
// invariant: the files each target writes, so rendering one leaves the
// others' files and manifest entries as they were.
const PREFIXES = {
  hero: 'hero-',
  devices: 'device-',
  floor: 'floor-',
  globe: 'globe-'
}
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
// why: the globe's canvas is the contact section plus the half screen it
// rises above it (you-are-here.tsx); each shape is shot at the ratio that
// keeps its densest window at or under one screen px per image px (task
// portfolio-lp-device-gate, 8): a 390x844 phone at 3x, the rest at 2x.
const GLOBE = [
  {
    name: 'wide',
    width: 1800,
    height: 900,
    maxAspect: 100,
    dpr: 2,
    widths: [3600, 2400, 1600]
  },
  {
    name: 'tablet',
    width: 820,
    height: 1180,
    maxAspect: 0.95,
    dpr: 2,
    widths: [1640, 1100]
  },
  {
    name: 'phone',
    width: 430,
    height: 932,
    maxAspect: 0.58,
    dpr: 3,
    widths: [1290, 860]
  }
]
const GLOBE_SCREENS = 1.5
// why: the land mask loads and the bloom settles; the globe holds still.
const GLOBE_SETTLE_MS = 6000

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

/**
 * One PNG with straight alpha from a scene shot over black and over white:
 * its cover is 1 minus the gap between the two, raised to its brightest
 * channel over black so light drawn where it is clear survives, and its
 * colour is the light over black divided by that alpha. Over the page's
 * dark sky it composites as the canvas did.
 */
const lightOf = async (page, black, white) =>
  Buffer.from(
    await page.evaluate(
      async ([dark, light]) => {
        const read = async source => {
          const image = new Image()
          image.src = `data:image/png;base64,${source}`
          await image.decode()
          const canvas = document.createElement('canvas')
          canvas.width = image.width
          canvas.height = image.height
          const context = canvas.getContext('2d')
          if (!context) throw new Error('no 2D canvas to read with')
          context.drawImage(image, 0, 0)
          return {
            canvas,
            context,
            pixels: context.getImageData(0, 0, image.width, image.height)
          }
        }
        const onBlack = await read(dark)
        const onWhite = await read(light)
        const out = onBlack.pixels.data
        const white = onWhite.pixels.data
        for (let i = 0; i < out.length; i += 4) {
          const r = out[i] ?? 0
          const g = out[i + 1] ?? 0
          const b = out[i + 2] ?? 0
          const gap =
            ((white[i] ?? 0) -
              r +
              (white[i + 1] ?? 0) -
              g +
              (white[i + 2] ?? 0) -
              b) /
            3
          const alpha = Math.min(Math.max(255 - gap, r, g, b), 255)
          out[i] = alpha > 0 ? Math.round((r * 255) / alpha) : 0
          out[i + 1] = alpha > 0 ? Math.round((g * 255) / alpha) : 0
          out[i + 2] = alpha > 0 ? Math.round((b * 255) / alpha) : 0
          out[i + 3] = alpha
        }
        onBlack.context.putImageData(onBlack.pixels, 0, 0)
        return onBlack.canvas.toDataURL('image/png').split(',')[1]
      },
      [black.toString('base64'), white.toString('base64')]
    ),
    'base64'
  )

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

await mkdir(OUT, { recursive: true })
for (const file of await readdir(OUT))
  if ([...renders].some(target => file.startsWith(PREFIXES[target])))
    await rm(new URL(file, OUT))
const previous = await readFile(MANIFEST, 'utf8').then(JSON.parse, () => ({}))
const manifest = {
  hero: renders.has('hero') ? [] : (previous.hero ?? []),
  floor: renders.has('floor') ? [] : (previous.floor ?? []),
  devices: renders.has('devices') ? {} : (previous.devices ?? {}),
  globe: renders.has('globe') ? [] : (previous.globe ?? [])
}

for (const shape of renders.has('hero') ? HERO : []) {
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

for (const { stage, dpr, devices } of renders.has('devices') ? PASSES : []) {
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

for (const shape of renders.has('globe') ? GLOBE : []) {
  const { width, height } = shape
  const canvas = { width, height: height * GLOBE_SCREENS }
  const { context, page } = await open(canvas, shape.dpr, '/?capture=globe', {
    reducedMotion: 'reduce'
  })
  // why: the section held to one window of the shape, the canvas risen half
  // of it above, unmasked: the page lays its mask over the image itself.
  await page.addStyleTag({
    content: `${ONLY('[data-testid="globe-scene"]')}
      #contato { height: ${height}px !important; min-height: 0 !important; }
      [data-testid="globe-scene"] {
        top: -${height / 2}px !important;
        mask-image: none !important;
      }`
  })
  await page.waitForSelector('[data-testid="globe-scene"]')
  await page.evaluate(lift => {
    const section = document.getElementById('contato')
    if (!section) throw new Error('no #contato on the page')
    const top = section.getBoundingClientRect().top + scrollY - lift
    window.scrollTo({ top, behavior: 'instant' })
  }, height / 2)
  await page.waitForTimeout(GLOBE_SETTLE_MS)
  // why: the bloom adds light where the canvas stays clear (alpha 0), which
  // the compositor adds over the page but a clear screenshot drops; shot
  // over black and over white, the light and the cover are both recovered.
  const over = async colour => {
    await page.evaluate(
      value =>
        document.documentElement.style.setProperty(
          'background',
          value,
          'important'
        ),
      colour
    )
    await page.waitForTimeout(300)
    return page.screenshot({ clip: { x: 0, y: 0, ...canvas } })
  }
  const png = await lightOf(page, await over('#000'), await over('#fff'))
  // why: at 0.8 the dotted land shows no visible loss and weighs about a
  // sixth less than at 0.9; the image loads only as the contact nears.
  const encoded = await encode(page, png, shape.widths, 0.8)
  const [largest] = encoded
  manifest.globe.push({
    name: shape.name,
    maxAspect: shape.maxAspect,
    width: largest.width,
    height: largest.height,
    // invariant: the window the shot was taken in, from which the page
    // projects the visitor's pin onto it (still-pin.ts).
    shot: { ...canvas, lift: (canvas.height - height) / canvas.height },
    srcset: await save(`globe-${shape.name}`, encoded)
  })
  await context.close()
}

for (const floor of renders.has('floor') ? FLOORS : []) {
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
