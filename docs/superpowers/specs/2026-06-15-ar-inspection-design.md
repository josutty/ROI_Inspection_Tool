# AR Inspection System — Design Spec

**Date:** 2026-06-15
**Status:** Approved

---

## 1. Overview

An AR inspection application that overlays a CAD model onto a real-world object via WebXR, captures the aligned scene, and compares real edges against the model's edges using OpenCV.js to produce a color-coded inspection result.

---

## 2. Tech Stack

- **React 18** with TypeScript
- **Tailwind CSS** for UI styling
- **Three.js** for 3D CAD model rendering and edge extraction
- **WebXR** (WebXR Device API) for AR camera passthrough and world-space tracking
- **OpenCV.js** for edge detection and comparison

---

## 3. App Flow

```
UploadScreen → ARScreen → ResultsScreen
```

---

## 4. Screen Specifications

### 4.1 UploadScreen

- **Upload zone**: drag-and-drop or click-to-upload `.stl` files
- **Model preview**: Three.js canvas showing uploaded STL in wireframe, user can rotate
- **Start AR button**: triggers WebXR support check, then enters AR session
- **Error state**: shown if WebXR AR is not supported on the device

### 4.2 ARScreen

**Rendering layers (bottom to top):**
1. WebXR camera feed (VRDisplay's passthrough — fullscreen canvas)
2. Three.js canvas (transparent background, CAD overlay)

**CAD model placement:**
- Positioned 1 meter in front of the camera along the viewing axis at session start
- No world-space tracking during alignment phase — user physically moves device

**Visual modes (user-toggleable):**
- **Edge/wireframe**: shows model edges only, fully transparent interior — default during alignment
- **Semi-transparent solid**: solid model with ~50% opacity

**Pose lock flow:**
1. User aligns CAD overlay with real object by moving the device
2. User taps **"Lock Pose"** button
3. WebXR begins hit-test / world tracking to anchor the model in real space
4. Model stays locked relative to world as device moves
5. **"Inspect"** button appears after pose is locked

### 4.3 ResultsScreen

- Captures current WebXR frame (camera + locked model overlay) as a snapshot
- Runs OpenCV edge comparison:
  - Extracts edges from the camera frame using the model overlay's ROI (with chamfer-score-based offset)
  - Compares real edges vs. model edges using adaptive thresholds
- Displays result overlay on the captured snapshot:
  - **Green** — edges aligned within threshold
  - **Yellow** — edges slightly displaced (adaptive threshold based on distance from camera)
  - **Red** — edges not aligned at all
- "Back" button returns to ARScreen

---

## 5. Adaptive Threshold Specification

Thresholds scale based on the estimated distance from the camera to the locked model surface:

| Distance | Green (px) | Yellow (px) | Red (>px) |
|---|---|---|---|
| < 0.5m | 3 | 6 | 6 |
| 0.5–1m | 5 | 10 | 10 |
| 1–2m | 8 | 15 | 15 |
| > 2m | 12 | 24 | 24 |

---

## 6. Component Inventory

| Component | Purpose |
|---|---|
| `App.tsx` | Screen routing, global state (uploaded model, XR session) |
| `UploadScreen.tsx` | STL file upload, model preview, Start AR button |
| `ARScreen.tsx` | WebXR session, CAD overlay, pose lock, inspect trigger |
| `ResultsScreen.tsx` | Snapshot capture, OpenCV comparison, result visualization |
| `useWebXR.ts` | WebXR lifecycle hook (check support, request session, frame loop) |
| `useCADLoader.ts` | STL file loading via Three.js STLLoader, geometry extraction |
| `useEdgeComparison.ts` | OpenCV.js edge detection and comparison logic |

---

## 7. Key Implementation Notes

- **STL only** — Three.js `STLLoader` handles geometry directly
- **Mobile AR primary** — targets Android Chrome with WebXR AR, iOS Safari with WebXR polyfill
- **No backend** — all processing runs client-side
- **Three.js / React integration** — imperative Three.js managed via React refs, no R3F
- **OpenCV.js loaded async** — loaded on first access to ResultsScreen

---

## 8. File Structure

```
src/
├── App.tsx
├── screens/
│   ├── UploadScreen.tsx
│   ├── ARScreen.tsx
│   └── ResultsScreen.tsx
├── hooks/
│   ├── useWebXR.ts
│   ├── useCADLoader.ts
│   └── useEdgeComparison.ts
├── components/
│   └── ModelPreview.tsx
├── types/
│   └── index.ts
└── utils/
    └── edgeUtils.ts
```