import type { DrawingMode } from '../types'

interface ROIControlsProps {
  mode: DrawingMode
  vertexCount: number
  onLoadModel: () => void
  onCreateROI: () => void
  onLoadROI: () => void
  onExport: () => void
  modelLoaded: boolean
  hasROIs: boolean
}

export function ROIControls({
  mode,
  vertexCount,
  onLoadModel,
  onCreateROI,
  onLoadROI,
  onExport,
  modelLoaded,
  hasROIs,
}: ROIControlsProps) {
  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-3 flex items-center gap-2">
        {/* Add ROI Button */}
        <button
          onClick={onCreateROI}
          disabled={!modelLoaded || mode === 'drawing'}
          className={`group relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 ${
            mode === 'drawing'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
              : !modelLoaded
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md hover:shadow-lg hover:scale-105'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>{mode === 'drawing' ? `Drawing (${vertexCount})` : 'Add ROI'}</span>
        </button>

        {/* Load ROI Button */}
        <button
          onClick={onLoadROI}
          disabled={!modelLoaded || mode === 'drawing'}
          className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 ${
            !modelLoaded || mode === 'drawing'
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg hover:scale-105'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span>Load ROI</span>
        </button>

        {/* Export ROI Button */}
        <button
          onClick={onExport}
          disabled={!modelLoaded || !hasROIs}
          className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 ${
            !modelLoaded || !hasROIs
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg hover:scale-105'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Export ROI</span>
        </button>
      </div>
    </div>
  )
}
