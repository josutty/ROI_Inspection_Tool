interface ModelUploaderProps {
  onModelLoaded: (file: File) => void
}

export function ModelUploader({ onModelLoaded }: ModelUploaderProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onModelLoaded(file)
  }

  return (
    <div className="absolute top-4 right-4 bg-black/70 p-3 rounded-lg text-white z-20">
      <label className="text-sm mb-1 block">Load CAD Model</label>
      <input
        type="file"
        accept=".stl,.dae"
        onChange={handleChange}
        className="text-xs"
      />
    </div>
  )
}
