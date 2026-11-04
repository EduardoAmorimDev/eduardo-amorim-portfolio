import { Section } from '@/components/molecules/section'

// why: the first and last steps are named by the task (T9); the ones in
// between are still open (task Unresolved 10), so they stay lorem.
const STEPS = [
  'Discovery',
  'Lorem ipsum',
  'Dolor sit',
  'Amet consectetur',
  'Adipiscing elit',
  'Deploy'
]

// why: on wide screens the line runs down the middle and the steps take
// turns on either side of it (task reach-and-seams, 19); odd steps (index
// 0, 2, 4) on the left, read towards the line.
const SIDE = {
  left: 'lg:mr-auto lg:pr-16 lg:pl-0 lg:text-right',
  right: 'lg:ml-auto lg:pl-16'
}
const MARKER_SIDE = {
  left: 'lg:right-0 lg:left-auto lg:translate-x-1/2',
  right: 'lg:left-0 lg:-translate-x-1/2'
}

/** How the work goes: one node per step on a single line, in order. */
export const Workflow = () => (
  <Section
    id="workflow"
    eyebrow="Workflow"
    title="Lorem ipsum dolor sit amet"
    intro="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec ullamcorper nulla non metus auctor."
  >
    <div className="relative mt-16">
      <div
        aria-hidden="true"
        data-timeline-line
        className="from-primary to-steel absolute top-5 bottom-5 left-5 w-px -translate-x-1/2 bg-linear-to-b lg:left-1/2"
      />
      <ol className="relative">
        {STEPS.map((title, index) => {
          const side = index % 2 === 0 ? 'left' : 'right'
          return (
            <li
              key={title}
              data-side={side}
              className={`relative pb-12 pl-16 last:pb-0 lg:w-1/2 ${SIDE[side]}`}
            >
              <span
                data-step-number
                className={`border-primary bg-background font-display text-body text-mist absolute top-0 left-5 grid size-10 -translate-x-1/2 place-items-center rounded-full border shadow-[0_0_24px_rgb(from_var(--color-primary)_r_g_b/45%)] ${MARKER_SIDE[side]}`}
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="text-title-sm pt-1.5 font-semibold">{title}</h3>
              <p className="text-body-sm text-foreground/70 mt-2">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
                eiusmod tempor.
              </p>
            </li>
          )
        })}
      </ol>
    </div>
  </Section>
)
