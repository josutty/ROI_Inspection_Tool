import { useState, useEffect } from 'react'
import type { ROI } from '../types'

interface ROIListProps {
  rois: ROI[]
  selectedROIId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

export function ROIList({ rois, selectedROIId, onSelect, onDelete }: ROIListProps) {
  // Start minimized on mobile screens
  const [isMinimized, setIsMinimized] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768
    }
    return false
  })

  // Update minimized state on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && !isMinimized) {
        // Auto-minimize on mobile if not already minimized
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isMinimized])
  return (
    <div className={`absolute top-20 right-4 sm:right-6 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-20 transition-all duration-300 ${
      isMinimized ? 'w-14' : 'w-72 sm:w-80 max-h-[calc(100vh-10rem)]'
    }`}>
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-200 flex items-center justify-between">
        {!isMinimized ? (
          <>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">ROI List</h3>
                <p className="text-xs text-gray-600">{rois.length} Region{rois.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 hover:bg-white/60 rounded-lg transition-colors"
              title="Minimize"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsMinimized(false)}
            className="w-full flex flex-col items-center gap-2 py-2"
            title="Expand"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            {rois.length > 0 && (
              <span className="w-6 h-6 bg-purple-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {rois.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* ROI List */}
      {!isMinimized && (
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 14rem)' }}>
        {rois.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">No ROIs yet</p>
            <p className="text-xs text-gray-500">Add ROIs to get started</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {rois.map((roi, index) => (
              <div
                key={roi.id}
                className={`group p-3 rounded-xl cursor-pointer transition-all duration-200 border-2 ${
                  roi.id === selectedROIId
                    ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-purple-400 shadow-lg'
                    : 'bg-gray-50 border-transparent hover:border-gray-300 hover:shadow-md'
                }`}
                onClick={() => onSelect(roi.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        roi.id === selectedROIId
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-300 text-gray-700'
                      }`}>
                        {index + 1}
                      </span>
                      <p className="text-sm font-semibold text-gray-900 truncate">{roi.label}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-8">
                      <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                      </svg>
                      <p className="text-xs text-gray-500 font-mono">{roi.vertices.length} vertices</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(roi.id)
                    }}
                    className="shrink-0 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      )}
    </div>
  )
}
