interface HomeScreenProps {
  onStartInspection: () => void
  onOpenROIEditor: () => void
}

export function HomeScreen({ onStartInspection, onOpenROIEditor }: HomeScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50/30 to-blue-100 flex flex-col">
      {/* Glassmorphic Header */}
      <div className="px-8 pt-10 pb-6 bg-white/60 backdrop-blur-2xl border-b border-white/20 shadow-lg">
        <h1 className="text-5xl font-black text-gray-900 mb-3 tracking-tight bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">ROI Inspection Studio</h1>
        <p className="text-gray-600 text-base font-medium">Upload your STL model and ROI definitions for inspection.</p>
      </div>

      {/* Main Content with Glassmorphic Cards */}
      <div className="flex-1 px-8 py-8 overflow-y-auto bg-gradient-to-br from-white/40 via-blue-50/30 to-purple-50/40 backdrop-blur-xl">
        {/* Action Cards */}
        <div className="grid gap-6 mb-8 max-w-4xl mx-auto">
          {/* Upload STL & ROI JSON Card - Glassmorphic */}
          <div className="group bg-white/70 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 p-8 hover:shadow-3xl hover:border-white/50 hover:-translate-y-1 transition-all duration-500">
            <div className="flex items-center gap-5 mb-5">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 tracking-tight">Upload STL & ROI JSON</h3>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-6 font-medium">Upload model and extract ROI images for inspection.</p>
            <button
              onClick={onStartInspection}
              className="group/btn relative w-full py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white font-bold rounded-2xl hover:from-blue-700 hover:via-purple-700 hover:to-blue-700 transition-all shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 flex items-center justify-center gap-3 overflow-hidden hover:scale-105 duration-300"
            >
              {/* Shimmer Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover/btn:translate-x-[200%] transition-transform duration-1000"></div>
              
              <span className="relative z-10 flex items-center gap-3 text-base">
                Start Inspection
                <svg className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>
          </div>

          {/* ROI Addition Card - Glassmorphic */}
          <div className="group bg-white/70 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 p-8 hover:shadow-3xl hover:border-white/50 hover:-translate-y-1 transition-all duration-500">
            <div className="flex items-center gap-5 mb-5">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-600/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 tracking-tight">ROI Addition</h3>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-6 font-medium">Create and manage ROI definitions</p>
            <button
              onClick={onOpenROIEditor}
              className="group/btn relative w-full py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 text-white font-bold rounded-2xl hover:from-purple-700 hover:via-pink-700 hover:to-purple-700 transition-all shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 flex items-center justify-center gap-3 overflow-hidden hover:scale-105 duration-300"
            >
              {/* Shimmer Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover/btn:translate-x-[200%] transition-transform duration-1000"></div>
              
              <span className="relative z-10 flex items-center gap-3 text-base">
                Open ROI Editor
                <svg className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
