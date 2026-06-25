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
