import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { xrManager } from '../utils/xrSessionManager'
import type { CADModel } from '../types'

interface ARScreenProps {
  model: CADModel
  onInspect: (snapshot: string, modelSnapshot: ImageData, cameraSnapshot: ImageData) => void
  onBack: () => void
  overlayMode: 'wireframe' | 'solid'
  onToggleOverlay: () => void
}

export function ARScreen({ model, onInspect, onBack, overlayMode, onToggleOverlay }: ARScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const meshRef = useRef<THREE.Mesh | null>(null)
  const reticleRef = useRef<THREE.Mesh | null>(null)
  const frameRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)
  const sessionRef = useRef<XRSession | null>(null)
  const hitTestSourceRef = useRef<any>(null)
  const localSpaceRef = useRef<any>(null)
  const modelPositionRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, -1))

  const [isPoseLocked, setIsPoseLocked] = useState(false)
  const [showHitIndicator, setShowHitIndicator] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)

  // Initialize Three.js with WebXR AR
  useEffect(() => {
    const startAR = async () => {
      try {
        // Start camera for preview
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        // Check WebXR support
        const supported = await xrManager.isSupported()
        if (!supported) {
          setSessionError('WebXR AR not supported')
          return
        }

        // Start WebXR AR
        if (xrManager.isActive()) {
          await xrManager.endSession()
          await new Promise(r => setTimeout(r, 500))
        }

        const session = await xrManager.requestSession()
        sessionRef.current = session

        // Get reference space for hit-test
        const refSpace = await session.requestReferenceSpace('local')
        localSpaceRef.current = refSpace

        // Request hit-test source
        const hitTestSource = await session.requestHitTestSource!({ space: refSpace })
        hitTestSourceRef.current = hitTestSource

        initThreeWithXR(session)
        setSessionError(null)
      } catch (err) {
        setSessionError('Failed to start AR: ' + (err as Error).message)
      }
    }

    startAR()

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
      hitTestSourceRef.current = null
      xrManager.endSession()
    }
  }, [])

  const initThreeWithXR = (session: XRSession) => {
    if (!containerRef.current) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100)
    camera.position.set(0, 0, 0)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0)
    renderer.xr.enabled = true
    rendererRef.current = renderer
    containerRef.current.appendChild(renderer.domElement)

    // Connect WebXR session to Three.js
    renderer.xr.setSession(session)

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const dir = new THREE.DirectionalLight(0xffffff, 2)
    dir.position.set(1, 2, 2)
    scene.add(dir)

    // Create model mesh (starts at z = -1, 1 meter in front)
    const material = overlayMode === 'wireframe'
      ? new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true })
      : new THREE.MeshStandardMaterial({
          color: 0x00f0ff,
          transparent: true,
          opacity: 0.6,
        })

    const mesh = new THREE.Mesh(model.geometry, material)
    mesh.position.copy(modelPositionRef.current)
    meshRef.current = mesh
    scene.add(mesh)

    // Reticle ring for surface detection
    const reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    )
    reticle.matrixAutoUpdate = false
    reticle.visible = false
    reticleRef.current = reticle
    scene.add(reticle)

    sceneRef.current = scene

    // XR render loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate)

      // Perform hit-test if session is active and not locked
      if (sessionRef.current && hitTestSourceRef.current && !isPoseLocked && localSpaceRef.current) {
        try {
          const frame = (sessionRef.current as any).frame
          if (frame) {
            const hitTestResults = frame.getHitTestResults(hitTestSourceRef.current)
            if (hitTestResults.length > 0) {
              const pose = hitTestResults[0].getPose(localSpaceRef.current)
              if (pose) {
                // Update reticle position from hit test pose matrix
                reticle.visible = true
                reticle.matrix.fromArray(pose.transform.matrix)
                setShowHitIndicator(true)

                // If not locked, follow the reticle position
                if (!isPoseLocked && meshRef.current) {
                  // Extract position from reticle matrix and lerp
                  const reticlePos = new THREE.Vector3()
                  reticle.matrix.decompose(reticlePos, new THREE.Quaternion(), new THREE.Vector3())
                  meshRef.current.position.lerp(reticlePos, 0.1)
                  modelPositionRef.current.copy(meshRef.current.position)
                }
              }
            } else {
              reticle.visible = false
              setShowHitIndicator(false)
            }
          }
        } catch (e) {
          // Hit-test temporarily failed
        }
      }

      renderer.render(scene, camera)
    }
    animate()
  }

  // Update material when overlay mode changes
  useEffect(() => {
    if (!meshRef.current) return

    const oldMaterial = meshRef.current.material
    const newMaterial = overlayMode === 'wireframe'
      ? new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true })
      : new THREE.MeshStandardMaterial({
          color: 0x00f0ff,
          transparent: true,
          opacity: 0.6,
        })

    meshRef.current.material = newMaterial

    if (Array.isArray(oldMaterial)) {
      oldMaterial.forEach(m => m.dispose())
    } else {
      oldMaterial.dispose()
    }
  }, [overlayMode])

  const handleLockPose = useCallback(() => {
    // Snap model to reticle position
    if (reticleRef.current && meshRef.current) {
      const position = new THREE.Vector3()
      const quaternion = new THREE.Quaternion()
      const scale = new THREE.Vector3()
      reticleRef.current.matrix.decompose(position, quaternion, scale)
      meshRef.current.position.copy(position)
      modelPositionRef.current.copy(position)
    }
    setIsPoseLocked(true)
    setShowHitIndicator(false)
  }, [])

  const handleInspect = useCallback(() => {
    if (!videoRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current) return

    const video = videoRef.current
    const renderer = rendererRef.current
    const displayWidth = renderer.domElement.clientWidth
    const displayHeight = renderer.domElement.clientHeight

    if (displayWidth === 0 || displayHeight === 0) return

    // Capture video frame
    const camCanvas = document.createElement('canvas')
    camCanvas.width = displayWidth
    camCanvas.height = displayHeight
    const ctx = camCanvas.getContext('2d')
    if (!ctx) return

    const videoRatio = video.videoWidth / video.videoHeight
    const canvasRatio = displayWidth / displayHeight
    let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight

    if (videoRatio > canvasRatio) {
      sw = video.videoHeight * canvasRatio
      sx = (video.videoWidth - sw) / 2
    } else {
      sh = video.videoWidth / canvasRatio
      sy = (video.videoHeight - sh) / 2
    }

    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, displayWidth, displayHeight)
    const snapshot = camCanvas.toDataURL('image/png')

    // Capture Three.js canvas (model overlay)
    renderer.render(sceneRef.current, cameraRef.current)
    const cadCanvas = document.createElement('canvas')
    cadCanvas.width = displayWidth
    cadCanvas.height = displayHeight
    const cadCtx = cadCanvas.getContext('2d')
    if (!cadCtx) return

    cadCtx.drawImage(renderer.domElement, 0, 0, displayWidth, displayHeight)
    const modelImageData = cadCtx.getImageData(0, 0, displayWidth, displayHeight)
    const cameraImageData = ctx.getImageData(0, 0, displayWidth, displayHeight)

    onInspect(snapshot, modelImageData, cameraImageData)
  }, [onInspect])

  const handleBack = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
    }
    if (rendererRef.current) {
      rendererRef.current.dispose()
    }
    xrManager.endSession()
    onBack()
  }, [onBack])

  return (
    <div className="fixed inset-0 bg-gray-900">
      {/* Camera layer */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          autoPlay
          muted
        />
      </div>

      {/* Three.js layer */}
      <div ref={containerRef} className="absolute inset-0 z-10" />

      {/* UI layer */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-20">
        <button
          onClick={handleBack}
          className="bg-gray-800/80 text-white px-4 py-2 rounded-lg"
        >
          ← Back
        </button>

        <button
          onClick={onToggleOverlay}
          className="bg-gray-800/80 text-white px-4 py-2 rounded-lg"
        >
          Mode: {overlayMode === 'wireframe' ? 'Wireframe' : 'Solid'}
        </button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
        {sessionError && (
          <div className="mb-4 p-3 bg-red-900/80 text-red-200 rounded-lg text-sm text-center">
            {sessionError}
          </div>
        )}

        <div className="flex flex-col items-center gap-4">
          {!isPoseLocked ? (
            <>
              <div className="text-cyan-400 text-sm mb-2 text-center">
                {showHitIndicator
                  ? 'White ring shows where model will be placed'
                  : 'Point camera at a flat surface...'}
              </div>
              <button
                onClick={handleLockPose}
                className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-4 rounded-xl font-bold text-lg w-full max-w-xs"
              >
                Lock Pose & Track
              </button>
              <div className="text-gray-400 text-sm text-center">
                Model follows the white ring • Tap lock when aligned
              </div>
            </>
          ) : (
            <>
              <div className="text-green-400 text-sm mb-2">
                ✓ Tracking active - model anchored to real world
              </div>
              <button
                onClick={handleInspect}
                className="bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-xl font-bold text-lg w-full max-w-xs"
              >
                Inspect
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}