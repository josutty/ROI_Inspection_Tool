import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import type { CADModel } from '../types'

interface ModelPreviewProps {
  model: CADModel | null
  wireframe?: boolean
  className?: string
}

export function ModelPreview({ model, wireframe = true, className = '' }: ModelPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const meshRef = useRef<THREE.Mesh | null>(null)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1a1a2e)
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(0, 0, 2)
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(1, 1, 1)
    scene.add(directionalLight)

    // Grid helper
    const gridHelper = new THREE.GridHelper(2, 10, 0x444444, 0x333333)
    scene.add(gridHelper)

    // Animation loop
    let rotation = 0
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate)
      rotation += 0.005
      if (meshRef.current) {
        meshRef.current.rotation.y = rotation
      }
      renderer.render(scene, camera)
    }
    animate()

    // Handle resize
    const handleResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', handleResize)
      if (rendererRef.current && container.contains(rendererRef.current.domElement)) {
        container.removeChild(rendererRef.current.domElement)
      }
      rendererRef.current?.dispose()
    }
  }, [])

  useEffect(() => {
    if (!sceneRef.current) return

    // Remove existing mesh
    if (meshRef.current) {
      sceneRef.current.remove(meshRef.current)
      meshRef.current.geometry.dispose()
      if (Array.isArray(meshRef.current.material)) {
        meshRef.current.material.forEach(m => m.dispose())
      } else {
        meshRef.current.material.dispose()
      }
      meshRef.current = null
    }

    if (!model) return

    // Create new mesh
    const material = wireframe
      ? new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true })
      : new THREE.MeshStandardMaterial({
          color: 0x00ffff,
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide,
        })

    const mesh = new THREE.Mesh(model.geometry, material)
    meshRef.current = mesh
    sceneRef.current.add(mesh)
  }, [model, wireframe])

  return (
    <div
      ref={containerRef}
      className={`w-full h-full min-h-[300px] ${className}`}
    />
  )
}

interface ModelPreviewFromFileProps {
  file: File | null
  wireframe?: boolean
  className?: string
}

export function ModelPreviewFromFile({ file, wireframe = true, className = '' }: ModelPreviewFromFileProps) {
  const [model, setModel] = useState<CADModel | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setModel(null)
      return
    }

    setLoading(true)
    setError(null)

    const arrayBuffer = file.arrayBuffer()
    arrayBuffer
      .then((buffer) => {
        const loader = new STLLoader()
        const geometry = loader.parse(buffer)

        // Center and scale
        geometry.computeBoundingBox()
        const center = new THREE.Vector3()
        geometry.boundingBox!.getCenter(center)
        geometry.translate(-center.x, -center.y, -center.z)

        geometry.computeBoundingBox()
        const size = new THREE.Vector3()
        geometry.boundingBox!.getSize(size)
        const maxDim = Math.max(size.x, size.y, size.z)
        if (maxDim > 1) {
          const scale = 1 / maxDim
          geometry.scale(scale, scale, scale)
        }

        setModel({ geometry, name: file.name })
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message || 'Failed to load model')
        setLoading(false)
      })
  }, [file])

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-[300px] ${className}`}>
        <div className="text-cyan-400">Loading model...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center min-h-[300px] ${className}`}>
        <div className="text-red-400">{error}</div>
      </div>
    )
  }

  return <ModelPreview model={model} wireframe={wireframe} className={className} />
}