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

// invariant: one entry per variable in the `:root` block of app/globals.css;
// each maps to a brand colour that switches with prefers-color-scheme.
export const THEME_COLORS = [
  'background',
  'foreground',
  'glitch-a',
  'glitch-b',
  'grid-line'
] as const

export type ThemeColor = (typeof THEME_COLORS)[number]

type StyleSource = Pick<CSSStyleDeclaration, 'getPropertyValue'>

const readVariable = (name: string, styles: StyleSource) => {
  const value = styles.getPropertyValue(name).trim()
  // hazard: an empty value would turn three.js colours black without a word;
  // fail loudly so a renamed or tree-shaken token is caught at once.
  if (!value) throw new Error(`${name} is not defined in the theme.`)
  return value
}

/**
 * Reads a brand colour from the CSS theme, for code that cannot use Tailwind
 * classes (three.js materials and lights). Client-only: call it after mount,
 * e.g. inside a component rendered by an R3F <Canvas>.
 */
export const readColorToken = (
  token: ColorToken,
  styles: StyleSource = getComputedStyle(document.documentElement)
) => readVariable(`--color-${token}`, styles)

/**
 * Reads a colour of the active theme (light or dark), as the browser resolves
 * it right now. Client-only, like readColorToken.
 */
export const readThemeColor = (
  name: ThemeColor,
  styles: StyleSource = getComputedStyle(document.documentElement)
) => readVariable(`--${name}`, styles)
