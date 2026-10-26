import { expect, test } from './fixtures'
import {
  channels,
  meanLuminance,
  parseColor,
  screenPixels,
  tokenRgb
} from './page-helpers'

const CARDS = [
  '#solucoes li',
  '#cases article',
  '#depoimentos figure',
  '#workflow ol > li'
]
// why: the checklist's own numbers (C69, C70).
const COUNT = 18
const GLASS = { fill: 0.05, edge: 0.1, highlight: 0.2, blur: 'blur(16px)' }
const LIFT = 0.01
const CHANNEL_SLACK = 1

test('cards are frosted glass', async ({ page }) => {
  await page.goto('/')
  const mist = channels(await tokenRgb(page, 'mist'))
  const cards = await page.locator(CARDS.join(', ')).evaluateAll(elements =>
    elements.map(element => {
      const style = getComputedStyle(element)
      return {
        background: style.backgroundColor,
        backdrop: style.backdropFilter,
        edges: [
          style.borderTopWidth,
          style.borderRightWidth,
          style.borderBottomWidth,
          style.borderLeftWidth
        ],
        edge: style.borderTopColor,
        shadow: style.boxShadow
      }
    })
  )
  expect(cards).toHaveLength(COUNT)
  const expectMist = (css: string, alpha: number, label: string) => {
    const colour = parseColor(css)
    colour.rgb.forEach((channel, index) =>
      expect(
        Math.abs(channel - (mist[index] ?? 0)),
        `${label}: ${css}`
      ).toBeLessThanOrEqual(CHANNEL_SLACK)
    )
    expect(colour.alpha, `${label}: ${css}`).toBeCloseTo(alpha, 3)
  }
  for (const card of cards) {
    expectMist(card.background, GLASS.fill, 'fill')
    expect(card.backdrop).toBe(GLASS.blur)
    expect(card.edges).toEqual(['1px', '1px', '1px', '1px'])
    expectMist(card.edge, GLASS.edge, 'edge')
    const inset = /^(.+\)) 0px 1px 0px 0px inset$/.exec(card.shadow)
    expect(
      inset,
      `a 1px highlight along the top: ${card.shadow}`
    ).not.toBeNull()
    expectMist(inset?.[1] ?? '', GLASS.highlight, 'highlight')
  }
})

test('a glow behind a card shows through it', async ({ page }) => {
  await page.goto('/')
  const card = page.locator('#depoimentos figure').nth(1)
  await card.evaluate(element =>
    element.scrollIntoView({ block: 'center', behavior: 'instant' })
  )
  await page.waitForTimeout(300)
  const box = await card.boundingBox()
  if (!box) throw new Error('the card has no box')
  // why: the glows stand still for the measure; the steel one is moved
  // behind the card, then far away, and every other glow stays far away.
  const place = (behind: boolean) =>
    page.evaluate(
      ({ behind, centre }) => {
        const block = document.querySelector('#depoimentos')?.parentElement
        for (const glow of block?.querySelectorAll<HTMLElement>(
          '[data-testid="sections-glow"]'
        ) ?? []) {
          glow.style.animation = 'none'
          glow.style.translate = '0 0'
          const here = glow.getBoundingClientRect()
          const steel = glow.dataset.glow === 'steel'
          glow.style.translate =
            steel && behind
              ? `${centre.x - (here.left + here.width / 2)}px ${centre.y - (here.top + here.height / 2)}px`
              : '300vmax 0'
        }
      },
      {
        behind,
        centre: { x: box.x + box.width / 2, y: box.y + box.height / 2 }
      }
    )
  const lightness = async () => {
    await page.waitForTimeout(200)
    const pixels = await screenPixels(page, box)
    return meanLuminance(pixels, {
      x0: 0,
      x1: pixels.width,
      y0: 0,
      y1: pixels.height
    })
  }
  await place(true)
  const lit = await lightness()
  await place(false)
  const dark = await lightness()
  expect(
    lit - dark,
    `${lit} with the glow, ${dark} without`
  ).toBeGreaterThanOrEqual(LIFT)
})
