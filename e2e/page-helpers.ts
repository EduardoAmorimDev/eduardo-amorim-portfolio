import type { Locator, Page } from '@playwright/test'
import type { ColorToken } from '../lib/color-tokens'

/** The computed `rgb(...)` of a theme colour token, as the browser paints it. */
export const tokenRgb = (page: Page, token: ColorToken) =>
  page.evaluate(name => {
    const probe = document.createElement('span')
    probe.style.color = `var(--color-${name})`
    document.body.append(probe)
    const { color } = getComputedStyle(probe)
    probe.remove()
    return color
  }, token)

// why: scroll events and the work they trigger run in the frame's rendering
// steps; after two frames every scroll listener has seen the new position.
export const nextFrames = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  )

/** Scrolls the window instantly (Lenis follows native scrolls) and settles. */
export const scrollWindowTo = async (page: Page, top: number) => {
  await page.evaluate(
    y => window.scrollTo({ top: y, behavior: 'instant' }),
    top
  )
  await nextFrames(page)
}

/** Document y of an element's top edge. */
export const documentTop = (target: Locator) =>
  target.evaluate(element => element.getBoundingClientRect().top + scrollY)

/**
 * Share of the target's box whose pixels change when the target is hidden.
 * Near 0 means something else is painted over it; text and buttons laid on
 * top change a clear share of their box.
 */
export const paintedShare = async (page: Page, target: Locator) => {
  const box = await target.boundingBox()
  if (!box) throw new Error('target has no box to compare')
  // why: a handle, because a role locator stops matching once its target is
  // hidden from the accessibility tree.
  const element = await target.elementHandle()
  const shown = await page.screenshot({ clip: box })
  await element.evaluate(node => {
    node.style.visibility = 'hidden'
  })
  const hidden = await page.screenshot({ clip: box })
  await element.evaluate(node => {
    node.style.visibility = ''
  })
  await element.dispose()
  const sources = [shown, hidden].map(
    png => `data:image/png;base64,${png.toString('base64')}`
  )
  return page.evaluate(async ([withTarget, withoutTarget]) => {
    const pixels = async (source: string) => {
      const image = new Image()
      image.src = source
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext('2d')
      if (!context) throw new Error('no 2D context to read the screenshot')
      context.drawImage(image, 0, 0)
      return context.getImageData(0, 0, image.width, image.height).data
    }
    const [a, b] = await Promise.all([
      pixels(withTarget),
      pixels(withoutTarget)
    ])
    let changed = 0
    for (let index = 0; index < a.length; index += 4) {
      const delta = Math.max(
        Math.abs(a[index] - b[index]),
        Math.abs(a[index + 1] - b[index + 1]),
        Math.abs(a[index + 2] - b[index + 2])
      )
      if (delta > 48) changed++
    }
    return changed / (a.length / 4)
  }, sources)
}
