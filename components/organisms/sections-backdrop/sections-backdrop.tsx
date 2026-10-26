/**
 * The static background behind the sections after the hero: two blurred
 * radial glows that stay on screen while the sections scroll; no grid, which
 * belongs to the hero alone. Must be placed inside a container that creates
 * a stacking context.
 */
export const SectionsBackdrop = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 -z-20 overflow-clip"
  >
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
