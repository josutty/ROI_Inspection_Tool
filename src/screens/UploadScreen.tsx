import { useState, useCallback, useRef } from 'react'
import { ModelPreviewFromFile } from '../components/ModelPreview'
import type { CADModel } from '../types'
import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'

interface UploadScreenProps {
  onStartAR: (model: CADModel) => void
  onCheckXR: () => Promise<boolean>
}

export function UploadScreen({ onStartAR, onCheckXR }: UploadScreenProps) {
  const [file, setFile] = useState<File | null>(null)
  const [model, setModel] = useState<CADModel | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [xrSupported, setXrSupported] = useState<boolean | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.toLowerCase().endsWith('.stl')) {
      setError('Please upload an STL file')
      return
    }

    setFile(selectedFile)
    setLoading(true)
    setError(null)

    try {
      const buffer = await selectedFile.arrayBuffer()
      const loader = new STLLoader()
      const geometry = loader.parse(buffer)

      geometry.computeBoundingBox()
      const center = new THREE.Vector3()
      geometry.boundingBox!.getCenter(center)
      geometry.translate(-center.x, -center.y, -center.z)

      geometry.computeBoundingBox()
      const size = new THREE.Vector3()
      geometry.boundingBox!.getSize(size)
      const maxDim = Math.max(size.x, size.y, size.z)
      if (maxDim > 1) {
        const scale = 1 / maxDim
        geometry.scale(scale, scale, scale)
      }

      const cadModel: CADModel = { geometry, name: selectedFile.name }
      setModel(cadModel)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load model')
      setModel(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      const input = fileInputRef.current
      if (input) {
        const dt = new DataTransfer()
        dt.items.add(droppedFile)
        input.files = dt.files
        const event = new Event('change', { bubbles: true })
        input.dispatchEvent(event)
      }
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleStartAR = useCallback(async () => {
    if (!model) return

    const supported = await onCheckXR()
    setXrSupported(supported)

    if (supported) {
      onStartAR(model)
    }
  }, [model, onStartAR, onCheckXR])

  const handleCheckDevice = useCallback(async () => {
    const supported = await onCheckXR()
    setXrSupported(supported)
  }, [onCheckXR])

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold text-cyan-400 mb-8">AR Inspection System</h1>

      <div className="w-full max-w-2xl bg-gray-800 rounded-xl p-6 shadow-2xl">
        <h2 className="text-xl text-white mb-4">Upload CAD Model</h2>

        {!model ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-cyan-600 rounded-lg p-12 text-center cursor-pointer hover:border-cyan-400 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".stl,.dae"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="text-cyan-400 text-lg mb-2">
              Drag and drop your STL file here
            </div>
            <div className="text-gray-400 text-sm">or click to browse</div>
            {loading && <div className="text-cyan-300 mt-4">Loading...</div>}
            {error && <div className="text-red-400 mt-4">{error}</div>}
          </div>
        ) : (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-white">File: {file?.name}</span>
              <button
                onClick={() => { setFile(null); setModel(null) }}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Remove
              </button>
            </div>
            <div className="bg-gray-900 rounded-lg overflow-hidden h-80">
              <ModelPreviewFromFile file={file} wireframe />
            </div>
          </div>
        )}

        {xrSupported === false && (
          <div className="mb-4 p-4 bg-red-900/50 rounded-lg text-red-300 text-sm">
            WebXR AR is not supported on this device. Please use a supported mobile device with AR capabilities.
          </div>
        )}

        <button
          onClick={handleStartAR}
          disabled={!model || loading}
          className={`w-full py-4 rounded-lg font-bold text-lg transition-colors ${
            model && !loading
              ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          {loading ? 'Loading...' : 'Start AR'}
        </button>

        <button
          onClick={handleCheckDevice}
          className="w-full py-2 rounded-lg font-medium text-sm transition-colors bg-gray-700 hover:bg-gray-600 text-gray-300 mt-2"
        >
          Check Device Support
        </button>

        {xrSupported === true && (
          <div className="mt-2 p-2 bg-green-900/50 rounded-lg text-green-300 text-sm text-center">
            ✓ WebXR AR is supported on this device
          </div>
        )}

        {xrSupported === false && (
          <div className="mt-2 p-2 bg-yellow-900/50 rounded-lg text-yellow-300 text-sm text-center">
            ⚠ WebXR AR not supported - will use camera fallback
          </div>
        )}
      </div>
    </div>
  )
}