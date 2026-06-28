import { useState, useCallback, useRef } from 'react'
import * as THREE from 'three'
import { ROIViewport3D } from './ROIViewport3D'
import { ROIControls } from './ROIControls'
import { ROILabelInput } from './ROILabelInput'
import { ROIList } from './ROIList'
import { useROIManager } from '../hooks/useROIManager'
import { usePolygonDrawing } from '../hooks/usePolygonDrawing'
import { useRaycastCursor } from '../hooks/useRaycastCursor'
import { downloadJSON } from '../utils/export'
import { loadJSONFile } from '../utils/import'
import { clearDraft } from '../utils/draft'
import type { Vertex } from '../types'

interface ROIEditorScreenProps {
  onClose?: () => void
}

export function ROIEditorScreen({ onClose }: ROIEditorScreenProps) {
  const [modelUrl, setModelUrl] = useState<string | null>(null)
  const [modelFileName, setModelFileName] = useState<string>('')
  const [showLabelInput, setShowLabelInput] = useState(false)
  const [selectedROIId, setSelectedROIId] = useState<string | null>(null)
  const [pendingVertices, setPendingVertices] = useState<Vertex[]>([])
  const modelRef = useRef<THREE.Object3D | null>(null)
  const cameraRef = useRef<THREE.Camera | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const { rois, addROI, deleteROI } = useROIManager()
  const {
    mode,
    currentVertices,
    startDrawing,
    addVertex,
    closePolygon,
    cancelDrawing,
  } = usePolygonDrawing()
  const { cursorVertex, updateCursor, clearCursor } = useRaycastCursor()

  const handleLoadModel = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.stl,.dae'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const url = URL.createObjectURL(file)
        setModelUrl(url)
        setModelFileName(file.name)
      }
    }
    input.click()
  }, [])

  const handleClearModel = useCallback(() => {
    if (modelUrl) {
      URL.revokeObjectURL(modelUrl)
    }
    setModelUrl(null)
    setModelFileName('')
    setSelectedROIId(null)
    cancelDrawing()
    clearCursor()
  }, [modelUrl, cancelDrawing, clearCursor])

  const handleCreateROI = useCallback(() => {
    setSelectedROIId(null)
    startDrawing()
  }, [startDrawing])

  const handleLoadROI = useCallback(async () => {
    try {
      const loadedRois = await loadJSONFile()
      if (loadedRois.length === 0) throw new Error('No ROIs found in file')
      for (const roi of loadedRois) {
        addROI(roi.label, roi.vertices)
      }
      clearDraft()
    } catch (err) {
      console.error('Failed to load ROI:', err)
    }
  }, [addROI])

  const handleExport = useCallback(() => {
    downloadJSON(rois)
  }, [rois])

  const handleModelReady = useCallback((model: THREE.Object3D, camera: THREE.Camera, canvas: HTMLCanvasElement) => {
    modelRef.current = model
    cameraRef.current = camera
    canvasRef.current = canvas
  }, [])

  const handleCursorMove = useCallback((clientX: number, clientY: number) => {
    if (!cameraRef.current || !modelRef.current || !canvasRef.current) return
    updateCursor(cameraRef.current, modelRef.current, clientX, clientY, canvasRef.current)
  }, [updateCursor])

  // const handleVertexClick = useCallback((vertex: Vertex) => {
  //   if (mode !== 'drawing') return

  //   // Check if clicking near the first vertex to close the polygon
  //   if (currentVertices.length >= 4 ) {//&& isNearFirstVertex(vertex, currentVertices[0])) {
  //     const closed = closePolygon()
  //     if (closed.length >= 4) {
  //       setPendingVertices(closed)
  //       setShowLabelInput(true)
  //     }
  //   } else {
  //     addVertex(vertex)
  //   }
  // }, [mode, currentVertices, isNearFirstVertex, addVertex, closePolygon])

  /**
   * Just add vertices.
   * Saving is handled separately by the Save ROI button.
   */
  const handleVertexClick = useCallback(
    (vertex: Vertex) => {
      if (mode !== 'drawing') return

      addVertex(vertex)
    },
    [mode, addVertex]
  )

  /**
   * Finish drawing and ask for label.
   */
  const handleSaveROI = useCallback(() => {
    if (mode !== 'drawing') return

    if (currentVertices.length < 4) {
      alert('A ROI requires at least 4 vertices.')
      return
    }

    const closedVertices = closePolygon()

    setPendingVertices(closedVertices)
    setShowLabelInput(true)
  }, [mode, currentVertices, closePolygon])

  const handleCancelROI = useCallback(() => {
    cancelDrawing();          // Clear the current polygon and exit drawing mode
    clearCursor();            // Remove the cursor indicator
    setPendingVertices([]);   // Clear any pending vertices
    setShowLabelInput(false); // Hide label dialog if it's open
  }, [cancelDrawing, clearCursor]);

  const handleLabelConfirm = useCallback((label: string) => {
    addROI(label, pendingVertices)
    setShowLabelInput(false)
    setSelectedROIId(null)
    setPendingVertices([])
    clearCursor()
  }, [addROI, pendingVertices, clearCursor])

  const handleLabelCancel = useCallback(() => {
    setShowLabelInput(false)
    cancelDrawing()
    clearCursor()
  }, [cancelDrawing, clearCursor])

  const handleSelectROI = useCallback((id: string) => {
    setSelectedROIId(id)
  }, [])

  const handleDeleteROI = useCallback((id: string) => {
    deleteROI(id)
    if (selectedROIId === id) {
      setSelectedROIId(null)
    }
  }, [deleteROI, selectedROIId])

  return (
    <div className="w-full h-dvh relative bg-gradient-to-br from-gray-50 via-gray-100 to-purple-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 z-50 shadow-sm">
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-gray-900 flex-1">ROI Editor</h2>
        {modelUrl && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-medium text-green-700">{rois.length} ROI{rois.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden">
        {modelUrl ? (
          <>
            <ROIViewport3D
              modelUrl={modelUrl}
              rois={rois}
              drawingVertices={currentVertices}
              selectedROIId={selectedROIId}
              cursorVertex={cursorVertex}
              isDrawing={mode === 'drawing'}
              onModelReady={handleModelReady}
              onVertexClick={handleVertexClick}
              onCursorMove={handleCursorMove}
            />
            
            {/* Model Info Badge */}
            <div className="absolute top-4 left-4 z-20 bg-white rounded-xl shadow-lg border border-gray-200 px-4 py-2 flex items-center gap-3">
              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">{modelFileName}</p>
                <p className="text-[10px] text-gray-500">3D Model Loaded</p>
              </div>
              <button
                onClick={handleClearModel}
                className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center max-w-md mx-auto px-6">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-50 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-12 h-12 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No Model Loaded</h3>
              <p className="text-gray-600 mb-8 text-sm">Upload a 3D CAD model (.stl or .dae) to start creating and managing ROIs</p>
              <button
                onClick={handleLoadModel}
                className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 via-purple-700 to-purple-600 hover:from-purple-700 hover:via-purple-800 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                <span className="relative z-10 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload CAD Model
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {modelUrl && (
        <ROIControls
          mode={mode}
          vertexCount={currentVertices.length}
          onLoadModel={handleLoadModel}
          onCreateROI={handleCreateROI}
          onLoadROI={handleLoadROI}
          onExport={handleExport}
          onSaveROI={handleSaveROI}
          onCancelROI={handleCancelROI}
          modelLoaded={!!modelUrl}
          hasROIs={rois.length > 0}
        />
      )}

      {modelUrl && (
        <ROIList
          rois={rois}
          selectedROIId={selectedROIId}
          onSelect={handleSelectROI}
          onDelete={handleDeleteROI}
        />
      )}

      {showLabelInput && (
        <ROILabelInput onConfirm={handleLabelConfirm} onCancel={handleLabelCancel} />
      )}
    </div>
  )
}
