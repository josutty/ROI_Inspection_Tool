import { useState, useCallback } from 'react'
import type { ROI, Vertex } from '../types'

let roiCounter = 0

function generateId(): string {
  return `roi_${String(++roiCounter).padStart(3, '0')}`
}

export function useROIManager() {
  const [rois, setRois] = useState<ROI[]>([])

  const addROI = useCallback((label: string, vertices: Vertex[]) => {
    const newROI: ROI = {
      id: generateId(),
      label,
      vertices,
      color: '#00ffff',
    }
    setRois(prev => [...prev, newROI])
    return newROI
  }, [])

  const updateROI = useCallback((id: string, updates: Partial<Omit<ROI, 'id'>>) => {
    setRois(prev => prev.map(roi =>
      roi.id === id ? { ...roi, ...updates } : roi
    ))
  }, [])

  const deleteROI = useCallback((id: string) => {
    setRois(prev => prev.filter(roi => roi.id !== id))
  }, [])

  const getROI = useCallback((id: string) => {
    return rois.find(roi => roi.id === id) ?? null
  }, [rois])

  return { rois, addROI, updateROI, deleteROI, getROI }
}
