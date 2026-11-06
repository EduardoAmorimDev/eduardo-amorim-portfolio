import type { CDPSession, Page } from '@playwright/test'
import { expect, test } from './fixtures'
import {
  documentTop,
  forceLite,
  notebookAt,
  scrollWindowTo
} from './page-helpers'

// why: the task's own numbers (.tasks/portfolio-lp-60fps.md, Intent).
const MIN_FPS = 58
const SLOWDOWN = 6
const MEASURE_MS = 3000
const RUNS = 3
// why: the tier judges 2 s windows from a second after load and turns
// lite on three slow ones in a row; four windows leave it time to decide.
const WARM_UP_MS = 9000
const LITE = { attribute: 'data-performance', value: 'lite' }
// why: the hero and the globe keep their adaptive ratio in lite, for their
// sharpness on dense screens (user, 2026-11-05); these two are pinned.
const LITE_DPR = { notebook: 0.75, glass: 1 }

const DESKTOP = { viewport: { width: 1440, height: 900 } }
const PHONE = {
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 3
}

type Stretch = {
  name: string
  range: (page: Page) => Promise<[number, number]>
}

const top = (page: Page, selector: string) =>
  documentTop(page.locator(selector))

/** The five stretches of the task, each from where to where it scrolls. */
const STRETCHES: Stretch[] = [
  { name: 'the hero at rest', range: async () => [0, 0] },
  {
    name: 'the scroll to the solutions',
    range: async page => [
      await top(page, '#prova-social'),
      (await top(page, '#solucoes')) + 600
    ]
  },
  {
    name: 'the scroll through the Alcance',
    range: async page => [await notebookAt(page, 0), await notebookAt(page, 1)]
  },
  {
    name: 'the scroll from the cases to the workflow',
    range: async page => [
      (await top(page, '#cases')) + (await page.evaluate(() => innerHeight)),
      (await top(page, '#workflow')) + 600
    ]
  },
  {
    name: 'the contact at rest',
    range: async page => {
      const at = (await top(page, '#contato')) - 200
      return [at, at]
    }
  }
]

const slowDown = (cdp: CDPSession, rate: number) =>
  cdp.send('Emulation.setCPUThrottlingRate', { rate })

/** Counts animation frames until `stop` resolves; returns frames per second. */
const countFrames = async (page: Page, stop: () => Promise<unknown>) => {
  await page.evaluate(() => {
    const scope = window as unknown as { frameCount: () => number }
    const start = performance.now()
    let frames = 0
    let last = start
    let counting = true
    const tick = (now: number) => {
      if (!counting) return
      frames++
      last = now
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    // invariant: reading the count ends the loop, so a later run does not
    // pay for this one's frames.
    scope.frameCount = () => {
      counting = false
      return (1000 * frames) / (last - start)
    }
  })
  await stop()
  return page.evaluate(() =>
    (window as unknown as { frameCount: () => number }).frameCount()
  )
}

/**
 * Scrolls by `distance` px over `ms`, as a wheel or a finger does: the
 * browser scrolls on its compositor, the page only hears of it.
 */
const gesture = (
  cdp: CDPSession,
  device: { isMobile?: boolean; viewport: { width: number; height: number } },
  distance: number,
  ms: number
) =>
  cdp.send('Input.synthesizeScrollGesture', {
    x: device.viewport.width / 2,
    y: device.viewport.height / 2,
    yDistance: -distance,
    speed: Math.max(Math.round((Math.abs(distance) * 1000) / ms), 1),
    preventFling: true,
    gestureSourceType: device.isMobile ? 'touch' : 'mouse'
  })

type Device = {
  isMobile?: boolean
  viewport: { width: number; height: number }
}

/** Frames per second over MEASURE_MS, scrolling from `from` to `to`. */
const measure = async (
  page: Page,
  cdp: CDPSession,
  device: Device,
  [from, to]: [number, number]
) => {
  await scrollWindowTo(page, from)
  return countFrames(page, () =>
    to === from
      ? page.waitForTimeout(MEASURE_MS)
      : gesture(cdp, device, to - from, MEASURE_MS)
  )
}

/**
 * Goes over the stretch as a visitor would, back and forth, for WARM_UP_MS:
 * a stretch that is only slow while it scrolls is judged while it scrolls.
 */
const warmUp = async (
  page: Page,
  cdp: CDPSession,
  device: Device,
  [from, to]: [number, number]
) => {
  if (to === from) return page.waitForTimeout(WARM_UP_MS)
  const started = Date.now()
  await scrollWindowTo(page, from)
  for (let lap = 0; Date.now() - started < WARM_UP_MS; lap++)
    await gesture(cdp, device, lap % 2 ? from - to : to - from, MEASURE_MS)
}

for (const [label, device] of [
  ['1440x900', DESKTOP],
  ['390x844', PHONE]
] as const)
  test.describe(`at 6x CPU on ${label}`, () => {
    test.use(device)

    for (const stretch of STRETCHES)
      test(`at 6x CPU on ${label}, ${stretch.name} runs at 58 fps or more`, async ({
        page
      }) => {
        test.setTimeout(120_000)
        await page.goto('/')
        await page.waitForLoadState('networkidle')
        const range = await stretch.range(page)
        await scrollWindowTo(page, range[0])
        const cdp = await page.context().newCDPSession(page)
        await slowDown(cdp, SLOWDOWN)
        await warmUp(page, cdp, device, range)
        // why: the median of three runs, as the machine's other work (a
        // browser drawing on the same GPU) delays a frame now and then.
        const runs = []
        for (let run = 0; run < RUNS; run++)
          runs.push(await measure(page, cdp, device, range))
        const fps = [...runs].sort((a, b) => a - b)[Math.floor(RUNS / 2)] ?? 0
        await slowDown(cdp, 1)
        const tier = await page.locator('html').getAttribute(LITE.attribute)
        expect(fps, `tier: ${tier ?? 'full'}`).toBeGreaterThanOrEqual(MIN_FPS)
      })
  })

/** Counts, per canvas, the WebGL draw calls made; installed before load. */
const countDraws = (page: Page) =>
  page.addInitScript(() => {
    const counts = new WeakMap<HTMLCanvasElement, number>()
    const scope = window as unknown as {
      drawsOf: (canvas: Element | null) => number
    }
    for (const proto of [
      WebGLRenderingContext.prototype,
      WebGL2RenderingContext.prototype
    ])
      for (const name of ['drawElements', 'drawArrays'] as const) {
        const draw = proto[name] as (...args: unknown[]) => void
        Object.defineProperty(proto, name, {
          value: function (this: WebGLRenderingContext, ...args: unknown[]) {
            const canvas = this.canvas
            if (canvas instanceof HTMLCanvasElement)
              counts.set(canvas, (counts.get(canvas) ?? 0) + 1)
            return draw.apply(this, args)
          }
        })
      }
    scope.drawsOf = canvas =>
      canvas instanceof HTMLCanvasElement ? (counts.get(canvas) ?? 0) : -1
  })

/**
 * Frames per second, and frames per second in which the canvas inside
 * `selector` drew anything, until `stop` resolves.
 */
const countDrawnFrames = async (
  page: Page,
  selector: string,
  stop: () => Promise<unknown>
) => {
  await page.evaluate(target => {
    const scope = window as unknown as {
      drawsOf: (canvas: Element | null) => number
      drawnRate: () => { fps: number; draws: number }
    }
    const canvas = document.querySelector(`${target} canvas`)
    const start = performance.now()
    let frames = 0
    let drawn = 0
    let last = start
    let seen = scope.drawsOf(canvas)
    let counting = true
    const tick = (now: number) => {
      if (!counting) return
      frames++
      last = now
      const draws = scope.drawsOf(canvas)
      if (draws !== seen) drawn++
      seen = draws
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    scope.drawnRate = () => {
      counting = false
      const seconds = (last - start) / 1000
      return { fps: frames / seconds, draws: drawn / seconds }
    }
  }, selector)
  await stop()
  return page.evaluate(() =>
    (
      window as unknown as { drawnRate: () => { fps: number; draws: number } }
    ).drawnRate()
  )
}

// why: the scenes that follow the finger on a phone (task
// portfolio-lp-mobile-smooth, 1 and 9): a canvas drawn every other frame
// passes the page's frame rate and still judders.
const DRAWN_STRETCHES: (Stretch & { canvas: string })[] = [
  {
    name: 'the hero at rest',
    canvas: '[data-testid="hero-scene"]',
    range: async () => [0, 0]
  },
  {
    name: 'the dive through the hero',
    canvas: '[data-testid="hero-scene"]',
    range: async page => [0, await page.evaluate(() => innerHeight)]
  },
  {
    name: 'the scroll through the Alcance',
    canvas: '[data-testid="notebook-scene"]',
    range: async page => [await notebookAt(page, 0), await notebookAt(page, 1)]
  }
]

test.describe('at 6x CPU on 390x844, every frame drawn', () => {
  test.use(PHONE)

  for (const tier of ['full', 'lite'] as const)
    for (const stretch of DRAWN_STRETCHES)
      test(`on 390x844, ${stretch.name} draws every frame, ${tier}`, async ({
        page
      }) => {
        test.setTimeout(120_000)
        await countDraws(page)
        await page.goto('/')
        await page.waitForLoadState('networkidle')
        if (tier === 'lite') await forceLite(page)
        const range = await stretch.range(page)
        const cdp = await page.context().newCDPSession(page)
        await slowDown(cdp, SLOWDOWN)
        const runs: { fps: number; draws: number }[] = []
        for (let run = 0; run < RUNS + 1; run++) {
          await scrollWindowTo(page, range[0])
          runs.push(
            await countDrawnFrames(page, stretch.canvas, () =>
              range[1] === range[0]
                ? page.waitForTimeout(MEASURE_MS)
                : gesture(cdp, PHONE, range[1] - range[0], MEASURE_MS)
            )
          )
        }
        await slowDown(cdp, 1)
        // why: the first run warms the scene up; the median of the rest.
        const median = (key: 'fps' | 'draws') =>
          runs
            .slice(1)
            .map(run => run[key])
            .sort((a, b) => a - b)[Math.floor(RUNS / 2)] ?? 0
        const at = await page.locator('html').getAttribute(LITE.attribute)
        expect(median('fps'), `tier: ${at ?? 'full'}`).toBeGreaterThanOrEqual(
          MIN_FPS
        )
        expect(median('draws'), `tier: ${at ?? 'full'}`).toBeGreaterThanOrEqual(
          MIN_FPS
        )
      })
})

test('lite mode draws the solution icons flat', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.mouse.move(700, 450)
  await scrollWindowTo(page, await top(page, '#solucoes ul'))
  const icons = page.locator('#solucoes li [data-glass-icon]')
  await expect(
    page.locator('#solucoes [data-glass-icon][data-ready]')
  ).toHaveCount(6, { timeout: 15_000 })
  const boxes = async () =>
    icons.evaluateAll(all =>
      all.map(icon => {
        const { x, y, width, height } = icon.getBoundingClientRect()
        return { x, y, width, height }
      })
    )
  const before = await boxes()
  await forceLite(page)
  await scrollWindowTo(page, await top(page, '#solucoes ul'))
  await expect(page.locator('#solucoes svg[data-flat-icon]')).toHaveCount(6)
  for (const icon of await icons.all()) {
    await expect(icon.locator('svg[data-flat-icon]')).toBeVisible()
    await expect(icon).not.toHaveAttribute('data-ready', '')
  }
  await expect(page.locator('[data-testid="glass-shelf"]')).toHaveCount(0)
  const after = await boxes()
  expect(after).toHaveLength(before.length)
  after.forEach((box, index) => {
    const was = before[index]
    if (!was) throw new Error(`no box ${index} before lite`)
    for (const key of ['x', 'y', 'width', 'height'] as const)
      expect(Math.abs(box[key] - was[key]), key).toBeLessThanOrEqual(0.5)
  })
})

test('a full-speed visit keeps full quality', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const cdp = await page.context().newCDPSession(page)
  await gesture(cdp, DESKTOP, await top(page, '#contato'), 60_000)
  await expect(page.locator('html')).not.toHaveAttribute(
    LITE.attribute,
    LITE.value
  )
})

/**
 * Loads the page, slows the CPU and goes over the Alcance, back and forth,
 * until the visit has turned lite.
 */
const turnLite = async (page: Page) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const cdp = await page.context().newCDPSession(page)
  const range: [number, number] = [
    await notebookAt(page, 0),
    await notebookAt(page, 1)
  ]
  await scrollWindowTo(page, range[0])
  await slowDown(cdp, SLOWDOWN)
  const html = page.locator('html')
  for (
    let lap = 0;
    lap < 10 && (await html.getAttribute(LITE.attribute)) !== LITE.value;
    lap++
  )
    await gesture(
      cdp,
      DESKTOP,
      lap % 2 ? range[0] - range[1] : range[1] - range[0],
      MEASURE_MS
    )
  await expect(html).toHaveAttribute(LITE.attribute, LITE.value)
  await slowDown(cdp, 1)
  await scrollWindowTo(page, 0)
}

test('lite mode switches on and stays for the visit', async ({ page }) => {
  test.setTimeout(150_000)
  await turnLite(page)
  await page.waitForTimeout(5000)
  await expect(page.locator('html')).toHaveAttribute(LITE.attribute, LITE.value)
  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(4000)
  await expect(page.locator('html')).not.toHaveAttribute(
    LITE.attribute,
    LITE.value
  )
})

/** Buffer px per CSS px of the canvas inside `selector`. */
const ratioOf = (page: Page, selector: string) =>
  page.locator(`${selector} canvas`).evaluate(node => {
    const canvas = node as HTMLCanvasElement
    return canvas.width / canvas.clientWidth
  })

test('lite mode drops the costly effects', async ({ page }) => {
  test.setTimeout(150_000)
  // why: counts the draws each WebGL context makes, by its canvas.
  await page.addInitScript(() => {
    const counts = new WeakMap<HTMLCanvasElement, number>()
    const scope = window as unknown as { glassDraws: () => number }
    for (const proto of [
      WebGLRenderingContext.prototype,
      WebGL2RenderingContext.prototype
    ]) {
      const draw = proto.drawElements
      proto.drawElements = function (...args: Parameters<typeof draw>) {
        const canvas = this.canvas
        if (canvas instanceof HTMLCanvasElement)
          counts.set(canvas, (counts.get(canvas) ?? 0) + 1)
        return draw.apply(this, args)
      }
    }
    scope.glassDraws = () => {
      const canvas = document.querySelector(
        '[data-testid="glass-stage"] canvas'
      )
      return canvas instanceof HTMLCanvasElement
        ? (counts.get(canvas) ?? 0)
        : -1
    }
  })
  await turnLite(page)

  const sky = await page.evaluate(() => ({
    shifted: [...document.querySelectorAll('[data-parallax-slab]')].filter(
      slab => getComputedStyle(slab).transform !== 'none'
    ).length,
    animated: [
      ...document.querySelectorAll(
        '[data-parallax-layer], [data-testid="sections-glow"]'
      )
    ].flatMap(node => node.getAnimations({ subtree: true })).length
  }))
  expect(sky).toEqual({ shifted: 0, animated: 0 })
  await expect(page.locator('[data-testid="notebook-scene"]')).toHaveAttribute(
    'data-effects',
    'lite'
  )
  await expect(page.locator('[data-testid="globe-scene"]')).toHaveAttribute(
    'data-effects',
    'lite'
  )

  expect(await ratioOf(page, '[data-testid="notebook-scene"]')).toBeCloseTo(
    LITE_DPR.notebook,
    1
  )

  await scrollWindowTo(page, await top(page, '#solucoes ul'))
  await page.mouse.move(700, 450)
  await page.waitForTimeout(2000)
  expect(await ratioOf(page, '[data-testid="glass-stage"]')).toBeCloseTo(
    LITE_DPR.glass,
    1
  )
  const draws = () =>
    page.evaluate(() =>
      (window as unknown as { glassDraws: () => number }).glassDraws()
    )
  const before = await draws()
  await page.waitForTimeout(1000)
  expect(await draws(), 'the glass holds still').toBe(before)
})

test('the sky moves on the scroll timeline', async ({ page }) => {
  await page.goto('/')
  const supported = await page.evaluate(() =>
    CSS.supports('animation-timeline: view()')
  )
  expect(supported, 'Chromium has scroll timelines').toBe(true)
  const start = await top(page, '#solucoes')
  await scrollWindowTo(page, start)
  const writes = await page.evaluate(
    ([from, by]) =>
      new Promise<number>(resolve => {
        let count = 0
        const observer = new MutationObserver(records => {
          count += records.length
        })
        for (const slab of document.querySelectorAll('[data-parallax-slab]'))
          observer.observe(slab, {
            attributes: true,
            attributeFilter: ['style']
          })
        let step = 0
        const tick = () => {
          step++
          scrollTo({ top: from + (by * step) / 30, behavior: 'instant' })
          if (step < 30) requestAnimationFrame(tick)
          else
            requestAnimationFrame(() => {
              observer.disconnect()
              resolve(count)
            })
        }
        requestAnimationFrame(tick)
      }),
    [start, 600] as const
  )
  expect(writes).toBe(0)
  const timelines = await page
    .locator('#solucoes')
    .locator('xpath=..')
    .locator('[data-parallax-slab]')
    .evaluateAll(slabs =>
      slabs.map(slab =>
        getComputedStyle(slab).getPropertyValue('animation-timeline')
      )
    )
  for (const timeline of timelines) expect(timeline).toBe('--sky')
})
