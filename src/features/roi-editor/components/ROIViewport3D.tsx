// src/features/roi-editor/components/ROIViewport3D.tsx

import { useRef, useEffect, useCallback } from 'react'
import { Canvas, useThree, ThreeEvent } from '@react-three/fiber'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import * as THREE from 'three'
import type { ROI, Vertex } from '../types'
import { ROIPolygon } from './ROIPolygon'

interface ROIViewport3DProps {
  modelUrl: string | null
  rois: ROI[]
  drawingVertices: Vertex[]
  selectedROIId: string | null
  cursorVertex: Vertex | null
  isDrawing: boolean
  onModelReady: (
    model: THREE.Object3D,
    camera: THREE.Camera,
    canvas: HTMLCanvasElement
  ) => void
  onVertexClick: (vertex: Vertex) => void
  onCursorMove: (clientX: number, clientY: number) => void
}

function ViewportContent({
  modelUrl,
  rois,
  drawingVertices,
  selectedROIId,
  cursorVertex,
  isDrawing,
  onModelReady,
  onVertexClick,
  onCursorMove,
}: ROIViewport3DProps) {
  const { camera, gl, scene } = useThree()

  const modelRef = useRef<THREE.Object3D | null>(null)
  const cursorSphereRef = useRef<THREE.Mesh>(null)
  const controlsRef = useRef<OrbitControls | null>(null)

  useEffect(() => {
    if (!modelUrl) return

    const loader = new STLLoader()

    loader.load(modelUrl, geometry => {
      geometry.center()
      geometry.computeVertexNormals()

      const material = new THREE.MeshPhongMaterial({
        color: '#888888',
        specular: '#111111',
        shininess: 30,
      })

      const mesh = new THREE.Mesh(geometry, material)

      scene.add(mesh)

      modelRef.current = mesh

      onModelReady(mesh, camera, gl.domElement)
    })

    return () => {
      if (modelRef.current) {
        scene.remove(modelRef.current)

        if ((modelRef.current as THREE.Mesh).geometry) {
          ;(modelRef.current as THREE.Mesh).geometry.dispose()
        }

        const material = (modelRef.current as THREE.Mesh)
          .material as THREE.Material

        material?.dispose()
      }
    }
  }, [modelUrl, camera, gl, scene, onModelReady])

  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement)

    controls.enableDamping = true
    controls.dampingFactor = 0.05

    controlsRef.current = controls

    return () => {
      controls.dispose()
    }
  }, [camera, gl])

  useEffect(() => {
    if (!cursorSphereRef.current) return

    if (cursorVertex && modelRef.current) {
      const position = new THREE.Vector3(
        cursorVertex.x,
        cursorVertex.y,
        cursorVertex.z
      )

      position.applyMatrix4(modelRef.current.matrixWorld)

      cursorSphereRef.current.position.copy(position)
      cursorSphereRef.current.visible = true
    } else {
      cursorSphereRef.current.visible = false
    }
  }, [cursorVertex])

  const pointerDownRef = useRef<{ x: number; y: number } | null>(null)

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!isDrawing || !modelRef.current) return

      pointerDownRef.current = {
        x: e.clientX,
        y: e.clientY,
      }
    },
    [isDrawing]
  )

  const handlePointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (
        !isDrawing ||
        !modelRef.current ||
        !pointerDownRef.current
      ) {
        return
      }

      const dx = e.clientX - pointerDownRef.current.x
      const dy = e.clientY - pointerDownRef.current.y

      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < 10) {
        const raycaster = new THREE.Raycaster()
        const mouse = new THREE.Vector2()

        const rect = gl.domElement.getBoundingClientRect()

        mouse.x =
          ((e.clientX - rect.left) / rect.width) * 2 - 1

        mouse.y =
          -((e.clientY - rect.top) / rect.height) * 2 + 1

        raycaster.setFromCamera(mouse, camera)

        const intersects = raycaster.intersectObject(
          modelRef.current,
          true
        )

        if (intersects.length > 0) {
          const localPoint =
            modelRef.current.worldToLocal(
              intersects[0].point.clone()
            )

          onVertexClick({
            x: localPoint.x,
            y: localPoint.y,
            z: localPoint.z,
          })
        }
      }

      pointerDownRef.current = null
    },
    [isDrawing, camera, gl, onVertexClick]
  )

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!isDrawing || !modelRef.current) return

      onCursorMove(e.clientX, e.clientY)
    },
    [isDrawing, onCursorMove]
  )

  return (
    <>
      <ambientLight intensity={0.5} />

      <directionalLight
        position={[1, 1, 1]}
        intensity={0.8}
      />

      {modelRef.current && (
        <primitive
          object={modelRef.current}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerMove={handlePointerMove}
        />
      )}

      {/* Saved ROIs */}
      {rois.map(roi => (
        <ROIPolygon
          key={roi.id}
          roi={roi}
          isSelected={roi.id === selectedROIId}
          modelMatrix={modelRef.current?.matrixWorld}
        />
      ))}

      {/* Live polygon while drawing */}
      {isDrawing && drawingVertices.length > 0 && (
        <ROIPolygon
          roi={{
            id: '__draft__',
            label: 'Draft ROI',
            color: '#ffff00',
            vertices: drawingVertices,
          }}
          isSelected={true}
          modelMatrix={modelRef.current?.matrixWorld}
        />
      )}

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
      camera={{
        position: [0, 0, 1],
        fov: 50,
      }}
      style={{
        width: '100%',
        height: '100%',
      }}
    >
      <ViewportContent {...props} />
    </Canvas>
  )
}