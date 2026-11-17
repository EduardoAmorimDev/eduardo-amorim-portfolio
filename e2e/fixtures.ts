import { test as base, expect, type Page } from '@playwright/test'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])

// why: the device check (lib/device-check.ts) reads the GPU's name; a
// spec states the GPU it runs on rather than inherit this machine's, so
// the tier is the same on every machine. A GPU detect-gpu benchmarks well
// over 60 fps gives the full tier; a blocklisted one, lite.
export const FULL_GPU =
  'ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0, D3D11)'
export const LITE_GPU = 'Google SwiftShader'

/** Makes every later load of `page` report `renderer` as its GPU. */
export const reportGpu = (page: Page, renderer: string) =>
  page.addInitScript(name => {
    // invariant: WEBGL_debug_renderer_info's UNMASKED_RENDERER_WEBGL.
    const UNMASKED_RENDERER = 0x9246
    for (const context of [WebGLRenderingContext, WebGL2RenderingContext]) {
      const read = context.prototype.getParameter
      context.prototype.getParameter = function (parameter: number) {
        return parameter === UNMASKED_RENDERER
          ? name
          : read.call(this, parameter)
      }
    }
  }, renderer)

// invariant: every spec imports `test` from here, so no e2e request ever
// leaves the machine (constitution VI); the hero's live iframe included.
export const test = base.extend<{ gpu: string }>({
  gpu: [FULL_GPU, { option: true }],
  page: async ({ page, gpu }, run) => {
    await reportGpu(page, gpu)
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
