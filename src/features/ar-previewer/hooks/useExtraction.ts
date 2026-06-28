import { useCallback } from 'react'
import type { ROI } from '../../roi-editor/types'
import type { Pose, ExtractionResult, ProjectedVertex } from '../types'
import { cropPolygonFromCanvas, downloadImage } from '../utils/imageCrop'

export function useExtraction() {
  const extractROIs = useCallback((
    rois: ROI[],
    projectedROIs: Map<string, ProjectedVertex[]>,
    videoElement: HTMLVideoElement,
    _pose: Pose
  ): ExtractionResult[] => {
    const canvas = document.createElement('canvas')
    canvas.width = videoElement.videoWidth
    canvas.height = videoElement.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return []

    ctx.drawImage(videoElement, 0, 0)
    const fullFrameImageDataUrl = canvas.toDataURL('image/png')
    const results: ExtractionResult[] = []

    for (const roi of rois) {
      const projected = projectedROIs.get(roi.id)
      if (!projected || projected.length < 3) continue

      // Draw the projected polygon on the captured camera frame
ctx.strokeStyle = "red";
ctx.lineWidth = 2;

ctx.beginPath();

projected.forEach((p, i) => {
  if (i === 0) {
    ctx.moveTo(p.screenX, p.screenY);
  } else {
    ctx.lineTo(p.screenX, p.screenY);
  }
});

ctx.closePath();
ctx.stroke();

      const cropCanvas = cropPolygonFromCanvas(canvas, projected)
      // document.body.appendChild(canvas)
      if (!cropCanvas) continue

      const xs = projected.map(v => v.screenX)
      const ys = projected.map(v => v.screenY)

      const minX = Math.min(...xs)
      const minY = Math.min(...ys)
      const maxX = Math.max(...xs)
      const maxY = Math.max(...ys)

      const bbox: [number, number, number, number] = [
        minX,
        minY,
        maxX - minX,
        maxY - minY,
      ]

      results.push({
        roiId: roi.id,
        label: roi.label,
        imageDataUrl: cropCanvas.toDataURL("image/png"),
        width: cropCanvas.width,
        height: cropCanvas.height,
        fullFrameImageDataUrl,
        bbox,
      })
    }
    return results
  }, [])

  const downloadResult = useCallback((result: ExtractionResult) => {
    downloadImage(result.imageDataUrl, `${result.label}.png`)
  }, [])

  return { extractROIs, downloadResult }
}
