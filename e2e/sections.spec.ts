import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures'
import {
  atContato,
  paintedShare,
  placeIs,
  scrollWindowTo
} from './page-helpers'

const SECTION_IDS = [
  'hero',
  'prova-social',
  'sobre',
  'solucoes',
  'notebook',
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

const expectHeroCopyOnFirstScreen = async (page: Page) => {
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

test('main has the ten sections in order', async ({ page }) => {
  await page.goto('/')
  const ids = await page
    .locator('main section')
    .evaluateAll(sections => sections.map(section => section.id))
  expect(ids).toEqual(SECTION_IDS)
})

// why: contato's and sobre's copy is final (tasks you-are-here, 5, and
// swallow-and-copy, 15–16), the rest still lorem.
test('every section but hero, notebook, sobre and contato has an h2 and lorem text', async ({
  page
}) => {
  await page.goto('/')
  for (const id of SECTION_IDS.filter(
    id => !['hero', 'notebook', 'sobre', 'contato'].includes(id)
  )) {
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

test('hero copy fits the first screen at 1024x768', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  await expectHeroCopyOnFirstScreen(page)
})

test('hero copy fits the first screen at 768x1024', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 })
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

// why: the copy is fixed, whatever the place (task reach-and-seams, 20).
const CONTATO = {
  title: 'Posso trazer um horizonte de possibilidades até você',
  lead: 'Você viu onde podemos chegar. Já sabemos nosso ponto de partida.',
  choice: 'A escolha é sua...',
  call: 'Vamos conversar'
}

const expectContatoCopy = async (contato: Locator) => {
  await expect(contato.locator('span').first()).toHaveText('Contato')
  await expect(contato.locator('h2')).toHaveCount(1)
  await expect(contato.locator('h2')).toHaveAccessibleName(CONTATO.title)
  const text = contato.locator('p')
  await expect(text).toHaveText([CONTATO.lead, CONTATO.choice])
  await expect(contato.getByRole('button')).toHaveCount(1)
  await expect(contato.getByRole('button')).toHaveText(CONTATO.call)
}

test('contato: the invitation, with a city found', async ({ page }) => {
  // why: a synthetic place, as Vercel's headers would give it.
  await placeIs(page, { latitude: -25.43, longitude: -49.27, city: 'Curitiba' })
  const contato = await atContato(page)
  await expectContatoCopy(contato)
  await expect(contato).not.toContainText('Curitiba')
  await expect(contato.locator('[data-testid="globe-scene"]')).toHaveCount(1)
})

test.describe('a place guessed from the time zone', () => {
  test.use({ timezoneId: 'America/Sao_Paulo' })

  test('contato: the same invitation, near the visitor', async ({ page }) => {
    await placeIs(page)
    const contato = await atContato(page)
    await expectContatoCopy(contato)
    await expect(contato).not.toContainText('São Paulo')
  })
})

test.describe('no place at all', () => {
  // why: a real zone that the 52-zone table does not list.
  test.use({ timezoneId: 'Pacific/Galapagos' })

  test('contato: the same invitation, with no place', async ({ page }) => {
    await placeIs(page)
    await expectContatoCopy(await atContato(page))
  })
})

test('contato: the same invitation while the place is on its way', async ({
  page
}) => {
  let answer = () => {}
  const held = new Promise<void>(resolve => {
    answer = resolve
  })
  await page.route('**/api/onde-estou', async route => {
    await held
    await route.fulfill({ status: 204 })
  })
  await page.goto('/')
  const contato = page.locator('#contato')
  const asked = page.waitForRequest('**/api/onde-estou')
  await scrollWindowTo(
    page,
    await contato.evaluate(
      section => section.getBoundingClientRect().top + scrollY
    )
  )
  await asked
  await expectContatoCopy(contato)
  answer()
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

// why: the copy is the author's, word for word (task swallow-and-copy, 15–17).
const ABOUT = {
  title: 'A cara por trás do resultado',
  first: /^Meu nome é Eduardo Amorim\. Sou engenheiro full stack/,
  last: /^Além do código.*por onde quer que passe\.$/
}

test('about introduces Eduardo beside the photo placeholder', async ({
  page
}) => {
  await page.goto('/')
  const about = page.locator('#sobre')
  await expect(about.locator('span').first()).toHaveText('Sobre')
  await expect(about.locator('h2')).toHaveAccessibleName(ABOUT.title)
  await expect(about.getByRole('img', { name: /foto/i })).toBeVisible()
  await expect(about.locator('p')).toHaveCount(2)
  await expect(about.locator('p').first()).toHaveText(ABOUT.first)
  await expect(about.locator('p').last()).toHaveText(ABOUT.last)
  await expect(about.locator('p').filter({ hasText: LOREM })).toHaveCount(0)
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

test('no horizontal scroll at 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const height = await page.evaluate(
    () => document.documentElement.scrollHeight
  )
  // why: every screen down the page, so a section wider than the phone is
  // caught wherever it sits.
  for (let top = 0; top < height; top += 667) {
    await scrollWindowTo(page, top)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
      `at ${top}px`
    ).toBeLessThanOrEqual(375)
  }
})
