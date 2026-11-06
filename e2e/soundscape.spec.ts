import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { scrollWindowTo } from './page-helpers'

declare global {
  interface Window {
    audioContexts?: AudioContext[]
    bufferSources?: number
  }
}

// why: the page keeps its AudioContext private; the test keeps a handle on
// each one built, to read whether the sound is really running, and counts
// the buffer sources made, as each typed key on the planet makes one.
const watchAudio = () => {
  const Original = window.AudioContext
  window.audioContexts = []
  window.bufferSources = 0
  window.AudioContext = class extends Original {
    constructor(options?: AudioContextOptions) {
      super(options)
      window.audioContexts?.push(this)
    }
    createBufferSource() {
      window.bufferSources = (window.bufferSources ?? 0) + 1
      return super.createBufferSource()
    }
  }
}

const contextState = (page: Page) =>
  page.evaluate(() => window.audioContexts?.[0]?.state ?? 'none')
const bufferSources = (page: Page) =>
  page.evaluate(() => window.bufferSources ?? 0)
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

test('the planet types only once the visitor reaches it', async ({ page }) => {
  await page.addInitScript(watchAudio)
  await page.goto('/')
  await toggle(page).click()
  await expect.poll(() => contextState(page)).toBe('running')

  // invariant: in the hero the planet is silent and queues no key; its first
  // typist starts within 4 s and keys every 0.2 s at most once it plays.
  const atHero = await bufferSources(page)
  await page.waitForTimeout(5000)
  expect(await bufferSources(page)).toBe(atHero)

  await scrollToSection(page, 'contato')
  await expect
    .poll(() => bufferSources(page), { timeout: 10_000 })
    .toBeGreaterThan(atHero)
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
