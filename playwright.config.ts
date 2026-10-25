import { defineConfig, devices } from '@playwright/test'

const PORT = 3100

export default defineConfig({
  testDir: './e2e',
  forbidOnly: !!process.env.CI,
  retries: 0,
  // why: every worker renders the hero's WebGL; in parallel they compete for
  // the GPU (or the CPU under SwiftShader) and stretch the measured timings.
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        launchOptions: {
          // why: headless Chromium skips the GPU by default; ANGLE over the
          // system GL renders the hero's WebGL in hardware (~60 fps here), and
          // a machine without a GPU falls back to SwiftShader in software.
          args: [
            '--use-gl=angle',
            '--use-angle=gl',
            '--ignore-gpu-blocklist',
            '--enable-unsafe-swiftshader'
          ]
        }
      }
    }
  ],
  // why: a production build is what ships, and its timing is what the glitch
  // and parallax checks should measure; a fresh build every run means no test
  // ever passes against stale code.
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000
  }
})
