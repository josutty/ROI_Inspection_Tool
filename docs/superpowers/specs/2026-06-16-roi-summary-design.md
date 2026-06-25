# ROI Summary Feature Design

## Overview

Add a "Get Summary Table" button to `ExtractionPopover` that sends extracted ROI images to the `/process` FastAPI endpoint, then displays results on a new Results screen with zoomable full-frame image.

## Data Flow

```
ExtractionPopover
    │
    ├── croppedImages + bbox (sent as multipart files)
    ├── labels: [{ name, bbox }]
    │
    ├── fullFrameImageDataUrl (stored locally, NOT sent to API)
    │
    ▼ "Get Summary Table"

FastAPI /process (multipart/form-data)
    ├── images: File uploads
    ├── labels: JSON string
    │
    ▼ returns

ResultsScreen
    ├── fullFrameImageDataUrl (local, for zoom display)
    ├── API results list
    └── click list item → zoom + bbox overlay on full image
```

## Mock Server Update

**`mock_server/main.py`** — accept multipart uploads:

- `images`: List of file uploads (PNG/JPEG)
- `labels`: JSON string `[{ "name": "...", "bbox": [...] }]`

Response unchanged from mock.

## Frontend Changes

### 1. `useExtraction.ts` — return full frame alongside cropped images

- Add `fullFrameImageDataUrl: string` to `ExtractionResult`
- Capture full canvas frame: `canvas.toDataURL('image/png')`

### 2. `ExtractionPopover` — add "Get Summary Table" button

- New state: `apiResults: ProcessResponse | null`, `isLoading: boolean`
- Button calls `fetch('/process', { method: 'POST', formData })`
- On success: navigate to ResultsScreen with state `{ fullFrameImageDataUrl, results, labels }`

### 3. `ProcessResponse` type — new types file

```ts
interface ProcessResponse {
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

### 4. `ResultsScreen` — new screen (src/screens/ResultsScreen.tsx)

**Props:** `{ fullFrameImageDataUrl: string, results: ProcessResponse, labels: ROI[] }`

**Layout:**
- Top/center: Full image with CSS transform zoom
- On image: Semi-transparent bounding box overlay for selected ROI
- Bottom: Horizontal scrollable list of result items

**Zoom behavior:**
- Initial: full image fits container (scale = 1, centered)
- Click list item: update `scale` (2x), `translateX/Y` to center the bbox
- CSS transform: `transform: scale(${scale}) translate(${tx}px, ${ty}px)`

**Bounding box overlay:**
- Absolute positioned div over the image
- Uses same transform as image
- Semi-transparent fill + border (e.g., `rgba(255,100,0,0.3)` fill, `2px solid orange` border)

### 5. `App.tsx` — add route for ResultsScreen

- Route `/results` or use state-based navigation from ExtractionPopover

## API Request Format (multipart/form-data)

```
POST /process
Content-Type: multipart/form-data

images: [File, File, ...]   ← cropped ROI images as files
labels: [{"name": "...", "bbox": [x,y,w,h]}, ...]  ← JSON string
```

## No Breaking Changes

- `useExtraction.ts`: add new return field, don't modify existing behavior
- `ExtractionPopover`: add new button, don't remove/modify existing UI
- `ARPreviewerScreen`: no changes
- Existing components remain untouched
