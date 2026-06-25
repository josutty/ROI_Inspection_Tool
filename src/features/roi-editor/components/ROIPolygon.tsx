// src/features/roi-editor/components/ROIPolygon.tsx

import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import type { ROI } from '../types'

interface ROIPolygonProps {
  roi: ROI
  isSelected: boolean
  modelMatrix?: THREE.Matrix4
}

export function ROIPolygon({
  roi,
  isSelected,
  modelMatrix,
}: ROIPolygonProps) {
  const lineRef = useRef<THREE.LineLoop>(null)
  const spheresRef = useRef<THREE.InstancedMesh>(null)
  const textSpriteRef = useRef<THREE.Sprite>(null)

  // Create text texture for label
  const createTextTexture = (text: string, color: string) => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!
    canvas.width = 512
    canvas.height = 128
    
    context.fillStyle = 'rgba(0, 0, 0, 0)'
    context.fillRect(0, 0, canvas.width, canvas.height)
    
    context.font = 'bold 48px Arial'
    context.fillStyle = color
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(text, canvas.width / 2, canvas.height / 2)
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
  }

  useEffect(() => {
    if (!lineRef.current || !spheresRef.current) return

    const points = roi.vertices.map(
      v => new THREE.Vector3(v.x, v.y, v.z)
    )

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
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    )

    if (lineRef.current.geometry) {
      lineRef.current.geometry.dispose()
    }

    lineRef.current.geometry = geometry

    const color = isSelected
      ? '#ffff00'
      : roi.color ?? '#00ffff'

    // Keep ROI edges visible regardless of occlusion - make them thicker and brighter
    const lineMaterial = new THREE.LineBasicMaterial({
      color,
      depthTest: false,
      depthWrite: false,
      linewidth: 3, // Note: this may not work on all platforms, but we set it anyway
      opacity: 1.0,
      transparent: false
    })

    if (lineRef.current.material) {
      ;(lineRef.current.material as THREE.Material).dispose()
    }

    lineRef.current.material = lineMaterial
    lineRef.current.renderOrder = 999

    // Keep ROI vertices visible regardless of occlusion - make them bigger
    const sphereGeometry = new THREE.SphereGeometry(0.008, 16, 16)

    const sphereMaterial = new THREE.MeshBasicMaterial({
      color,
      depthTest: false,
      depthWrite: false,
    })

    if (spheresRef.current.geometry) {
      spheresRef.current.geometry.dispose()
    }

    if (spheresRef.current.material) {
      ;(spheresRef.current.material as THREE.Material).dispose()
    }

    spheresRef.current.geometry = sphereGeometry
    spheresRef.current.material = sphereMaterial
    spheresRef.current.renderOrder = 999

    const matrix = new THREE.Matrix4()

    points.forEach((p, i) => {
      matrix.makeTranslation(p.x, p.y, p.z)
      spheresRef.current!.setMatrixAt(i, matrix)
    })

    spheresRef.current.count = points.length
    spheresRef.current.instanceMatrix.needsUpdate = true

    // Create and position text label sprite (if ref is available)
    if (textSpriteRef.current) {
      const center = new THREE.Vector3()
      points.forEach(p => center.add(p))
      center.divideScalar(points.length)

      // Create text texture
      const textTexture = createTextTexture(roi.label, color)
      const spriteMaterial = new THREE.SpriteMaterial({
        map: textTexture,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        opacity: 1.0
      })

      if (textSpriteRef.current.material) {
        if (textSpriteRef.current.material.map) {
          textSpriteRef.current.material.map.dispose()
        }
        textSpriteRef.current.material.dispose()
      }

      textSpriteRef.current.material = spriteMaterial
      textSpriteRef.current.position.copy(center)
      textSpriteRef.current.scale.set(0.3, 0.075, 1)
      textSpriteRef.current.renderOrder = 1000
    }
  }, [roi, isSelected, modelMatrix])

  return (
    <group renderOrder={999}>
      <lineLoop ref={lineRef} renderOrder={999}>
        <bufferGeometry />
        <lineBasicMaterial
          color={isSelected ? '#ffff00' : roi.color ?? '#00ffff'}
          depthTest={false}
          depthWrite={false}
          linewidth={3}
          opacity={1.0}
          transparent={false}
        />
      </lineLoop>

      <instancedMesh
        ref={spheresRef}
        args={[undefined, undefined, roi.vertices.length]}
        renderOrder={999}
      >
        <sphereGeometry args={[0.008, 16, 16]} />
        <meshBasicMaterial
          color={isSelected ? '#ffff00' : roi.color ?? '#00ffff'}
          depthTest={false}
          depthWrite={false}
        />
      </instancedMesh>

      <sprite ref={textSpriteRef} renderOrder={1000}>
        <spriteMaterial
          depthTest={false}
          depthWrite={false}
          transparent={true}
          opacity={1.0}
        />
      </sprite>
    </group>
  )
}