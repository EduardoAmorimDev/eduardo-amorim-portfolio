import { PLANET } from './space'

// why: the rim of the reference, in the brand's colours (task space, 6): a
// thin mist line on the edge over a primary band fading inwards, and a
// primary glow fading outwards; the body is ink, as the page below it.
const ATMOSPHERE = {
  backgroundImage: [
    'radial-gradient(circle closest-side,',
    'var(--color-ink) calc(100% - 44px),',
    'color-mix(in oklab, var(--color-primary) 60%, var(--color-ink)) calc(100% - 4px),',
    'var(--color-mist) calc(100% - 1px),',
    'transparent 100%)'
  ].join(' '),
  boxShadow: [
    '0 0 70px 10px rgb(from var(--color-primary) r g b / 40%)',
    '0 0 16px 2px rgb(from var(--color-mist) r g b / 30%)'
  ].join(', ')
}

/**
 * The silhouette of a planet closing the hero: a circle PLANET.radius hero
 * widths wide whose top sits PLANET.top down it, lit along its rim. It lies
 * over the sky and the black hole and under the copy; its ink body runs on
 * into the page below.
 */
export const HeroPlanet = () => (
  <div
    aria-hidden="true"
    data-testid="hero-planet"
    className="pointer-events-none absolute inset-0 overflow-clip"
  >
    <div
      className="bg-ink absolute left-1/2 aspect-square -translate-x-1/2 rounded-full"
      style={{
        ...ATMOSPHERE,
        top: `${PLANET.top * 100}%`,
        width: `${PLANET.radius * 2 * 100}%`
      }}
    />
  </div>
)
