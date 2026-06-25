import { useState, useCallback } from 'react'
import type { Pose } from '../types'

export function useModelAlignment() {
  const [pose, setPose] = useState<Pose>({
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
  })

  const updatePosition = useCallback((axis: 'x' | 'y' | 'z', value: number) => {
    setPose(prev => ({
      ...prev,
      position: { ...prev.position, [axis]: value },
    }))
  }, [])

  const updateRotation = useCallback((axis: 'x' | 'y' | 'z', value: number) => {
    setPose(prev => ({
      ...prev,
      rotation: { ...prev.rotation, [axis]: value },
    }))
  }, [])

  const resetPose = useCallback(() => {
    setPose({
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
    })
  }, [])

  return { pose, updatePosition, updateRotation, resetPose }
}
