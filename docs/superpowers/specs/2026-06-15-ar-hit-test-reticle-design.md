# AR Hit-Test Reticle Placement — 2026-06-15

## Context

The `ARScreen.tsx` component uses WebXR hit-testing to place a CAD model in AR. Currently it uses a red sphere hit-indicator that the model smoothly follows (lerp). This spec changes the visual feedback to a reticle ring (matching the ARScene.tsx example) and uses button-based locking to anchor the model.

## Behavior

1. **Reticle ring** appears on detected surfaces (same approach as ARScene.tsx using `frame.getHitTestResults`)
2. **Model follows reticle** with smooth lerp until locked
3. **"Lock Pose & Track" button** snaps the model to the reticle position and anchors it
4. After locking, reticle hides but hit-test continues (for potential future re-tracking)

## Changes to ARScreen.tsx

### Visual Change
- Replace `hitIndicator` sphere with `reticle` ring mesh:
  ```ts
  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  )
  reticle.matrixAutoUpdate = false
  reticle.visible = false
  ```

### Hit-Test Loop
- Use `reticle.matrix.fromArray(pose.transform.matrix)` to position reticle (same as ARScene.tsx line 83)
- Set `reticle.visible = true/false` based on hit detection

### Lock Behavior
- On "Lock Pose & Track": decompose reticle matrix, copy position to model
- After locking: `reticle.visible = false`, model stays anchored

## Dependencies

- No new dependencies; uses existing WebXR hit-test API
- Model geometry comes from `CADModel` prop (unchanged)