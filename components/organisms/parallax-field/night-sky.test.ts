import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { dustMotes, farStars, nearStars } from './night-sky.ts'

// invariant: task earth-and-sky, 12: the server and the browser draw the
// same sky, so every draw must come from the seed, never from chance.
test('the sky is the same on every draw', () => {
  assert.deepEqual(farStars(), farStars())
  assert.deepEqual(nearStars(), nearStars())
  assert.deepEqual(dustMotes(), dustMotes())
})

test('the sky draws on no unseeded randomness', async () => {
  const source = await readFile(
    new URL('./night-sky.ts', import.meta.url),
    'utf8'
  )
  assert.doesNotMatch(
    source,
    /Math\.random|crypto\.|Date\.now|performance\.now/
  )
})
