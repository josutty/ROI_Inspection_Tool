// src/features/ar-previewer/components/ROIUploader.tsx

import type { ROI } from '../../roi-editor/types'

interface ROIUploaderProps {
  onROIsLoaded: (rois: ROI[]) => void
}

export function ROIUploader({ onROIsLoaded }: ROIUploaderProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string)
        if (json.rois && Array.isArray(json.rois)) {
          onROIsLoaded(json.rois)
        }
      } catch {
        console.error('Invalid ROI JSON')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="absolute top-24 right-4 bg-black/70 p-3 rounded-lg text-white z-20">
      <label className="text-sm mb-1 block">Load ROI JSON</label>
      <input
        type="file"
        accept=".json"
        onChange={handleChange}
        className="text-xs"
      />
    </div>
  )
}
