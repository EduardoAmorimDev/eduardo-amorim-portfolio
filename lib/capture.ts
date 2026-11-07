/**
 * What scripts/render-stills.mjs is rendering (`?capture=hero|devices|floor`),
 * or null on a real visit: the scenes stay live for it, and the notebook
 * leaves out the part that is not being shot.
 */
export type CaptureTarget = 'hero' | 'devices' | 'floor'

const isTarget = (value: string | null): value is CaptureTarget =>
  value === 'hero' || value === 'devices' || value === 'floor'

export const captureTarget = (): CaptureTarget | null => {
  if (typeof location === 'undefined') return null
  const target = new URLSearchParams(location.search).get('capture')
  return isTarget(target) ? target : null
}
