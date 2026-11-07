import { expect, test } from './fixtures'

const veil = '[data-loading-veil]'
// why: the script waits 6 s at most (loading-veil.tsx), then fades 0.6 s.
const LIFTED_BY_MS = 8000

test('the veil comes with the page and lifts once the hero is drawn', async ({
  page,
  request
}) => {
  const html = await (await request.get('/')).text()
  expect(html).toContain('data-loading-veil="loading"')
  expect(html).toContain('M31 48H48V79H79V95H31Z')

  await page.goto('/', { waitUntil: 'commit' })
  await expect(page.locator(veil)).toHaveCount(0, { timeout: LIFTED_BY_MS })
  await expect(page.locator('html')).toHaveCSS('overflow', 'visible')
})

test('a hero that never draws still lets the veil lift', async ({ page }) => {
  // invariant: the hero's first-frame signal (lib/hero-ready.ts) is lost,
  // as on a GPU that never draws it; the page itself runs on.
  await page.addInitScript(() => {
    const dispatch = window.dispatchEvent.bind(window)
    window.dispatchEvent = event =>
      event.type === 'hero-ready' ? true : dispatch(event)
  })
  await page.goto('/', { waitUntil: 'commit' })
  await page.waitForTimeout(3000)
  await expect(page.locator(veil)).toHaveAttribute(
    'data-loading-veil',
    'loading'
  )
  await expect(page.locator(veil)).toHaveCount(0, { timeout: LIFTED_BY_MS })
  await expect(page.locator('#hero')).toBeVisible()
})

test.describe('without scripts', () => {
  test.use({ javaScriptEnabled: false })

  test('the veil lifts on its own', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' })
    await expect(page.locator(veil)).toBeVisible()
    await expect(page.locator(veil)).toBeHidden({ timeout: 10_000 })
  })
})
