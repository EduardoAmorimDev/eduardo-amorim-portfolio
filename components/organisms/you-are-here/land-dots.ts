// why: the land mask is an equirectangular 1-bit image of the continents
// (public/textures/land-mask.png, rasterised from Natural Earth's public
// domain 1:110m land); a dot of the globe is land when its pixel is white.
export const LAND_MASK_URL = '/textures/land-mask.png'

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

/** A point on the unit sphere: y up, longitude 0 facing +z. */
export const toSphere = (latitude: number, longitude: number, radius = 1) => {
  const phi = (latitude * Math.PI) / 180
  const lambda = (longitude * Math.PI) / 180
  return [
    radius * Math.cos(phi) * Math.sin(lambda),
    radius * Math.sin(phi),
    radius * Math.cos(phi) * Math.cos(lambda)
  ] as const
}

type Mask = { width: number; height: number; data: Uint8ClampedArray }

const isLand = (mask: Mask, latitude: number, longitude: number) => {
  const x = Math.min(
    mask.width - 1,
    Math.floor(((longitude + 180) / 360) * mask.width)
  )
  const y = Math.min(
    mask.height - 1,
    Math.floor(((90 - latitude) / 180) * mask.height)
  )
  return (mask.data[(y * mask.width + x) * 4] ?? 0) > 127
}

/**
 * Positions (x, y, z per dot) of `count` evenly spread points on the unit
 * sphere (a Fibonacci lattice) that fall on land.
 */
export const landDots = (mask: Mask, count: number) => {
  const positions: number[] = []
  for (let index = 0; index < count; index++) {
    const y = 1 - (2 * (index + 0.5)) / count
    const ring = Math.sqrt(1 - y * y)
    const theta = GOLDEN_ANGLE * index
    const x = Math.cos(theta) * ring
    const z = Math.sin(theta) * ring
    const latitude = (Math.asin(y) * 180) / Math.PI
    const longitude = (Math.atan2(x, z) * 180) / Math.PI
    if (isLand(mask, latitude, longitude)) positions.push(x, y, z)
  }
  return new Float32Array(positions)
}

/** Loads the land mask's pixels; rejects when it cannot be read. */
export const loadLandMask = async (signal?: AbortSignal): Promise<Mask> => {
  const response = await fetch(LAND_MASK_URL, { signal })
  if (!response.ok) throw new Error(`${LAND_MASK_URL}: ${response.status}`)
  const bitmap = await createImageBitmap(await response.blob())
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('2D canvas is not available for the land mask.')
  const { width, height } = bitmap
  context.drawImage(bitmap, 0, 0)
  // invariant: read the size before close(), which zeroes it.
  bitmap.close()
  return { width, height, data: context.getImageData(0, 0, width, height).data }
}
