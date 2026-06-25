import type { ProjectedVertex } from '../types'

export function cropPolygonFromCanvas(
  ctx: CanvasRenderingContext2D,
  projectedVertices: ProjectedVertex[],
  _width: number,
  _height: number
): ImageData | null {
  if (projectedVertices.length < 3) return null

  // Compute bounding box of the projected polygon
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const v of projectedVertices) {
    if (v.screenX < minX) minX = v.screenX
    if (v.screenY < minY) minY = v.screenY
    if (v.screenX > maxX) maxX = v.screenX
    if (v.screenY > maxY) maxY = v.screenY
  }

  const bboxWidth = Math.ceil(maxX - minX)
  const bboxHeight = Math.ceil(maxY - minY)
  if (bboxWidth <= 0 || bboxHeight <= 0) return null

  // Get image data for just the bounding box
  const imageData = ctx.getImageData(Math.floor(minX), Math.floor(minY), bboxWidth, bboxHeight)
  return imageData
}

export function downloadImage(dataUrl: string, filename: string): void {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
