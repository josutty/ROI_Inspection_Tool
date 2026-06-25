import { useState, useCallback } from 'react'
import type { EdgeComparisonResult } from '../types'

/**
 * Simple Sobel edge detection (same as reference implementation)
 */
function sobelEdges(data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const gray = new Uint8ClampedArray(width * height)
  const edges = new Uint8ClampedArray(width * height)

  // Convert to grayscale
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]
    gray[i] = (r + g + b) / 3
  }

  // Sobel kernels
  const gxK = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
  const gyK = [-1, -2, -1, 0, 0, 0, 1, 2, 1]

  // Apply Sobel
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0, k = 0

      for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
          const idx = (y + j) * width + (x + i)
          gx += gray[idx] * gxK[k]
          gy += gray[idx] * gyK[k]
          k++
        }
      }

      const mag = Math.sqrt(gx * gx + gy * gy)
      edges[y * width + x] = mag > 80 ? 255 : 0
    }
  }

  return edges
}

/**
 * Generate deviation map using direct position comparison (same as reference)
 */
function generateDeviationMap(
  cadEdges: Uint8ClampedArray,
  camEdges: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height * 4)

  for (let i = 0; i < width * height; i++) {
    const cad = cadEdges[i]
    const cam = camEdges[i]
    const idx = i * 4

    // Only show results within CAD model ROI (where CAD has edges)
    if (cad === 0) {
      // Outside CAD ROI - make transparent/background
      out[idx] = 0
      out[idx + 1] = 0
      out[idx + 2] = 0
      out[idx + 3] = 0
      continue
    }

    // Within CAD ROI - show deviation
    if (cam === 255) {
      // Both have edge at same position = perfect match
      out[idx] = 16      // R
      out[idx + 1] = 185 // G
      out[idx + 2] = 129 // B
      out[idx + 3] = 255 // A
    } else {
      // CAD has edge but camera doesn't = missing edge
      out[idx] = 239     // R
      out[idx + 1] = 68  // G
      out[idx + 2] = 68  // B
      out[idx + 3] = 255 // A
    }
  }

  return out
}

export function useEdgeComparison() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<EdgeComparisonResult | null>(null)

  const compare = useCallback(async (
    modelSnapshot: ImageData,
    cameraSnapshot: ImageData,
    _distanceMeters: number = 1.0
  ): Promise<EdgeComparisonResult> => {
    setIsProcessing(true)
    setError(null)

    try {
      const width = modelSnapshot.width
      const height = modelSnapshot.height

      // Run Sobel edge detection on both images
      const modelEdges = sobelEdges(modelSnapshot.data, width, height)
      const cameraEdges = sobelEdges(cameraSnapshot.data, width, height)

      // Generate deviation map using direct position comparison
      const resultData = generateDeviationMap(modelEdges, cameraEdges, width, height)

      const edgeResult: EdgeComparisonResult = {
        alignedEdges: resultData,
        displacedEdges: resultData,
        misalignedEdges: resultData,
        width,
        height,
      }

      setResult(edgeResult)
      setIsProcessing(false)
      return edgeResult
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Edge comparison failed'
      setError(message)
      setIsProcessing(false)
      throw err
    }
  }, [])

  const clearResult = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return {
    isProcessing,
    error,
    result,
    compare,
    clearResult,
  }
}