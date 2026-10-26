import { expect, test } from './fixtures'
import { gotoHero } from './page-helpers'

const DECORATIONS = [
  '[data-testid="hero-grid"]',
  '[data-testid="hero-lens"]',
  '[data-lens="outline"]',
  '[data-glitch-copy]'
]

test('decorations are hidden and each title is read once', async ({ page }) => {
  await gotoHero(page)
  for (const selector of DECORATIONS) {
    const found = page.locator(selector)
    expect(await found.count(), selector).toBeGreaterThan(0)
    for (const element of await found.all())
      await expect(element, selector).toHaveAttribute('aria-hidden', 'true')
  }
  for (const heading of await page.locator('h1, h2').all()) {
    const text = await heading.evaluate(
      element => element.firstChild?.textContent ?? ''
    )
    expect(text).toMatch(/\S/)
    await expect(heading).toHaveAccessibleName(text)
  }
  // invariant: the title's outline lies outside the <h1>, so the title is
  // named by its own text alone.
  await expect(page.locator('#hero h1 [data-lens]')).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
})

test('the hero scene is hidden from assistive tech', async ({ page }) => {
  await gotoHero(page)
  await expect(page.locator('[data-testid="hero-scene"]')).toHaveAttribute(
    'aria-hidden',
    'true'
  )
  // invariant: the hero's accessibility tree holds its copy and nothing
  // else: the title, the subtitle and the CTA.
  const tree = await page.locator('#hero').ariaSnapshot()
  const roles = tree
    .split('\n')
    .map(line => line.trim().replace(/^- /, '').split(/[ :"]/)[0])
    .filter(Boolean)
  expect(roles).toEqual(['heading', 'paragraph', 'link', '/url'])
})
