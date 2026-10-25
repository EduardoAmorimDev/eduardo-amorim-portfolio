import { expect, test } from './fixtures'

const isLocal = (url: string) =>
  ['localhost', '127.0.0.1'].includes(new URL(url).hostname)

test('external requests are aborted', async ({ page }) => {
  const reached: string[] = []
  const blocked: string[] = []
  page.on('requestfinished', request => {
    if (request.url().startsWith('http')) reached.push(request.url())
  })
  page.on('requestfailed', request => {
    if (!isLocal(request.url())) blocked.push(request.url())
  })

  await page.goto('/')
  const outcome = await page.evaluate(() =>
    fetch('https://example.com/probe').then(
      () => 'reached',
      () => 'aborted'
    )
  )

  expect(outcome).toBe('aborted')
  expect(blocked).toContain('https://example.com/probe')
  expect(reached.length).toBeGreaterThan(0)
  expect(reached.filter(url => !isLocal(url))).toEqual([])
})
