'use client'
import { useEffect } from 'react'
import { watchPerformance } from '@/lib/performance-tier'
import { useLiteMode } from '@/lib/use-lite-mode'

/** Measures the visit's frame rate and turns it lite when it falls short. */
export const PerformanceWatch = () => {
  const lite = useLiteMode()
  useEffect(() => watchPerformance(), [])
  // hazard: a lite turned before the page finished hydrating can be wiped
  // from <html> by React; once mounted, the attribute is laid again.
  useEffect(() => {
    if (lite) document.documentElement.dataset.performance = 'lite'
  }, [lite])
  return null
}
