import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { scrollWindowTo } from './page-helpers'

declare global {
  interface Window {
    audioContexts?: AudioContext[]
    oscillators?: number
    audioTap?: AnalyserNode
  }
}

// why: the page keeps its audio private; the test keeps a handle on each
// context built, counts the oscillators made (each star or signal makes
// one), and taps whatever reaches the speakers to read its spectrum.
const watchAudio = () => {
  const Original = window.AudioContext
  window.audioContexts = []
  window.oscillators = 0
  window.AudioContext = class extends Original {
    constructor(options?: AudioContextOptions) {
      super(options)
      window.audioContexts?.push(this)
    }
    createOscillator() {
      window.oscillators = (window.oscillators ?? 0) + 1
      return super.createOscillator()
    }
  }
  const connect = AudioNode.prototype.connect as (
    this: AudioNode,
    ...args: unknown[]
  ) => AudioNode
  AudioNode.prototype.connect = function (this: AudioNode, ...args: unknown[]) {
    if (args[0] instanceof AudioDestinationNode) {
      window.audioTap ??= new AnalyserNode(this.context, { fftSize: 8192 })
      connect.call(this, window.audioTap)
    }
    return connect.apply(this, args)
  } as AudioNode['connect']
}

// why: the ear hears the share of power above 1.5 kHz as hiss ("chuviscado").
const HISS_HZ = 1500
const hissShare = (page: Page) =>
  page.evaluate(async above => {
    const tap = window.audioTap
    if (!tap) return 1
    const bins = new Float32Array(tap.frequencyBinCount)
    let high = 0
    let all = 0
    for (let read = 0; read < 30; read++) {
      await new Promise(resolve => setTimeout(resolve, 100))
      tap.getFloatFrequencyData(bins)
      bins.forEach((db, bin) => {
        const power = 10 ** (db / 10)
        all += power
        if ((bin * tap.context.sampleRate) / tap.fftSize > above) high += power
      })
    }
    return all > 0 ? high / all : 1
  }, HISS_HZ)

const contextState = (page: Page) =>
  page.evaluate(() => window.audioContexts?.[0]?.state ?? 'none')
const oscillators = (page: Page) => page.evaluate(() => window.oscillators ?? 0)
const toggle = (page: Page) =>
  page.getByRole('button', { name: 'Som ambiente' })

const scrollToSection = async (page: Page, id: string) =>
  scrollWindowTo(
    page,
    await page
      .locator(`#${id}`)
      .evaluate(section => section.getBoundingClientRect().top + scrollY)
  )

test('the sound starts off and plays only when asked', async ({ page }) => {
  await page.addInitScript(watchAudio)
  await page.goto('/')
  const button = toggle(page)

  await expect(button).toHaveAttribute('aria-pressed', 'false')
  expect(await contextState(page)).toBe('none')

  await button.click()
  await expect(button).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => contextState(page)).toBe('running')

  await button.click()
  await expect(button).toHaveAttribute('aria-pressed', 'false')
  await expect.poll(() => contextState(page)).toBe('suspended')
})

test('the toggle stays on screen and the sound plays down the whole page', async ({
  page
}) => {
  await page.addInitScript(watchAudio)
  await page.goto('/')
  const button = toggle(page)
  await button.click()
  await expect.poll(() => contextState(page)).toBe('running')

  for (const id of ['notebook', 'contato']) {
    await scrollToSection(page, id)
    await expect(button).toBeInViewport()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(await contextState(page)).toBe('running')
  }
})

test('a silent place schedules nothing; the planet signals once reached', async ({
  page
}) => {
  await page.addInitScript(watchAudio)
  await page.goto('/')
  await toggle(page).click()
  await expect.poll(() => contextState(page)).toBe('running')

  // invariant: in the hero space and the planet are silent and make no star
  // or signal; the planet's first signal comes within 3 s once it plays.
  const atHero = await oscillators(page)
  await page.waitForTimeout(5000)
  expect(await oscillators(page)).toBe(atHero)

  await scrollToSection(page, 'contato')
  await expect
    .poll(() => oscillators(page), { timeout: 10_000 })
    .toBeGreaterThan(atHero)
})

test('space and the planet carry almost no hiss', async ({ page }) => {
  await page.addInitScript(watchAudio)
  await page.goto('/')
  await toggle(page).click()
  await expect.poll(() => contextState(page)).toBe('running')

  const notebook = await page
    .locator('#notebook')
    .evaluate(section => section.getBoundingClientRect().top + scrollY)
  await scrollWindowTo(page, notebook + 2000)
  await page.waitForTimeout(1000)
  const space = await hissShare(page)
  await scrollToSection(page, 'contato')
  await page.waitForTimeout(1000)
  const planet = await hissShare(page)
  // invariant: the first cut's space kept 16% here; its planet 0.6%.
  expect(space, `space's hiss share ${space}`).toBeLessThan(0.01)
  expect(planet, `planet's hiss share ${planet}`).toBeLessThan(0.01)
})

test('a browser that refuses the sound leaves the button off', async ({
  page
}) => {
  await page.addInitScript(() => {
    AudioContext.prototype.resume = () =>
      Promise.reject(new Error('blocked by the test'))
  })
  await page.goto('/')
  await toggle(page).click()

  const button = page.getByRole('button', {
    name: 'Som ambiente indisponível'
  })
  await expect(button).toBeDisabled()
  await expect(button).toHaveAttribute('aria-pressed', 'false')
})
