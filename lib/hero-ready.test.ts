import assert from 'node:assert/strict'
import { test } from 'node:test'

// why: the module reads `window` when called; an EventTarget stands in.
Object.assign(globalThis, { window: new EventTarget() })
const { markHeroReady, onHeroReady } = await import('./hero-ready.ts')

test('a wait set before the first frame hears it once; one set after, at once', () => {
  let early = 0
  onHeroReady(() => early++)
  const cancelled = onHeroReady(() => assert.fail('a cancelled wait ran'))
  cancelled()
  markHeroReady()
  markHeroReady()
  assert.equal(early, 1)
  let late = 0
  onHeroReady(() => late++)
  assert.equal(late, 1)
})
