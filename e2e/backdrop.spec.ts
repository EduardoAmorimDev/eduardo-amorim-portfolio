import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { documentTop, scrollWindowTo } from './page-helpers'

// why: the checklist's own numbers (C62–C66).
const GLOW_PATH = { min: 30_000, max: 45_000, reach: 8 }
const GLOW_BREATH = { min: 8000, max: 12_000, swing: 0.1 }
const TWINKLE = { min: 3000, max: 8000, low: 0.25, high: 1, groups: 4 }
// why: one breath per glow, plain numbers (task portfolio-lp-60fps, 10).
const BREATHS = { primary: 'glow-breathe-a', steel: 'glow-breathe-b' }
const STEPS = 48

type Reading = { duration: number; iterations: number; values: string[] }

/**
 * Pauses the element's animation named `name` and reads `property` across
 * one whole run of it, at STEPS + 1 evenly spaced moments.
 */
const sweep = (target: Locator, name: string, property: string) =>
  target.evaluate(
    (element, { name, property, steps }) => {
      const animation = element
        .getAnimations()
        .find(
          found => found instanceof CSSAnimation && found.animationName === name
        )
      if (!animation) throw new Error(`no ${name} animation`)
      const timing = animation.effect?.getComputedTiming()
      const duration = Number(timing?.duration ?? 0)
      const others = element
        .getAnimations()
        .filter(found => found !== animation)
      for (const other of others) other.cancel()
      animation.pause()
      const values: string[] = []
      for (let step = 0; step <= steps; step++) {
        animation.currentTime = (duration * step) / steps
        values.push(getComputedStyle(element).getPropertyValue(property))
      }
      return {
        duration,
        iterations: Number(timing?.iterations ?? 0),
        values
      } satisfies Reading
    },
    { name, property, steps: STEPS }
  )

/** The element's value of `property` with no animation running. */
const still = (target: Locator, property: string) =>
  target.evaluate((element, property) => {
    for (const animation of element.getAnimations()) animation.cancel()
    element.style.animation = 'none'
    return getComputedStyle(element).getPropertyValue(property)
  }, property)

const numbers = (value: string) =>
  [...value.matchAll(/-?[\d.]+/g)].map(match => Number(match[0]))

const atSolutions = async (page: Page) => {
  await page.goto('/')
  await scrollWindowTo(page, await documentTop(page.locator('#solucoes')))
}

test('each glow drifts on a closed path of at most 8vmax', async ({ page }) => {
  await atSolutions(page)
  const vmax = await page.evaluate(
    () => Math.max(innerWidth, innerHeight) / 100
  )
  const glows = page.locator('[data-testid="sections-glow"]')
  // invariant: a pair per block of sections and a pair on the notebook's
  // stage (task reach-and-seams, 8), all drifting alike.
  expect(await glows.count()).toBe(6)
  for (const glow of await glows.all()) {
    const { duration, iterations, values } = await sweep(
      glow,
      'glow-drift',
      'translate'
    )
    expect(duration).toBeGreaterThanOrEqual(GLOW_PATH.min)
    expect(duration).toBeLessThanOrEqual(GLOW_PATH.max)
    expect(iterations).toBe(Infinity)
    const offsets = values.map(value => {
      const [x = 0, y = 0] = numbers(value)
      return Math.hypot(x, y)
    })
    expect(Math.max(...offsets)).toBeLessThanOrEqual(GLOW_PATH.reach * vmax)
    expect(Math.max(...offsets), 'the glow moves').toBeGreaterThan(vmax)
    // invariant: closed means the path ends where it starts: the first and
    // last keyframes match, and just before the end it is back at the start.
    const ends = await glow.evaluate(element => {
      const drift = element
        .getAnimations()
        .find(
          found =>
            found instanceof CSSAnimation &&
            found.animationName === 'glow-drift'
        )
      const frames =
        drift?.effect instanceof KeyframeEffect
          ? drift.effect.getKeyframes()
          : []
      return {
        first: { offset: frames[0]?.offset, translate: frames[0]?.translate },
        last: {
          offset: frames.at(-1)?.offset,
          translate: frames.at(-1)?.translate
        }
      }
    })
    expect(ends.first.offset).toBe(0)
    expect(ends.last.offset).toBe(1)
    expect(ends.first.translate).toBe(ends.last.translate)
    const [x = NaN, y = NaN] = numbers(values[STEPS - 1] ?? '')
    expect(Math.hypot(x, y), 'nearly home at the end').toBeLessThan(vmax)
  }
})

test('each glow breathes ±0.1 around its opacity', async ({ page }) => {
  await atSolutions(page)
  const glows = page.locator('[data-testid="sections-glow"]')
  for (let index = 0; index < (await glows.count()); index++) {
    const kind = await glows.nth(index).getAttribute('data-glow')
    const name = kind === 'primary' || kind === 'steel' ? BREATHS[kind] : ''
    const { duration, iterations, values } = await sweep(
      glows.nth(index),
      name,
      'opacity'
    )
    expect(duration).toBeGreaterThanOrEqual(GLOW_BREATH.min)
    expect(duration).toBeLessThanOrEqual(GLOW_BREATH.max)
    expect(iterations).toBe(Infinity)
    const base = Number(await still(glows.nth(index), 'opacity'))
    const opacities = values.map(Number)
    expect(Math.min(...opacities)).toBeCloseTo(base - GLOW_BREATH.swing, 2)
    expect(Math.max(...opacities)).toBeCloseTo(base + GLOW_BREATH.swing, 2)
  }
  // invariant: plain numbers, so the breath runs on the compositor.
  const texts = await page.evaluate(names => {
    const found: string[] = []
    const walk = (rules: CSSRuleList) => {
      for (const rule of rules) {
        if (rule instanceof CSSKeyframesRule && names.includes(rule.name))
          found.push(rule.cssText)
        if ('cssRules' in rule && rule.cssRules instanceof CSSRuleList)
          walk(rule.cssRules)
      }
    }
    for (const sheet of document.styleSheets) walk(sheet.cssRules)
    return found
  }, Object.values(BREATHS))
  expect(texts).toHaveLength(2)
  for (const text of texts) expect(text).not.toContain('var(')
})

test('far stars twinkle in four groups', async ({ page }) => {
  await atSolutions(page)
  // why: task portfolio-lp-60fps, 9 (in place of earth-and-sky 13's out
  // of step): the stars of 1.5 px or more twinkle with one of four groups.
  const slabs = page.locator('[data-parallax-slab="back"]')
  expect(await slabs.count()).toBeGreaterThan(0)
  for (const slab of await slabs.all())
    expect(
      await slab.locator('[data-twinkle-group]').count()
    ).toBeLessThanOrEqual(TWINKLE.groups)
  const stray = await page.evaluate(
    () =>
      [...document.querySelectorAll('[data-star="far"]')].filter(
        star =>
          star.hasAttribute('data-twinkle') !==
          !!star.closest('[data-twinkle-group]')
      ).length
  )
  expect(stray, 'every twinkling star, and only those, in a group').toBe(0)
  const groups = page
    .locator('#solucoes')
    .locator('xpath=..')
    .locator('[data-parallax-slab="back"]')
    .first()
    .locator('[data-twinkle-group]')
  expect(await groups.count()).toBe(TWINKLE.groups)
  const timings = new Set<string>()
  const periods = new Set<string>()
  for (const group of await groups.all()) {
    const timing = await group.evaluate(element => {
      const { animationDuration, animationDelay } = getComputedStyle(element)
      return { animationDuration, animationDelay }
    })
    periods.add(timing.animationDuration)
    timings.add(timing.animationDelay)
    const { duration, iterations, values } = await sweep(
      group,
      'twinkle',
      'opacity'
    )
    expect(duration).toBeGreaterThanOrEqual(TWINKLE.min)
    expect(duration).toBeLessThanOrEqual(TWINKLE.max)
    expect(iterations).toBe(Infinity)
    // invariant: the star's own brightness (its colour's alpha) dims to a
    // quarter and back with its group.
    const opacities = values.map(Number)
    expect(Math.min(...opacities)).toBeCloseTo(TWINKLE.low, 2)
    expect(Math.max(...opacities)).toBeCloseTo(TWINKLE.high, 2)
  }
  expect(periods.size).toBe(TWINKLE.groups)
  expect(timings.size).toBe(TWINKLE.groups)
})
