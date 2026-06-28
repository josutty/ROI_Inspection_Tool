import type { ProjectedVertex } from '../types'

export function cropPolygonFromCanvas(
  sourceCanvas: HTMLCanvasElement,
  projectedVertices: ProjectedVertex[]
): HTMLCanvasElement | null {
  if (projectedVertices.length < 3) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const v of projectedVertices) {
    minX = Math.min(minX, v.screenX)
    minY = Math.min(minY, v.screenY)
    maxX = Math.max(maxX, v.screenX)
    maxY = Math.max(maxY, v.screenY)
  }

  const left = Math.max(0, Math.floor(minX))
  const top = Math.max(0, Math.floor(minY))
  const right = Math.min(sourceCanvas.width, Math.ceil(maxX))
  const bottom = Math.min(sourceCanvas.height, Math.ceil(maxY))

  const width = right - left
  const height = bottom - top

  if (width <= 0 || height <= 0) return null

  const cropCanvas = document.createElement("canvas")
  cropCanvas.width = width
  cropCanvas.height = height

  const cropCtx = cropCanvas.getContext("2d")
  if (!cropCtx) return null

  cropCtx.beginPath()

  projectedVertices.forEach((v, i) => {
    const x = v.screenX - left
    const y = v.screenY - top

    if (i === 0) {
      cropCtx.moveTo(x, y)
    } else {
      cropCtx.lineTo(x, y)
    }
  })

  cropCtx.closePath()
  cropCtx.clip()

  cropCtx.drawImage(
    sourceCanvas,
    left,
    top,
    width,
    height,
    0,
    0,
    width,
    height
  )

  return cropCanvas
}

export function downloadImage(dataUrl: string, filename: string): void {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
