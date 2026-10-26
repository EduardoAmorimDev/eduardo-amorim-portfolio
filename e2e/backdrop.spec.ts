import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { documentTop, scrollWindowTo } from './page-helpers'

// why: the checklist's own numbers (C62–C66).
const GLOW_PATH = { min: 30_000, max: 45_000, reach: 8 }
const GLOW_BREATH = { min: 8000, max: 12_000, swing: 0.1 }
const TWINKLE = { min: 3000, max: 8000, low: 0.25, high: 1, distinct: 5 }
const PULSE = { duration: 12_000, low: 0.95, high: 1.05 }
const SWAY = { duration: 14_000, angle: 6 }
const STEPS = 48
const SLACK = 0.01

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
  expect(await glows.count()).toBe(4)
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
    expect(values[0]).toBe(values.at(-1))
  }
})

test('each glow breathes ±0.1 around its opacity', async ({ page }) => {
  await atSolutions(page)
  const glows = page.locator('[data-testid="sections-glow"]')
  for (let index = 0; index < (await glows.count()); index++) {
    const { duration, iterations, values } = await sweep(
      glows.nth(index),
      'glow-breathe',
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
})

test('back-layer dots twinkle out of step', async ({ page }) => {
  await atSolutions(page)
  const dots = page.locator('[data-parallax-layer="back"] [data-dot]')
  expect(await dots.count()).toBeGreaterThan(10)
  const timings = await dots.evaluateAll(elements =>
    elements.map(element => {
      const { animationDuration, animationDelay } = getComputedStyle(element)
      return `${animationDuration} ${animationDelay}`
    })
  )
  const periods = new Set<string>()
  const phases = new Set<string>()
  for (const timing of timings) {
    const [period = '', phase = ''] = timing.split(' ')
    periods.add(period)
    phases.add(phase)
  }
  expect(periods.size).toBeGreaterThanOrEqual(TWINKLE.distinct)
  expect(phases.size).toBeGreaterThanOrEqual(TWINKLE.distinct)
  for (const dot of (await dots.all()).slice(0, 6)) {
    const { duration, iterations, values } = await sweep(
      dot,
      'twinkle',
      'opacity'
    )
    expect(duration).toBeGreaterThanOrEqual(TWINKLE.min)
    expect(duration).toBeLessThanOrEqual(TWINKLE.max)
    expect(iterations).toBe(Infinity)
    const opacities = values.map(Number)
    expect(Math.min(...opacities)).toBeCloseTo(TWINKLE.low, 2)
    expect(Math.max(...opacities)).toBeCloseTo(TWINKLE.high, 2)
  }
})

test('rings pulse', async ({ page }) => {
  await atSolutions(page)
  const rings = page.locator('[data-parallax-layer="back"] [data-ring]')
  expect(await rings.count()).toBeGreaterThan(0)
  for (const ring of await rings.all()) {
    const { duration, iterations, values } = await sweep(
      ring,
      'ring-pulse',
      'scale'
    )
    expect(duration).toBe(PULSE.duration)
    expect(iterations).toBe(Infinity)
    const scales = values.map(value => numbers(value)[0] ?? 1)
    expect(Math.min(...scales)).toBeCloseTo(PULSE.low, 2)
    expect(Math.max(...scales)).toBeCloseTo(PULSE.high, 2)
  }
})

test('mid shapes sway as they float', async ({ page }) => {
  await atSolutions(page)
  const shapes = page.locator('[data-parallax-layer="mid"] [data-mid-shape]')
  expect(await shapes.count()).toBeGreaterThan(0)
  for (const shape of await shapes.all()) {
    const floats = await shape
      .locator('svg')
      .evaluate(svg =>
        svg
          .getAnimations()
          .some(
            found =>
              found instanceof CSSAnimation && found.animationName === 'float'
          )
      )
    expect(floats, 'still floats').toBe(true)
    const { duration, iterations, values } = await sweep(
      shape,
      'sway',
      'rotate'
    )
    expect(duration).toBe(SWAY.duration)
    expect(iterations).toBe(Infinity)
    const angles = values.map(value => numbers(value)[0] ?? 0)
    expect(Math.min(...angles)).toBeGreaterThanOrEqual(-SWAY.angle - SLACK)
    expect(Math.max(...angles)).toBeLessThanOrEqual(SWAY.angle + SLACK)
    expect(Math.max(...angles) - Math.min(...angles)).toBeCloseTo(
      2 * SWAY.angle,
      1
    )
  }
})
