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
  onSaveROI: () => void
  onCancelROI: () => void
}

export function ROIControls({
  mode,
  vertexCount,
  onCreateROI,
  onLoadROI,
  onExport,
  modelLoaded,
  hasROIs,
  onSaveROI,
  onCancelROI
}: ROIControlsProps) {
  return (
    <div style = {{display: "flex",width: "100%",justifyContent: "center"}} 
      className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-3 flex items-center gap-2">

        {mode === 'drawing' ? (
          <>
            {/* Save Button */}
            <button
              onClick={onSaveROI}
              disabled={vertexCount < 3}
              className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${vertexCount < 3
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md hover:shadow-lg hover:scale-105'
                }`}
            >
              Save
            </button>

            {/* Cancel Button */}
            <button
              onClick={onCancelROI}
              className="px-6 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            {/* Add ROI */}
            <button
              onClick={onCreateROI}
              disabled={!modelLoaded}
              className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${!modelLoaded
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md hover:shadow-lg hover:scale-105'
                }`}
            >
              Add ROI
            </button>

            {/* Load ROI */}
            <button
              onClick={onLoadROI}
              disabled={!modelLoaded}
              className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${!modelLoaded
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg hover:scale-105'
                }`}
            >
              Load ROI
            </button>

            {/* Export ROI */}
            <button
              onClick={onExport}
              disabled={!modelLoaded || !hasROIs}
              className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${!modelLoaded || !hasROIs
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg hover:scale-105'
                }`}
            >
              Export ROI
            </button>
          </>
        )}
      </div>
    </div>
  )
}
