import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { COLOR_TOKENS, readColorToken } from './color-tokens.ts'

const themeColors = async () => {
  const css = await readFile(
    new URL('../app/globals.css', import.meta.url),
    'utf8'
  )
  const block = css.match(/@theme static\s*{([^}]*)}/)
  assert.ok(block, 'globals.css has an @theme static block')
  return [...block[1].matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6});/g)].map(
    ([, name]) => name
  )
}

test('COLOR_TOKENS lists exactly the colours of the static theme', async () => {
  assert.deepEqual(await themeColors(), [...COLOR_TOKENS])
})

test('readColorToken returns the trimmed CSS value of the token', () => {
  const styles = {
    getPropertyValue: (name: string) =>
      name === '--color-primary' ? ' #3f30f1 ' : ''
  }
  assert.equal(readColorToken('primary', styles), '#3f30f1')
})

test('readColorToken fails loudly when the token is missing', () => {
  const styles = { getPropertyValue: () => '' }
  assert.throws(
    () => readColorToken('ink', styles),
    /--color-ink is not defined/
  )
})
