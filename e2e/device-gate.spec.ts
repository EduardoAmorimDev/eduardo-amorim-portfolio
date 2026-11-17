import type { Page } from '@playwright/test'
import { FULL_GPU, LITE_GPU, expect, test } from './fixtures'
import {
  documentTop,
  gotoStopped,
  notebookAt,
  placeIs,
  scrollWindowTo
} from './page-helpers'

// why: the checklist's own numbers (.checks/portfolio-lp-device-gate.md).
const SCENES = ['#hero', '#notebook', '#contato'] as const
const MAX_DENSITY = 1.01
const PIN_PULSE = { name: 'pin-pulse', ms: 2400 }
const SLOW_CPU = 20
const SLOW_MS = 8000
const NEVER_MS = 15_000
const SETTLE_MS = 1200
// why: a place near the still's pose (Brasília) and one on the far side.
const NEAR_PLACE = { latitude: -15.79, longitude: -47.88, city: 'Brasília' }
const FAR_PLACE = { latitude: 35.68, longitude: 139.69, city: 'Tóquio' }

const PHONE = {
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 3
}

/** Where the page is read on its way down: every scene once on screen. */
const stops = async (page: Page) => [
  0,
  await documentTop(page.locator('#solucoes')),
  await notebookAt(page, 0.3),
  await notebookAt(page, 0.9),
  await documentTop(page.locator('#contato')),
  await page.evaluate(() => document.documentElement.scrollHeight)
]

/** The canvases with a WebGL context, by the test id they sit in. */
const webglCanvases = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('canvas')]
      // invariant: a canvas already holding a WebGL context answers null
      // to '2d'; probing with '2d' never creates a WebGL one.
      .filter(canvas => canvas.getContext('2d') === null)
      .map(
        canvas =>
          canvas.closest('[data-testid]')?.getAttribute('data-testid') ?? '?'
      )
  )

/** Scrolls the page top to bottom; the WebGL canvases seen at each stop. */
const webglAlong = async (page: Page) => {
  const seen: string[] = []
  for (const top of await stops(page)) {
    await scrollWindowTo(page, top)
    await page.waitForTimeout(SETTLE_MS)
    seen.push(...(await webglCanvases(page)))
  }
  return seen
}

const expectScenes = async (page: Page, mode: 'live' | 'still') => {
  for (const scene of SCENES)
    await expect(page.locator(scene), scene).toHaveAttribute('data-scene', mode)
}

/** Device px per image px of the globe's image as laid out now. */
const globeDensity = async (page: Page) => {
  await scrollWindowTo(page, await documentTop(page.locator('#contato')))
  const image = page.locator('[data-testid="globe-still"] img')
  await expect
    .poll(() => image.evaluate(node => (node as HTMLImageElement).complete))
    .toBe(true)
  return image.evaluate(node => {
    const img = node as HTMLImageElement
    const width = Number(/-(\d+)\.webp$/.exec(img.currentSrc)?.[1] ?? 0)
    const height = (width * img.naturalHeight) / img.naturalWidth
    const box = img.getBoundingClientRect()
    return Math.max(box.width / width, box.height / height) * devicePixelRatio
  })
}

/** The globe's box against its section's, and the mask it is drawn under. */
const globeBox = (page: Page) =>
  page.locator('[data-testid="globe-still"]').evaluate(box => {
    const section = box.closest('section')
    if (!section) throw new Error('the globe sits in no section')
    const own = box.getBoundingClientRect()
    const host = section.getBoundingClientRect()
    return {
      rise: host.top - own.top,
      half: innerHeight / 2,
      bottom: host.bottom - own.bottom,
      mask: getComputedStyle(box).maskImage
    }
  })

// C5
test('the check reads its benchmarks from the site', async ({ page }) => {
  const asked: string[] = []
  page.on('request', request => asked.push(request.url()))
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-performance', 'full')
  const benchmarks = asked.filter(url => url.includes('benchmarks'))
  expect(benchmarks).toEqual([
    expect.stringMatching(/^http:\/\/localhost:\d+\/detect-gpu\/benchmarks\//)
  ])
  expect(asked.filter(url => url.includes('unpkg.com'))).toEqual([])
})

// C6
test('nothing mounts before the check answers', async ({ page }) => {
  let release = () => {}
  const held = new Promise<void>(resolve => {
    release = resolve
  })
  await page.route('**/detect-gpu/benchmarks/**', async route => {
    await held
    await route.continue()
  })
  const asked = page.waitForRequest('**/detect-gpu/benchmarks/**')
  await page.goto('/', { waitUntil: 'commit' })
  await asked
  await page.waitForTimeout(500)
  expect(await page.locator('html').getAttribute('data-performance')).toBeNull()
  expect(await page.locator('canvas').count()).toBe(0)
  for (const still of ['hero-still', 'notebook-still', 'globe-still'])
    expect(await page.locator(`[data-testid="${still}"]`).count(), still).toBe(
      0
    )
  await expect(page.locator('[data-loading-veil]')).toBeVisible()
  release()
  await expect(page.locator('html')).toHaveAttribute('data-performance', 'full')
  await expect(page.locator('[data-testid="hero-scene"]')).toHaveCount(1)
})

// C7
test("the check's own context is lost before the tier is told", async ({
  page
}) => {
  // why: only the check asks for WebGL 1 (lib/device-check.ts); the scenes
  // draw in WebGL 2, so this records the check's own release alone.
  await page.addInitScript(() => {
    const scope = window as unknown as { lostWhile: string[] }
    scope.lostWhile = []
    const proto = WebGLRenderingContext.prototype
    const extension = proto.getExtension as (
      this: WebGLRenderingContext,
      name: string
    ) => unknown
    Object.defineProperty(proto, 'getExtension', {
      value: function (this: WebGLRenderingContext, name: string) {
        const found = extension.call(this, name)
        if (name === 'WEBGL_lose_context' && found) {
          const lose = found as WEBGL_lose_context
          const loseContext = lose.loseContext.bind(lose)
          lose.loseContext = () => {
            scope.lostWhile.push(
              document.documentElement.dataset.performance ?? 'pending'
            )
            loseContext()
          }
        }
        return found
      }
    })
  })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-performance', 'full')
  expect(
    await page.evaluate(
      () => (window as unknown as { lostWhile: string[] }).lostWhile
    )
  ).toEqual(['pending'])
})

for (const [tier, gpu] of [
  ['full', FULL_GPU],
  ['lite', LITE_GPU]
] as const)
  test.describe(`on touch in ${tier}`, () => {
    test.use({ ...PHONE, gpu })

    // C8
    test(`on touch no webgl is drawn in ${tier}`, async ({ page }) => {
      test.setTimeout(90_000)
      await page.goto('/')
      await expect(page.locator('html')).toHaveAttribute(
        'data-performance',
        tier
      )
      expect(await webglAlong(page)).toEqual([])
      await expectScenes(page, 'still')
    })
  })

test.describe('the globe image', () => {
  for (const { name, use } of [
    { name: '390x844 at 3x', use: PHONE },
    {
      name: '820x1180 at 2x',
      use: {
        ...PHONE,
        viewport: { width: 820, height: 1180 },
        deviceScaleFactor: 2
      }
    },
    {
      name: '1440x900 at 2x',
      use: {
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
        gpu: LITE_GPU
      }
    }
  ])
    test.describe(name, () => {
      test.use(use)

      // C9
      test(`the globe image fills the canvas's box, sharp, at ${name}`, async ({
        page
      }) => {
        await page.goto('/')
        await page.waitForLoadState('networkidle')
        const density = await globeDensity(page)
        expect(density).toBeGreaterThan(0)
        expect(density).toBeLessThanOrEqual(MAX_DENSITY)
        const box = await globeBox(page)
        expect(box.rise).toBeCloseTo(box.half, 0)
        expect(box.bottom).toBeCloseTo(0, 0)
        expect(box.mask).toContain('linear-gradient')
      })
    })
})

test.describe('the still globe pins', () => {
  test.use(PHONE)

  const pinAt = async (page: Page, place?: Record<string, unknown>) => {
    await placeIs(page, place)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const answered = page.waitForResponse('**/api/onde-estou')
    await scrollWindowTo(page, await documentTop(page.locator('#contato')))
    await answered
    await page.waitForTimeout(300)
    return page.locator('[data-testid="globe-pin"]')
  }

  // C10
  test('the still globe pins a place on its face, with a pulsing ring', async ({
    page
  }) => {
    const pin = await pinAt(page, NEAR_PLACE)
    await expect(pin).toHaveCount(1)
    const ring = await pin.locator('[data-pin-ring]').evaluate(node =>
      node.getAnimations().map(animation => ({
        name: (animation as CSSAnimation).animationName,
        ms: animation.effect?.getComputedTiming().duration
      }))
    )
    expect(ring).toEqual([PIN_PULSE])
    // why: the ring grows to 3.2x its size, as the live pin's does.
    const scales = await pin
      .locator('[data-pin-ring]')
      .evaluate(node =>
        (node.getAnimations()[0]?.effect as KeyframeEffect | undefined)
          ?.getKeyframes()
          .map(frame => frame.scale)
      )
    expect(scales).toEqual(['1', '3.2'])
    // invariant: the pin sits on the globe, inside the image's box.
    const inside = await pin.evaluate(node => {
      const box = node.closest('[data-testid="globe-still"]')
      if (!box) return false
      const at = node.getBoundingClientRect()
      const own = box.getBoundingClientRect()
      return at.left > own.left && at.right < own.right && at.top > own.top
    })
    expect(inside).toBe(true)
  })

  test('the still globe pins no place on its far side', async ({ page }) => {
    const pin = await pinAt(page, FAR_PLACE)
    await expect(pin).toHaveCount(0)
  })

  test.describe('with no place to be found', () => {
    // why: a time zone the lookup has no city for, so with the host's
    // answer empty there is no place at all (lib/visitor-place.ts).
    test.use({ timezoneId: 'UTC' })

    test('the still globe pins nothing without a place', async ({ page }) => {
      const pin = await pinAt(page)
      await expect(page.locator('[data-testid="globe-still"] img')).toHaveCount(
        1
      )
      await expect(pin).toHaveCount(0)
    })
  })

  test.describe('under reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })

    test('the still globe pins with a ring held still', async ({ page }) => {
      const pin = await pinAt(page, NEAR_PLACE)
      await expect(pin).toHaveCount(1)
      expect(
        await pin
          .locator('[data-pin-ring]')
          .evaluate(node => node.getAnimations().length)
      ).toBe(0)
    })
  })
})

test.describe('a globe image that fails', () => {
  test.use(PHONE)

  // C11
  test('a globe image that fails leaves the contact as it reads', async ({
    page
  }) => {
    await page.route('**/stills/globe-*', route => route.abort())
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await scrollWindowTo(page, await documentTop(page.locator('#contato')))
    await page.waitForTimeout(SETTLE_MS)
    await expect(page.locator('[data-testid="globe-still"] img')).toHaveCount(0)
    await expect(page.locator('#contato h2')).toBeVisible()
    await expect(page.locator('#contato button')).toBeVisible()
    await expect(page.locator('#contato')).not.toContainText(/erro|error/i)
  })
})

// C12
test('a full desktop draws every scene live', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-performance', 'full')
  await expectScenes(page, 'live')
  await expect(page.locator('[data-testid="glass-stage"]')).toHaveCount(1)
  expect(await webglAlong(page)).toEqual(
    expect.arrayContaining(['hero-scene', 'notebook-scene', 'globe-scene'])
  )
  // why: the globe keeps its fixed ratio, 1.5 on a 1x screen.
  const ratio = await page
    .locator('[data-testid="globe-scene"] canvas')
    .evaluate(node => {
      const canvas = node as HTMLCanvasElement
      return canvas.width / canvas.clientWidth
    })
  expect(ratio).toBeCloseTo(1.5, 1)
})

// C13
test('a slow full desktop never swaps', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: SLOW_CPU })
  await page.waitForTimeout(SLOW_MS)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  await expect(page.locator('html')).toHaveAttribute('data-performance', 'full')
  await expect(page.locator('#hero')).toHaveAttribute('data-scene', 'live')
  await expect(page.locator('#notebook')).toHaveAttribute('data-scene', 'live')
  await expect(page.locator('#contato')).toHaveAttribute('data-scene', 'live')
  await expect(page.locator('[data-testid="hero-scene"]')).toHaveCount(1)
  await expect(page.locator('[data-testid="hero-still"]')).toHaveCount(0)
})

test.describe('lite on a desktop', () => {
  test.use({ gpu: LITE_GPU })

  // C14
  test('lite draws no webgl and keeps the system pointer', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute(
      'data-performance',
      'lite'
    )
    expect(await webglAlong(page)).toEqual([])
    await expectScenes(page, 'still')
    await scrollWindowTo(page, await documentTop(page.locator('#solucoes')))
    await page.mouse.move(700, 450)
    await page.mouse.move(720, 460)
    await page.waitForTimeout(500)
    await expect(page.locator('[data-testid="glass-stage"]')).toHaveCount(0)
    await expect(page.locator('html')).not.toHaveClass(/glass-cursor/)
    expect(
      await page.evaluate(
        () =>
          getComputedStyle(document.elementFromPoint(720, 460) ?? document.body)
            .cursor
      )
    ).not.toBe('none')
  })

  // C15
  test('lite stills the page', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('html')).not.toHaveClass(/\blenis\b/)
    const blurred = await page
      .locator('.glass-card')
      .evaluateAll(
        cards =>
          cards.filter(card => getComputedStyle(card).backdropFilter !== 'none')
            .length
      )
    expect(blurred).toBe(0)
    const twinkling = await page.evaluate(
      () =>
        [...document.querySelectorAll('[data-parallax-layer]')].flatMap(layer =>
          layer.getAnimations({ subtree: true })
        ).length
    )
    expect(twinkling).toBe(0)
    await scrollWindowTo(page, await documentTop(page.locator('#solucoes')))
    await expect(page.locator('#solucoes svg[data-flat-icon]')).toHaveCount(6)
  })

  // C16
  test('lite never glitches', async ({ page }) => {
    await gotoStopped(page, 100)
    await expect(page.locator('html')).toHaveAttribute(
      'data-performance',
      'lite'
    )
    const heading = page.locator('#workflow h2')
    const log = await heading.evaluateHandle(element => {
      const values: (string | undefined)[] = []
      new MutationObserver(() => values.push(element.dataset.glitch)).observe(
        element,
        { attributes: true, attributeFilter: ['data-glitch'] }
      )
      return values
    })
    await heading.evaluate(element =>
      element.scrollIntoView({ block: 'center', behavior: 'instant' })
    )
    await page.waitForTimeout(300)
    await page.clock.runFor(NEVER_MS)
    expect(await log.jsonValue()).not.toContain('on')
  })

  // C17
  test('lite keeps the alcance story', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await scrollWindowTo(page, await notebookAt(page, 0.96))
    await page.waitForTimeout(SETTLE_MS * 2)
    const shown = await page
      .locator('#notebook [data-shot]')
      .evaluateAll(shots =>
        shots
          .filter(shot => (shot as HTMLElement).style.visibility === 'visible')
          .map(shot => shot.getAttribute('data-shot'))
      )
    expect(shown).toEqual(['laptop'])
    const box = await page
      .locator('#notebook [data-shot="laptop"]')
      .evaluate(node => node.getBoundingClientRect().toJSON())
    expect(box.left).toBeLessThan(0)
    expect(box.top).toBeLessThan(0)
    expect(box.right).toBeGreaterThan(1440)
    expect(box.bottom).toBeGreaterThan(900)
  })
})
