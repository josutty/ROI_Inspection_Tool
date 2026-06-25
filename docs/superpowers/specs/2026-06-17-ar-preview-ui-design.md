# AR Previewer UI/UX Improvements

## Changes

### 1. Default Screen
- `App.tsx`: Change default `currentScreen` from `'roi-editor'` to `'ar-preview'`

### 2. Pose Controls - Collapsible Icon Toggle
- Replace always-visible PoseControls panel with a toggle icon button (gear ⚙️)
- Icon fixed at top-left
- Click icon → show PoseControls as popover
- Panel has × close button
- Click outside panel → close
- Same controls as current (position, rotation, render mode, reset)

### 3. Canvas Opacity
- `ARViewport` container: add `opacity: 0.8` style
- WebGL canvas is already `alpha: true`, so semi-transparent

## Files to Modify

- `src/App.tsx` — change default screen
- `src/features/ar-previewer/components/ARPreviewerScreen.tsx` — replace PoseControls with icon toggle
- `src/features/ar-previewer/components/PoseControls.tsx` — add close button
- `src/features/ar-previewer/components/ARViewport.tsx` — add opacity to container
