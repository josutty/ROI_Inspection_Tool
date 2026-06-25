import type { ROI, ROIConfig } from '../types'

export function exportROIConfig(rois: ROI[]): ROIConfig {
  return { rois }
}

export function downloadJSON(rois: ROI[], filename: string = 'rois.json'): void {
  const config = exportROIConfig(rois)
  const json = JSON.stringify(config, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
