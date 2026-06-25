import { useState, useEffect, useRef, useCallback } from 'react'
import { useEdgeComparison } from '../hooks/useEdgeComparison'

interface ResultsScreenProps {
  snapshot: string
  modelSnapshot: ImageData
  cameraSnapshot: ImageData
  onBack: () => void
  onReset: () => void
}

export function ResultsScreen({ snapshot, modelSnapshot, cameraSnapshot, onBack, onReset }: ResultsScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const { isProcessing, error, result, compare } = useEdgeComparison()
  const [distance, setDistance] = useState(1.0)
  const [analyzed, setAnalyzed] = useState(false)

  useEffect(() => {
    if (!analyzed && modelSnapshot.width > 0 && cameraSnapshot.width > 0) {
      compare(modelSnapshot, cameraSnapshot, distance).then(() => {
        setAnalyzed(true)
      })
    }
  }, [modelSnapshot, cameraSnapshot, distance, compare, analyzed])

  useEffect(() => {
    if (!result || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = result.width
    canvas.height = result.height

    // Draw snapshot as background
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, result.width, result.height)
    }
    img.src = snapshot
  }, [result, snapshot])

  useEffect(() => {
    if (!result || !overlayRef.current) return

    const canvas = overlayRef.current
    canvas.width = result.width
    canvas.height = result.height

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imageData = new ImageData(
      new Uint8ClampedArray(result.alignedEdges),
      result.width,
      result.height
    )
    ctx.putImageData(imageData, 0, 0)
  }, [result])

  const handleDistanceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDistance(parseFloat(e.target.value))
    setAnalyzed(false)
  }, [])

  const handleReanalyze = useCallback(() => {
    setAnalyzed(false)
    compare(modelSnapshot, cameraSnapshot, distance).then(() => {
      setAnalyzed(true)
    })
  }, [modelSnapshot, cameraSnapshot, distance, compare])

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <div className="p-4 flex items-center gap-4 bg-gray-800">
        <button
          onClick={onBack}
          className="text-white px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600"
        >
          ← Back
        </button>
        <h2 className="text-xl text-white flex-1">Inspection Results</h2>
        <button
          onClick={onReset}
          className="text-white px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500"
        >
          New Inspection
        </button>
      </div>

      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          {isProcessing && (
            <div className="flex items-center justify-center h-64">
              <div className="text-cyan-400 text-lg">Analyzing edges...</div>
            </div>
          )}

          {error && (
            <div className="bg-red-900/50 text-red-300 p-4 rounded-lg mb-4">
              {error}
            </div>
          )}

          {result && !isProcessing && (
            <>
              <div className="bg-gray-800 rounded-xl p-4 mb-6">
                <h3 className="text-white mb-4">Legend</h3>
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: '#10b981' }} />
                    <span className="text-gray-300">Perfect Match</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: '#f97316' }} />
                    <span className="text-gray-300">Warning</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: '#ef4444' }} />
                    <span className="text-gray-300">Missing Edge</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: '#141825' }} />
                    <span className="text-gray-300">Background</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-4 mb-6">
                <label className="text-white block mb-2">
                  Camera distance: {distance.toFixed(1)}m
                </label>
                <input
                  type="range"
                  min="0.3"
                  max="3"
                  step="0.1"
                  value={distance}
                  onChange={handleDistanceChange}
                  className="w-full"
                />
                <div className="flex justify-between text-gray-400 text-sm mt-1">
                  <span>0.3m</span>
                  <span>3m</span>
                </div>
                <button
                  onClick={handleReanalyze}
                  className="mt-4 bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg"
                >
                  Re-analyze
                </button>
              </div>

              <div className="bg-gray-800 rounded-xl overflow-hidden relative" style={{ aspectRatio: '16/9' }}>
                <canvas ref={canvasRef} className="w-full h-full object-contain" />
                <canvas ref={overlayRef} className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-80" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}