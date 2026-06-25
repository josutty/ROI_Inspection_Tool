import { useState, useCallback, useRef, useEffect } from 'react'

interface WebXRState {
  isSupported: boolean
  isSessionActive: boolean
  session: XRSession | null
  refSpace: XRReferenceSpace | null
}

export function useWebXR() {
  const [state, setState] = useState<WebXRState>({
    isSupported: false,
    isSessionActive: false,
    session: null,
    refSpace: null,
  })

  const sessionRef = useRef<XRSession | null>(null)
  const refSpaceRef = useRef<XRReferenceSpace | null>(null)

  useEffect(() => {
    if ('xr' in navigator) {
      (navigator as any).xr.isSessionSupported('immersive-ar').then((supported: boolean) => {
        setState(prev => ({ ...prev, isSupported: supported }))
      }).catch(() => {
        setState(prev => ({ ...prev, isSupported: false }))
      })
    }
  }, [])

  const startSession = useCallback(async () => {
    if (!('xr' in navigator)) {
      throw new Error('WebXR not supported')
    }

    const xr = (navigator as any).xr
    const supported = await xr.isSessionSupported('immersive-ar')
    if (!supported) {
      throw new Error('WebXR AR not supported on this device')
    }

    const session = await xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test', 'dom-overlay'],
      optionalFeatures: ['anchors', 'plane-detection'],
      domOverlay: { root: document.body },
    } as XRSessionInit)

    const refSpace = await session.requestReferenceSpace('local')
    void refSpace // reserved for future use
    const refSpaceRef_local = await session.requestReferenceSpace('viewer')

    sessionRef.current = session
    refSpaceRef.current = refSpaceRef_local

    session.addEventListener('end', () => {
      setState(prev => ({
        ...prev,
        isSessionActive: false,
        session: null,
        refSpace: null,
      }))
      sessionRef.current = null
      refSpaceRef.current = null
    })

    setState({
      isSupported: true,
      isSessionActive: true,
      session,
      refSpace: refSpaceRef_local,
    })

    return { session, refSpace: refSpaceRef_local }
  }, [])

  const endSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.end()
    }
  }, [])

  const getSession = useCallback(() => sessionRef.current, [])
  const getRefSpace = useCallback(() => refSpaceRef.current, [])

  return {
    ...state,
    startSession,
    endSession,
    getSession,
    getRefSpace,
  }
}