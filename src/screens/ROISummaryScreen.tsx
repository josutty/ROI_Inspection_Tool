import { useState, useCallback, useRef, useEffect } from 'react'
import type { ProcessResponse } from '../features/ar-previewer/types'
import type { ROI } from '../features/roi-editor/types'

interface ROISummaryScreenProps {
  fullFrameImageDataUrl: string
  results: ProcessResponse
  labels: ROI[]
  onBack: () => void
}

export function ROISummaryScreen({
  fullFrameImageDataUrl,
  results,
  labels: _labels,
  onBack,
}: ROISummaryScreenProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'visual' | 'table'>('visual')
  const [searchQuery, setSearchQuery] = useState('')
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
    if (!container) return

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
  }, [])

  // const handleSelectItem = useCallback((index: number) => {
  //   setSelectedIndex(index)
  // }, [])

  // const handleResetZoom = useCallback(() => {
  //   setSelectedIndex(null)
  // }, [])

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

  const filteredResults = results.results.filter(result =>
    result.roi_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
    <div className="w-full h-screen bg-gradient-to-br from-blue-50 via-purple-50/30 to-blue-100 flex flex-col">
      {/* Glassmorphic Header */}
      <div className="bg-white/80 backdrop-blur-3xl border-b border-white/20 px-6 py-4 flex items-center gap-4 shadow-lg">
        <button
          onClick={onBack}
          className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/60 backdrop-blur-xl hover:bg-white/80 transition-all duration-300 hover:scale-105 shadow-lg border border-white/20"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl font-black text-gray-900 flex-1 tracking-tight">ROI Summary</h2>
        <button className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/60 backdrop-blur-xl hover:bg-white/80 hover:scale-105 transition-all duration-300 shadow-lg border border-white/20">
          <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>
        <button className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/60 backdrop-blur-xl hover:bg-white/80 hover:scale-105 transition-all duration-300 shadow-lg border border-white/20">
          <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
        </button>
        <button className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/60 backdrop-blur-xl hover:bg-white/80 hover:scale-105 transition-all duration-300 shadow-lg border border-white/20">
          <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>

      {/* Main Content with Glassmorphic Background */}
      <div className="flex-1 flex overflow-hidden bg-gradient-to-br from-white/40 via-blue-50/30 to-purple-50/40 backdrop-blur-xl">
        {/* Left Side - 3D View */}
        <div className="flex-1 p-8 overflow-hidden">
          <div className="bg-white/70 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 h-full flex flex-col overflow-hidden">
            {/* Glassmorphic Tabs */}
            <div className="px-8 pt-6 pb-4 border-b border-white/30 flex items-center gap-4 bg-white/40 backdrop-blur-xl">
              <button
                onClick={() => setViewMode('visual')}
                className={`px-6 py-3 rounded-2xl font-bold text-sm tracking-tight transition-all duration-300 ${
                  viewMode === 'visual'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                    : 'text-gray-600 hover:bg-white/60 backdrop-blur-sm'
                }`}
              >
                Visual View
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-6 py-3 rounded-2xl font-bold text-sm tracking-tight transition-all duration-300 ${
                  viewMode === 'table'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                    : 'text-gray-600 hover:bg-white/60 backdrop-blur-sm'
                }`}
              >
                Table View
              </button>
            </div>

            {/* Visual View */}
            {viewMode === 'visual' && (
              <div ref={containerRef} className="flex-1 relative overflow-hidden bg-gray-900">
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
            )}

            {/* Table View with Glassmorphism */}
            {viewMode === 'table' && (
              <div className="flex-1 overflow-auto p-8 bg-gradient-to-br from-white/40 to-blue-50/30">
                {/* Glassmorphic Search Bar */}
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex-1 relative">
                    <svg className="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search ROIs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-6 py-4 bg-white/70 backdrop-blur-xl border border-white/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-lg font-medium text-gray-900 placeholder-gray-500"
                    />
                  </div>
                  <button className="p-4 bg-white/70 backdrop-blur-xl hover:bg-white/90 rounded-2xl transition-all duration-300 hover:scale-105 shadow-lg border border-white/30">
                    <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                  </button>
                  <button className="p-4 bg-white/70 backdrop-blur-xl hover:bg-white/90 rounded-2xl transition-all duration-300 hover:scale-105 shadow-lg border border-white/30">
                    <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                </div>

                {/* Glassmorphic Table */}
                <div className="bg-white/70 backdrop-blur-2xl border border-white/30 rounded-2xl overflow-hidden shadow-2xl">
                  <table className="w-full">
                    <thead className="bg-white/60 backdrop-blur-xl border-b border-white/30">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">ROI Name</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Image Name</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Position</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Height</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Confidence Score</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white/40 backdrop-blur-sm divide-y divide-white/30">
                      {filteredResults.map((result, index) => (
                        <tr key={index} className="hover:bg-white/60 transition-all duration-300 cursor-pointer group" onClick={() => { setSelectedIndex(index); setViewMode('visual'); }}>
                          <td className="px-6 py-4 text-sm font-bold text-gray-900">ROI {index + 1}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900">{result.roi_name}</td>
                          <td className="px-6 py-4 text-sm text-gray-700 font-medium">100</td>
                          <td className="px-6 py-4 text-sm text-gray-700 font-medium">100</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-4 py-2 rounded-full text-xs font-bold backdrop-blur-xl shadow-lg ${
                              result.confidence > 0.8
                                ? 'bg-emerald-500/20 text-emerald-800 border border-emerald-500/30'
                                : result.confidence > 0.5
                                ? 'bg-amber-500/20 text-amber-800 border border-amber-500/30'
                                : 'bg-red-500/20 text-red-800 border border-red-500/30'
                            }`}>
                              {result.confidence > 0.8 ? '✓' : result.confidence > 0.5 ? '⚠' : '✗'} {result.confidence > 0.8 ? 'Pass' : result.confidence > 0.5 ? 'Warning' : 'Fail'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-gray-900">{(result.confidence * 100).toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Glassmorphic Footer Actions */}
      <div className="bg-white/80 backdrop-blur-3xl border-t border-white/20 px-8 py-5 shadow-2xl">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <button
            onClick={onBack}
            className="px-8 py-3.5 bg-white/70 backdrop-blur-xl hover:bg-white/90 text-gray-700 font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-lg border border-white/30"
          >
            Back to ROI Images
          </button>
          <div className="flex items-center gap-4">
            <button className="px-8 py-3.5 bg-white/70 backdrop-blur-xl hover:bg-white/90 text-gray-700 font-bold rounded-2xl border border-white/30 transition-all duration-300 hover:scale-105 shadow-lg">
              Home
            </button>
            <button
              onClick={handleExport}
              className="group relative px-10 py-3.5 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 hover:from-blue-700 hover:via-purple-700 hover:to-blue-700 text-white font-bold rounded-2xl shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105 overflow-hidden"
            >
              {/* Shimmer Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
              
              <span className="relative z-10 tracking-tight">Export Summary Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}