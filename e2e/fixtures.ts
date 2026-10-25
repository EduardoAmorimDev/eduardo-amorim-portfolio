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
    await run(page)
  }
})

export { expect }
