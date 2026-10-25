// why: 1px lines every 80px; the whole grid is drawn at 6% opacity, so
// the line colour (--grid-line) can stay a plain theme token.
const GRID = {
  backgroundImage:
    'linear-gradient(to right, var(--grid-line) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)',
  backgroundSize: '80px 80px'
}

/**
 * The static background behind the sections after the hero: a faint grid and
 * two blurred radial glows that stay on screen while the sections scroll.
 * Must be placed inside a container that creates a stacking context.
 */
export const SectionsBackdrop = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 -z-20 overflow-clip"
  >
    <div
      data-testid="sections-grid"
      className="absolute inset-0 opacity-[0.06]"
      style={GRID}
    />
    <div className="sticky top-0 h-svh">
      <div
        data-testid="sections-glow"
        data-glow="primary"
        className="absolute top-[8%] -left-[12%] size-[55vmax] rounded-full opacity-30 blur-[100px]"
        style={{
          backgroundImage:
            'radial-gradient(circle, var(--color-primary), transparent 70%)'
        }}
      />
      <div
        data-testid="sections-glow"
        data-glow="steel"
        className="absolute -right-[14%] bottom-[-20%] size-[50vmax] rounded-full opacity-40 blur-[100px]"
        style={{
          backgroundImage:
            'radial-gradient(circle, var(--color-steel), transparent 70%)'
        }}
      />
    </div>
  </div>
)
