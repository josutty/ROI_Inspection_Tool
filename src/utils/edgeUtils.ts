/**
 * Adaptive threshold calculator based on camera distance
 * Returns thresholds in pixels for green/yellow/red edge classification
 */
export function getAdaptiveThresholds(distanceMeters: number): { green: number; yellow: number } {
  if (distanceMeters < 0.5) {
    return { green: 3, yellow: 6 }
  } else if (distanceMeters < 1.0) {
    return { green: 5, yellow: 10 }
  } else if (distanceMeters < 2.0) {
    return { green: 8, yellow: 15 }
  } else {
    return { green: 12, yellow: 24 }
  }
}

/**
 * Compare edges between model projection and camera frame
 * Returns classification mask: 0=aligned(green), 1=displaced(yellow), 2=misaligned(red)
 */
export function compareEdges(
  modelEdges: ImageData,
  cameraEdges: ImageData,
  distanceMeters: number
): { data: Uint8ClampedArray; width: number; height: number } {
  const { green, yellow } = getAdaptiveThresholds(distanceMeters)
  const result = new Uint8ClampedArray(modelEdges.width * modelEdges.height * 4)

  const modelData = modelEdges.data
  const cameraData = cameraEdges.data

  for (let i = 0; i < modelData.length; i += 4) {
    const modelEdge = modelData[i] > 0 || modelData[i + 1] > 0 || modelData[i + 2] > 0

    if (!modelEdge) {
      result[i] = 0
      result[i + 1] = 0
      result[i + 2] = 0
      result[i + 3] = 0
      continue
    }

    // Find nearest camera edge pixel
    const offset = yellow * 2 + 1
    let minDist = offset + 1
    let camEdgeStrength = 0

    for (let dy = -offset; dy <= offset; dy++) {
      for (let dx = -offset; dx <= offset; dx++) {
        const nx = (i / 4) % modelEdges.width + dx
        const ny = Math.floor((i / 4) / modelEdges.width) + dy
        if (nx < 0 || nx >= modelEdges.width || ny < 0 || ny >= modelEdges.height) continue

        const ni = (ny * modelEdges.width + nx) * 4
        const dist = Math.sqrt(dx * dx + dy * dy)
        const strength = (cameraData[ni] + cameraData[ni + 1] + cameraData[ni + 2]) / 3

        if (strength > 0 && dist < minDist) {
          minDist = dist
          camEdgeStrength = strength
        }
      }
    }

    if (minDist <= green) {
      // Aligned - green
      result[i] = 0
      result[i + 1] = 255
      result[i + 2] = 0
      result[i + 3] = 255
    } else if (minDist <= yellow) {
      // Displaced - yellow
      result[i] = 255
      result[i + 1] = 255
      result[i + 2] = 0
      result[i + 3] = 255
    } else {
      // Misaligned - red
      result[i] = 255
      result[i + 1] = 0
      result[i + 2] = 0
      result[i + 3] = 255
    }
    void camEdgeStrength // reserved for future use
  }

  return { data: result, width: modelEdges.width, height: modelEdges.height }
}

/**
 * Extract ROI from camera frame using model overlay bounds with chamfer offset
 */
export function extractROIWithOffset(
  modelBounds: { x: number; y: number; width: number; height: number },
  offset: number = 10
): { x: number; y: number; width: number; height: number } {
  return {
    x: Math.max(0, modelBounds.x - offset),
    y: Math.max(0, modelBounds.y - offset),
    width: modelBounds.width + offset * 2,
    height: modelBounds.height + offset * 2,
  }
}