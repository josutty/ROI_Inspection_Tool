import { useState, useCallback } from 'react'
import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import type { CADModel } from '../types'

export function useCADLoader() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [model, setModel] = useState<CADModel | null>(null)

  const loadModel = useCallback(async (file: File): Promise<CADModel> => {
    setIsLoading(true)
    setError(null)

    try {
      const arrayBuffer = await file.arrayBuffer()
      const loader = new STLLoader()
      const geometry = loader.parse(arrayBuffer)

      // Center and scale geometry
      geometry.computeBoundingBox()
      const center = new THREE.Vector3()
      geometry.boundingBox!.getCenter(center)
      geometry.translate(-center.x, -center.y, -center.z)

      // Scale to reasonable size (max 1 meter)
      geometry.computeBoundingBox()
      const size = new THREE.Vector3()
      geometry.boundingBox!.getSize(size)
      const maxDim = Math.max(size.x, size.y, size.z)
      if (maxDim > 1) {
        const scale = 1 / maxDim
        geometry.scale(scale, scale, scale)
      }

      const cadModel: CADModel = {
        geometry,
        name: file.name,
      }

      setModel(cadModel)
      setIsLoading(false)
      return cadModel
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load STL file'
      setError(message)
      setIsLoading(false)
      throw err
    }
  }, [])

  const clearModel = useCallback(() => {
    setModel(null)
    setError(null)
  }, [])

  return {
    isLoading,
    error,
    model,
    loadModel,
    clearModel,
  }
}