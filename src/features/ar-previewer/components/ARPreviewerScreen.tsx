import { useState, useRef, useCallback, useEffect } from 'react'
import * as THREE from 'three'
import { ARViewport } from './ARViewport'
import { ExtractionPopover } from './ExtractionPopover'
import { useModelAlignment } from '../hooks/useModelAlignment'
import { useROIProjection } from '../hooks/useROIProjection'
import { useExtraction } from '../hooks/useExtraction'
import type { ROI } from '../../roi-editor/types'
import type { ExtractionResult, ProjectedVertex, ProcessResponse } from '../types'
import type { LabelItem } from './ExtractionPopover'

interface ARPreviewerScreenProps {
  showROIEditor?: boolean
  onToggleROIEditor?: () => void
  onNavigateToROISummary?: (data: {
    fullFrameImageDataUrl: string
    results: ProcessResponse
    labels: LabelItem[]
  }) => void
  onBack?: () => void
}

export function ARPreviewerScreen({ onNavigateToROISummary, onBack }: ARPreviewerScreenProps) {
  const [currentStep] = useState<'upload-stl' | 'upload-roi' | 'extract'>('upload-stl')
  const [showARPreview, setShowARPreview] = useState(false)
  const [modelFile, setModelFile] = useState<File | null>(null)
  const [rois, setRois] = useState<ROI[]>([])
  const [showPopover, setShowPopover] = useState(false)
  const [extractionResults, setExtractionResults] = useState<ExtractionResult[]>([])
  const [_projectedROIs, setProjectedROIs] = useState<Map<string, ProjectedVertex[]>>(new Map())
  const [renderMode, setRenderMode] = useState<'default' | 'edges'>('default')
  const [isUploading, setIsUploading] = useState(false)
  const [modelLoadError, setModelLoadError] = useState<string | null>(null)
  const [isModelLoading, setIsModelLoading] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const modelRef = useRef<THREE.Object3D | null>(null)
  const cameraRef = useRef<THREE.Camera | null>(null)

  const { pose } = useModelAlignment()
  const { projectROIs } = useROIProjection()
  const { extractROIs, downloadResult } = useExtraction()

  const steps = [
    { id: 'upload-stl', label: 'Upload STL', completed: !!modelFile },
    { id: 'upload-roi' as const, label: 'Upload ROI JSON', completed: rois.length > 0 },
    { id: 'extract' as const, label: 'Extract Images', completed: false },
  ]

  const currentStepIndex = steps.findIndex(s => s.id === currentStep)
  const stlCompleted = !!modelFile
  const roiCompleted = rois.length > 0
  const canExtract = stlCompleted && roiCompleted

  // Initialize camera when entering AR preview
  useEffect(() => {
    if (!showARPreview || !videoRef.current) return
    
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      })
      .catch(console.error)
    
    return () => {
      // Cleanup camera stream when leaving AR preview
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [showARPreview])



  const handleModelReady = useCallback((model: THREE.Object3D, camera: THREE.Camera) => {
    modelRef.current = model
    cameraRef.current = camera
    setIsModelLoading(false)
  }, [])

  const handleROIsLoaded = useCallback((loadedRois: ROI[]) => {
    setRois(loadedRois)
  }, [])

  const handleExtract = useCallback(() => {
    if (!modelRef.current || !cameraRef.current || !videoRef.current) return
    const width = videoRef.current.videoWidth || 1920
    const height = videoRef.current.videoHeight || 1080
    const projected = projectROIs(rois, pose, cameraRef.current, width, height)
    setProjectedROIs(projected)
    const results = extractROIs(rois, projected, videoRef.current, pose)
    setExtractionResults(results)
    setShowPopover(true)
  }, [rois, pose, projectROIs, extractROIs])

  const handleFileUpload = async (file: File) => {
    setIsUploading(true)
    setModelLoadError(null)
    
    // Check file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    if (fileExtension === 'step' || fileExtension === 'stp') {
      setModelLoadError('STEP/STP files are not directly supported. Please convert to STL or COLLADA (.dae) format first.')
      setIsUploading(false)
      return
    }
    
    // Simulate upload delay for smooth UX
    await new Promise(resolve => setTimeout(resolve, 800))
    setModelFile(file)
    setIsModelLoading(true)
    setIsUploading(false)
  }

  const handleProceed = () => {
    setShowARPreview(true)
  }

  const handleBackToSetup = () => {
    setShowARPreview(false)
  }

  // AR Preview Screen
  if (showARPreview) {
    return (
      <div className="w-full h-dvh relative bg-gray-900">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
        <ARViewport
          modelFile={modelFile}
          rois={rois}
          pose={pose}
          renderMode={renderMode}
          onModelReady={handleModelReady}
        />

        {/* Glassmorphic Back Button */}
        <button
          onClick={handleBackToSetup}
          className="absolute top-6 left-6 z-30 w-12 h-12 bg-black/50 backdrop-blur-2xl border border-white/20 rounded-2xl flex items-center justify-center text-white hover:bg-black/70 hover:border-white/40 hover:scale-110 transition-all duration-300 shadow-2xl"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Premium Extract Button - Enhanced Glassmorphic */}
        <div style = {{
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  position: "absolute",
  bottom: "2rem",
  width: "100%",
  zIndex: 20,
}}>
        <div style={{display: 'contents'}} className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-20">
          <button
            onClick={handleExtract}
            disabled={!modelFile || rois.length === 0}
            className="group relative px-12 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-400 rounded-3xl text-white font-black text-lg shadow-[0_20px_60px_-15px_rgba(147,51,234,0.6)] transition-all duration-500 hover:shadow-[0_20px_80px_-15px_rgba(147,51,234,0.8)] hover:scale-[1.15] disabled:hover:scale-100 disabled:hover:shadow-none backdrop-blur-2xl border-2 border-white/30 overflow-hidden disabled:border-gray-600 tracking-wide"
          >
            {/* Animated Background Gradient */}
            {/* <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-purple-400/40 to-pink-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div> */}
            
            {/* Shimmer Effect */}
            {/* <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div> */}
            
            {/* Pulsing Ring Effect */}
            {/* <div className="absolute inset-0 rounded-3xl border-2 border-white/40 group-hover:scale-110 group-hover:border-white/0 transition-all duration-500"></div> */}
            
            <span className="relative z-10 flex items-center gap-4">
              <svg className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="drop-shadow-lg">Extract ROI Images</span>
              <svg className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>
        </div>
        </div>

        {showPopover && (
          <ExtractionPopover
            results={extractionResults}
            onDownload={downloadResult}
            onClose={() => setShowPopover(false)}
            onNavigateHome={onBack}
            onNavigateToSummary={onNavigateToROISummary}
          />
        )}
      </div>
    )
  }

  // Setup Screen
  return (
    <div className="w-full h-dvh relative bg-gradient-to-br from-gray-50 via-gray-100 to-blue-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 z-50">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-gray-900 flex-1">Model Setup</h2>
      </div>

      {/* Stepper */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-center gap-2">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    step.completed
                      ? 'bg-green-500 text-white'
                      : index === currentStepIndex
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step.completed ? '✓' : index + 1}
                </div>
                <span
                  className={`text-sm font-medium hidden sm:inline ${
                    step.completed ? 'text-green-600' : index <= currentStepIndex ? 'text-gray-900' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-12 h-0.5 transition-colors ${
                    steps[index].completed ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 bg-gray-50">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6">
          {/* STL Upload Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">STL Model</h3>
                {stlCompleted && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Upload Successful
                  </span>
                )}
              </div>

              {/* Error Message Display */}
              {modelLoadError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-red-800">{modelLoadError}</p>
                    <p className="text-xs text-red-600 mt-1">Recommended: Use STL or COLLADA (.dae) formats for best compatibility</p>
                  </div>
                  <button
                    onClick={() => setModelLoadError(null)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {!modelFile ? (
                /* Dropzone Mode */
                <label className="block cursor-pointer">
                  <input
                    type="file"
                    accept=".stl,.dae"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file)
                    }}
                    className="hidden"
                    disabled={isUploading}
                  />
                  <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                    isUploading 
                      ? 'border-blue-400 bg-blue-50' 
                      : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
                  }`}>
                    {isUploading ? (
                      <div className="space-y-3">
                        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                        <p className="text-sm font-medium text-blue-600">Uploading...</p>
                      </div>
                    ) : (
                      <div>
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-sm font-medium text-gray-900">Drop your CAD model here</p>
                        <p className="text-xs text-gray-500 mt-1">or click to browse</p>
                        <p className="text-xs text-gray-400 mt-2">Supported: .stl, .dae (COLLADA)</p>
                      </div>
                    )}
                  </div>
                </label>
              ) : (
                /* 3D Preview Mode */
                <div className="space-y-4">
                  <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl overflow-hidden relative">
                    {isModelLoading && (
                      <div className="absolute inset-0 flex items-center justify-center z-20 bg-gray-900/50 backdrop-blur-sm">
                        <div className="text-center">
                          <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-3"></div>
                          <p className="text-sm font-medium text-white">Loading 3D Model...</p>
                        </div>
                      </div>
                    )}
                    <div key="stl-preview">
                      <ARViewport
                        modelFile={modelFile}
                        rois={[]}
                        pose={pose}
                        renderMode={renderMode}
                        onModelReady={handleModelReady}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{modelFile.name}</p>
                      <p className="text-xs text-gray-500">{(modelFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button
                      onClick={() => {
                        setModelFile(null)
                        setIsModelLoading(false)
                        setModelLoadError(null)
                      }}
                      className="ml-3 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-600">View Mode:</span>
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setRenderMode('default')}
                        className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                          renderMode === 'default'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Solid + Edges
                      </button>
                      <button
                        onClick={() => setRenderMode('edges')}
                        className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                          renderMode === 'edges'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Edges Only
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ROI JSON Upload Card */}
          <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all ${
            !stlCompleted ? 'opacity-50 pointer-events-none' : ''
          }`}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">ROI JSON</h3>
                {roiCompleted && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Upload Successful
                  </span>
                )}
              </div>

              {!stlCompleted && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                  <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-xs text-amber-800">Please upload STL model first</p>
                </div>
              )}

              {!roiCompleted ? (
                /* Dropzone Mode */
                <label className="block cursor-pointer">
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = (ev) => {
                        try {
                          const json = JSON.parse(ev.target?.result as string)
                          if (json.rois && Array.isArray(json.rois)) {
                            handleROIsLoaded(json.rois)
                          }
                        } catch {
                          console.error('Invalid ROI JSON')
                        }
                      }
                      reader.readAsText(file)
                    }}
                    className="hidden"
                    disabled={!stlCompleted}
                  />
                  <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                    !stlCompleted
                      ? 'border-gray-200 bg-gray-50'
                      : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50/50'
                  }`}>
                    <div>
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-sm font-medium text-gray-900">Drop ROI JSON here</p>
                      <p className="text-xs text-gray-500 mt-1">or click to browse</p>
                      <p className="text-xs text-gray-400 mt-2">Supported: .json</p>
                    </div>
                  </div>
                </label>
              ) : (
                /* ROI Preview Mode */
                <div className="space-y-4">
                  <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl overflow-hidden relative">
                    <div key={`roi-preview-${rois.length}`}>
                      <ARViewport
                        modelFile={modelFile}
                        rois={rois}
                        pose={pose}
                        renderMode={renderMode}
                        onModelReady={handleModelReady}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{rois.length} ROI{rois.length !== 1 ? 's' : ''} loaded</p>
                      <p className="text-xs text-gray-500">
                        {rois.map(roi => roi.label).join(', ')}
                      </p>
                    </div>
                    <button
                      onClick={() => setRois([])}
                      className="ml-3 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Glassmorphic Sticky Bottom Action Bar */}
      <div className="bg-white/80 backdrop-blur-3xl border-t border-white/20 px-8 py-5 shadow-2xl">
        <div className="max-w-6xl mx-auto flex items-center justify-center">
          <button
            onClick={handleProceed}
            disabled={!canExtract}
            className={`group relative px-14 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 hover:from-blue-700 hover:via-purple-700 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-bold rounded-2xl shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 disabled:cursor-not-allowed hover:scale-105 disabled:hover:scale-100 overflow-hidden ${
              canExtract ? 'animate-pulse' : ''
            }`}
          >
            {/* Animated Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
            
            <span className="relative z-10 flex items-center gap-3 text-base tracking-wide">
              Proceed to AR Preview
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>
        </div>
      </div>

      {showPopover && (
        <ExtractionPopover
          results={extractionResults}
          onDownload={downloadResult}
          onClose={() => setShowPopover(false)}
          onNavigateHome={onBack}
          onNavigateToSummary={onNavigateToROISummary}
        />
      )}
    </div>
  )
}
