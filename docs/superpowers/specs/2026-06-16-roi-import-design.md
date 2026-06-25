# ROI Import from JSON — Design Spec

## Overview

Add a "Load ROI" button that lets users import an existing ROI from a JSON file. The imported vertices populate the drawing buffer, ready for tweaking before saving with a label. A draft is persisted to `localStorage` so vertices survive a page refresh or accidental cancel.

---

## Data Flow

```
User clicks "Load ROI"
  → File picker opens (.json only)
  → File parsed, ROI[] validated
  → Vertices stored in localStorage as draft
  → pendingVertices state set → drawing mode enabled
  → Label input shown
  → User confirms label → addROI() called, draft cleared
  → OR user cancels → draft cleared, state reset
```

---

## File Changes

### `src/features/roi-editor/utils/export.ts`

Add `importROIConfig(rois: ROI[]): ROIConfig` (mirrors `exportROIConfig`).

Add `loadJSONFile(): Promise<ROI[]>`:
- Creates hidden `<input type="file" accept=".json">`
- Reads file as text, parses JSON
- Validates structure: must be `ROIConfig` with `rois` array
- Each ROI must have `id`, `label`, `vertices[]` (3+ vertices with x/y/z numbers)
- Returns validated `ROI[]`
- Throws descriptive error on invalid file

### `src/features/roi-editor/hooks/useROIManager.ts`

No changes needed — `addROI` already exists.

### `src/features/roi-editor/components/ROIEditorScreen.tsx`

- Add `handleLoadROI` callback:
  ```ts
  const handleLoadROI = useCallback(async () => {
    try {
      const rois = await loadJSONFile()
      if (rois.length === 0) throw new Error('No ROIs found in file')
      const first = rois[0]
      setPendingVertices(first.vertices)
      setShowLabelInput(true)
      saveDraft(first.vertices)
    } catch (e) {
      console.error(e)
      // Could show a toast notification here
    }
  }, [])
  ```
- Wire `handleLoadROI` into `ROIControls` as `onLoadROI`
- On `handleLabelConfirm`: call `clearDraft()` after `addROI`
- On `handleLabelCancel`: call `clearDraft()`
- On `handleDeleteROI`: no draft interaction needed

### `src/features/roi-editor/components/ROIControls.tsx`

- Add `onLoadROI: () => void` prop
- Add "Load ROI" button next to "Create ROI" button
- Disable when `mode !== 'idle'` (nothing to load while drawing)

### `src/features/roi-editor/utils/draft.ts` (new file)

```ts
const DRAFT_KEY = 'roi_draft'

export function saveDraft(vertices: Vertex[]): void {
  localStorage.setItem(BLAB_DRAFT_KEY, JSON.stringify(vertices))
}

export function loadDraft(): Vertex[] | null {
  const raw = localStorage.getItem(BLAB_DRAFT_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Vertex[]
  } catch {
    return null
  }
}

export function clearDraft(): void {
  localStorage.removeItem(BLAB_DRAFT_KEY)
}
```

---

## UX Details

- **File picker** accepts only `.json`
- **Validation errors** are logged to console (no user-facing toast in v1)
- **Draft persistence** ensures vertices survive:
  - Page refresh
  - Accidental cancel button
  - Browser tab close (if editor is the last page)
- **Draft cleared** on successful save or explicit cancel
- **Load button disabled** while in `drawing` or `editing` mode (no nested drawing)
- **First ROI only** is loaded if file contains multiple — the user can export/merge separately if they need more

---

## Testing Checklist

- [ ] Load valid `.json` → vertices appear, label input shown
- [ ] Load invalid file (malformed JSON) → error logged, no state change
- [ ] Load valid file, cancel label input → draft cleared
- [ ] Load valid file, confirm label → ROI added, draft cleared
- [ ] Refresh page after loading (before confirming) → draft restored, pending vertices shown
- [ ] Button disabled during drawing mode
