import { expect, test } from './fixtures'

// invariant: a browser that allows sound on entry (its policy, or a visitor
// who allowed this site) plays the soundscape with no gesture at all, as
// headless Chromium does; soundscape.spec.ts plays the stricter policy.

test('where the browser allows it, the sound plays on entry', async ({
  page
}) => {
  await page.addInitScript(() => {
    const Original = window.AudioContext
    const contexts: AudioContext[] = []
    Object.assign(window, { audioContexts: contexts })
    window.AudioContext = class extends Original {
      constructor(options?: AudioContextOptions) {
        super(options)
        contexts.push(this)
      }
    }
  })
  await page.goto('/')
  const state = () =>
    page.evaluate(
      () =>
        (window as unknown as { audioContexts?: AudioContext[] })
          .audioContexts?.[0]?.state ?? 'none'
    )
  await expect.poll(state).toBe('running')
  await expect(
    page.getByRole('button', { name: 'Som ambiente' })
  ).toHaveAttribute('aria-pressed', 'true')
})
