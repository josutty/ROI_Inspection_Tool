import type { ROI, ROIConfig, Vertex } from '../types'

export function importROIConfig(rois: ROI[]): ROIConfig {
  return { rois }
}

export async function loadJSONFile(): Promise<ROI[]> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) {
        reject(new Error('No file selected'))
        return
      }
      try {
        const text = await file.text()
        const data = JSON.parse(text)

        // Validate ROIConfig structure
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid JSON structure')
        }
        if (!Array.isArray(data.rois)) {
          throw new Error('Missing or invalid rois array')
        }

        const rois: ROI[] = []
        for (const roi of data.rois) {
          if (!roi || typeof roi !== 'object') continue
          if (typeof roi.id !== 'string' || typeof roi.label !== 'string') continue
          if (!Array.isArray(roi.vertices) || roi.vertices.length < 3) continue

          // Validate each vertex
          const validVertices: Vertex[] = []
          for (const v of roi.vertices) {
            if (
              v &&
              typeof v === 'object' &&
              typeof v.x === 'number' &&
              typeof v.y === 'number' &&
              typeof v.z === 'number'
            ) {
              validVertices.push({ x: v.x, y: v.y, z: v.z })
            }
          }
          if (validVertices.length >= 3) {
            rois.push({
              id: roi.id,
              label: roi.label,
              vertices: validVertices,
              color: typeof roi.color === 'string' ? roi.color : '#00ffff',
            })
          }
        }

        if (rois.length === 0) {
          throw new Error('No valid ROIs found in file')
        }

        resolve(rois)
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to parse JSON file'))
      }
    }
    input.click()
  })
}
