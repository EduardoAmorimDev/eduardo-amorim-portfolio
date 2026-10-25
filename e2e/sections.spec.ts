import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { paintedShare } from './page-helpers'

const SECTION_IDS = [
  'hero',
  'prova-social',
  'sobre',
  'solucoes',
  'cases',
  'workflow',
  'depoimentos',
  'faq',
  'contato'
]
const LOREM = /lorem/i
// why: text laid over the scene changes well over this share of its box when
// hidden; a copy painted under the canvas changes next to nothing.
const MIN_PAINTED_SHARE = 0.05

// hazard: the 3D scene is ink in both themes until it follows the theme
// (task T26); on the light theme the ink copy would vanish into it, so the
// paint check runs where theme and scene agree today.
const expectHeroCopyOnFirstScreen = async (page: Page) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const hero = page.locator('#hero')
  const title = hero.locator('h1')
  await expect(title).toHaveAttribute('data-glitch', 'off')
  expect(await page.evaluate(() => scrollY)).toBe(0)

  const viewport = page.viewportSize()
  const canvas = await hero
    .locator('[data-testid="hero-scene"] canvas')
    .boundingBox()
  if (!viewport || !canvas) throw new Error('no viewport or hero canvas')

  const copy = {
    title,
    subtitle: hero.locator('p'),
    cta: hero.getByRole('link', { name: LOREM })
  }
  for (const [name, target] of Object.entries(copy)) {
    await expect(target, name).toHaveCount(1)
    await expect(target, name).toHaveText(LOREM)
    const box = await target.boundingBox()
    if (!box) throw new Error(`${name} has no box`)
    const inside = (outer: {
      x: number
      y: number
      width: number
      height: number
    }) =>
      box.x >= outer.x &&
      box.y >= outer.y &&
      box.x + box.width <= outer.x + outer.width &&
      box.y + box.height <= outer.y + outer.height
    expect(inside({ x: 0, y: 0, ...viewport }), `${name} fits the screen`).toBe(
      true
    )
    expect(inside(canvas), `${name} lies over the canvas`).toBe(true)
    expect(
      await paintedShare(page, target),
      `${name} is painted over the scene`
    ).toBeGreaterThan(MIN_PAINTED_SHARE)
  }
}

test('main has the nine sections in order', async ({ page }) => {
  await page.goto('/')
  const ids = await page
    .locator('main section')
    .evaluateAll(sections => sections.map(section => section.id))
  expect(ids).toEqual(SECTION_IDS)
})

test('every section but hero has an h2 and lorem text', async ({ page }) => {
  await page.goto('/')
  for (const id of SECTION_IDS.filter(id => id !== 'hero')) {
    const section = page.locator(`#${id}`)
    await expect(section.locator('h2'), id).toHaveCount(1)
    await expect(section.locator('h2'), id).toHaveAccessibleName(/\S/)
    expect(
      await section.locator('p').filter({ hasText: LOREM }).count(),
      id
    ).toBeGreaterThan(0)
  }
})

test('hero copy fits the first screen at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await expectHeroCopyOnFirstScreen(page)
})

test('hero copy fits the first screen at 375x667', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await expectHeroCopyOnFirstScreen(page)
})

test('hero CTA scrolls to contato', async ({ page }) => {
  await page.goto('/')
  await page.locator('#hero').getByRole('link', { name: LOREM }).click()
  await expect
    .poll(
      () =>
        page.locator('#contato').evaluate(section => {
          const { top } = section.getBoundingClientRect()
          return top >= 0 && top < innerHeight
        }),
      { timeout: 15_000 }
    )
    .toBe(true)
})

test('contato has heading, text and CTA button', async ({ page }) => {
  await page.goto('/')
  const contato = page.locator('#contato')
  await expect(contato.locator('h2')).toHaveCount(1)
  await expect(contato.locator('p').filter({ hasText: LOREM })).toHaveCount(1)
  await expect(contato.getByRole('button')).toHaveCount(1)
  await expect(contato.getByRole('button')).toHaveText(LOREM)
})

test('social proof shows six placeholder logos', async ({ page }) => {
  await page.goto('/')
  const logos = page.locator('#prova-social').getByRole('img')
  await expect(logos).toHaveCount(6)
  for (const logo of await logos.all()) {
    await expect(logo).toHaveAccessibleName(/exemplo/i)
    // invariant: drawn inline; no image file of a real brand is loaded.
    expect(await logo.evaluate(element => element.tagName)).toBe('svg')
  }
})

test('about shows a photo placeholder and two paragraphs', async ({ page }) => {
  await page.goto('/')
  const about = page.locator('#sobre')
  await expect(about.getByRole('img', { name: /foto/i })).toBeVisible()
  await expect(about.locator('p')).toHaveCount(2)
  await expect(about.locator('p').filter({ hasText: LOREM })).toHaveCount(2)
})

test('solutions shows six cards with icon, title and text', async ({
  page
}) => {
  await page.goto('/')
  const cards = page.locator('#solucoes li')
  await expect(cards).toHaveCount(6)
  for (const card of await cards.all()) {
    await expect(card.locator('svg')).toBeVisible()
    await expect(card.locator('h3')).toHaveText(/\S/)
    await expect(card.locator('p')).toHaveText(LOREM)
  }
})

test('cases shows three cases with image, title, text and three tags', async ({
  page
}) => {
  await page.goto('/')
  const cases = page.locator('#cases article')
  await expect(cases).toHaveCount(3)
  for (const item of await cases.all()) {
    await expect(item.getByRole('img')).toHaveCount(1)
    await expect(item.getByRole('img')).toBeVisible()
    await expect(item.locator('h3')).toHaveText(/\S/)
    await expect(item.locator('p')).toHaveText(LOREM)
    await expect(
      item.getByRole('list', { name: 'Stack' }).locator('li')
    ).toHaveCount(3)
  }
})

test('workflow shows six numbered steps from Discovery to Deploy', async ({
  page
}) => {
  await page.goto('/')
  const steps = page.locator('#workflow ol > li')
  await expect(steps).toHaveCount(6)
  await expect(steps.locator('[data-step-number]')).toHaveText([
    '01',
    '02',
    '03',
    '04',
    '05',
    '06'
  ])
  const titles = steps.locator('h3')
  await expect(titles.first()).toHaveText('Discovery')
  await expect(titles.last()).toHaveText('Deploy')
  for (const title of (await titles.all()).slice(1, -1)) {
    await expect(title).toHaveText(/\S/)
  }
})

test('testimonials shows three quotes with name, role and avatar', async ({
  page
}) => {
  await page.goto('/')
  const quotes = page.locator('#depoimentos figure')
  await expect(quotes).toHaveCount(3)
  for (const quote of await quotes.all()) {
    await expect(quote.locator('blockquote')).toHaveText(LOREM)
    const caption = quote.locator('figcaption')
    await expect(caption.getByRole('img', { name: /avatar/i })).toBeVisible()
    await expect(caption.locator('p')).toHaveCount(2)
    await expect(caption.locator('p').first()).toHaveText(/\S/)
    await expect(caption.locator('p').last()).toHaveText(/\S/)
  }
})

test('faq shows five closed questions', async ({ page }) => {
  await page.goto('/')
  const questions = page.locator('#faq details')
  await expect(questions).toHaveCount(5)
  for (const question of await questions.all()) {
    await expect(question).toHaveJSProperty('open', false)
    await expect(question.locator('summary')).toHaveText(/\S/)
    await expect(question.locator('p')).toBeHidden()
  }
})

test('faq question opens and closes', async ({ page }) => {
  await page.goto('/')
  const question = page.locator('#faq details').nth(1)
  const answer = question.locator('p')
  await expect(answer).toBeHidden()
  await question.locator('summary').click()
  await expect(answer).toBeVisible()
  await expect(answer).toHaveText(LOREM)
  await question.locator('summary').click()
  await expect(answer).toBeHidden()
})
