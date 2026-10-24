// invariant: one entry per --color-* in the `@theme static` block of
// app/globals.css; lib/color-tokens.test.ts fails when the two drift apart.
export const COLOR_TOKENS = [
  'primary',
  'ink',
  'steel',
  'graphite',
  'ash',
  'mist',
  'smoke',
  'snow'
] as const

export type ColorToken = (typeof COLOR_TOKENS)[number]

type StyleSource = Pick<CSSStyleDeclaration, 'getPropertyValue'>

/**
 * Reads a brand colour from the CSS theme, for code that cannot use Tailwind
 * classes (three.js materials and lights). Client-only: call it after mount,
 * e.g. inside a component rendered by an R3F <Canvas>.
 */
export const readColorToken = (
  token: ColorToken,
  styles: StyleSource = getComputedStyle(document.documentElement)
) => {
  const value = styles.getPropertyValue(`--color-${token}`).trim()
  // hazard: an empty value would turn three.js colours black without a word;
  // fail loudly so a renamed or tree-shaken token is caught at once.
  if (!value) throw new Error(`--color-${token} is not defined in the theme.`)
  return value
}
