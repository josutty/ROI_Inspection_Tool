import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';

export default function AnchorTracking() {
  const mountRef = useRef(null);
  const [logs, setLogs] = useState(["Initializing system setup..."]);

  const logToUi = (msg) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    let wantsToPlace = false;
    const anchorMap = new Map();

    // --- 1. CRITICAL COMPATIBILITY CHECKS ---
    if (!window.isSecureContext) {
      logToUi("CRITICAL ERROR: WebXR requires a secure context (HTTPS). The browser has blocked AR features because this connection is insecure (HTTP).");
    }

    if (!navigator.xr) {
      logToUi("CRITICAL ERROR: 'navigator.xr' is completely undefined. Your browser or device does not support WebXR. If you are on iOS, standard Safari lacks WebXR support.");
      return;
    }

    // --- 2. SETUP STANDARD THREE.JS FALLBACK ---
    // If AR fails, we still render a gray background instead of a black void so you know the code works
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333); // Temporary visible background
    
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    camera.position.set(0, 1.6, 3); // Move camera back so you can see objects if AR fails
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true; 
    mountRef.current.appendChild(renderer.domElement);

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    // --- 3. CONTROLLER EVENTS ---
    const controller = renderer.xr.getController(0);
    controller.addEventListener('select', () => { wantsToPlace = true; });
    scene.add(controller);

    const boxGeometry = new THREE.BoxGeometry(0.12, 0.12, 0.12);

    // --- 4. ANIMATION LOOP ---
    renderer.setAnimationLoop((timestamp, frame) => {
      // If we successfully enter AR, clear the temporary gray background so camera feed shows
      if (renderer.xr.isPresenting) {
        scene.background = null;
      }

      if (!frame) {
        renderer.render(scene, camera);
        return;
      }

      const referenceSpace = renderer.xr.getReferenceSpace();

      if (wantsToPlace && referenceSpace) {
        const position = DOMPointReadOnly.fromPoint({ x: 0, y: 0, z: -1.2 });
        const orientation = DOMPointReadOnly.fromPoint({ x: 0, y: 0, z: 0, w: 1 });
        const localViewerTransform = new XRRigidTransform(position, orientation);

        // Try creating anchor
        frame.createAnchor(localViewerTransform, referenceSpace)
          .then((anchor) => {
            logToUi("Mesh spawned and anchored!");
            const material = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff });
            const mesh = new THREE.Mesh(boxGeometry, material);
            mesh.matrixAutoUpdate = false;
            scene.add(mesh);
            anchorMap.set(anchor, mesh);
          })
          .catch((err) => {
            logToUi(`Anchor rejected by browser: ${err.message}. Trying local fallback placement...`);
            
            // Fallback: If anchors are broken on this phone, place it using standard local tracking coordinates
            const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
            const mesh = new THREE.Mesh(boxGeometry, material);
            mesh.position.set(0, 0, -1.2).applyMatrix4(renderer.xr.getController(0).matrixWorld);
            scene.add(mesh);
          });

        wantsToPlace = false;
      }

      // Update active anchors
      if (frame.trackedAnchors && anchorMap.size > 0) {
        anchorMap.forEach((mesh, anchor) => {
          if (frame.trackedAnchors.has(anchor)) {
            const anchorPose = frame.getPose(anchor.anchorSpace, referenceSpace);
            if (anchorPose && !anchorPose.emulatedPosition) {
              mesh.matrix.fromArray(anchorPose.transform.matrix);
              mesh.visible = true;
            }
          }
        });
      }

      renderer.render(scene, camera);
    });

    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onWindowResize);

    // --- 5. SAFE BUTTON INJECTION ---
    // We try requesting 'anchors' optionally. If it's completely missing, the button will still show up!
    const arButton = ARButton.createButton(renderer, { 
      optionalFeatures: ['anchors'] // Changed from requiredFeatures to optionalFeatures to prevent button crashes
    });
    
    document.body.appendChild(arButton);
    logToUi("WebXR initialized. Look at the bottom of your screen for the 'START AR' button.");

    return () => {
      window.removeEventListener('resize', onWindowResize);
      renderer.setAnimationLoop(null);
      if (mountRef.current && renderer.domElement) mountRef.current.removeChild(renderer.domElement);
      if (document.body.contains(arButton)) document.body.removeChild(arButton);
      renderer.dispose();
      scene.clear();
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      
      {/* UI Logger text container */}
      <div style={{
        position: 'absolute',
        top: '15px',
        left: '15px',
        right: '15px',
        maxHeight: '40%',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        color: '#ffb703',
        fontFamily: 'monospace',
        fontSize: '12px',
        padding: '15px',
        borderRadius: '8px',
        overflowY: 'auto',
        zIndex: 99999,
        border: '1px solid #ffb703',
        lineHeight: '1.5'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#fff' }}>System Diagnostic Log Panel:</div>
        {logs.map((log, index) => (
          <div key={index} style={{ marginBottom: '4px' }}>{log}</div>
        ))}
      </div>
    </div>
  );
}