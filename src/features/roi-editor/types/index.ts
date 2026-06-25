export interface Vertex {
  x: number
  y: number
  z: number
}

export interface ROI {
  id: string
  label: string
  vertices: Vertex[]
  color?: string
}

export interface ROIConfig {
  rois: ROI[]
}

export type DrawingMode = 'idle' | 'drawing' | 'editing'

export interface DrawingState {
  mode: DrawingMode
  currentVertices: Vertex[]
  selectedROIId: string | null
}