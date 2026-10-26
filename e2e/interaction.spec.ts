import { expect, test } from './fixtures'

const TEXT = 'h1, h2, h3, p, li, span, blockquote, figcaption'
const CONTROLS = 'button, a[href], summary'
// why: long enough for the controls' colour transitions to finish.
const HOVER_MS = 400

test('text takes the default cursor and no selection', async ({ page }) => {
  await page.goto('/')
  const wrong = await page.evaluate(
    ({ text, controls }) =>
      [...document.querySelectorAll(text)]
        .filter(element => !element.closest(controls))
        .flatMap(element => {
          const { cursor, userSelect } = getComputedStyle(element)
          return cursor === 'default' && userSelect === 'none'
            ? []
            : [`${element.tagName} ${cursor} ${userSelect}`]
        }),
    { text: TEXT, controls: CONTROLS }
  )
  expect(wrong).toEqual([])
})

test('a triple click selects no text', async ({ page }) => {
  await page.goto('/')
  const paragraph = page.locator('#sobre p').first()
  await paragraph.scrollIntoViewIfNeeded()
  await paragraph.click({ clickCount: 3 })
  expect(await page.evaluate(() => getSelection()?.toString() ?? '')).toBe('')
})

test('every control shows the pointer cursor', async ({ page }) => {
  await page.goto('/')
  const found = await page.evaluate(controls => {
    const all = [...document.querySelectorAll(controls)]
    return {
      count: all.length,
      wrong: all
        .flatMap(control => [control, ...control.querySelectorAll('*')])
        .flatMap(element => {
          const { cursor } = getComputedStyle(element)
          return cursor === 'pointer' ? [] : [`${element.tagName} ${cursor}`]
        })
    }
  }, CONTROLS)
  expect(found.count).toBeGreaterThan(0)
  expect(found.wrong).toEqual([])
})

test('every control changes on hover', async ({ page }) => {
  await page.goto('/')
  const controls = page.locator(CONTROLS)
  const count = await controls.count()
  expect(count).toBeGreaterThan(0)
  const colours = (index: number) =>
    controls.nth(index).evaluate(element => {
      const { color, backgroundColor } = getComputedStyle(element)
      return { color, backgroundColor }
    })
  for (let index = 0; index < count; index++) {
    const control = controls.nth(index)
    await control.scrollIntoViewIfNeeded()
    await page.mouse.move(1, 1)
    await page.waitForTimeout(HOVER_MS)
    const rest = await colours(index)
    await control.hover()
    await page.waitForTimeout(HOVER_MS)
    const hovered = await colours(index)
    expect(hovered, `${await control.textContent()} changes`).not.toEqual(rest)
  }
})
