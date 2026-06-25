import { useState, useCallback, useRef } from 'react'
import * as THREE from 'three'
import type { Vertex } from '../types'

export function useRaycastCursor() {
  const [cursorVertex, setCursorVertex] = useState<Vertex | null>(null)
  const cursorRef = useRef<THREE.Vector3 | null>(null)

  const updateCursor = useCallback((
    camera: THREE.Camera,
    model: THREE.Object3D,
    clientX: number,
    clientY: number,
    canvas: HTMLCanvasElement
  ) => {
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    const rect = canvas.getBoundingClientRect()
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObject(model, true)
    if (intersects.length > 0 && intersects[0].point) {
      const worldPoint = intersects[0].point.clone()
      const localPoint = model.worldToLocal(worldPoint)
      cursorRef.current = worldPoint
      setCursorVertex({ x: localPoint.x, y: localPoint.y, z: localPoint.z })
    } else {
      cursorRef.current = null
      setCursorVertex(null)
    }
  }, [])

  const clearCursor = useCallback(() => {
    cursorRef.current = null
    setCursorVertex(null)
  }, [])

  return { cursorVertex, updateCursor, clearCursor }
}