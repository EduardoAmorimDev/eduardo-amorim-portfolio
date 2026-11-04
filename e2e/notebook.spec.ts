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

// why: the page covers the glass on these shapes of window (task
// swallow-and-copy, 11–12), so the dive must still end on the real page.
const HANDOFF_VIEWS = [
  [1440, 900],
  [1920, 1080],
  [1280, 720]
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
    expect(differingShare(staged, real)).toBeLessThanOrEqual(HANDOFF_MAX_SHARE)
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
