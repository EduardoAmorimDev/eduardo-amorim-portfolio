import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures'

const LOREM = /lorem/i
const CLOSE_MS = 300
// why: the checklist's own numbers (C6, C7).
const TRANSITION_MS = 300
const EASING = 'ease-out'
const MID_MS = 150
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

test('leaving an unpinned question starts closing within 300ms', async ({
  page
}) => {
  await page.goto('/')
  const question = questions(page).nth(2)
  await hover(page, question)
  await expect(question).toHaveAttribute('data-state', 'open')

  // why: both moments are taken in page time, so the round trips of the
  // test do not count against the 300 ms; the listeners are in place
  // before the mouse moves.
  await question.evaluate(details => {
    details.addEventListener('pointerleave', () => {
      details.dataset.leftAt ??= String(performance.now())
    })
    new MutationObserver(() => {
      if (details.dataset.state === 'closing')
        details.dataset.closingAt ??= String(performance.now())
    }).observe(details, { attributes: true, attributeFilter: ['data-state'] })
  })
  await leave(page)
  await expect(question).toHaveAttribute('data-closing-at', /\d/)
  const elapsed = await question.evaluate(
    details =>
      Number(details.dataset.closingAt) - Number(details.dataset.leftAt)
  )
  expect(elapsed).toBeGreaterThanOrEqual(0)
  expect(elapsed).toBeLessThanOrEqual(CLOSE_MS)
  await expect(question.locator('p')).toBeHidden()
})

type Run = {
  part: 'answer' | 'plus'
  property: string
  duration: number
  easing: string
  from: string
  to: string
}

/**
 * Records, inside the page and frame by frame, every transition the answer
 * and its "+" start, and the answer's height on each frame; the handle reads
 * the record as it stands.
 */
const recordTransitions = (question: Locator) =>
  question.evaluateHandle(details => {
    const parts = {
      answer: details.querySelector('[data-answer]'),
      plus: details.querySelector('summary [aria-hidden]')
    }
    const record: { runs: Run[]; heights: number[] } = { runs: [], heights: [] }
    const seen = new Set<Animation>()
    const tick = () => {
      for (const [part, element] of Object.entries(parts)) {
        for (const animation of element?.getAnimations() ?? []) {
          if (seen.has(animation) || !(animation instanceof CSSTransition))
            continue
          seen.add(animation)
          const timing = animation.effect?.getTiming()
          const frames =
            animation.effect instanceof KeyframeEffect
              ? animation.effect.getKeyframes()
              : []
          const css = animation.transitionProperty.replace(/-(.)/g, (_, c) =>
            String(c).toUpperCase()
          )
          const value = (index: number) => String(frames.at(index)?.[css] ?? '')
          record.runs.push({
            part: part === 'answer' ? 'answer' : 'plus',
            property: animation.transitionProperty,
            duration: Number(timing?.duration ?? 0),
            easing: String(timing?.easing ?? ''),
            from: value(0),
            to: value(-1)
          })
        }
      }
      record.heights.push(parts.answer?.getBoundingClientRect().height ?? -1)
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    return record
  })

const OPENERS = {
  hover: (page: Page, question: Locator) => hover(page, question),
  click: (_: Page, question: Locator) =>
    question.locator('summary').evaluate(summary => {
      if (summary instanceof HTMLElement) summary.click()
    }),
  Enter: async (page: Page, question: Locator) => {
    await question.locator('summary').focus()
    await page.keyboard.press('Enter')
  }
}

const expectOpening = (runs: Run[]) => {
  for (const [part, property, from, to] of [
    ['answer', 'grid-template-rows', null, null],
    ['answer', 'opacity', '0', '1'],
    ['plus', 'rotate', null, '45deg']
  ] as const) {
    const run = runs.find(
      found => found.part === part && found.property === property
    )
    expect(run, `${part} ${property}`).toBeDefined()
    expect(run?.duration).toBe(TRANSITION_MS)
    expect(run?.easing).toBe(EASING)
    if (from !== null) expect(run?.from).toBe(from)
    if (to !== null) expect(run?.to).toBe(to)
  }
}

test('an opening answer grows and fades in over 300ms, whatever opens it', async ({
  page
}) => {
  for (const [name, open] of Object.entries(OPENERS)) {
    await page.goto('/')
    const question = questions(page).nth(1)
    await question.locator('summary').scrollIntoViewIfNeeded()
    const record = await recordTransitions(question)
    await open(page, question)
    await page.waitForTimeout(TRANSITION_MS * 2)
    const { runs, heights } = await record.jsonValue()
    expectOpening(runs)
    // invariant: from nothing to the answer's height, through heights in
    // between.
    const full = heights.at(-1) ?? 0
    expect(full, name).toBeGreaterThan(20)
    expect(Math.min(...heights), name).toBeLessThan(1)
    expect(
      heights.some(height => height > 1 && height < full - 1),
      `${name} grows gradually`
    ).toBe(true)
  }
})

test('a closing answer shrinks and fades out before it hides', async ({
  page
}) => {
  await page.goto('/')
  const question = questions(page).nth(4)
  await OPENERS.Enter(page, question)
  await expect(question).toHaveAttribute('data-state', 'open')
  await page.waitForTimeout(TRANSITION_MS * 2)
  const record = await recordTransitions(question)
  // why: halfway through the close, measured in page time from its start;
  // the observer is in place before the key is pressed.
  const midway = await question.evaluateHandle((details, wait) => {
    const found: { open?: boolean; height?: number } = {}
    const observer = new MutationObserver(() => {
      if (details.dataset.state !== 'closing') return
      observer.disconnect()
      setTimeout(() => {
        found.open = details instanceof HTMLDetailsElement && details.open
        found.height =
          details.querySelector('[data-answer]')?.getBoundingClientRect()
            .height ?? 0
      }, wait)
    })
    observer.observe(details, {
      attributes: true,
      attributeFilter: ['data-state']
    })
    return found
  }, MID_MS)
  await page.keyboard.press('Enter')
  await expect.poll(async () => (await midway.jsonValue()).open).toBeDefined()
  const middle = await midway.jsonValue()
  expect(middle.open, 'still open halfway').toBe(true)
  expect(middle.height, 'still showing halfway').toBeGreaterThan(0)
  await expect(question).toHaveJSProperty('open', false)
  const { runs } = await record.jsonValue()
  for (const [part, property, to] of [
    ['answer', 'grid-template-rows', null],
    ['answer', 'opacity', '0'],
    ['plus', 'rotate', null]
  ] as const) {
    const run = runs.find(
      found => found.part === part && found.property === property
    )
    expect(run, `${part} ${property}`).toBeDefined()
    expect(run?.duration).toBe(TRANSITION_MS)
    expect(run?.easing).toBe(EASING)
    if (to !== null) expect(run?.to).toBe(to)
  }
  const back = runs.find(run => run.part === 'plus')
  expect(['0deg', 'none']).toContain(back?.to)
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

  test('a tap opens an answer with the same transition', async ({ page }) => {
    await page.goto('/')
    const question = questions(page).nth(2)
    await question.locator('summary').scrollIntoViewIfNeeded()
    const record = await recordTransitions(question)
    await question.locator('summary').tap()
    await page.waitForTimeout(TRANSITION_MS * 2)
    expectOpening((await record.jsonValue()).runs)
  })

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
