import { brownNoise, whiteNoise } from '@/lib/brown-noise'

/** What the page asks for: a loop's length in samples, at its rate. */
export type NoiseRequest = { length: number; sampleRate: number }
/** The loops the layers are made of: the rumble and plain white noise. */
export type NoiseReply = {
  rumble: Float32Array<ArrayBuffer>
  white: Float32Array<ArrayBuffer>
}

// why: a million samples cost tens of ms, far more on a slow phone, where a
// stall on the main thread drops the page to lite; built here, they cost
// the page nothing, and their buffers move back without a copy.
addEventListener('message', (event: MessageEvent<unknown>) => {
  const request = event.data
  if (
    typeof request !== 'object' ||
    request === null ||
    !('length' in request) ||
    !('sampleRate' in request) ||
    typeof request.length !== 'number' ||
    typeof request.sampleRate !== 'number'
  )
    return
  const reply: NoiseReply = {
    rumble: brownNoise(request.length, request.sampleRate),
    white: whiteNoise(request.length)
  }
  postMessage(reply, { transfer: [reply.rumble.buffer, reply.white.buffer] })
})
