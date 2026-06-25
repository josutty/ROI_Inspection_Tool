# ROI Summary Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Get Summary Table" to ExtractionPopover that calls FastAPI /process, then display results on a new ROISummary screen with zoomable full-frame image and bounding box overlay on click.

**Architecture:** Mock FastAPI server accepts multipart uploads (images + labels JSON). Frontend extracts full frame + cropped ROIs. New ROISummaryScreen displays API results as a list; clicking an item zooms the full frame image and highlights the ROI region with a bounding box.

**Tech Stack:** React, TypeScript, Tailwind CSS, FastAPI (uvicorn), Pydantic

---

## File Structure

```
mock_server/
  └── main.py                         # Update: multipart upload support

src/features/ar-previewer/
  ├── types/index.ts                  # Add: ProcessResponse type
  ├── hooks/useExtraction.ts          # Modify: add fullFrameImageDataUrl to result
  ├── components/ExtractionPopover.tsx # Modify: add "Get Summary Table" button + API call

src/screens/
  └── ROISummaryScreen.tsx            # Create: new screen with zoom + bbox list

src/App.tsx                           # Modify: add 'roi-summary' to Screen type + navigation
src/types/index.ts                    # Modify: add 'roi-summary' to Screen type
```

---

## Task 1: Update Mock Server for Multipart Uploads

**Files:**
- Modify: `mock_server/main.py`

- [ ] **Step 1: Update mock server to accept multipart uploads**

```python
from fastapi import FastAPI, File, Form, UploadFile
from pydantic import BaseModel
from typing import List
import json

app = FastAPI()

class LabelItem(BaseModel):
    name: str
    bbox: List[float]

class ResultItem(BaseModel):
    roi_name: str
    bbox: List[float]
    text: str
    field_type: str
    confidence: float
    mirrored: bool
    height_px_paddle: int
    height_px_final: int

class ProcessResponse(BaseModel):
    total: int
    results: List[ResultItem]

@app.post("/process", response_model=ProcessResponse)
async def process(
    images: List[UploadFile] = File(...),
    labels: str = Form(...)
) -> ProcessResponse:
    label_items = json.loads(labels)
    results = [
        ResultItem(
            roi_name=item["name"],
            bbox=item["bbox"],
            text=item["name"],
            field_type="brand_name",
            confidence=0.95,
            mirrored=False,
            height_px_paddle=18,
            height_px_final=16,
        )
        for item in label_items
    ]
    return ProcessResponse(total=len(results), results=results)
```

- [ ] **Step 2: Restart server and test with curl multipart**

```bash
pkill -f "uvicorn main:app" 2>/dev/null; sleep 1
cd /Users/mypc/Documents/vscode_projects/ar_inspection_system/mock_server
uvicorn main:app --port 8000 &
sleep 2
curl -s -X POST http://localhost:8000/process \
  -F "images=@/tmp/test.png" \
  -F 'labels=[{"name":"test_label","bbox":[10,20,100,50]}]'
```
Expected: `{"total":1,"results":[{"roi_name":"test_label",...}]}`

---

## Task 2: Add ProcessResponse Type

**Files:**
- Modify: `src/features/ar-previewer/types/index.ts`

- [ ] **Step 1: Add ProcessResponse type**

```ts
export interface ProcessResponse {
  total: number
  results: Array<{
    roi_name: string
    bbox: [number, number, number, number]
    text: string
    field_type: string
    confidence: number
    mirrored: boolean
    height_px_paddle: number
    height_px_final: number
  }>
}
```

---

## Task 3: Update useExtraction to Capture Full Frame

**Files:**
- Modify: `src/features/ar-previewer/hooks/useExtraction.ts`

- [ ] **Step 1: Update ExtractionResult to include fullFrameImageDataUrl**

Add to the existing `ExtractionResult` interface (or ensure it's returned):

```ts
export interface ExtractionResult {
  roiId: string
  label: string
  imageDataUrl: string    // cropped ROI
  width: number
  height: number
  bbox: [number, number, number, number]  // [x, y, w, h] from projection
  fullFrameImageDataUrl: string  // entire video frame
}
```

- [ ] **Step 2: Update extractROIs to capture full frame and compute bbox**

In the `extractROIs` callback, after drawing video to canvas:

```ts
const fullFrameImageDataUrl = canvas.toDataURL('image/png')

// For each ROI, compute bbox from projected vertices
const projected = projectedROIs.get(roi.id)
if (projected && projected.length >= 3) {
  const xs = projected.map(v => v.x)
  const ys = projected.map(v => v.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)
  const bbox: [number, number, number, number] = [
    minX, minY, maxX - minX, maxY - minY
  ]
  // ... existing crop logic ...
  results.push({
    roiId: roi.id,
    label: roi.label,
    imageDataUrl: cropCanvas.toDataURL('image/png'),
    width: cropCanvas.width,
    height: cropCanvas.height,
    bbox,
    fullFrameImageDataUrl,  // same for all ROIs (first captured frame)
  })
}
```

---

## Task 4: Update ExtractionPopover with "Get Summary Table"

**Files:**
- Modify: `src/features/ar-previewer/components/ExtractionPopover.tsx`

- [ ] **Step 1: Add state and API call handler**

Add state:
```ts
const [isLoading, setIsLoading] = useState(false)
const [summaryResults, setSummaryResults] = useState<ProcessResponse | null>(null)
```

Add helper to convert dataURL to File:
```ts
const dataURLToFile = (dataUrl: string, filename: string): File => {
  const arr = dataUrl.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) u8arr[n] = bstr.charCodeAt(n)
  return new File([u8arr], filename, { type: mime })
}
```

Add API call function:
```ts
const handleGetSummary = async () => {
  if (results.length === 0) return
  setIsLoading(true)
  try {
    const formData = new FormData()
    results.forEach((r, i) => {
      formData.append('images', dataURLToFile(r.imageDataUrl, `roi_${i}.png`))
    })
    const labels = results.map(r => ({ name: r.label, bbox: r.bbox }))
    formData.append('labels', JSON.stringify(labels))

    const resp = await fetch('http://localhost:8000/process', {
      method: 'POST',
      body: formData,
    })
    const data: ProcessResponse = await resp.json()
    setSummaryResults(data)
    // TODO: Navigate to ROISummaryScreen with { fullFrameImageDataUrl: results[0].fullFrameImageDataUrl, results: data, labels }
  } catch (err) {
    console.error('API call failed:', err)
  } finally {
    setIsLoading(false)
  }
}
```

- [ ] **Step 2: Add button to render**

Add below the existing grid:
```tsx
<div className="mt-4 flex justify-center">
  <button
    onClick={handleGetSummary}
    disabled={isLoading || results.length === 0}
    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg text-white font-semibold"
  >
    {isLoading ? 'Processing...' : 'Get Summary Table'}
  </button>
</div>
```

---

## Task 5: Create ROISummaryScreen

**Files:**
- Create: `src/screens/ROISummaryScreen.tsx`

- [ ] **Step 1: Create the screen component**

```tsx
import { useState, useCallback } from 'react'
import type { ProcessResponse } from '../features/ar-previewer/types'
import type { ROI } from '../features/roi-editor/types'

interface ROISummaryScreenProps {
  fullFrameImageDataUrl: string
  results: ProcessResponse
  labels: ROI[]
  onBack: () => void
}

export function ROISummaryScreen({ fullFrameImageDataUrl, results, labels, onBack }: ROISummaryScreenProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  
  const selectedResult = selectedIndex !== null ? results.results[selectedIndex] : null

  // Zoom state: scale + translation to center the selected bbox
  const [transform, setTransform] = useState({ scale: 1, tx: 0, ty: 0 })

  const handleSelectItem = useCallback((index: number) => {
    setSelectedIndex(index)
    const result = results.results[index]
    if (!result) return

    const [bx, by, bw, bh] = result.bbox
    // Center the bbox in the viewport with 2.5x zoom
    const scale = 2.5
    const viewportWidth = 800  // approximate container width
    const viewportHeight = 600 // approximate container height
    const tx = -(bx + bw / 2) * scale + viewportWidth / 2
    const ty = -(by + bh / 2) * scale + viewportHeight / 2
    setTransform({ scale, tx, ty })
  }, [results.results])

  const handleResetZoom = useCallback(() => {
    setSelectedIndex(null)
    setTransform({ scale: 1, tx: 0, ty: 0 })
  }, [])

  return (
    <div className="w-full h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center gap-4 bg-gray-800">
        <button
          onClick={onBack}
          className="text-white px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600"
        >
          ← Back
        </button>
        <h2 className="text-xl text-white flex-1">ROI Summary</h2>
        <span className="text-gray-400">{results.total} results</span>
      </div>

      {/* Main content: image + overlay */}
      <div className="flex-1 flex">
        {/* Image container */}
        <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
          <div
            className="relative"
            style={{
              transform: `scale(${transform.scale}) translate(${transform.tx}px, ${transform.ty}px)`,
              transformOrigin: 'center center',
              transition: 'transform 0.3s ease',
            }}
          >
            <img
              src={fullFrameImageDataUrl}
              alt="Full frame"
              className="max-w-full max-h-full object-contain"
            />
            {/* Bounding box overlay */}
            {selectedResult && (
              <div
                className="absolute border-2 border-orange-500 bg-orange-500/20 pointer-events-none"
                style={{
                  left: selectedResult.bbox[0],
                  top: selectedResult.bbox[1],
                  width: selectedResult.bbox[2],
                  height: selectedResult.bbox[3],
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Results list at bottom */}
      <div className="bg-gray-800 p-4">
        <div className="flex gap-4 overflow-x-auto pb-2">
          {results.results.map((result, index) => (
            <div
              key={index}
              onClick={() => handleSelectItem(index)}
              className={`flex-shrink-0 p-3 rounded-lg cursor-pointer transition-colors ${
                selectedIndex === index ? 'bg-orange-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <div className="text-white text-sm font-medium">{result.roi_name}</div>
              <div className="text-gray-400 text-xs mt-1">
                {result.field_type} · {result.confidence.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
        {selectedResult && (
          <button
            onClick={handleResetZoom}
            className="mt-2 text-sm text-gray-400 hover:text-white"
          >
            Reset zoom
          </button>
        )}
      </div>
    </div>
  )
}
```

---

## Task 6: Update App.tsx with Navigation

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add 'roi-summary' to Screen type in index.ts**

```ts
export type Screen = 'upload' | 'ar' | 'results' | 'roi-editor' | 'ar-preview' | 'roi-summary'
```

- [ ] **Step 2: Add navigation state for ROISummary**

```tsx
interface ROISummaryState {
  fullFrameImageDataUrl: string
  results: ProcessResponse
  labels: ROI[]
}

const [roiSummaryState, setRoiSummaryState] = useState<ROISummaryState | null>(null)
```

- [ ] **Step 3: Add render condition**

```tsx
{currentScreen === 'roi-summary' && roiSummaryState && (
  <ROISummaryScreen
    fullFrameImageDataUrl={roiSummaryState.fullFrameImageDataUrl}
    results={roiSummaryState.results}
    labels={roiSummaryState.labels}
    onBack={() => {
      setCurrentScreen('ar-preview')
      setRoiSummaryState(null)
    }}
  />
)}
```

- [ ] **Step 4: Import the new screen and types**

```tsx
import { ROISummaryScreen } from './screens/ROISummaryScreen'
import type { ROI } from './features/roi-editor/types'
import type { ProcessResponse } from './features/ar-previewer/types'
```

- [ ] **Step 5: Update ExtractionPopover to trigger navigation**

In `handleGetSummary`, replace the TODO with:
```tsx
setRoiSummaryState({
  fullFrameImageDataUrl: results[0].fullFrameImageDataUrl,
  results: data,
  labels: rois,  // pass the original ROIs
})
setCurrentScreen('roi-summary')
```

---

## Task 7: Test the Full Flow

- [ ] **Step 1: Start mock server**

```bash
cd /Users/mypc/Documents/vscode_projects/ar_inspection_system/mock_server
uvicorn main:app --port 8000
```

- [ ] **Step 2: Start frontend dev server**

```bash
cd /Users/mypc/Documents/vscode_projects/ar_inspection_system
npm run dev
```

- [ ] **Step 3: Navigate to AR Previewer, load model + ROIs, click "Extract ROI Images"**

- [ ] **Step 4: Click "Get Summary Table" — should navigate to ROISummaryScreen**

- [ ] **Step 5: Click list items — verify image zooms and bbox appears**

---

## Self-Review Checklist

- [ ] Mock server accepts multipart/form-data with images + labels JSON string
- [ ] `ExtractionResult` includes `fullFrameImageDataUrl` and `bbox`
- [ ] `ExtractionPopover` has "Get Summary Table" button that calls API
- [ ] Navigation from ExtractionPopover → ROISummaryScreen works with state
- [ ] `ROISummaryScreen` shows full image with CSS transform zoom
- [ ] Bounding box overlay appears on selected ROI
- [ ] No existing functionality broken (ROI editor, AR previewer, extraction popover download)
