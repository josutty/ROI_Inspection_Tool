import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';

export default function HitTesting() {
  const mountRef = useRef(null);

  useEffect(() => {
    let hitTestSource = null;
    let hitTestSourceRequested = false;

    // 1. Setup Scene, Camera, and Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true; // Enable WebXR
    
    // Attach the canvas to our React DOM node
    mountRef.current.appendChild(renderer.domElement);

    // 2. Add Lighting
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    // 3. Create the Reticle (Targeting Ring)
    const reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    reticle.matrixAutoUpdate = false; // WebXR will provide the exact matrix
    reticle.visible = false;
    scene.add(reticle);

    // 4. Handle Screen Taps (Object Placement)
    const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    
    function onSelect() {
      if (reticle.visible) {
        const material = new THREE.MeshStandardMaterial({ 
          color: 0xffffff * Math.random() 
        });
        const mesh = new THREE.Mesh(geometry, material);
        
        // Snap the new mesh to the reticle's physical location
        reticle.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
        scene.add(mesh);
      }
    }

    const controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
    scene.add(controller);

    // 5. The Render Loop (Hit Testing)
    renderer.setAnimationLoop((timestamp, frame) => {
      if (frame) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        // Request the hit test source once
        if (!hitTestSourceRequested) {
          session.requestReferenceSpace('viewer').then((viewerSpace) => {
            session.requestHitTestSource({ space: viewerSpace }).then((source) => {
              hitTestSource = source;
            });
          });
          hitTestSourceRequested = true;
        }

        // Check for intersections on every frame
        if (hitTestSource) {
          const hitTestResults = frame.getHitTestResults(hitTestSource);

          if (hitTestResults.length > 0) {
            const hit = hitTestResults[0];
            const pose = hit.getPose(referenceSpace);

            reticle.visible = true;
            reticle.matrix.fromArray(pose.transform.matrix);
          } else {
            reticle.visible = false;
          }
        }
      }

      renderer.render(scene, camera);
    });

    // 6. Handle Browser Resize
    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onWindowResize);

    // 7. Inject the AR Button into the DOM
    // We must request the 'hit-test' feature here
    const arButton = ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] });
    document.body.appendChild(arButton);

    // 8. Cleanup Function (Crucial for React StrictMode)
    return () => {
      window.removeEventListener('resize', onWindowResize);
      renderer.setAnimationLoop(null);
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      if (document.body.contains(arButton)) {
        document.body.removeChild(arButton);
      }
      
      renderer.dispose();
      scene.clear();
    };
  }, []); // Empty dependency array ensures this runs once on mount

  return (
    // The container for our Three.js canvas
    <div ref={mountRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }} />
  );
}