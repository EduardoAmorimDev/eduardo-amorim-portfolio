import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import {
  COLOR_TOKENS,
  THEME_COLORS,
  readColorToken,
  readThemeColor
} from './color-tokens.ts'

const globalsCss = () =>
  readFile(new URL('../app/globals.css', import.meta.url), 'utf8')

const themeColors = async () => {
  const css = await globalsCss()
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

test('THEME_COLORS lists exactly the variables of the light theme', async () => {
  const css = await globalsCss()
  const block = css.match(/^:root\s*{([^}]*)}/m)
  assert.ok(block, 'globals.css has a top-level :root block')
  const names = [...block[1].matchAll(/--([a-z-]+):/g)].map(([, name]) => name)
  assert.deepEqual(names, [...THEME_COLORS])
})

test('every theme colour points at a brand colour token', async () => {
  const css = await globalsCss()
  const tokens: readonly string[] = COLOR_TOKENS
  for (const [, name, token] of css.matchAll(
    /--(background|foreground|glitch-a|glitch-b|grid-line):\s*var\(--color-([a-z]+)\);/g
  ))
    assert.ok(token === 'white' || tokens.includes(token), `${name}: ${token}`)
})

test('readThemeColor returns the trimmed value of the theme variable', () => {
  const styles = {
    getPropertyValue: (name: string) =>
      name === '--grid-line' ? ' #4a5477' : ''
  }
  assert.equal(readThemeColor('grid-line', styles), '#4a5477')
  assert.throws(
    () => readThemeColor('background', styles),
    /--background is not defined/
  )
})
