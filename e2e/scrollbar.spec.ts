import { expect, test } from './fixtures'

// why: the user, 2026-11-06: no scrollbar over the sky. Headless Chromium
// hides scrollbars itself, so the rule is read, not the pixels.
test('the page shows no scrollbar yet still scrolls', async ({ page }) => {
  await page.goto('/')
  const html = page.locator('html')
  await expect(html).toHaveCSS('scrollbar-width', 'none')
  await expect(page.locator('body')).toHaveCSS('scrollbar-width', 'none')
  await page.evaluate(() => window.scrollTo({ top: 1200, behavior: 'instant' }))
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0)
})
