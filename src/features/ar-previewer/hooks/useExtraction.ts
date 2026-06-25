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

      const imageData = cropPolygonFromCanvas(ctx, projected, canvas.width, canvas.height)
      if (imageData) {
        const cropCanvas = document.createElement('canvas')
        cropCanvas.width = imageData.width
        cropCanvas.height = imageData.height
        const cropCtx = cropCanvas.getContext('2d')
        if (cropCtx) {
          cropCtx.putImageData(imageData, 0, 0)
          const xs = projected.map(v => v.screenX)
          const ys = projected.map(v => v.screenY)
          const minX = Math.min(...xs)
          const minY = Math.min(...ys)
          const maxX = Math.max(...xs)
          const maxY = Math.max(...ys)
          const bbox: [number, number, number, number] = [minX, minY, maxX - minX, maxY - minY]
          results.push({
            roiId: roi.id,
            label: roi.label,
            imageDataUrl: cropCanvas.toDataURL('image/png'),
            width: cropCanvas.width,
            height: cropCanvas.height,
            fullFrameImageDataUrl,
            bbox,
          })
        }
      }
    }
    return results
  }, [])

  const downloadResult = useCallback((result: ExtractionResult) => {
    downloadImage(result.imageDataUrl, `${result.label}.png`)
  }, [])

  return { extractROIs, downloadResult }
}
