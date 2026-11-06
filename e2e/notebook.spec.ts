import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import {
  documentTop,
  gotoNotebook,
  laptopScreen,
  notebookAt,
  notebookEnd,
  pixelAt,
  screenPixels,
  scrollWindowTo,
  type Pixels
} from './page-helpers'

// why: the task's own numbers (.tasks/portfolio-lp-device-carousel*.md).
const SCREENS_TALL = 7
const EMBED_PATH = '/embed/projetos'
const PHONE_WIDTH = 390
const PHONE_HEIGHT = 844
const TABLET = { portrait: [820, 1180], landscape: [1180, 820] } as const
// why: the copy of task reach-and-seams, 10–11.
const LABEL = 'Alcance'
const HEADING = 'Vá onde o concorrente não foi'
const CHAPTERS = [
  'No bolso do seu cliente',
  'A vitrine que nunca fecha',
  'E a operação inteira, por dentro'
]
const CHAPTER_LABELS = [
  '01 · Apps',
  '02 · Sites e landing pages',
  '03 · Sistemas'
]
const CHAPTER_BODIES = [
  'Aplicativos e PWAs que vivem na tela inicial, avisam na hora certa e abrem até com sinal fraco. Seu cliente chega até você com um toque.',
  'Sites e landing pages rápidos, fáceis de achar no Google e feitos para converter, em qualquer tela que o cliente tiver na mão.',
  'ERPs, CRMs, painéis e web apps sob medida: o que sua equipe usa todo dia, do estoque ao atendimento, no navegador de qualquer máquina.'
]
// why: a point of the section's progress where each chapter is on stage;
// 0.85 is inside the dive, where the copy steps aside.
const ON_STAGE = [
  { progress: 0.1, chapter: 0 },
  { progress: 0.37, chapter: 1 },
  { progress: 0.62, chapter: 2 },
  { progress: 0.85, chapter: null }
] as const
// why: the tablet's turn runs from 0.34 to 0.40 of the section.
const BEFORE_TURN = 0.3
const AFTER_TURN = 0.45
// why: the laptop's power-on ends by 0.71; 0.75 is lit, before the dive.
const LAPTOP_LIT = 0.75
const LIT_OPACITY = 0.9
// why: the stage fades over a quarter screen past the section's end.
const HANDOFF_SHARE = 0.25
// why: measured 2.66% at 1440×900 (the parallax shapes, which only the real
// page has, and glyph edges); the page painted ~55 px off, as Chrome does
// without the laptop's own compositing layer, measured 7%.
const HANDOFF_MAX_SHARE = 0.05
const PIXEL_GAP = 40
// why: the damped camera settles on the screen within a second or so.
const SETTLE_MS = 2500

const viewportOf = (page: Page) => {
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('no viewport')
  return viewport
}

const stage = (page: Page) => page.locator('#notebook > div')

const currentChapter = (page: Page) =>
  page
    .locator('#notebook [aria-current="step"] h3')
    .allTextContents()
    .then(titles => (titles.length ? CHAPTERS.indexOf(titles[0] ?? '') : null))

const scrollToProgress = async (page: Page, progress: number) => {
  await scrollWindowTo(page, await notebookAt(page, progress))
  await page.waitForTimeout(SETTLE_MS)
}

type Device = 'phone' | 'tablet' | 'laptop'
// why: the task's orders (.tasks/portfolio-lp-device-last.md, 3), by the
// window sizes the task names for each visitor's device.
const ORDERS = [
  { width: 1440, height: 900, order: ['phone', 'tablet', 'laptop'] },
  { width: 820, height: 1180, order: ['phone', 'laptop', 'tablet'] },
  { width: 390, height: 844, order: ['tablet', 'laptop', 'phone'] }
] as const
// why: the chapter of each device in CHAPTERS, and its name in the label.
const CHAPTER_OF = { phone: 0, tablet: 1, laptop: 2 } as const
const NAME_OF = {
  phone: 'Apps',
  tablet: 'Sites e landing pages',
  laptop: 'Sistemas'
} as const
// why: a point of the section's progress where the device in each place is
// alone on stage: resting first, resting second, opened last.
const PLACES = [0.1, 0.37, 0.62]
const LAPTOP_WIDTH = 1280

const screenOf = (page: Page, device: Device) =>
  page.locator(`#notebook iframe[title$="on a ${device}"]`)

const sizeOf = (page: Page, device: Device) =>
  screenOf(page, device).evaluate(frame => [
    Number(frame.getAttribute('width')),
    Number(frame.getAttribute('height'))
  ])

/** The devices whose page is drawn: off stage it is display:none. */
const devicesOnStage = (page: Page) =>
  page.locator('#notebook iframe').evaluateAll(frames =>
    frames
      .filter(frame => {
        const box = frame.closest('[data-scaled-page]')
        return box !== null && getComputedStyle(box).display !== 'none'
      })
      .map(frame => /on a (\w+)$/.exec(frame.getAttribute('title') ?? '')?.[1])
  )

const chapterLabels = (page: Page) =>
  page.getByTestId('notebook-copy').locator('h3').locator('..').locator('span')

/** Share of pixels whose channels differ by more than `PIXEL_GAP`. */
const differingShare = (a: Pixels, b: Pixels) => {
  let differing = 0
  for (let y = 0; y < a.height; y++)
    for (let x = 0; x < a.width; x++) {
      const [ar = 0, ag = 0, ab = 0] = pixelAt(a, x, y)
      const [br = 0, bg = 0, bb = 0] = pixelAt(b, x, y)
      const gap = Math.max(
        Math.abs(ar - br),
        Math.abs(ag - bg),
        Math.abs(ab - bb)
      )
      if (gap > PIXEL_GAP) differing++
    }
  return differing / (a.width * a.height)
}

test('the notebook is labelled by its heading and tells a chapter per device', async ({
  page
}) => {
  await page.goto('/')
  const notebook = page.locator('#notebook')
  const labelledBy = await notebook.getAttribute('aria-labelledby')
  expect(labelledBy).toBeTruthy()
  // why: the glitching heading paints decorative copies of its text, so it
  // is checked by its accessible name, which reads the text once.
  await expect(
    page.getByRole('heading', { level: 2, name: HEADING })
  ).toHaveAttribute('id', labelledBy ?? '')
  await expect(notebook.locator('h3')).toHaveText(CHAPTERS)
  const copy = notebook.getByTestId('notebook-copy')
  await expect(copy.locator('span').first()).toHaveText(LABEL)
  const chapters = copy.locator('h3').locator('..')
  await expect(chapters.locator('span')).toHaveText(CHAPTER_LABELS)
  await expect(chapters.locator('p')).toHaveText(CHAPTER_BODIES)
})

test('the notebook is seven screens tall and holds its stage', async ({
  page
}) => {
  await gotoNotebook(page)
  const viewport = viewportOf(page)
  const box = await page.locator('#notebook').boundingBox()
  expect(box?.height).toBe(viewport.height * SCREENS_TALL)

  const top = await documentTop(page.locator('#notebook'))
  await scrollWindowTo(page, top + viewport.height)
  const scene = await page
    .locator('[data-testid="notebook-scene"]')
    .evaluate(node => {
      const { top, bottom } = node.getBoundingClientRect()
      return { top, bottom }
    })
  expect(scene).toEqual({ top: 0, bottom: viewport.height })
})

test('every device shows the projects section at its own width', async ({
  page
}) => {
  await gotoNotebook(page)
  const viewport = viewportOf(page)
  const screens = await page.locator('#notebook iframe').evaluateAll(frames =>
    frames.map(frame => {
      const { pathname } = new URL((frame as HTMLIFrameElement).src)
      return {
        title: frame.getAttribute('title'),
        path: pathname,
        width: Number(frame.getAttribute('width'))
      }
    })
  )
  // invariant: compared by device, not by DOM order, which follows the
  // order the 3D scene mounts each screen in.
  const byTitle = Object.fromEntries(
    screens.map(({ title, ...screen }) => [title, screen])
  )
  expect(byTitle).toEqual({
    'Preview of the projects section on a phone': {
      path: EMBED_PATH,
      width: PHONE_WIDTH
    },
    'Preview of the projects section on a tablet': {
      path: EMBED_PATH,
      width: TABLET.portrait[0]
    },
    'Preview of the projects section on a laptop': {
      path: EMBED_PATH,
      width: viewport.width
    }
  })
})

// why: the windows of the task (portfolio-lp-device-last, 7-9) and two that
// match no device's own page, so the last page can only be the window's.
const OWN_WIDTHS = [
  { width: 820, height: 1180, last: 'tablet' },
  { width: 1000, height: 700, last: 'tablet' },
  { width: 390, height: 844, last: 'phone' },
  { width: 375, height: 667, last: 'phone' }
] as const

for (const { width, height, last } of OWN_WIDTHS)
  test(`every device shows the projects section at its own width at ${width}x${height}`, async ({
    page
  }) => {
    await page.setViewportSize({ width, height })
    await gotoNotebook(page)
    const own = {
      phone: [PHONE_WIDTH, PHONE_HEIGHT],
      tablet: [...TABLET.portrait],
      [last]: [width, height]
    }
    expect(await sizeOf(page, 'phone')).toEqual(own.phone)
    expect(await sizeOf(page, 'tablet')).toEqual(own.tablet)
    expect((await sizeOf(page, 'laptop'))[0]).toBe(LAPTOP_WIDTH)
  })

test('the chapter follows the device on stage, both ways', async ({ page }) => {
  // why: eight settled scrolls take 20 s, and reaching the notebook now
  // also loads the glass icons just above it (task reach-and-seams, 13).
  test.setTimeout(45_000)
  await gotoNotebook(page)
  for (const { progress, chapter } of ON_STAGE) {
    await scrollToProgress(page, progress)
    expect(await currentChapter(page), `at ${progress}`).toBe(chapter)
  }
  // invariant: nothing holds at the carousel's end; going back replays it.
  for (const { progress, chapter } of [...ON_STAGE].reverse()) {
    await scrollToProgress(page, progress)
    expect(await currentChapter(page), `back at ${progress}`).toBe(chapter)
  }
})

for (const { width, height, order } of ORDERS)
  test(`the chapters are numbered in the order of the devices at ${width}x${height}`, async ({
    page
  }) => {
    await page.setViewportSize({ width, height })
    await page.goto('/')
    const notebook = page.locator('#notebook')
    await expect(chapterLabels(page)).toHaveText(
      order.map((device, index) => `0${index + 1} · ${NAME_OF[device]}`)
    )
    await expect(notebook.locator('h3')).toHaveText(
      order.map(device => CHAPTERS[CHAPTER_OF[device]] ?? '')
    )
    await expect(notebook.getByTestId('notebook-copy').locator('p')).toHaveText(
      order.map(device => CHAPTER_BODIES[CHAPTER_OF[device]] ?? '')
    )
  })

for (const { width, height, order } of ORDERS.slice(1))
  test(`the chapter follows its device on stage at ${width}x${height}`, async ({
    page
  }) => {
    test.setTimeout(45_000)
    await page.setViewportSize({ width, height })
    await gotoNotebook(page)
    const stops = [
      ...order.map((device, index) => ({
        progress: PLACES[index] ?? 0,
        chapter: CHAPTER_OF[device]
      })),
      { progress: 0.85, chapter: null }
    ]
    for (const { progress, chapter } of [...stops, ...[...stops].reverse()]) {
      await scrollToProgress(page, progress)
      expect(await currentChapter(page), `at ${progress}`).toBe(chapter)
    }
  })

// why: the edges of Tailwind's md and lg (task portfolio-lp-device-last, 1).
const EDGES = [
  { width: 767, last: 'phone' },
  { width: 768, last: 'tablet' },
  { width: 1023, last: 'tablet' },
  { width: 1024, last: 'laptop' }
] as const

for (const { width, last } of EDGES)
  test(`the window width picks the last device at ${width}`, async ({
    page
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await gotoNotebook(page)
    await expect(chapterLabels(page).last()).toHaveText(`03 · ${NAME_OF[last]}`)
    expect((await sizeOf(page, last))[0]).toBe(width)
  })

for (const { width, height, order } of ORDERS)
  test(`the devices come on stage in the visitor's order at ${width}x${height}`, async ({
    page
  }) => {
    await page.setViewportSize({ width, height })
    await gotoNotebook(page)
    for (const [index, device] of order.entries()) {
      const progress = PLACES[index] ?? 0
      await scrollToProgress(page, progress)
      expect(await devicesOnStage(page), `at ${progress}`).toEqual([device])
    }
  })

test('crossing a width limit mid-Alcance reorders the devices', async ({
  page
}) => {
  test.setTimeout(45_000)
  const titles = () =>
    page
      .locator('#notebook iframe')
      .evaluateAll(frames =>
        frames.map(frame => frame.getAttribute('title') ?? '').sort()
      )
  await gotoNotebook(page)
  const all = await titles()
  expect(new Set(all).size).toBe(3)
  for (const { width, height, order } of [ORDERS[0], ORDERS[2], ORDERS[0]]) {
    await page.setViewportSize({ width, height })
    await scrollToProgress(page, PLACES[0] ?? 0)
    await expect(chapterLabels(page)).toHaveText(
      order.map((device, index) => `0${index + 1} · ${NAME_OF[device]}`)
    )
    expect(await titles(), `${width}`).toEqual(all)
    expect(await devicesOnStage(page), `${width}`).toEqual([order[0]])
    const last = order[2]
    expect((await sizeOf(page, last))[0], `${width}`).toBe(width)
    expect((await sizeOf(page, 'laptop'))[0], `${width}`).toBe(
      last === 'laptop' ? width : LAPTOP_WIDTH
    )
  }
})

test('the laptop opens and lights in second place', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 })
  await gotoNotebook(page)
  const opacity = () =>
    laptopScreen(page).evaluate(frame =>
      Number(getComputedStyle(frame).opacity)
    )
  await scrollToProgress(page, 0.2)
  expect(await opacity()).toBeLessThanOrEqual(0.05)
  await scrollToProgress(page, 0.41)
  expect(await opacity()).toBeGreaterThanOrEqual(LIT_OPACITY)
  const box = await laptopScreen(page).evaluate(frame => {
    const { width, height } = frame.getBoundingClientRect()
    return { width, height }
  })
  // why: the page is 1280 x 879; a closed lid shows it edge-on, near 0.
  expect(box.height / box.width).toBeGreaterThanOrEqual(0.6)
})

test('the last phone comes from the depth', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await gotoNotebook(page)
  const box = () =>
    screenOf(page, 'phone').evaluate(frame => {
      const { left, width } = frame.getBoundingClientRect()
      return { centre: left + width / 2, width }
    })
  // why: last, the phone comes in once the laptop has left, over
  // [0.52, 0.62] (task portfolio-lp-mobile-smooth, 10).
  await scrollToProgress(page, 0.57)
  const coming = await box()
  await scrollToProgress(page, 0.62)
  const landed = await box()
  expect(Math.abs(coming.centre - 390 / 2)).toBeLessThanOrEqual(390 * 0.1)
  expect(coming.width).toBeLessThan(landed.width)
})

// why: task portfolio-lp-mobile-smooth, 10: the last phone rises from
// behind the stage's middle only once the laptop has gone, never through it.
test('the last phone never crosses the leaving laptop', async ({ page }) => {
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await gotoNotebook(page)
  /** The page box of `device` on screen, or null while off stage. */
  const shownBox = (device: Device) =>
    screenOf(page, device).evaluate(frame => {
      const box = frame.closest('[data-scaled-page]')
      if (!box || getComputedStyle(box).display === 'none') return null
      const { left, top, right, bottom } = frame.getBoundingClientRect()
      return { left, top, right, bottom }
    })
  const seen = { phone: 0, laptop: 0 }
  for (let step = 0; step <= 12; step++) {
    const progress = 0.4 + step * 0.02
    await scrollToProgress(page, progress)
    const phone = await shownBox('phone')
    const laptop = await shownBox('laptop')
    if (phone) seen.phone++
    if (laptop) seen.laptop++
    if (!phone || !laptop) continue
    const crossing =
      phone.left < laptop.right &&
      laptop.left < phone.right &&
      phone.top < laptop.bottom &&
      laptop.top < phone.bottom
    expect(crossing, `at ${progress.toFixed(2)}`).toBe(false)
  }
  // invariant: the sweep saw both devices on stage, so it judged the hand-over.
  expect(seen.phone, 'the phone came on stage').toBeGreaterThan(0)
  expect(seen.laptop, 'the laptop was on stage').toBeGreaterThan(0)
})

test('the tablet turns in first place', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await gotoNotebook(page)
  await scrollToProgress(page, 0.12)
  expect(await sizeOf(page, 'tablet')).toEqual([...TABLET.portrait])
  await scrollToProgress(page, 0.215)
  expect(await sizeOf(page, 'tablet')).toEqual([...TABLET.landscape])
})

for (const { width, height } of [
  { width: 820, height: 1180 },
  { width: 1000, height: 700 }
])
  test(`the last tablet keeps the window's orientation at ${width}x${height}`, async ({
    page
  }) => {
    await page.setViewportSize({ width, height })
    await gotoNotebook(page)
    for (const progress of [0.47, 0.62, 0.9]) {
      await scrollToProgress(page, progress)
      expect(await sizeOf(page, 'tablet'), `at ${progress}`).toEqual([
        width,
        height
      ])
    }
  })

for (const { width, height, order } of ORDERS)
  test(`the dive ends on the last device's page filling the window at ${width}x${height}`, async ({
    page
  }) => {
    await page.setViewportSize({ width, height })
    await gotoNotebook(page)
    await scrollToProgress(page, 0.9)
    await scrollWindowTo(page, await notebookEnd(page))
    await page.waitForTimeout(SETTLE_MS)
    const last = order[2]
    const box = await screenOf(page, last).evaluate(frame => {
      const { left, top, right, bottom } = frame.getBoundingClientRect()
      return { left, top, right, bottom }
    })
    expect(Math.abs(box.left)).toBeLessThanOrEqual(2)
    expect(Math.abs(box.top)).toBeLessThanOrEqual(2)
    expect(Math.abs(box.right - width)).toBeLessThanOrEqual(2)
    // why: on a window wider than its glass the laptop's page runs on
    // below the window (task swallow-and-copy, 11).
    if (last === 'laptop') expect(box.bottom).toBeGreaterThanOrEqual(height - 2)
    else expect(Math.abs(box.bottom - height)).toBeLessThanOrEqual(2)
  })

test('the tablet turns and its page lays out again for landscape', async ({
  page
}) => {
  await gotoNotebook(page)
  const tablet = page.locator('#notebook iframe[title$="on a tablet"]')
  const size = () =>
    tablet.evaluate(frame => [
      Number(frame.getAttribute('width')),
      Number(frame.getAttribute('height'))
    ])
  await scrollToProgress(page, BEFORE_TURN)
  expect(await size()).toEqual([...TABLET.portrait])
  await scrollToProgress(page, AFTER_TURN)
  expect(await size()).toEqual([...TABLET.landscape])
})

test('the laptop is lit before the dive', async ({ page }) => {
  await gotoNotebook(page)
  const opacity = () =>
    laptopScreen(page).evaluate(frame =>
      Number(getComputedStyle(frame).opacity)
    )
  expect(await opacity()).toBeLessThanOrEqual(0.05)
  await scrollWindowTo(page, await notebookAt(page, LAPTOP_LIT))
  await expect
    .poll(opacity, { timeout: 10_000 })
    .toBeGreaterThanOrEqual(LIT_OPACITY)
})

test('the real projects section sits behind the stage as the section ends', async ({
  page
}) => {
  await gotoNotebook(page)
  await scrollWindowTo(page, await notebookEnd(page))
  const top = await page
    .locator('#cases')
    .evaluate(section => section.getBoundingClientRect().top)
  expect(Math.abs(top)).toBeLessThanOrEqual(1)
})

// why: the page covers the laptop's glass on the first three shapes of
// window (task swallow-and-copy, 11–12), and the tablet and the phone come
// last on the other two (portfolio-lp-device-last, 9); every dive must
// still end on the real page.
const HANDOFF_VIEWS = [
  [1440, 900],
  [1920, 1080],
  [1280, 720],
  [820, 1180],
  [390, 844]
] as const

for (const [width, height] of HANDOFF_VIEWS)
  test(`the stage hands over to the real page with no visible change at ${width}x${height}`, async ({
    page
  }) => {
    await page.setViewportSize({ width, height })
    await gotoNotebook(page)
    const viewport = viewportOf(page)
    const end = await notebookEnd(page)
    await scrollWindowTo(page, await notebookAt(page, 0.9))
    await page.waitForTimeout(SETTLE_MS)
    await scrollWindowTo(page, end)
    await page.waitForTimeout(SETTLE_MS)
    const clip = { x: 0, y: 0, ...viewport }
    const staged = await screenPixels(page, clip)
    await stage(page).evaluate(node => {
      ;(node as HTMLElement).style.visibility = 'hidden'
    })
    await page.waitForTimeout(300)
    const real = await screenPixels(page, clip)
    const share = differingShare(staged, real)
    // why: the measured share, kept in the report for the checklist.
    test.info().annotations.push({ type: 'share', description: `${share}` })
    expect(share).toBeLessThanOrEqual(HANDOFF_MAX_SHARE)
  })

test('past the end the stage is gone and the real page takes the pointer', async ({
  page
}) => {
  await gotoNotebook(page)
  const viewport = viewportOf(page)
  const end = await notebookEnd(page)
  await scrollWindowTo(page, end)
  await expect(stage(page)).toHaveCSS('opacity', '1')
  await scrollWindowTo(page, end + viewport.height * HANDOFF_SHARE + 1)
  await expect(stage(page)).toHaveCSS('visibility', 'hidden')
  const hit = await page.evaluate(
    ({ x, y }) => document.elementFromPoint(x, y)?.closest('section')?.id,
    { x: viewport.width / 2, y: viewport.height / 2 }
  )
  expect(hit).toBe('cases')
})

test('nothing floats over the notebook', async ({ page }) => {
  await gotoNotebook(page)
  const viewport = viewportOf(page)
  const top = await documentTop(page.locator('#notebook'))
  await scrollWindowTo(page, top + viewport.height)

  await expect(page.locator('#notebook [data-testid="hero-grid"]')).toHaveCount(
    0
  )
  await expect(page.locator('[data-testid="sections-grid"]')).toHaveCount(0)
  // invariant: every parallax layer and glow is clipped to its own block of
  // sections (the first runs a screen under the stage, task swallow-and-copy,
  // 8), so a block off screen leaves nothing of them on screen.
  const reaching = await page.evaluate(() => {
    const outside = (node: Element) => !node.closest('#notebook')
    const boxes = [
      ...[...document.querySelectorAll('[data-parallax-layer]')]
        .filter(outside)
        .map(layer => layer.parentElement),
      ...[...document.querySelectorAll('[data-testid="sections-glow"]')]
        .filter(outside)
        .map(glow => glow.closest('[aria-hidden="true"]')),
      document.querySelector('#hero')
    ]
    return boxes.flatMap(node => {
      if (!node) return ['a layer without a clipping box']
      const { top, bottom } = node.getBoundingClientRect()
      // why: 1 px of slack: svh and innerHeight round apart by a fraction.
      return bottom > 1 && top < innerHeight
        ? [`${node.tagName} ${top}–${bottom}`]
        : []
    })
  })
  expect(reaching).toEqual([])
})

test('the screen pages take no pointer or focus and are hidden from assistive tech', async ({
  page
}) => {
  await gotoNotebook(page)
  const frames = page.locator('#notebook iframe')
  await expect(frames).toHaveCount(3)
  for (const frame of await frames.all()) {
    await expect(frame).toHaveAttribute('aria-hidden', 'true')
    await expect(frame).toHaveAttribute('tabindex', '-1')
    await expect(frame).toHaveCSS('pointer-events', 'none')
  }
  // invariant: nothing of the embedded pages reaches the accessibility tree.
  const tree = await page.locator('#notebook').ariaSnapshot()
  expect(tree).not.toMatch(/iframe|document/i)
})

test('the embedded projects page is the cases section alone, kept out of search', async ({
  page
}) => {
  await page.goto(EMBED_PATH)
  await expect(page.locator('section')).toHaveCount(1)
  await expect(page.locator('section#cases')).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    /noindex/
  )
})
