import { useState } from 'react'
import { ROIEditorScreen } from './features/roi-editor'
import { ARPreviewerScreen } from './features/ar-previewer'
import { ROISummaryScreen } from './screens/ROISummaryScreen'
import { HomeScreen } from './screens/HomeScreen'
import type { ProcessResponse } from './features/ar-previewer/types'

interface ROISummaryState {
  fullFrameImageDataUrl: string
  results: ProcessResponse
}

type Screen = 'home' | 'inspection' | 'roi-editor'

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home')
  const [showROIEditor, setShowROIEditor] = useState(false)
  const [roiSummaryState, setRoiSummaryState] = useState<ROISummaryState | null>(null)

  return (
    <div className="w-full h-[100dvh]">
      {/* Home Screen */}
      {currentScreen === 'home' && (
        <HomeScreen
          onStartInspection={() => setCurrentScreen('inspection')}
          onOpenROIEditor={() => setCurrentScreen('roi-editor')}
        />
      )}

      {/* AR Previewer/Inspection Screen */}
      {currentScreen === 'inspection' && (
        <ARPreviewerScreen
          showROIEditor={showROIEditor}
          onToggleROIEditor={() => setShowROIEditor(!showROIEditor)}
          onNavigateToROISummary={(data) => {
            setRoiSummaryState(data)
          }}
          onBack={() => setCurrentScreen('home')}
        />
      )}

      {/* ROI Editor Screen */}
      {currentScreen === 'roi-editor' && (
        <div className="absolute inset-0 z-40">
          <ROIEditorScreen onClose={() => setCurrentScreen('home')} />
        </div>
      )}

      {/* ROI Editor overlay (when opened from inspection) */}
      {showROIEditor && currentScreen === 'inspection' && (
        <div className="absolute inset-0 z-40">
          <ROIEditorScreen onClose={() => setShowROIEditor(false)} />
        </div>
      )}

      {/* ROI Summary screen */}
      {roiSummaryState && (
        <div className="absolute inset-0 z-50">
          <ROISummaryScreen
            fullFrameImageDataUrl={roiSummaryState.fullFrameImageDataUrl}
            results={roiSummaryState.results}
            labels={[]}
            onBack={() => {
              setRoiSummaryState(null)
            }}
            onFinish={() => {
              setRoiSummaryState(null)
              setCurrentScreen('home')
            }}
          />
        </div>
      )}
    </div>
  )
}

export default App
