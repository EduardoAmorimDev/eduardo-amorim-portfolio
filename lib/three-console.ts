import { setConsoleFunction } from 'three'

// hazard: @react-three/fiber 9.8.2, the latest stable, builds a THREE.Clock
// in every canvas, which three deprecated in r183, so each canvas warned.
// Three's own console hook drops that one notice and passes every other
// message through unchanged. Delete this file once r3f's stable release
// uses THREE.Timer (its 10.0 canaries do).
const R3F_CLOCK_NOTICE = 'THREE.Clock: This module has been deprecated'

setConsoleFunction((type, message, ...params) => {
  if (type === 'warn' && message.startsWith(R3F_CLOCK_NOTICE)) return
  console[type](message, ...params)
})
