import * as THREE from 'three'

export interface CADModel {
  geometry: THREE.BufferGeometry
  name: string
}

export interface EdgeComparisonResult {
  alignedEdges: Uint8ClampedArray // Green
  displacedEdges: Uint8ClampedArray // Yellow
  misalignedEdges: Uint8ClampedArray // Red
  width: number
  height: number
}

export interface InspectionResult {
  snapshot: string // base64 data URL of camera frame
  modelSnapshot: ImageData
  cameraSnapshot: ImageData
  timestamp: number
}

export type Screen = 'upload' | 'ar' | 'results' | 'roi-editor' | 'ar-preview' | 'roi-summary'

export interface AppState {
  currentScreen: Screen
  cadModel: CADModel | null
  inspectionResult: InspectionResult | null
  isPoseLocked: boolean
  overlayMode: 'wireframe' | 'solid'
}