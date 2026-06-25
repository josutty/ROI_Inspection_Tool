import { useRef, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js'
import * as THREE from 'three'
import type { ROI } from '../../roi-editor/types'
import type { Pose } from '../types'
import { ROIPolygon } from '../../roi-editor/components/ROIPolygon'

interface ARViewportProps {
  modelFile: File | null
  rois: ROI[]
  pose: Pose
  renderMode: 'default' | 'edges'
  onModelReady: (model: THREE.Object3D, camera: THREE.Camera) => void
}

function ViewportContent({ modelFile, rois, pose, renderMode, onModelReady }: ARViewportProps) {
  const { camera, gl, scene } = useThree()
  const modelRef = useRef<THREE.Object3D | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)

  useEffect(() => {
    gl.setClearColor(0x000000, 0)
  }, [gl])

  useEffect(() => {
    if (!modelFile) return
    
    const loadModel = async () => {
      try {
        const fileExtension = modelFile.name.split('.').pop()?.toLowerCase()
        
        if (fileExtension === 'stl') {
          // Load STL file using arrayBuffer to avoid RangeError
          const loader = new STLLoader()
          const arrayBuffer = await modelFile.arrayBuffer()
          const geometry = loader.parse(arrayBuffer)
          
          // Center geometry
          geometry.center()

          // Solid mesh with default material
          const material = new THREE.MeshPhongMaterial({ 
            color: '#888888', 
            specular: '#111111', 
            shininess: 30,
            side: THREE.DoubleSide
          })
          const mesh = new THREE.Mesh(geometry, material)

          // Edges overlay
          const edgesGeometry = new THREE.EdgesGeometry(geometry, 15)
          const edgeMaterial = new THREE.LineBasicMaterial({ color: '#00ffff', linewidth: 1 })
          const edges = new THREE.LineSegments(edgesGeometry, edgeMaterial)

          // Group mesh + edges so they move together
          const group = new THREE.Group()
          group.add(mesh)
          group.add(edges)
          
          // Clear previous model
          if (modelRef.current) {
            scene.remove(modelRef.current)
          }
          
          scene.add(group)
          modelRef.current = group
          onModelReady(group, camera)
        } else if (fileExtension === 'dae') {
          // Load COLLADA file
          const loader = new ColladaLoader()
          const text = await modelFile.text()
          const blob = new Blob([text], { type: 'model/vnd.collada+xml' })
          const url = URL.createObjectURL(blob)
          
          return new Promise((resolve, reject) => {
            loader.load(
              url,
              (collada) => {
                URL.revokeObjectURL(url)
                const model = collada.scene
                
                // Center and scale the model
                const box = new THREE.Box3().setFromObject(model)
                const center = box.getCenter(new THREE.Vector3())
                const size = box.getSize(new THREE.Vector3())
                
                model.position.sub(center)
                
                const maxDim = Math.max(size.x, size.y, size.z)
                if (maxDim > 2) {
                  const scale = 2 / maxDim
                  model.scale.set(scale, scale, scale)
                }
                
                // Ensure materials are visible
                model.traverse((child) => {
                  if (child instanceof THREE.Mesh) {
                    if (child.material) {
                      if (Array.isArray(child.material)) {
                        child.material.forEach(mat => {
                          if (mat instanceof THREE.MeshPhongMaterial || mat instanceof THREE.MeshStandardMaterial) {
                            mat.side = THREE.DoubleSide
                          }
                        })
                      } else {
                        if (child.material instanceof THREE.MeshPhongMaterial || child.material instanceof THREE.MeshStandardMaterial) {
                          child.material.side = THREE.DoubleSide
                        }
                      }
                    }
                    child.castShadow = true
                    child.receiveShadow = true
                  }
                })
                
                // Clear previous model
                if (modelRef.current) {
                  scene.remove(modelRef.current)
                }
                
                scene.add(model)
                modelRef.current = model
                onModelReady(model, camera)
                resolve(true)
              },
              undefined,
              (error) => {
                URL.revokeObjectURL(url)
                console.error('Error loading DAE:', error)
                reject(error)
              }
            )
          })
        } else {
          console.error(`Unsupported file format: .${fileExtension}`)
        }
      } catch (error) {
        console.error('Error loading model:', error)
      }
    }

    loadModel()

    return () => {
      // Cleanup
      if (modelRef.current) {
        scene.remove(modelRef.current)
        modelRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose()
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => mat.dispose())
            } else {
              child.material.dispose()
            }
          }
        })
      }
    }
  }, [modelFile, camera, onModelReady, scene])

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
    scene.background = null
  }, [scene])

  useEffect(() => {
    if (!modelRef.current) return
    const mesh = modelRef.current.children[0] as THREE.Mesh
    const edges = modelRef.current.children[1] as THREE.LineSegments
    if (!mesh || !edges) return
    if (renderMode === 'edges') {
      mesh.visible = false
    } else {
      mesh.visible = true
    }
  }, [renderMode])

  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement)
    controls.enableDamping = true
    controlsRef.current = controls
    return () => controls.dispose()
  }, [camera, gl])

  return (
    <>
      {controlsRef.current && <primitive object={controlsRef.current} />}
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
    <div className="absolute inset-0 z-10" style={{ opacity: 0.8 }}>
      <Canvas
        camera={{ position: [0, 0, 1], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
      >
        <ViewportContent {...props} />
      </Canvas>
    </div>
  )
}
