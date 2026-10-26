import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures'

const LOREM = /lorem/i
const CLOSE_MS = 300
// why: long enough for a stray close, which happens on the next render, to
// have landed; well past CLOSE_MS.
const HOLD_MS = 600

const questions = (page: Page) => page.locator('#faq details')

/** Puts the mouse over a question's summary. */
const hover = async (page: Page, question: Locator) => {
  await question.locator('summary').scrollIntoViewIfNeeded()
  const box = await question.locator('summary').boundingBox()
  if (!box) throw new Error('the question has no box')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
}

/** Moves the mouse to the page's top left, away from every question. */
const leave = (page: Page) => page.mouse.move(2, 2, { steps: 4 })

test('faq shows five closed questions', async ({ page }) => {
  await page.goto('/')
  await expect(questions(page)).toHaveCount(5)
  for (const question of await questions(page).all()) {
    await expect(question).toHaveJSProperty('open', false)
    await expect(question.locator('summary')).toHaveText(/\S/)
    await expect(question.locator('p')).toBeHidden()
  }
})

test('faq question opens and closes', async ({ page }) => {
  await page.goto('/')
  const question = questions(page).nth(1)
  const answer = question.locator('p')
  await expect(answer).toBeHidden()
  await question.locator('summary').click()
  await expect(answer).toBeVisible()
  await expect(answer).toHaveText(LOREM)
  await question.locator('summary').click()
  await expect(answer).toBeHidden()
})

test('hovering a question opens it', async ({ page }) => {
  await page.goto('/')
  const question = questions(page).nth(2)
  await expect(question.locator('p')).toBeHidden()
  await hover(page, question)
  await expect(question.locator('p')).toBeVisible()
  await expect(question.locator('p')).toHaveText(LOREM)
})

test('leaving an unpinned question closes it within 300ms', async ({
  page
}) => {
  await page.goto('/')
  const question = questions(page).nth(2)
  await hover(page, question)
  await expect(question).toHaveJSProperty('open', true)

  // why: both moments are taken in page time, so the round trips of the
  // test do not count against the 300 ms; the listeners are in place
  // before the mouse moves.
  await question.evaluate(details => {
    details.addEventListener('pointerleave', () => {
      details.dataset.leftAt ??= String(performance.now())
    })
    new MutationObserver(() => {
      if (!(details as HTMLDetailsElement).open)
        details.dataset.closedAt ??= String(performance.now())
    }).observe(details, { attributes: true, attributeFilter: ['open'] })
  })
  await leave(page)
  await expect(question).toHaveAttribute('data-closed-at', /\d/)
  const elapsed = await question.evaluate(
    details => Number(details.dataset.closedAt) - Number(details.dataset.leftAt)
  )
  expect(elapsed).toBeGreaterThanOrEqual(0)
  expect(elapsed).toBeLessThanOrEqual(CLOSE_MS)
  await expect(question.locator('p')).toBeHidden()
})

test('clicking a question keeps it open after the pointer leaves', async ({
  page
}) => {
  await page.goto('/')
  const question = questions(page).nth(3)
  await hover(page, question)
  await expect(question).toHaveJSProperty('open', true)
  await page.mouse.down()
  await page.mouse.up()
  await leave(page)
  await page.waitForTimeout(HOLD_MS)
  await expect(question).toHaveJSProperty('open', true)
  await expect(question.locator('p')).toBeVisible()
})

test('clicking a pinned question closes it', async ({ page }) => {
  await page.goto('/')
  const question = questions(page).nth(3)
  await hover(page, question)
  await page.mouse.down()
  await page.mouse.up()
  await expect(question).toHaveJSProperty('open', true)
  // invariant: the mouse never leaves; the second click alone closes it.
  await page.mouse.down()
  await page.mouse.up()
  await expect(question).toHaveJSProperty('open', false)
  await expect(question.locator('p')).toBeHidden()
})

test('hovering another question keeps the pinned one open', async ({
  page
}) => {
  await page.goto('/')
  const pinned = questions(page).nth(0)
  const other = questions(page).nth(2)
  await hover(page, pinned)
  await page.mouse.down()
  await page.mouse.up()
  await hover(page, other)
  await expect(other.locator('p')).toBeVisible()
  await page.waitForTimeout(HOLD_MS)
  await expect(pinned).toHaveJSProperty('open', true)
  await expect(pinned.locator('p')).toBeVisible()
})

test('Enter and Space toggle a question from the keyboard', async ({
  page
}) => {
  await page.goto('/')
  const question = questions(page).nth(4)
  await question.locator('summary').focus()
  await page.keyboard.press('Enter')
  await expect(question).toHaveJSProperty('open', true)
  await page.waitForTimeout(HOLD_MS)
  await expect(question).toHaveJSProperty('open', true)
  await page.keyboard.press('Space')
  await expect(question).toHaveJSProperty('open', false)
})

test('a question exposes whether it is expanded', async ({ page }) => {
  await page.goto('/')
  const question = questions(page).nth(1)
  // why: the "+" beside the question is aria-hidden, so the accessible name
  // is the question's own text node alone.
  const name = await question
    .locator('summary')
    .evaluate(summary => summary.firstChild?.textContent?.trim() ?? '')
  expect(name).toMatch(/\S/)
  const session = await page.context().newCDPSession(page)
  const expanded = async () => {
    const { nodes } = await session.send('Accessibility.getFullAXTree')
    const found = nodes.filter(
      node =>
        typeof node.name?.value === 'string' &&
        node.name.value.trim() === name &&
        node.properties?.some(property => property.name === 'expanded')
    )
    expect(found, `one node named ${name} with an expanded state`).toHaveLength(
      1
    )
    return found[0]?.properties?.find(property => property.name === 'expanded')
      ?.value.value
  }

  expect(await expanded()).toBe(false)
  await question.locator('summary').focus()
  await page.keyboard.press('Enter')
  await expect(question).toHaveJSProperty('open', true)
  expect(await expanded()).toBe(true)
})

test.describe('touch', () => {
  test.use({ hasTouch: true })

  test('a tap toggles a question without hover', async ({ page }) => {
    await page.goto('/')
    const question = questions(page).nth(2)
    await question.locator('summary').scrollIntoViewIfNeeded()
    await question.locator('summary').tap()
    await expect(question).toHaveJSProperty('open', true)
    await page.waitForTimeout(HOLD_MS)
    await expect(question.locator('p')).toBeVisible()
    await question.locator('summary').tap()
    await expect(question).toHaveJSProperty('open', false)
  })
})
