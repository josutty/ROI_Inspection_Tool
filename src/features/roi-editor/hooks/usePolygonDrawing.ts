import { useState, useCallback } from 'react'
import type { DrawingMode, Vertex } from '../types'

const CLOSE_THRESHOLD = 0.005

export function usePolygonDrawing() {
  const [mode, setMode] = useState<DrawingMode>('idle')
  const [currentVertices, setCurrentVertices] = useState<Vertex[]>([])

  const startDrawing = useCallback(() => {
    setMode('drawing')
    setCurrentVertices([])
  }, [])

  const addVertex = useCallback((vertex: Vertex) => {
    setCurrentVertices(prev => [...prev, vertex])
  }, [])

  const closePolygon = useCallback(() => {
    setMode('idle')
    const closed = [...currentVertices]
    setCurrentVertices([])
    return closed
  }, [currentVertices])

  const cancelDrawing = useCallback(() => {
    setMode('idle')
    setCurrentVertices([])
  }, [])

  const isNearFirstVertex = useCallback((vertex: Vertex, firstVertex: Vertex): boolean => {
    if (currentVertices.length < 3) return false
    const dx = vertex.x - firstVertex.x
    const dy = vertex.y - firstVertex.y
    const dz = vertex.z - firstVertex.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz) < CLOSE_THRESHOLD
  }, [currentVertices])

  return {
    mode,
    currentVertices,
    startDrawing,
    addVertex,
    closePolygon,
    cancelDrawing,
    isNearFirstVertex,
  }
}
