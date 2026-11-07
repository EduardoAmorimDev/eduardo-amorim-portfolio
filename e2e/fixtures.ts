import { test as base, expect } from '@playwright/test'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])

// invariant: every spec imports `test` from here, so no e2e request ever
// leaves the machine (constitution VI); the hero's live iframe included.
export const test = base.extend({
  page: async ({ page }, run) => {
    await page.route('**/*', route => {
      const { hostname } = new URL(route.request().url())
      return LOCAL_HOSTS.has(hostname)
        ? route.continue()
        : route.abort('blockedbyclient')
    })
    // invariant: a spec reads the page, not the loading veil over it; every
    // load waits for the veil to lift (loading-veil.tsx). Not under a paused
    // clock, where it lifts as the spec runs the clock on, nor for a load
    // asked to stop at 'commit', as the veil's own spec does to see it.
    let clocked = false
    const install = page.clock.install.bind(page.clock)
    page.clock.install = async (...args) => {
      clocked = true
      return install(...args)
    }
    const goto = page.goto.bind(page)
    page.goto = async (url, options) => {
      const response = await goto(url, options)
      if (!clocked && options?.waitUntil !== 'commit')
        await page
          .locator('[data-loading-veil]')
          .waitFor({ state: 'detached', timeout: 15_000 })
      return response
    }
    await run(page)
  }
})

export { expect }
