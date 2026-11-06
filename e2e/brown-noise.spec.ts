import { expect, test } from './fixtures'

declare global {
  interface Window {
    audioContexts?: AudioContext[]
  }
}

// why: the page keeps its AudioContext private; the test keeps a handle on
// each one built, to read whether the sound is really running.
const watchAudioContexts = () => {
  const Original = window.AudioContext
  window.audioContexts = []
  window.AudioContext = class extends Original {
    constructor(options?: AudioContextOptions) {
      super(options)
      window.audioContexts?.push(this)
    }
  }
}

const contextState = (page: import('@playwright/test').Page) =>
  page.evaluate(() => window.audioContexts?.[0]?.state ?? 'none')

test('the brown noise starts off and plays only when asked', async ({
  page
}) => {
  await page.addInitScript(watchAudioContexts)
  await page.goto('/')
  const button = page.getByRole('button', { name: 'Ruído marrom' })

  await expect(button).toHaveAttribute('aria-pressed', 'false')
  expect(await contextState(page)).toBe('none')

  await button.click()
  await expect(button).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => contextState(page)).toBe('running')

  await button.click()
  await expect(button).toHaveAttribute('aria-pressed', 'false')
  await expect.poll(() => contextState(page)).toBe('suspended')
})

test('a browser that refuses the sound leaves the button off', async ({
  page
}) => {
  await page.addInitScript(() => {
    AudioContext.prototype.resume = () =>
      Promise.reject(new Error('blocked by the test'))
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Ruído marrom' }).click()

  const button = page.getByRole('button', { name: 'Ruído marrom indisponível' })
  await expect(button).toBeDisabled()
  await expect(button).toHaveAttribute('aria-pressed', 'false')
})
