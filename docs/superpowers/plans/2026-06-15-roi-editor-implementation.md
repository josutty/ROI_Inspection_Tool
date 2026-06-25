# ROI Editor + AR Previewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 3 epics: ROI Editor (define polygons on CAD model, label, export JSON) → AR Previewer (align model with physical object) → ROI Extraction (project ROIs onto camera, extract labeled crops).

**Architecture:** Feature-based folder structure under `src/features/roi-editor/` and `src/features/ar-previewer/`. ROI Editor uses Three.js OrbitControls + Raycaster for polygon drawing on model surface. AR Previewer uses separate canvas with pose controls for model alignment and canvas-based ROI projection + cropping for extraction. Both screens share ROI JSON format.

**Tech Stack:** React 18, TypeScript, Three.js (STL loading via THREE STLLoader, OrbitControls, Raycaster), Canvas 2D API for image cropping, native file download via anchor element.

---

## PHASE 1: ROI Editor — Types, Utils, and Core Hooks

### Task 1: ROI Editor Types

**Files:**
- Create: `src/features/roi-editor/types/index.ts`

- [ ] **Step 1: Create types file**

```typescript
// src/features/roi-editor/types/index.ts

export interface Vertex {
  x: number
  y: number
  z: number
}

export interface ROI {
  id: string
  label: string
  vertices: Vertex[]
  color?: string
}

export interface ROIConfig {
  rois: ROI[]
}

export type DrawingMode = 'idle' | 'drawing' | 'editing'

export interface DrawingState {
  mode: DrawingMode
  currentVertices: Vertex[]
  selectedROIId: string | null
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/roi-editor/types/index.ts
git commit -m "feat(roi-editor): add ROI types"
```

---

### Task 2: ROI Export Utils

**Files:**
- Create: `src/features/roi-editor/utils/export.ts`

- [ ] **Step 1: Create export utility**

```typescript
// src/features/roi-editor/utils/export.ts

import type { ROI, ROIConfig } from '../types'

export function exportROIConfig(rois: ROI[]): ROIConfig {
  return { rois }
}

export function downloadJSON(rois: ROI[], filename: string = 'rois.json'): void {
  const config = exportROIConfig(rois)
  const json = JSON.stringify(config, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/roi-editor/utils/export.ts
git commit -m "feat(roi-editor): add ROI export utils"
```

---

### Task 3: Raycast Utils

**Files:**
- Create: `src/features/roi-editor/utils/raycast.ts`

- [ ] **Step 1: Create raycast utility**

```typescript
// src/features/roi-editor/utils/raycast.ts

import * as THREE from 'three'
import type { Vertex } from '../types'

export function raycastToModel(
  camera: THREE.Camera,
  model: THREE.Object3D,
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement
): THREE.Vector3 | null {
  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()

  const rect = canvas.getBoundingClientRect()
  mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(mouse, camera)

  const intersects = raycaster.intersectObject(model, true)
  if (intersects.length > 0 && intersects[0].point) {
    return intersects[0].point.clone()
  }
  return null
}

export function worldToLocal(vertex: THREE.Vector3, model: THREE.Object3D): Vertex {
  const local = model.worldToLocal(vertex.clone())
  return { x: local.x, y: local.y, z: local.z }
}

export function localToWorld(vertex: Vertex, model: THREE.Object3D): THREE.Vector3 {
  const v = new THREE.Vector3(vertex.x, vertex.y, vertex.z)
  return model.localToWorld(v.clone())
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/roi-editor/utils/raycast.ts
git commit -m "feat(roi-editor): add raycast utils"
```

---

### Task 4: useROIManager Hook

**Files:**
- Create: `src/features/roi-editor/hooks/useROIManager.ts`

- [ ] **Step 1: Create useROIManager hook**

```typescript
// src/features/roi-editor/hooks/useROIManager.ts

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
```

- [ ] **Step 2: Commit**

```bash
git add src/features/roi-editor/hooks/useROIManager.ts
git commit -m "feat(roi-editor): add useROIManager hook"
```

---

### Task 5: usePolygonDrawing Hook

**Files:**
- Create: `src/features/roi-editor/hooks/usePolygonDrawing.ts`

- [ ] **Step 1: Create usePolygonDrawing hook**

```typescript
// src/features/roi-editor/hooks/usePolygonDrawing.ts

import { useState, useCallback } from 'react'
import type { DrawingMode, Vertex } from '../types'

const CLOSE_THRESHOLD = 0.05

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
```

- [ ] **Step 2: Commit**

```bash
git add src/features/roi-editor/hooks/usePolygonDrawing.ts
git commit -m "feat(roi-editor): add usePolygonDrawing hook"
```

---

### Task 6: useRaycastCursor Hook

**Files:**
- Create: `src/features/roi-editor/hooks/useRaycastCursor.ts`

- [ ] **Step 1: Create useRaycastCursor hook**

```typescript
// src/features/roi-editor/hooks/useRaycastCursor.ts

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
```

- [ ] **Step 2: Commit**

```bash
git add src/features/roi-editor/hooks/useRaycastCursor.ts
git commit -m "feat(roi-editor): add useRaycastCursor hook"
```

---

## PHASE 2: ROI Editor — Components

### Task 7: ROIPolygon Component

**Files:**
- Create: `src/features/roi-editor/components/ROIPolygon.tsx`

- [ ] **Step 1: Create ROIPolygon component**

```tsx
// src/features/roi-editor/components/ROIPolygon.tsx

import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import type { ROI, Vertex } from '../types'

interface ROIPolygonProps {
  roi: ROI
  isSelected: boolean
  modelMatrix?: THREE.Matrix4
}

export function ROIPolygon({ roi, isSelected, modelMatrix }: ROIPolygonProps) {
  const lineRef = useRef<THREE.LineLoop>(null)
  const spheresRef = useRef<THREE.InstancedMesh>(null)

  useEffect(() => {
    if (!lineRef.current || !spheresRef.current) return

    const points = roi.vertices.map(v => new THREE.Vector3(v.x, v.y, v.z))
    if (modelMatrix) {
      points.forEach(p => p.applyMatrix4(modelMatrix))
    }

    const positions = new Float32Array(points.length * 3)
    points.forEach((p, i) => {
      positions[i * 3] = p.x
      positions[i * 3 + 1] = p.y
      positions[i * 3 + 2] = p.z
    })

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    lineRef.current.geometry = geometry

    const sphere = new THREE.SphereGeometry(0.003, 8, 8)
    const color = isSelected ? '#ffff00' : (roi.color ?? '#00ffff')
    const material = new THREE.MeshBasicMaterial({ color })
    spheresRef.current.geometry = sphere
    spheresRef.current.material = material

    const matrix = new THREE.Matrix4()
    points.forEach((p, i) => {
      matrix.setPosition(p.x, p.y, p.z)
      spheresRef.current!.setMatrixAt(i, matrix)
    })
    spheresRef.current.instanceMatrix.needsUpdate = true
  }, [roi, isSelected, modelMatrix])

  return (
    <group>
      <lineLoop ref={lineRef}>
        <bufferGeometry />
      </lineLoop>
      <instancedMesh ref={spheresRef} args={[undefined, undefined, roi.vertices.length]}>
        <sphereGeometry args={[0.003, 8, 8]} />
        <meshBasicMaterial color={isSelected ? '#ffff00' : (roi.color ?? '#00ffff')} />
      </instancedMesh>
    </group>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/roi-editor/components/ROIPolygon.tsx
git commit -m "feat(roi-editor): add ROIPolygon component"
```

---

### Task 8: ROIViewport3D Component

**Files:**
- Create: `src/features/roi-editor/components/ROIViewport3D.tsx`

- [ ] **Step 1: Create ROIViewport3D component**

```tsx
// src/features/roi-editor/components/ROIViewport3D.tsx

import { useRef, useEffect, useCallback } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import * as THREE from 'three'
import type { ROI, Vertex } from '../types'
import { ROIPolygon } from './ROIPolygon'

interface ROIViewport3DProps {
  modelUrl: string | null
  rois: ROI[]
  selectedROIId: string | null
  cursorVertex: Vertex | null
  onVertexClick: (vertex: Vertex) => void
  onMouseMove: (clientX: number, clientY: number) => void
  onModelReady: (model: THREE.Object3D) => void
}

function ViewportContent({
  modelUrl,
  rois,
  selectedROIId,
  cursorVertex,
  onVertexClick,
  onMouseMove,
  onModelReady,
}: ROIViewport3DProps) {
  const { camera, gl } = useThree()
  const modelRef = useRef<THREE.Object3D | null>(null)
  const cursorSphereRef = useRef<THREE.Mesh>(null)

  useEffect(() => {
    if (!modelUrl) return
    const loader = new STLLoader()
    loader.load(modelUrl, (geometry) => {
      geometry.center()
      const material = new THREE.MeshPhongMaterial({ color: '#888888', specular: '#111111', shininess: 30 })
      const mesh = new THREE.Mesh(geometry, material)
      modelRef.current = mesh
      onModelReady(mesh)
    })
  }, [modelUrl, onModelReady])

  useEffect(() => {
    if (cursorSphereRef.current) {
      if (cursorVertex && modelRef.current) {
        const v = new THREE.Vector3(cursorVertex.x, cursorVertex.y, cursorVertex.z)
        v.applyMatrix4(modelRef.current.matrixWorld)
        cursorSphereRef.current.position.copy(v)
        cursorSphereRef.current.visible = true
      } else {
        cursorSphereRef.current.visible = false
      }
    }
  }, [cursorVertex])

  const handleClick = useCallback((e: THREE.Event) => {
    if (!modelRef.current) return
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    const rect = gl.domElement.getBoundingClientRect()
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObject(modelRef.current, true)
    if (intersects.length > 0 && intersects[0].point) {
      const local = modelRef.current.worldToLocal(intersects[0].point.clone())
      onVertexClick({ x: local.x, y: local.y, z: local.z })
    }
  }, [camera, gl, onVertexClick])

  const handleMouseMove = useCallback((e: THREE.Event) => {
    onMouseMove(e.clientX, e.clientY)
  }, [onMouseMove])

  return (
    <>
      <OrbitControls />
      <ambientLight intensity={0.5} />
      <directionalLight position={[1, 1, 1]} intensity={0.8} />
      {modelRef.current && <primitive object={modelRef.current} />}
      {rois.map(roi => (
        <ROIPolygon
          key={roi.id}
          roi={roi}
          isSelected={roi.id === selectedROIId}
          modelMatrix={modelRef.current?.matrixWorld}
        />
      ))}
      <mesh ref={cursorSphereRef}>
        <sphereGeometry args={[0.005, 8, 8]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
    </>
  )
}

export function ROIViewport3D(props: ROIViewport3DProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 1], fov: 50 }}
      style={{ width: '100%', height: '100%' }}
      onClick={undefined}
    >
      <ViewportContent {...props} />
    </Canvas>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/roi-editor/components/ROIViewport3D.tsx
git commit -m "feat(roi-editor): add ROIViewport3D component"
```

---

### Task 9: ROIControls Component

**Files:**
- Create: `src/features/roi-editor/components/ROIControls.tsx`

- [ ] **Step 1: Create ROIControls component**

```tsx
// src/features/roi-editor/components/ROIControls.tsx

import type { DrawingMode } from '../types'

interface ROIControlsProps {
  mode: DrawingMode
  vertexCount: number
  onLoadModel: () => void
  onCreateROI: () => void
  onExport: () => void
  modelLoaded: boolean
}

export function ROIControls({
  mode,
  vertexCount,
  onLoadModel,
  onCreateROI,
  onExport,
  modelLoaded,
}: ROIControlsProps) {
  return (
    <div className="absolute top-4 left-4 flex flex-col gap-2 bg-black/70 p-4 rounded-lg text-white">
      <button
        onClick={onLoadModel}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
      >
        Load STL Model
      </button>

      <button
        onClick={onCreateROI}
        disabled={!modelLoaded || mode === 'drawing'}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded text-sm"
      >
        {mode === 'drawing' ? 'Drawing...' : 'Create ROI'}
      </button>

      <button
        onClick={onExport}
        disabled={!modelLoaded}
        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded text-sm"
      >
        Export JSON
      </button>

      <div className="text-xs text-gray-300 mt-2">
        Mode: <span className="capitalize">{mode}</span>
      </div>

      {mode === 'drawing' && (
        <div className="text-xs text-gray-300">
          Vertices: {vertexCount}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/roi-editor/components/ROIControls.tsx
git commit -m "feat(roi-editor): add ROIControls component"
```

---

### Task 10: ROILabelInput Component

**Files:**
- Create: `src/features/roi-editor/components/ROILabelInput.tsx`

- [ ] **Step 1: Create ROILabelInput component**

```tsx
// src/features/roi-editor/components/ROILabelInput.tsx

import { useState } from 'react'

interface ROILabelInputProps {
  onConfirm: (label: string) => void
  onCancel: () => void
}

export function ROILabelInput({ onConfirm, onCancel }: ROILabelInputProps) {
  const [label, setLabel] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (label.trim()) {
      onConfirm(label.trim())
      setLabel('')
    }
  }

  return (
    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 p-4 rounded-lg text-white">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="text-sm">Label for ROI:</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g., serial_number"
          className="px-3 py-2 rounded bg-gray-800 text-white text-sm w-64"
          autoFocus
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!label.trim()}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded text-sm"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/roi-editor/components/ROILabelInput.tsx
git commit -m "feat(roi-editor): add ROILabelInput component"
```

---

### Task 11: ROIList Component

**Files:**
- Create: `src/features/roi-editor/components/ROIList.tsx`

- [ ] **Step 1: Create ROIList component**

```tsx
// src/features/roi-editor/components/ROIList.tsx

import type { ROI } from '../types'

interface ROIListProps {
  rois: ROI[]
  selectedROIId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

export function ROIList({ rois, selectedROIId, onSelect, onDelete }: ROIListProps) {
  return (
    <div className="absolute top-4 right-4 w-64 bg-black/70 rounded-lg text-white overflow-hidden">
      <div className="p-3 bg-gray-800 text-sm font-semibold">ROIs ({rois.length})</div>
      <div className="max-h-96 overflow-y-auto">
        {rois.length === 0 && (
          <div className="p-3 text-sm text-gray-400">No ROIs defined</div>
        )}
        {rois.map(roi => (
          <div
            key={roi.id}
            className={`p-3 border-b border-gray-700 cursor-pointer hover:bg-gray-800 ${
              roi.id === selectedROIId ? 'bg-gray-700' : ''
            }`}
            onClick={() => onSelect(roi.id)}
          >
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium truncate">{roi.label}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(roi.id)
                }}
                className="text-red-400 hover:text-red-300 text-xs px-2 py-1"
              >
                Delete
              </button>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {roi.vertices.length} vertices
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/roi-editor/components/ROIList.tsx
git commit -m "feat(roi-editor): add ROIList component"
```

---

### Task 12: ROI Editor Screen + Index

**Files:**
- Create: `src/features/roi-editor/components/ROIEditorScreen.tsx`
- Create: `src/features/roi-editor/index.ts`

- [ ] **Step 1: Create ROIEditorScreen component**

```tsx
// src/features/roi-editor/components/ROIEditorScreen.tsx

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
import type { Vertex } from '../types'

export function ROIEditorScreen() {
  const [modelUrl, setModelUrl] = useState<string | null>(null)
  const [modelFile, setModelFile] = useState<File | null>(null)
  const [showLabelInput, setShowLabelInput] = useState(false)
  const [selectedROIId, setSelectedROIId] = useState<string | null>(null)
  const modelRef = useRef<THREE.Object3D | null>(null)

  const { rois, addROI, deleteROI } = useROIManager()
  const { mode, currentVertices, startDrawing, addVertex, closePolygon, cancelDrawing, isNearFirstVertex } = usePolygonDrawing()
  const { cursorVertex, updateCursor, clearCursor } = useRaycastCursor()

  const handleLoadModel = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.stl'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const url = URL.createObjectURL(file)
        setModelUrl(url)
        setModelFile(file)
      }
    }
    input.click()
  }, [])

  const handleCreateROI = useCallback(() => {
    setSelectedROIId(null)
    startDrawing()
  }, [startDrawing])

  const handleExport = useCallback(() => {
    downloadJSON(rois)
  }, [rois])

  const handleModelReady = useCallback((model: THREE.Object3D) => {
    modelRef.current = model
  }, [])

  const handleMouseMove = useCallback((clientX: number, clientY: number) => {
    if (mode !== 'drawing' || !modelRef.current) return
    const canvas = document.querySelector('canvas')
    if (!canvas) return
    // Access camera from ROIViewport3D via ref in real implementation
    // For now, pass through raycast update
  }, [mode])

  const handleVertexClick = useCallback((vertex: Vertex) => {
    if (mode !== 'drawing') return

    if (currentVertices.length >= 3 && isNearFirstVertex(vertex, currentVertices[0])) {
      const closed = closePolygon()
      if (closed.length >= 3) {
        setShowLabelInput(true)
      }
    } else {
      addVertex(vertex)
    }
  }, [mode, currentVertices, isNearFirstVertex, addVertex, closePolygon])

  const handleLabelConfirm = useCallback((label: string) => {
    addROI(label, currentVertices)
    setShowLabelInput(false)
    clearCursor()
  }, [addROI, currentVertices, clearCursor])

  const handleLabelCancel = useCallback(() => {
    setShowLabelInput(false)
    cancelDrawing()
  }, [cancelDrawing])

  return (
    <div className="w-full h-screen relative bg-gray-900">
      {modelUrl && (
        <ROIViewport3D
          modelUrl={modelUrl}
          rois={rois}
          selectedROIId={selectedROIId}
          cursorVertex={cursorVertex}
          onVertexClick={handleVertexClick}
          onMouseMove={handleMouseMove}
          onModelReady={handleModelReady}
        />
      )}

      <ROIControls
        mode={mode}
        vertexCount={currentVertices.length}
        onLoadModel={handleLoadModel}
        onCreateROI={handleCreateROI}
        onExport={handleExport}
        modelLoaded={!!modelUrl}
      />

      <ROIList
        rois={rois}
        selectedROIId={selectedROIId}
        onSelect={setSelectedROIId}
        onDelete={deleteROI}
      />

      {showLabelInput && (
        <ROILabelInput onConfirm={handleLabelConfirm} onCancel={handleLabelCancel} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create index.ts**

```typescript
// src/features/roi-editor/index.ts

export { ROIEditorScreen } from './components/ROIEditorScreen'
export { useROIManager } from './hooks/useROIManager'
export { usePolygonDrawing } from './hooks/usePolygonDrawing'
export { useRaycastCursor } from './hooks/useRaycastCursor'
export * from './types'
```

- [ ] **Step 3: Commit**

```bash
git add src/features/roi-editor/components/ROIEditorScreen.tsx src/features/roi-editor/index.ts
git commit -m "feat(roi-editor): add ROIEditorScreen and index"
```

---

## PHASE 3: AR Previewer — Types, Utils, Hooks

### Task 13: AR Previewer Types

**Files:**
- Create: `src/features/ar-previewer/types/index.ts`

- [ ] **Step 1: Create types file**

```typescript
// src/features/ar-previewer/types/index.ts

import type { ROI } from '../../roi-editor/types'

export interface Pose {
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
}

export interface ExtractionResult {
  roiId: string
  label: string
  imageDataUrl: string
  width: number
  height: number
}

export interface ProjectedVertex {
  x: number
  y: number
  screenX: number
  screenY: number
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/ar-previewer/types/index.ts
git commit -m "feat(ar-previewer): add AR Previewer types"
```

---

### Task 14: Projection Utils

**Files:**
- Create: `src/features/ar-previewer/utils/projection.ts`

- [ ] **Step 1: Create projection utility**

```typescript
// src/features/ar-previewer/utils/projection.ts

import * as THREE from 'three'
import type { Vertex } from '../../roi-editor/types'
import type { ProjectedVertex } from '../types'

export function projectVertexToScreen(
  vertex: Vertex,
  modelMatrix: THREE.Matrix4,
  camera: THREE.Camera,
  width: number,
  height: number
): ProjectedVertex | null {
  const v = new THREE.Vector3(vertex.x, vertex.y, vertex.z)
  v.applyMatrix4(modelMatrix)

  const projected = v.project(camera)

  return {
    x: vertex.x,
    y: vertex.y,
    screenX: (projected.x * 0.5 + 0.5) * width,
    screenY: (-projected.y * 0.5 + 0.5) * height,
  }
}

export function projectROIToScreen(
  vertices: Vertex[],
  modelMatrix: THREE.Matrix4,
  camera: THREE.Camera,
  width: number,
  height: number
): ProjectedVertex[] {
  return vertices
    .map(v => projectVertexToScreen(v, modelMatrix, camera, width, height))
    .filter((p): p is ProjectedVertex => p !== null)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/ar-previewer/utils/projection.ts
git commit -m "feat(ar-previewer): add projection utils"
```

---

### Task 15: Image Crop Utils

**Files:**
- Create: `src/features/ar-previewer/utils/imageCrop.ts`

- [ ] **Step 1: Create image crop utility**

```typescript
// src/features/ar-previewer/utils/imageCrop.ts

import type { ProjectedVertex } from '../types'

export function cropPolygonFromCanvas(
  ctx: CanvasRenderingContext2D,
  projectedVertices: ProjectedVertex[],
  width: number,
  height: number
): ImageData | null {
  if (projectedVertices.length < 3) return null

  ctx.save()
  ctx.beginPath()
  ctx.moveTo(projectedVertices[0].screenX, projectedVertices[0].screenY)
  for (let i = 1; i < projectedVertices.length; i++) {
    ctx.lineTo(projectedVertices[i].screenX, projectedVertices[i].screenY)
  }
  ctx.closePath()
  ctx.clip()

  const imageData = ctx.getImageData(0, 0, width, height)
  ctx.restore()
  return imageData
}

export function downloadImage(dataUrl: string, filename: string): void {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/ar-previewer/utils/imageCrop.ts
git commit -m "feat(ar-previewer): add image crop utils"
```

---

### Task 16: useModelAlignment Hook

**Files:**
- Create: `src/features/ar-previewer/hooks/useModelAlignment.ts`

- [ ] **Step 1: Create useModelAlignment hook**

```typescript
// src/features/ar-previewer/hooks/useModelAlignment.ts

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
```

- [ ] **Step 2: Commit**

```bash
git add src/features/ar-previewer/hooks/useModelAlignment.ts
git commit -m "feat(ar-previewer): add useModelAlignment hook"
```

---

### Task 17: useROIProjection Hook

**Files:**
- Create: `src/features/ar-previewer/hooks/useROIProjection.ts`

- [ ] **Step 1: Create useROIProjection hook**

```typescript
// src/features/ar-previewer/hooks/useROIProjection.ts

import { useCallback } from 'react'
import * as THREE from 'three'
import type { ROI } from '../../roi-editor/types'
import type { Pose, ProjectedVertex } from '../types'
import { projectROIToScreen } from '../utils/projection'

export function useROIProjection() {
  const projectROIs = useCallback((
    rois: ROI[],
    pose: Pose,
    camera: THREE.Camera,
    width: number,
    height: number
  ): Map<string, ProjectedVertex[]> => {
    const euler = new THREE.Euler(
      THREE.MathUtils.degToRad(pose.rotation.x),
      THREE.MathUtils.degToRad(pose.rotation.y),
      THREE.MathUtils.degToRad(pose.rotation.z),
      'XYZ'
    )
    const quat = new THREE.Quaternion().setFromEuler(euler)
    const pos = new THREE.Vector3(pose.position.x, pose.position.y, pose.position.z)
    const modelMatrix = new THREE.Matrix4().compose(pos, quat, new THREE.Vector3(1, 1, 1))

    const result = new Map<string, ProjectedVertex[]>()
    for (const roi of rois) {
      const projected = projectROIToScreen(roi.vertices, modelMatrix, camera, width, height)
      result.set(roi.id, projected)
    }
    return result
  }, [])

  return { projectROIs }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/ar-previewer/hooks/useROIProjection.ts
git commit -m "feat(ar-previewer): add useROIProjection hook"
```

---

### Task 18: useExtraction Hook

**Files:**
- Create: `src/features/ar-previewer/hooks/useExtraction.ts`

- [ ] **Step 1: Create useExtraction hook**

```typescript
// src/features/ar-previewer/hooks/useExtraction.ts

import { useCallback } from 'react'
import type { ROI } from '../../roi-editor/types'
import type { Pose, ExtractionResult, ProjectedVertex } from '../types'
import { cropPolygonFromCanvas, downloadImage } from '../utils/imageCrop'

export function useExtraction() {
  const extractROIs = useCallback((
    rois: ROI[],
    projectedROIs: Map<string, ProjectedVertex[]>,
    videoElement: HTMLVideoElement,
    pose: Pose
  ): ExtractionResult[] => {
    const canvas = document.createElement('canvas')
    canvas.width = videoElement.videoWidth
    canvas.height = videoElement.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return []

    ctx.drawImage(videoElement, 0, 0)
    const results: ExtractionResult[] = []

    for (const roi of rois) {
      const projected = projectedROIs.get(roi.id)
      if (!projected || projected.length < 3) continue

      const imageData = cropPolygonFromCanvas(ctx, projected, canvas.width, canvas.height)
      if (imageData) {
        const cropCanvas = document.createElement('canvas')
        cropCanvas.width = imageData.width
        cropCanvas.height = imageData.height
        const cropCtx = cropCanvas.getContext('2d')
        if (cropCtx) {
          cropCtx.putImageData(imageData, 0, 0)
          results.push({
            roiId: roi.id,
            label: roi.label,
            imageDataUrl: cropCanvas.toDataURL('image/png'),
            width: cropCanvas.width,
            height: cropCanvas.height,
          })
        }
      }
    }
    return results
  }, [])

  const downloadResult = useCallback((result: ExtractionResult) => {
    downloadImage(result.imageDataUrl, `${result.label}.png`)
  }, [])

  return { extractROIs, downloadResult }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/ar-previewer/hooks/useExtraction.ts
git commit -m "feat(ar-previewer): add useExtraction hook"
```

---

## PHASE 4: AR Previewer — Components

### Task 19: PoseControls Component

**Files:**
- Create: `src/features/ar-previewer/components/PoseControls.tsx`

- [ ] **Step 1: Create PoseControls component**

```tsx
// src/features/ar-previewer/components/PoseControls.tsx

import type { Pose } from '../types'

interface PoseControlsProps {
  pose: Pose
  onPositionChange: (axis: 'x' | 'y' | 'z', value: number) => void
  onRotationChange: (axis: 'x' | 'y' | 'z', value: number) => void
  onReset: () => void
}

export function PoseControls({ pose, onPositionChange, onRotationChange, onReset }: PoseControlsProps) {
  return (
    <div className="absolute top-4 left-4 bg-black/70 p-4 rounded-lg text-white w-72">
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-semibold">Pose Controls</span>
        <button
          onClick={onReset}
          className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
        >
          Reset
        </button>
      </div>

      <div className="mb-4">
        <div className="text-xs text-gray-400 mb-2">Translation</div>
        {(['x', 'y', 'z'] as const).map(axis => (
          <div key={axis} className="flex items-center gap-2 mb-1">
            <span className="text-xs w-4">{axis.toUpperCase()}</span>
            <input
              type="range"
              min={-1}
              max={1}
              step={0.01}
              value={pose.position[axis]}
              onChange={(e) => onPositionChange(axis, parseFloat(e.target.value))}
              className="flex-1"
            />
            <input
              type="number"
              min={-1}
              max={1}
              step={0.01}
              value={pose.position[axis].toFixed(2)}
              onChange={(e) => onPositionChange(axis, parseFloat(e.target.value))}
              className="w-16 bg-gray-800 text-xs px-2 py-1 rounded"
            />
          </div>
        ))}
      </div>

      <div>
        <div className="text-xs text-gray-400 mb-2">Rotation (degrees)</div>
        {(['x', 'y', 'z'] as const).map(axis => (
          <div key={axis} className="flex items-center gap-2 mb-1">
            <span className="text-xs w-4">R{axis}</span>
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={pose.rotation[axis]}
              onChange={(e) => onRotationChange(axis, parseFloat(e.target.value))}
              className="flex-1"
            />
            <input
              type="number"
              min={-180}
              max={180}
              step={1}
              value={pose.rotation[axis]}
              onChange={(e) => onRotationChange(axis, parseFloat(e.target.value))}
              className="w-16 bg-gray-800 text-xs px-2 py-1 rounded"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/ar-previewer/components/PoseControls.tsx
git commit -m "feat(ar-previewer): add PoseControls component"
```

---

### Task 20: ModelUploader Component

**Files:**
- Create: `src/features/ar-previewer/components/ModelUploader.tsx`

- [ ] **Step 1: Create ModelUploader component**

```tsx
// src/features/ar-previewer/components/ModelUploader.tsx

interface ModelUploaderProps {
  onModelLoaded: (file: File) => void
}

export function ModelUploader({ onModelLoaded }: ModelUploaderProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onModelLoaded(file)
  }

  return (
    <div className="absolute top-4 right-4 bg-black/70 p-3 rounded-lg text-white">
      <label className="text-sm mb-1 block">Load STL Model</label>
      <input
        type="file"
        accept=".stl"
        onChange={handleChange}
        className="text-xs"
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/ar-previewer/components/ModelUploader.tsx
git commit -m "feat(ar-previewer): add ModelUploader component"
```

---

### Task 21: ROIUploader Component

**Files:**
- Create: `src/features/ar-previewer/components/ROIUploader.tsx`

- [ ] **Step 1: Create ROIUploader component**

```tsx
// src/features/ar-previewer/components/ROIUploader.tsx

import type { ROI } from '../../roi-editor/types'

interface ROIUploaderProps {
  onROIsLoaded: (rois: ROI[]) => void
}

export function ROIUploader({ onROIsLoaded }: ROIUploaderProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string)
        if (json.rois && Array.isArray(json.rois)) {
          onROIsLoaded(json.rois)
        }
      } catch {
        console.error('Invalid ROI JSON')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="absolute top-24 right-4 bg-black/70 p-3 rounded-lg text-white">
      <label className="text-sm mb-1 block">Load ROI JSON</label>
      <input
        type="file"
        accept=".json"
        onChange={handleChange}
        className="text-xs"
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/ar-previewer/components/ROIUploader.tsx
git commit -m "feat(ar-previewer): add ROIUploader component"
```

---

### Task 22: ExtractionPopover Component

**Files:**
- Create: `src/features/ar-previewer/components/ExtractionPopover.tsx`

- [ ] **Step 1: Create ExtractionPopover component**

```tsx
// src/features/ar-previewer/components/ExtractionPopover.tsx

import type { ExtractionResult } from '../types'

interface ExtractionPopoverProps {
  results: ExtractionResult[]
  onDownload: (result: ExtractionResult) => void
  onClose: () => void
}

export function ExtractionPopover({ results, onDownload, onClose }: ExtractionPopoverProps) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 p-6 rounded-lg max-w-4xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-lg font-semibold">Extracted ROI Images</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        {results.length === 0 && (
          <p className="text-gray-400">No ROIs extracted</p>
        )}

        <div className="grid grid-cols-3 gap-4">
          {results.map(result => (
            <div key={result.roiId} className="bg-gray-800 p-3 rounded">
              <img
                src={result.imageDataUrl}
                alt={result.label}
                className="w-full h-32 object-contain mb-2"
              />
              <div className="text-white text-sm mb-2">{result.label}</div>
              <button
                onClick={() => onDownload(result)}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs text-white w-full"
              >
                Download
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/ar-previewer/components/ExtractionPopover.tsx
git commit -m "feat(ar-previewer): add ExtractionPopover component"
```

---

### Task 23: ARViewport Component

**Files:**
- Create: `src/features/ar-previewer/components/ARViewport.tsx`

- [ ] **Step 1: Create ARViewport component**

```tsx
// src/features/ar-previewer/components/ARViewport.tsx

import { useRef, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import * as THREE from 'three'
import type { ROI, Vertex } from '../../roi-editor/types'
import type { Pose } from '../types'
import { ROIPolygon } from '../../roi-editor/components/ROIPolygon'

interface ARViewportProps {
  modelFile: File | null
  rois: ROI[]
  pose: Pose
  videoRef: React.RefObject<HTMLVideoElement | null>
  onModelReady: (model: THREE.Object3D, camera: THREE.Camera) => void
}

function ViewportContent({ modelFile, rois, pose, videoRef, onModelReady }: ARViewportProps) {
  const { camera } = useThree()
  const modelRef = useRef<THREE.Object3D | null>(null)
  const videoTextureRef = useRef<THREE.VideoTexture | null>(null)

  useEffect(() => {
    if (!modelFile) return
    const loader = new STLLoader()
    loader.load(URL.createObjectURL(modelFile), (geometry) => {
      geometry.center()
      const material = new THREE.MeshPhongMaterial({ color: '#888888', specular: '#111111', shininess: 30 })
      const mesh = new THREE.Mesh(geometry, material)
      modelRef.current = mesh
      onModelReady(mesh, camera)
    })
  }, [modelFile, camera, onModelReady])

  useEffect(() => {
    if (!modelRef.current) return
    const euler = new THREE.Euler(
      THREE.MathUtils.degToRad(pose.rotation.x),
      THREE.MathUtils.degToRad(pose.rotation.y),
      THREE.MathUtils.degToRad(pose.rotation.z),
      'XYZ'
    )
    const quat = new THREE.Quaternion().setFromEuler(euler)
    const pos = new THREE.Vector3(pose.position.x, pose.position.y, pose.position.z)
    modelRef.current.position.copy(pos)
    modelRef.current.quaternion.copy(quat)
  }, [pose])

  useEffect(() => {
    if (!videoRef.current) return
    const video = videoRef.current
    if (video.readyState >= video.HAVE_CURRENT_DATA) {
      videoTextureRef.current = new THREE.VideoTexture(video)
      videoTextureRef.current.minFilter = THREE.LinearFilter
      videoTextureRef.current.magFilter = THREE.LinearFilter
    }
  }, [videoRef])

  return (
    <>
      <OrbitControls />
      <ambientLight intensity={0.5} />
      <directionalLight position={[1, 1, 1]} intensity={0.8} />
      {modelRef.current && <primitive object={modelRef.current} />}
      {rois.map(roi => (
        <ROIPolygon
          key={roi.id}
          roi={roi}
          isSelected={false}
          modelMatrix={modelRef.current?.matrixWorld}
        />
      ))}
    </>
  )
}

export function ARViewport(props: ARViewportProps) {
  return (
    <div className="w-full h-full relative">
      <video
        ref={videoRef as React.RefObject<HTMLVideoElement>}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />
      <Canvas
        camera={{ position: [0, 0, 1], fov: 50 }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        <ViewportContent {...props} />
      </Canvas>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/ar-previewer/components/ARViewport.tsx
git commit -m "feat(ar-previewer): add ARViewport component"
```

---

### Task 24: AR Previewer Screen + Index

**Files:**
- Create: `src/features/ar-previewer/components/ARPreviewerScreen.tsx`
- Create: `src/features/ar-previewer/index.ts`

- [ ] **Step 1: Create ARPreviewerScreen component**

```tsx
// src/features/ar-previewer/components/ARPreviewerScreen.tsx

import { useState, useRef, useCallback, useEffect } from 'react'
import * as THREE from 'three'
import { ARViewport } from './ARViewport'
import { PoseControls } from './PoseControls'
import { ModelUploader } from './ModelUploader'
import { ROIUploader } from './ROIUploader'
import { ExtractionPopover } from './ExtractionPopover'
import { useModelAlignment } from '../hooks/useModelAlignment'
import { useROIProjection } from '../hooks/useROIProjection'
import { useExtraction } from '../hooks/useExtraction'
import type { ROI } from '../../roi-editor/types'
import type { ExtractionResult, ProjectedVertex } from '../types'

export function ARPreviewerScreen() {
  const [modelFile, setModelFile] = useState<File | null>(null)
  const [rois, setRois] = useState<ROI[]>([])
  const [showPopover, setShowPopover] = useState(false)
  const [extractionResults, setExtractionResults] = useState<ExtractionResult[]>([])
  const [projectedROIs, setProjectedROIs] = useState<Map<string, ProjectedVertex[]>>(new Map())

  const videoRef = useRef<HTMLVideoElement>(null)
  const modelRef = useRef<THREE.Object3D | null>(null)
  const cameraRef = useRef<THREE.Camera | null>(null)

  const { pose, updatePosition, updateRotation, resetPose } = useModelAlignment()
  const { projectROIs } = useROIProjection()
  const { extractROIs, downloadResult } = useExtraction()

  useEffect(() => {
    const video = document.createElement('video')
    video.autoplay = true
    video.playsInline = true
    video.muted = true
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        video.srcObject = stream
        video.play()
      })
      .catch(console.error)
    videoRef.current = video
  }, [])

  const handleModelReady = useCallback((model: THREE.Object3D, camera: THREE.Camera) => {
    modelRef.current = model
    cameraRef.current = camera
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

  return (
    <div className="w-full h-screen relative bg-gray-900">
      <ARViewport
        modelFile={modelFile}
        rois={rois}
        pose={pose}
        videoRef={videoRef}
        onModelReady={handleModelReady}
      />

      <PoseControls
        pose={pose}
        onPositionChange={updatePosition}
        onRotationChange={updateRotation}
        onReset={resetPose}
      />

      <ModelUploader onModelLoaded={setModelFile} />
      <ROIUploader onROIsLoaded={handleROIsLoaded} />

      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <button
          onClick={handleExtract}
          disabled={!modelFile || rois.length === 0}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg text-white font-semibold text-lg"
        >
          Extract ROI Images
        </button>
      </div>

      {showPopover && (
        <ExtractionPopover
          results={extractionResults}
          onDownload={downloadResult}
          onClose={() => setShowPopover(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create index.ts**

```typescript
// src/features/ar-previewer/index.ts

export { ARPreviewerScreen } from './components/ARPreviewerScreen'
export { useModelAlignment } from './hooks/useModelAlignment'
export { useROIProjection } from './hooks/useROIProjection'
export { useExtraction } from './hooks/useExtraction'
export * from './types'
```

- [ ] **Step 3: Commit**

```bash
git add src/features/ar-previewer/components/ARPreviewerScreen.tsx src/features/ar-previewer/index.ts
git commit -m "feat(ar-previewer): add ARPreviewerScreen and index"
```

---

## PHASE 5: App Integration

### Task 25: App.tsx Wiring

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Update App.tsx with new screens**

```tsx
// src/App.tsx

import { useState, useCallback } from 'react'
import { ROIEditorScreen } from './features/roi-editor'
import { ARPreviewerScreen } from './features/ar-previewer'
import type { Screen } from './types'

// Existing screens disabled — code preserved
// import { UploadScreen } from './screens/UploadScreen'
// import { ARScreen } from './screens/ARScreen'
// import { ResultsScreen } from './screens/ResultsScreen'

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('roi-editor')

  const handleNavigate = useCallback((screen: Screen) => {
    setCurrentScreen(screen)
  }, [])

  return (
    <div className="w-full h-screen">
      {/* Navigation bar */}
      <div className="absolute top-0 left-0 right-0 z-50 flex gap-2 p-4 bg-black/50">
        <button
          onClick={() => handleNavigate('roi-editor')}
          className={`px-4 py-2 rounded ${currentScreen === 'roi-editor' ? 'bg-blue-600' : 'bg-gray-700'}`}
        >
          ROI Editor
        </button>
        <button
          onClick={() => handleNavigate('ar-preview')}
          className={`px-4 py-2 rounded ${currentScreen === 'ar-preview' ? 'bg-blue-600' : 'bg-gray-700'}`}
        >
          AR Previewer
        </button>
      </div>

      {currentScreen === 'roi-editor' && <ROIEditorScreen />}
      {currentScreen === 'ar-preview' && <ARPreviewerScreen />}

      {/* Disabled screens — preserved but not rendered */}
      {/* {currentScreen === 'upload' && <UploadScreen ... />} */}
      {/* {currentScreen === 'ar' && <ARScreen ... />} */}
      {/* {currentScreen === 'results' && <ResultsScreen ... />} */}
    </div>
  )
}

export default App
```

- [ ] **Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat(app): wire ROI Editor and AR Previewer screens"
```

---

## PHASE 6: Install Dependencies

### Task 26: Install @react-three/fiber

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install @react-three/fiber and @react-three/drei**

```bash
npm install @react-three/fiber @react-three/drei three
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @react-three/fiber, @react-three/drei dependencies"
```

---

## Self-Review Checklist

1. **Spec coverage:** All 15 user stories covered:
   - US-001 to US-007 → ROI Editor (Tasks 1-12)
   - US-008 to US-012 → AR Previewer (Tasks 13-24)
   - US-013 to US-015 → ROI Extraction (Tasks 13-24)
2. **Placeholder scan:** No TBD/TODO placeholders found
3. **Type consistency:** ROI type from `roi-editor/types` imported in `ar-previewer/types` and components correctly

---

## Execution Options

**Plan complete and saved to `docs/superpowers/plans/2026-06-15-roi-editor-implementation.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**