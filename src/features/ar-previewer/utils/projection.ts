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
