import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { scrollWindowTo } from './page-helpers'

declare global {
  interface Window {
    audioContexts?: AudioContext[]
    automations?: number
    audioTap?: AnalyserNode
  }
}

// why: the page keeps its audio private; the test keeps a handle on each
// context built, counts the changes scheduled on the audio clock (each of the
// planet's breaths writes some), and taps what reaches the speakers.
// hazard: headless Chromium plays audio with no gesture whatever its flags,
// so the policy most browsers keep for a first visit is played here: before
// the visitor's first gesture a context is held suspended and a resume
// hangs; after it, both behave as usual. The gesture is a real press, tap or
// key: Playwright's evaluate counts as user activation, so that is not read.
const watchAudio = () => {
  const Original = window.AudioContext
  let gestured = false
  for (const type of ['pointerdown', 'pointerup', 'touchend', 'keydown'])
    window.addEventListener(
      type,
      event => {
        if (event.isTrusted) gestured = true
      },
      { capture: true }
    )
  const allowed = () => gestured
  window.audioContexts = []
  window.automations = 0
  window.AudioContext = class extends Original {
    constructor(options?: AudioContextOptions) {
      super(options)
      window.audioContexts?.push(this)
      // invariant: headless Chromium starts a context on its own, a moment
      // after it is built; until a gesture, every such start is undone.
      const hold = () => {
        if (!allowed() && this.state === 'running') void super.suspend()
      }
      this.addEventListener('statechange', hold)
      hold()
    }
    resume() {
      return allowed() ? super.resume() : new Promise<void>(() => undefined)
    }
  }
  const setTarget = AudioParam.prototype.setTargetAtTime
  AudioParam.prototype.setTargetAtTime = function (...args) {
    window.automations = (window.automations ?? 0) + 1
    return setTarget.apply(this, args)
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
const automations = (page: Page) => page.evaluate(() => window.automations ?? 0)
const toggle = (page: Page) =>
  page.getByRole('button', { name: 'Som ambiente' })
// why: a click on the hero's empty corner, the visitor's first gesture.
const gesture = (page: Page) => page.mouse.click(8, 8)

const scrollToSection = async (page: Page, id: string) =>
  scrollWindowTo(
    page,
    await page
      .locator(`#${id}`)
      .evaluate(section => section.getBoundingClientRect().top + scrollY)
  )

test('the sound is on by default and starts at the first gesture', async ({
  page
}) => {
  await page.addInitScript(watchAudio)
  await page.goto('/')
  const button = toggle(page)

  // invariant: the sound asks to play on entry and is held until a gesture,
  // the toggle reading on all the while.
  await expect(button).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => contextState(page)).toBe('suspended')

  await gesture(page)
  await expect.poll(() => contextState(page)).toBe('running')
  await expect(button).toHaveAttribute('aria-pressed', 'true')

  await button.click()
  await expect(button).toHaveAttribute('aria-pressed', 'false')
  await expect.poll(() => contextState(page)).toBe('suspended')

  await button.click()
  await expect(button).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => contextState(page)).toBe('running')
})

test('a first press on the toggle mutes the sound before it plays', async ({
  page
}) => {
  await page.addInitScript(watchAudio)
  await page.goto('/')
  const button = toggle(page)
  await button.click()
  await expect(button).toHaveAttribute('aria-pressed', 'false')
  // invariant: the resume asked on entry never overrides the mute.
  await page.waitForTimeout(1500)
  expect(await contextState(page)).not.toBe('running')

  await button.click()
  await expect(button).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => contextState(page)).toBe('running')
})

test('the toggle stays on screen and the sound plays down the whole page', async ({
  page
}) => {
  await page.addInitScript(watchAudio)
  await page.goto('/')
  const button = toggle(page)
  await gesture(page)
  await expect.poll(() => contextState(page)).toBe('running')

  for (const id of ['notebook', 'contato']) {
    await scrollToSection(page, id)
    await expect(button).toBeInViewport()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(await contextState(page)).toBe('running')
  }
})

test('a silent place schedules nothing; the planet breathes once reached', async ({
  page
}) => {
  await page.addInitScript(watchAudio)
  await page.goto('/')
  await gesture(page)
  await expect.poll(() => contextState(page)).toBe('running')

  // invariant: held still in the hero, nothing writes to the audio clock
  // once the first mix is set (the layers are built when the browser idles);
  // held still at the contact, the planet breathes every 7 to 10.5 s.
  await expect.poll(() => automations(page)).toBeGreaterThan(0)
  const atHero = await automations(page)
  await page.waitForTimeout(5000)
  expect(await automations(page)).toBe(atHero)

  await scrollToSection(page, 'contato')
  await page.waitForTimeout(1000)
  const atContato = await automations(page)
  await expect
    .poll(() => automations(page), { timeout: 12_000 })
    .toBeGreaterThan(atContato)
})

test('space and the planet carry almost no hiss', async ({ page }) => {
  await page.addInitScript(watchAudio)
  await page.goto('/')
  await gesture(page)
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
  // invariant: the first cut's space kept 16% here.
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
  await gesture(page)

  const button = page.getByRole('button', {
    name: 'Som ambiente indisponível'
  })
  await expect(button).toBeDisabled()
  await expect(button).toHaveAttribute('aria-pressed', 'false')
})
