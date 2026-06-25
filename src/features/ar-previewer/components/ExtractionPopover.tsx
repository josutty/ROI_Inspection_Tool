// src/features/ar-previewer/components/ExtractionPopover.tsx

import { useState } from 'react'
import type { ExtractionResult, ProcessResponse } from '../types'

export interface LabelItem {
  roiId: string
  label: string
  bbox: [number, number, number, number]
}

interface ExtractionPopoverProps {
  results: ExtractionResult[]
  onDownload: (result: ExtractionResult) => void
  onClose: () => void
  onNavigateHome?: () => void
  onNavigateToSummary?: (data: {
    fullFrameImageDataUrl: string
    results: ProcessResponse
    labels: LabelItem[]
  }) => void
}

const dataURLToFile = (dataUrl: string, filename: string): File => {
  const arr = dataUrl.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }

  return new File([u8arr], filename, { type: mime })
}

export function ExtractionPopover({
  results,
  onDownload,
  onClose,
  onNavigateHome,
  onNavigateToSummary,
}: ExtractionPopoverProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGetSummary = async () => {
    if (results.length === 0 || !onNavigateToSummary) return

    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      const labels: LabelItem[] = []

      results.forEach((result, index) => {
        const file = dataURLToFile(result.imageDataUrl, `roi_${index}.png`)

        formData.append('images', file)

        labels.push({
          roiId: result.roiId,
          label: result.label,
          bbox: result.bbox,
        })
      })

      formData.append('labels', JSON.stringify(labels))

      const endpoint = import.meta.env.VITE_API_ENDPOINT as string

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      })

      const text = await response.text()

      if (!response.ok || !text) {
        throw new Error(
          `Server error: ${response.status} ${response.statusText} - ${text}`,
        )
      }

      const data: ProcessResponse = JSON.parse(text)

      onNavigateToSummary({
        fullFrameImageDataUrl:
          results[0]?.fullFrameImageDataUrl || '',
        results: data,
        labels,
      })

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-2xl bg-black/40">
      <div className="w-full max-w-7xl max-h-[90vh] bg-white/80 backdrop-blur-3xl rounded-3xl shadow-2xl border border-white/20 flex flex-col overflow-hidden">
        {/* Premium Header with Gradient Accent */}
        <div className="relative flex justify-between items-center px-8 py-6 border-b border-white/10 backdrop-blur-xl bg-gradient-to-r from-white/40 via-white/30 to-white/40">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-blue-500/5"></div>
          
          <div className="flex items-center gap-4 relative z-10">
            <button
              onClick={onClose}
              className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/60 backdrop-blur-xl border border-white/20 hover:bg-white/80 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl group"
            >
              <svg className="w-5 h-5 text-gray-700 group-hover:text-gray-900 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div>
              <h2 style = {{ fontSize:'1.3em', marginBottom:0}} className="text-gray-900 font-bold tracking-tight">
                Extracted ROI Images
              </h2>
              <p className="text-gray-600 text-sm mt-1 font-medium">
                {results.length} region{results.length !== 1 ? 's' : ''} extracted successfully
              </p>
            </div>
          </div>

          {/* Home Button - Glassmorphic Floating */}
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="w-11 h-11 flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/90 to-purple-600/90 backdrop-blur-xl hover:from-blue-600/90 hover:to-purple-700/90 hover:scale-110 transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-blue-500/30 relative z-10 group"
              title="Go to Home"
            >
              <svg className="w-5 h-5 text-white group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </button>
          )}
        </div>

        {/* Scrollable Body - Glassmorphic Cards */}
        <div className="flex-1 overflow-y-auto p-8 bg-gradient-to-br from-gray-50/50 via-white/30 to-blue-50/50 backdrop-blur-xl">
          {error && (
            <div className="mb-6 p-5 bg-red-500/10 backdrop-blur-xl border border-red-500/20 rounded-2xl text-red-700 text-sm shadow-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">{error}</span>
              </div>
            </div>
          )}

          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-gray-100/80 to-gray-200/80 backdrop-blur-xl border border-gray-200/30 flex items-center justify-center mb-6 shadow-xl">
                <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-500 text-lg font-medium">No ROIs extracted yet</p>
              <p className="text-gray-400 text-sm mt-2">Extract regions to see them here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((result, index) => (
                <div
                  key={result.roiId}
                  className="group bg-white/70 backdrop-blur-2xl rounded-3xl shadow-xl border border-white/30 overflow-hidden hover:shadow-2xl hover:border-white/50 hover:-translate-y-1 transition-all duration-500"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Image Preview with Overlay */}
                  <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 aspect-[4/3] overflow-hidden">
                    <img
                      src={result.imageDataUrl}
                      alt={result.label}
                      className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700"
                    />
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    {/* Floating Badge */}
                    <div className="absolute top-4 left-4 px-3 py-1.5 bg-white/90 backdrop-blur-xl rounded-full text-xs font-bold text-gray-700 shadow-lg border border-white/20 opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-y-2 group-hover:translate-y-0">
                      ROI {index + 1}
                    </div>
                  </div>

                  {/* Content Area - Glassmorphic */}
                  <div className="p-6 bg-gradient-to-br from-white/60 to-white/40 backdrop-blur-xl">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-gray-900 font-bold text-base truncate mb-1.5 tracking-tight" title={result.label}>
                          {result.label}
                        </h3>
                        <div className="flex items-center gap-2">
                          <div className="px-2 py-0.5 bg-blue-500/10 backdrop-blur-sm rounded-md">
                            <p className="text-xs font-semibold text-blue-600">Extracted</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Premium Download Button */}
                      <button
                        onClick={() => onDownload(result)}
                        className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-blue-500/40 hover:scale-110 group/btn shrink-0"
                        title="Download"
                      >
                        <svg className="w-5 h-5 text-white group-hover/btn:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        {/* Pulse Effect */}
                        <div className="absolute inset-0 rounded-2xl bg-blue-400 opacity-0 group-hover/btn:opacity-20 group-hover/btn:animate-ping"></div>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Premium Footer with Glassmorphism */}
        <div className="shrink-0 border-t border-white/10 bg-white/60 backdrop-blur-3xl px-8 py-6">
          <div className="flex justify-center">
            <button
              onClick={handleGetSummary}
              disabled={isLoading || results.length === 0}
              className="relative px-10 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 hover:from-blue-700 hover:via-purple-700 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-bold rounded-2xl shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 flex items-center gap-3 overflow-hidden group hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              {/* Animated Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
              
              <span className="relative z-10 flex items-center gap-3">
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-base tracking-wide">Processing...</span>
                  </>
                ) : (
                  <>
                    <span className="text-base tracking-wide">Get Summary Table</span>
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}