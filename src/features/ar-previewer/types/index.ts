export interface Pose {
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
}

export interface ExtractionResult {
  roiId: string
  label: string
  imageDataUrl: string
  width: number
  height: number
  fullFrameImageDataUrl: string
  bbox: [number, number, number, number]
}

export interface ProjectedVertex {
  x: number
  y: number
  screenX: number
  screenY: number
}

export interface ProcessResponse {
  total: number
  results: Array<{
    roi_name: string
    bbox: [number, number, number, number]
    text: string
    field_type: string
    confidence: number
    mirrored: boolean
    height_px_paddle: number
    height_px_final: number
  }>
}
