// Global WebXR session manager singleton
class XRSessionManager {
  private static instance: XRSessionManager | null = null
  private session: XRSession | null = null
  private sessionEnding: Promise<void> | null = null

  static getInstance(): XRSessionManager {
    if (!XRSessionManager.instance) {
      XRSessionManager.instance = new XRSessionManager()
    }
    return XRSessionManager.instance
  }

  async isSupported(): Promise<boolean> {
    if (!('xr' in navigator)) return false
    try {
      return await (navigator as any).xr.isSessionSupported('immersive-ar')
    } catch {
      return false
    }
  }

  async requestSession(): Promise<XRSession> {
    // If session is ending, wait for it to fully end
    if (this.sessionEnding) {
      await this.sessionEnding
      this.sessionEnding = null
      // Additional delay for browser to fully release
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // If session already exists, throw error
    if (this.session) {
      throw new Error('Session already exists. Call endSession() first.')
    }

    const xr = (navigator as any).xr
    const session = await xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay'],
      domOverlay: { root: document.body },
    } as XRSessionInit)

    this.session = session

    session.addEventListener('end', () => {
      this.session = null
      this.sessionEnding = null
    })

    return session
  }

  async endSession(): Promise<void> {
    if (!this.session) return

    const sessionToEnd = this.session
    this.session = null

    this.sessionEnding = sessionToEnd.end().then(() => {
      this.sessionEnding = null
    }).catch(() => {
      this.sessionEnding = null
    })

    await this.sessionEnding
  }

  getSession(): XRSession | null {
    return this.session
  }

  isActive(): boolean {
    return this.session !== null
  }
}

export const xrManager = XRSessionManager.getInstance()