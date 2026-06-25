# ROI Editor + AR Previewer Design Spec

## Overview

Implementing 3 epics (15 user stories) as a standalone feature set:
- **Epic 1: ROI Editor** — load CAD model, define polygon ROIs, label, export JSON
- **Epic 2: AR Previewer** — align CAD model with physical object via camera feed
- **Epic 3: ROI Extraction** — project ROIs onto camera image, extract labeled crops

---

## Architecture

### Feature-Based Folder Structure

```
src/features/
  roi-editor/
    components/    # ROIViewport3D, ROIPolygon, ROIControls, ROILabelInput, ROIList
    hooks/         # useROIManager, usePolygonDrawing, useRaycastCursor
    types/          # ROI, ROIConfig
    utils/          # export, projection
  ar-previewer/
    components/    # ARViewport, PoseControls, ExtractionPopover, ModelUploader, ROIUploader
    hooks/         # useModelAlignment, useROIProjection, useExtraction
    types/         # Pose, ExtractionResult
    utils/         # projection, imageCrop
```

### App.tsx Changes

- 2 new screen states: `'roi-editor'` and `'ar-preview'`
- Existing screens (`'upload'`, `'ar'`, `'results'`) marked as disabled (code preserved)
- App state: `currentScreen`, `cachedModel` (STL geometry), `cachedROIs` (ROI JSON data)

---

## Screen 1: ROI Editor

### Purpose
Load STL model → define polygon ROIs via raycast clicking → label each ROI → export as JSON.

### Components

**ROIViewport3D**
- Three.js Canvas with OrbitControls (orbit, pan, zoom)
- Raycast cursor: mouse move → `THREE.Raycaster` intersects model → preview sphere at intersection point
- Vertices stored in **model-local coordinates** (transformed point, not world)
- Click on model surface → confirm vertex at raycast intersection
- Click near first vertex (within threshold) → close polygon

**ROIControls**
- "Load STL Model" button → file picker for `.stl` files
- "Create ROI" button → enters polygon drawing mode
- Mode indicator: "Idle" | "Drawing ROI" | "Editing ROI"
- Current vertex count display while drawing

**ROIPolygon**
- Renders polygon outline via `THREE.LineLoop`
- Small spheres at each vertex for selection handles
- Selected ROI highlighted with color change (e.g., cyan → yellow)
- Polygon fills semi-transparently when complete

**ROILabelInput**
- Appears after polygon is closed
- Text field for label input
- "Confirm" button saves ROI with label
- "Cancel" button discards current polygon

**ROIList**
- Sidebar showing all created ROIs
- Each entry: label name, vertex count, delete button
- Click entry → selects/deselects ROI in viewport

### Data Flow
1. Load STL → geometry stored via `useCADLoader`
2. Click "Create ROI" → drawing mode active
3. Mouse move → raycast cursor shows preview point
4. Click → confirms vertex, adds to current polygon
5. Click near first vertex → closes polygon → label input appears
6. Enter label + confirm → ROI saved to list
7. Click "Export JSON" → downloads `rois.json`

### Export JSON Format
```json
{
  "rois": [
    {
      "id": "roi_001",
      "label": "serial_number",
      "vertices": [
        [0.124, 0.055, -0.018],
        [0.136, 0.055, -0.018],
        [0.136, 0.067, -0.018],
        [0.124, 0.067, -0.018]
      ]
    }
  ]
}
```

---

## Screen 2: AR Previewer with ROI Extraction

### Purpose
Load model + ROI JSON → adjust pose to align with physical object → extract ROI image crops.

### Components

**ARViewport**
- Separate Three.js Canvas (no WebXR camera — uses device camera via `<video>` element)
- OrbitControls for viewing angle
- Model rendered with current pose (position + rotation)
- ROI polygons rendered on model surface
- Camera video feed as background

**ModelUploader**
- File input for STL model upload
- Same model from ROI Editor

**ROIUploader**
- File input for ROI JSON upload
- Reconstructs ROIs on model surface after loading

**PoseControls**
- Translation sliders: X, Y, Z (with numeric input fields)
- Rotation sliders: Rx, Ry, Rz in degrees (with numeric input fields)
- "Reset Pose" button

**ExtractionButton**
- "Extract ROI Images" button
- Projects ROI vertices to screen space using current pose
- Crops image regions from camera frame

**ExtractionPopover**
- Modal/overlay showing extracted crops as thumbnails
- Each crop labeled with ROI label
- "Download" button per image (saves with label in filename)
- "Close" button

### Data Flow
1. Upload STL model
2. Upload ROI JSON
3. Model renders, ROIs reconstruct on surface
4. Adjust pose via sliders to align model with physical object
5. Click "Extract ROI Images"
   - Project ROI vertices: `worldPos = modelMatrix × localPos`
   - Project to screen: `ndcPos = projectionMatrix × viewMatrix × worldPos`
   - Crop from camera frame using polygon mask
6. Popover shows labeled crops with download buttons

---

## Key Technical Details

### Raycast Cursor (ROI Editor)
- `THREE.Raycaster` from camera through mouse NDC coordinates
- Intersect model geometry → preview sphere at intersection point
- Vertex stored in **model-local coordinates** (apply inverse of model matrix)

### ROI Polygon Rendering
- `THREE.LineLoop` for polygon outline
- `THREE.SphereGeometry` at each vertex for handles
- Selected ROI: color highlight

### ROI Projection (AR Previewer)
```
localPos → worldPos (modelMatrix × localPos) → ndcPos (projectionMatrix × viewMatrix × worldPos) → screenPos (ndcToScreen)
```

### Image Extraction
- Canvas element captures camera frame
- For each ROI: create path from projected 2D vertices → `ctx.clip()` → `ctx.drawImage()` → `ctx.getImageData()`
- Data URL → anchor download

---

## Disabled Existing Code

Existing screens (`UploadScreen`, `ARScreen`, `ResultsScreen`) remain in `src/screens/` with comments noting they are disabled. App.tsx no longer routes to them.

---

## Success Criteria

- STL model loads and displays in both screens
- ROIs defined via raycast clicking with accurate 3D vertex positions
- Multiple ROIs supported, each with unique label
- JSON export matches specified format
- Pose adjustment updates model in real time
- ROI extraction produces correctly cropped images
- Extracted images paired with their labels
- Individual download per extracted image
