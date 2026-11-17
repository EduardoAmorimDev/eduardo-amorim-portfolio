import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'

type Shape = {
  name: string
  shot?: { width: number; height: number; lift: number }
  srcset: { src: string; w: number }[]
}

const manifest = JSON.parse(
  readFileSync(new URL('./stills.json', import.meta.url), 'utf8')
) as { globe?: Shape[] }

test('every globe shape is listed and on disk', () => {
  const globe = manifest.globe ?? []
  assert.deepEqual(globe.map(shape => shape.name).sort(), [
    'phone',
    'tablet',
    'wide'
  ])
  for (const shape of globe) {
    assert.ok(shape.shot, `${shape.name} records the window it was shot in`)
    assert.ok(shape.srcset.length > 0, `${shape.name} has sources`)
    for (const { src } of shape.srcset)
      assert.ok(
        existsSync(new URL(`../public${src}`, import.meta.url)),
        `${src} is on disk`
      )
  }
})
