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
