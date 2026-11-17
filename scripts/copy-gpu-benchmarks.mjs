// Copies detect-gpu's benchmark tables into public/, so the device check
// (lib/device-check.ts) reads them from the site itself, never from a CDN
// (task portfolio-lp-device-gate, 1). Runs before `dev` and `build`, from
// the version installed, so the tables always match the library.
import { cp, rm } from 'node:fs/promises'

const FROM = new URL(
  '../node_modules/detect-gpu/dist/benchmarks/',
  import.meta.url
)
const TO = new URL('../public/detect-gpu/benchmarks/', import.meta.url)

await rm(TO, { recursive: true, force: true })
await cp(FROM, TO, { recursive: true })
