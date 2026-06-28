import { useState, useCallback, useRef, useEffect } from 'react'
import type { ProcessResponse } from '../features/ar-previewer/types'
import type { ROI } from '../features/roi-editor/types'

interface ROISummaryScreenProps {
  fullFrameImageDataUrl: string
  results: ProcessResponse
  labels: ROI[]
  onBack: () => void
  onFinish: () => void
}

export function ROISummaryScreen({
  fullFrameImageDataUrl,
  results,
  labels: _labels,
  onBack,
  onFinish,
}: ROISummaryScreenProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'visual' | 'table'>('visual')
  const [imgNaturalSize, setImgNaturalSize] = useState({
    width: 0,
    height: 0,
  })
  const [containerSize, setContainerSize] = useState({
    width: 0,
    height: 0,
  })

  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const img = imgRef.current
    if (!img) return

    const handleLoad = () => {
      setImgNaturalSize({
        width: img.naturalWidth,
        height: img.naturalHeight,
      })
    }

    img.addEventListener('load', handleLoad)

    if (img.complete) {
      handleLoad()
    }

    return () => {
      img.removeEventListener('load', handleLoad)
    }
  }, [fullFrameImageDataUrl])

  useEffect(() => {
    const container = containerRef.current
    if (!container || viewMode !== 'visual') return

    const measure = () => {
      setContainerSize({
        width: container.clientWidth,
        height: container.clientHeight,
      })
    }

    measure()

    const ro = new ResizeObserver(measure)
    ro.observe(container)

    return () => ro.disconnect()
  }, [viewMode])

  const handleExport = useCallback(() => {
    // Create CSV data
    const headers = ['ROI Name', 'Image Name', 'Position', 'Height', 'Status', 'Confidence Score']
    const rows = results.results.map((result, idx) => [
      result.roi_name,
      `ROI ${idx + 1}`,
      '100',
      '100',
      result.confidence > 0.8 ? 'Pass' : result.confidence > 0.5 ? 'Warning' : 'Fail',
      `${(result.confidence * 100).toFixed(1)}%`
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `roi-summary-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [results])

  const selectedResult =
    selectedIndex !== null ? results.results[selectedIndex] : null

  const containerWidth = containerSize.width
  const containerHeight = containerSize.height

  const fitScale =
    imgNaturalSize.width > 0 && imgNaturalSize.height > 0
      ? Math.min(
          containerWidth / imgNaturalSize.width,
          containerHeight / imgNaturalSize.height
        )
      : 1

  const renderedWidth = imgNaturalSize.width * fitScale
  const renderedHeight = imgNaturalSize.height * fitScale

  const fitOffsetX = Math.max(
    0,
    (containerWidth - renderedWidth) / 2
  )

  const fitOffsetY = Math.max(
    0,
    (containerHeight - renderedHeight) / 2
  )

  let zoomScale = 1

  if (selectedResult) {
    const [, , bw, bh] = selectedResult.bbox

    zoomScale = Math.min(
      5,
      Math.max(
        2,
        Math.min(
          containerWidth / bw,
          containerHeight / bh
        ) * 0.5
      )
    )
  }

  const finalScale = fitScale * zoomScale

  let translateX = fitOffsetX
  let translateY = fitOffsetY

  if (
    selectedResult &&
    imgNaturalSize.width > 0 &&
    imgNaturalSize.height > 0
  ) {
    const [bx, by, bw, bh] = selectedResult.bbox

    const roiCenterX = bx + bw / 2
    const roiCenterY = by + bh / 2

    translateX =
      containerWidth / 2 -
      roiCenterX * finalScale

    translateY =
      containerHeight / 2 -
      roiCenterY * finalScale
  }

  return (
    <div className="w-full h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-300 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors border border-gray-300"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-gray-900">Inspection Results</h2>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        {/* View Area */}
        <div className="flex-1 p-6 overflow-hidden">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="px-6 pt-4 pb-3 border-b border-gray-200 flex items-center gap-3 bg-white justify-center">
              <button
                onClick={() => setViewMode('visual')}
                className={`px-5 py-2 rounded-lg font-semibold text-sm transition-colors ${
                  viewMode === 'visual'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                Visual View
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-5 py-2 rounded-lg font-semibold text-sm transition-colors ${
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                Table View
              </button>
            </div>

            {/* Visual View */}
            <div className={`flex-1 relative overflow-hidden bg-gray-900 ${viewMode === 'visual' ? 'block' : 'hidden'}`}>
              <div ref={containerRef} className="absolute inset-0">
                <div
                  className="absolute top-0 left-0"
                  style={{
                    width: imgNaturalSize.width,
                    height: imgNaturalSize.height,
                    transform: `translate(${translateX}px, ${translateY}px) scale(${finalScale})`,
                    transformOrigin: 'top left',
                    transition: 'transform 300ms ease',
                  }}
                >
                  <img
                    ref={imgRef}
                    src={fullFrameImageDataUrl}
                    alt="Full frame"
                    draggable={false}
                    className="block select-none"
                    style={{
                      width: imgNaturalSize.width,
                      height: imgNaturalSize.height,
                    }}
                  />

                  {selectedResult && (
                    <div
                      className="absolute border-4 border-blue-500 bg-blue-500/20 pointer-events-none"
                      style={{
                        left: selectedResult.bbox[0],
                        top: selectedResult.bbox[1],
                        width: selectedResult.bbox[2],
                        height: selectedResult.bbox[3],
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Table View */}
            {viewMode === 'table' && (
              <div className="flex-1 overflow-auto p-6 bg-white">
                {/* Table */}
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-200 border-b-2 border-gray-300">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase">ROI Name</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase">Image Name</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase">Accuracy</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {results.results.map((result, index) => (
                        <tr key={index} className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedIndex(index); setViewMode('visual'); }}>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900">ROI {index + 1}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{result.roi_name}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900">{(result.confidence * 100).toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ROI Horizontal Carousel - Only for Visual View */}
        {viewMode === 'visual' && (
          <div className="bg-white border-t border-gray-300 px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-700 uppercase">ROI REGIONS</h3>
              {selectedIndex !== null && (
                <button
                  onClick={() => setSelectedIndex(null)}
                  className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold rounded transition-colors flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                  </svg>
                  Reset View
                </button>
              )}
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {results.results.map((result, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedIndex(selectedIndex === index ? null : index)}
                  className={`flex-shrink-0 w-48 text-left p-3 rounded-lg border transition-colors ${
                    selectedIndex === index
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-white border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-900">ROI {index + 1}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                      result.confidence > 0.8
                        ? 'bg-green-100 text-green-800'
                        : result.confidence > 0.5
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {result.confidence > 0.8 ? '✓' : result.confidence > 0.5 ? '⚠' : '✗'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mb-1 truncate">{result.roi_name}</div>
                  <div className="text-xs font-semibold text-gray-900">{(result.confidence * 100).toFixed(1)}%</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Fixed Bottom Buttons */}
        <div className="bg-white border-t border-gray-300 px-6 py-4 shadow-lg">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleExport}
              className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Summary
            </button>
            <button
              onClick={onFinish}
              className="px-8 py-3 bg-slate-600 text-white font-semibold rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}