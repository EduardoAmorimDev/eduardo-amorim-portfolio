'use client'
import { useEffect } from 'react'
import { checkThisDevice } from '@/lib/device-check'
import { useTier } from '@/lib/use-lite-mode'

/** Decides the visit's tier once, on load (lib/device-check.ts). */
export const DeviceCheck = () => {
  const tier = useTier()
  useEffect(() => {
    void checkThisDevice()
  }, [])
  // hazard: a tier marked before the page finished hydrating can be wiped
  // from <html> by React; once mounted, the attribute is laid again.
  useEffect(() => {
    if (tier) document.documentElement.dataset.performance = tier
  }, [tier])
  return null
}
