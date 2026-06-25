import type { Pose } from '../types'

interface PoseControlsProps {
  pose: Pose
  renderMode: 'default' | 'edges'
  onPositionChange: (axis: 'x' | 'y' | 'z', value: number) => void
  onRotationChange: (axis: 'x' | 'y' | 'z', value: number) => void
  onReset: () => void
  onRenderModeChange: (mode: 'default' | 'edges') => void
  onClose?: () => void
}

export function PoseControls({ pose, renderMode, onPositionChange, onRotationChange, onReset, onRenderModeChange, onClose }: PoseControlsProps) {
  return (
    <div className="bg-gray-900/95 backdrop-blur-md border border-cyan-500/30 p-4 rounded-lg text-white w-72 shadow-xl shadow-black/50">
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-semibold text-cyan-300 tracking-wide">Pose Controls</span>
        <div className="flex gap-2">
          <button
            onClick={onReset}
            className="text-xs px-3 py-1 bg-gray-800/80 hover:bg-gray-700 border border-gray-600 hover:border-gray-500 rounded text-gray-300 transition-all"
          >
            Reset
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-xs w-6 h-6 flex items-center justify-center bg-gray-800/80 hover:bg-red-900/50 border border-gray-600 hover:border-red-500/50 rounded text-gray-400 hover:text-red-400 transition-all"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 mb-3">
        <button
          onClick={() => onRenderModeChange('default')}
          className={`flex-1 text-xs px-2 py-1.5 rounded border transition-all ${renderMode === 'default' ? 'bg-cyan-600/30 border-cyan-400 text-cyan-300' : 'bg-transparent border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300'}`}
        >
          Solid+Edges
        </button>
        <button
          onClick={() => onRenderModeChange('edges')}
          className={`flex-1 text-xs px-2 py-1.5 rounded border transition-all ${renderMode === 'edges' ? 'bg-cyan-600/30 border-cyan-400 text-cyan-300' : 'bg-transparent border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300'}`}
        >
          Edges Only
        </button>
      </div>

      <div className="mb-4">
        <div className="text-xs text-cyan-400/70 mb-2 font-medium tracking-wider uppercase">Translation</div>
        {(['x', 'y', 'z'] as const).map(axis => (
          <div key={axis} className="flex items-center gap-2 mb-1.5">
            <span className="text-xs w-4 text-cyan-400 font-mono">{axis.toUpperCase()}</span>
            <input
              type="range"
              min={-1}
              max={1}
              step={0.01}
              value={pose.position[axis]}
              onChange={(e) => onPositionChange(axis, parseFloat(e.target.value))}
              className="flex-1 accent-cyan-400"
            />
            <input
              type="number"
              min={-1}
              max={1}
              step={0.01}
              value={pose.position[axis].toFixed(2)}
              onChange={(e) => onPositionChange(axis, parseFloat(e.target.value))}
              className="w-14 bg-gray-800/80 text-xs px-2 py-1 rounded border border-gray-700 text-cyan-300 font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>
        ))}
      </div>

      <div>
        <div className="text-xs text-cyan-400/70 mb-2 font-medium tracking-wider uppercase">Rotation (degrees)</div>
        {(['x', 'y', 'z'] as const).map(axis => (
          <div key={axis} className="flex items-center gap-2 mb-1.5">
            <span className="text-xs w-4 text-cyan-400 font-mono">R{axis}</span>
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={pose.rotation[axis]}
              onChange={(e) => onRotationChange(axis, parseFloat(e.target.value))}
              className="flex-1 accent-cyan-400"
            />
            <input
              type="number"
              min={-180}
              max={180}
              step={1}
              value={pose.rotation[axis]}
              onChange={(e) => onRotationChange(axis, parseFloat(e.target.value))}
              className="w-14 bg-gray-800/80 text-xs px-2 py-1 rounded border border-gray-700 text-cyan-300 font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
