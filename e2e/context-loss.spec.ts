import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import {
  documentTop,
  notebookAt,
  paintedShare,
  scrollWindowTo
} from './page-helpers'

// why: the user, 2026-11-05: after passing the devices and coming back,
// they vanished for good; a WebGL context the browser dropped was restored
// onto a scene three left blank. lib/use-canvas-recovery.ts rebuilds it.
const RESTORE_WAIT_MS = 1000
const MIN_PAINTED = 0.02

type Scene = {
  name: string
  testId: string
  at: (page: Page) => Promise<number>
}

const SCENES: Scene[] = [
  { name: 'the hero', testId: 'hero-scene', at: async () => 0 },
  {
    name: 'the Alcance',
    testId: 'notebook-scene',
    at: page => notebookAt(page, 0.62)
  },
  {
    name: 'the globe',
    testId: 'globe-scene',
    at: async page => (await documentTop(page.locator('#contato'))) - 200
  }
]

for (const { name, testId, at } of SCENES)
  test(`${name} draws again after the browser drops its WebGL context`, async ({
    page
  }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await scrollWindowTo(page, await at(page))
    await page.waitForTimeout(2500)
    const canvas = page.locator(`[data-testid="${testId}"] canvas`)
    expect(await paintedShare(page, canvas)).toBeGreaterThan(MIN_PAINTED)

    const supported = await canvas.evaluate(node => {
      const element = node as HTMLCanvasElement
      const gl = element.getContext('webgl2') ?? element.getContext('webgl')
      const lose = gl?.getExtension('WEBGL_lose_context')
      if (!lose) return false
      element.dataset.lost = ''
      lose.loseContext()
      return true
    })
    expect(supported, 'the browser can drop a context on demand').toBe(true)

    await page.waitForTimeout(RESTORE_WAIT_MS + 1500)
    await expect(
      page.locator(`[data-testid="${testId}"] canvas[data-lost]`),
      'the lost canvas is replaced'
    ).toHaveCount(0)
    expect(await paintedShare(page, canvas)).toBeGreaterThan(MIN_PAINTED)
  })
