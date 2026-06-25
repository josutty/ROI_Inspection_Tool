import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/**
 * ---------------- EDGE DETECTION (Sobel) ----------------
 */
function sobelEdges(imageData, width, height) {
  const gray = new Uint8ClampedArray(width * height);
  const edges = new Uint8ClampedArray(width * height);

  for (let i = 0; i < width * height; i++) {
    const r = imageData[i * 4];
    const g = imageData[i * 4 + 1];
    const b = imageData[i * 4 + 2];
    gray[i] = (r + g + b) / 3;
  }

  const gxK = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const gyK = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0, k = 0;

      for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
          const idx = (y + j) * width + (x + i);
          gx += gray[idx] * gxK[k];
          gy += gray[idx] * gyK[k];
          k++;
        }
      }

      const mag = Math.sqrt(gx * gx + gy * gy);
      edges[y * width + x] = mag > 80 ? 255 : 0;
    }
  }

  return edges;
}

/**
 * ---------------- DEVIATION MAP ----------------
 */
function generateDeviationMap(cadEdges, camEdges, width, height) {
  const out = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    const cad = cadEdges[i];
    const cam = camEdges[i];

    let r = 0, g = 0, b = 0, a = 255;

    if (cad === 255 && cam === 255) {
      g = 255;
    } else if (cad === 255 && cam === 0) {
      r = 255;
    } else if (cad === 0 && cam === 255) {
      r = 255; g = 165;
    } else {
      r = 20; g = 20; b = 25; a = 180;
    }

    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = a;
  }

  return out;
}

export default function ARInspectorOrbit() {
  const videoRef = useRef(null);
  const mountRef = useRef(null);

  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const cadRef = useRef(null);

  const [streamStarted, setStreamStarted] = useState(false);
  const [result, setResult] = useState(null);
  const [loadingModel, setLoadingModel] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    return () => {
      if (rendererRef.current) rendererRef.current.dispose();
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStreamStarted(true);
        initThree();
      }
    } catch (err) {
      alert("Could not access camera.");
    }
  };

  const initThree = () => {
    if (sceneRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
    camera.position.set(0, 0, 2);

    // CRITICAL: Set preserveDrawingBuffer to true so we can extract pixels directly from the live canvas
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    mountRef.current.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 2.5);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 2);
    dir.position.set(1, 2, 2);
    scene.add(dir);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingModel(true);
    if (!streamStarted) await startCamera();

    const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
    const url = URL.createObjectURL(file);
    const loader = new STLLoader();

    loader.load(url, (geometry) => {
      geometry.computeBoundingBox();
      const box = geometry.boundingBox;
      const size = new THREE.Vector3();
      box.getSize(size);

      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 1 / maxDim;

      const material = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.6,
        roughness: 0.3,
        metalness: 0.2,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.scale.setScalar(scale);
      box.getCenter(mesh.position).multiplyScalar(-scale);

      if (cadRef.current) sceneRef.current.remove(cadRef.current);

      cadRef.current = mesh;
      sceneRef.current.add(mesh);
      setLoadingModel(false);
    }, undefined, () => setLoadingModel(false));
  };

  /**
   * ---------------- FIXED CAPTURE & COMPARE ----------------
   */
  const captureAndCompare = () => {
    if (!videoRef.current || !rendererRef.current) return;

    const video = videoRef.current;
    const renderer = rendererRef.current;
   
    // Instead of rendering to the raw video resolution, match the EXACT
    // display bounding dimensions of the active interactive canvas layout.
    const displayWidth = renderer.domElement.clientWidth;
    const displayHeight = renderer.domElement.clientHeight;

    if (displayWidth === 0 || displayHeight === 0) return;

    // 1. CAPTURE VIDEO IN CURRENT VIEWPORT PROPORTIONS
    const camCanvas = document.createElement("canvas");
    camCanvas.width = displayWidth;
    camCanvas.height = displayHeight;
    const ctx = camCanvas.getContext("2d");
   
    // Using object-fit: cover logic mathematically to map the video
    // frame identically into the layout dimensions.
    const videoRatio = video.videoWidth / video.videoHeight;
    const canvasRatio = displayWidth / displayHeight;
    let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight;

    if (videoRatio > canvasRatio) {
      sw = video.videoHeight * canvasRatio;
      sx = (video.videoWidth - sw) / 2;
    } else {
      sh = video.videoWidth / canvasRatio;
      sy = (video.videoHeight - sh) / 2;
    }

    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, displayWidth, displayHeight);
    const camData = ctx.getImageData(0, 0, displayWidth, displayHeight).data;

    // 2. CAPTURE THREE.JS CANVAS (Guarantees matching FOV Aspect Ratio)
    renderer.render(sceneRef.current, cameraRef.current);
    const cadCanvas = document.createElement("canvas");
    cadCanvas.width = displayWidth;
    cadCanvas.height = displayHeight;
    const cadCtx = cadCanvas.getContext("2d");
   
    // Draw the exactly-rendered frame buffers directly
    cadCtx.drawImage(renderer.domElement, 0, 0, displayWidth, displayHeight);
    const cadData = cadCtx.getImageData(0, 0, displayWidth, displayHeight).data;

    // 3. RUN ALIGNMENT LOGIC
    const cadEdges = sobelEdges(cadData, displayWidth, displayHeight);
    const camEdges = sobelEdges(camData, displayWidth, displayHeight);
    const diff = generateDeviationMap(cadEdges, camEdges, displayWidth, displayHeight);

    const out = document.createElement("canvas");
    out.width = displayWidth;
    out.height = displayHeight;
    const octx = out.getContext("2d");
    const img = octx.createImageData(displayWidth, displayHeight);
    img.data.set(diff);
    octx.putImageData(img, 0, 0);

    setResult(out.toDataURL());
    if (isMobile) {
      setShowResultModal(true);
    }
  };

  // --- STYLING SYSTEM ---
  const styles = {
    container: { position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#020617', fontFamily: 'sans-serif' },
    videoLayer: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 },
    video: { width: '100%', height: '100%', objectFit: 'cover' },
    threeLayer: { position: 'absolute', top: 0, left: 0, width: '100%', height: isMobile ? 'calc(100% - 140px)' : '100%', zIndex: 10, pointerEvents: 'auto' },
    panel: {
      position: 'absolute',
      left: isMobile ? '0' : '16px',
      bottom: isMobile ? '0' : 'auto',
      top: isMobile ? 'auto' : '16px',
      width: isMobile ? '100%' : '320px',
      maxHeight: isMobile ? '160px' : 'calc(100vh - 32px)',
      boxSizing: 'border-box',
      zIndex: 20,
      borderRadius: isMobile ? '20px 20px 0 0' : '12px',
      border: '1px solid rgba(255,255,255,0.1)',
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(16px)',
      padding: isMobile ? '16px 24px' : '20px',
      color: '#e2e8f0',
      boxShadow: '0 -10px 25px -5px rgba(0,0,0,0.4), 0 25px 50px -12px rgba(0,0,0,0.5)',
      display: 'flex',
      flexDirection: isMobile ? 'row' : 'column',
      gap: '16px',
      alignItems: isMobile ? 'center' : 'stretch',
      justifyContent: isMobile ? 'space-between' : 'flex-start'
    },
    headerGroup: { display: isMobile ? 'none' : 'block' },
    title: { fontSize: '18px', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' },
    indicator: { width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#22d3ee' },
    subtitle: { fontSize: '12px', color: '#94a3b8', marginTop: '4px', marginBottom: '16px' },
    actionGroup: { display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: '10px', width: '100%', alignItems: 'center' },
    uploadZone: { display: 'flex', alignItems: 'center', justifyCenter: 'center', flex: 1, width: '100%', height: isMobile ? '48px' : '70px', border: '2px dashed #334155', backgroundColor: 'rgba(30,41,59,0.3)', borderRadius: '8px', cursor: 'pointer', textAlign: 'center' },
    btnStream: { width: isMobile ? 'auto' : '100%', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '12px 16px', borderRadius: '8px', fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap', height: '48px' },
    btnAnalyze: (active) => ({ width: isMobile ? 'auto' : '100%', flex: isMobile ? 1 : 'none', backgroundColor: active ? '#06b6d4' : '#1e293b', color: active ? '#0f172a' : '#64748b', padding: '12px 16px', border: active ? 'none' : '1px solid rgba(51,65,85,0.5)', borderRadius: '8px', fontWeight: '600', cursor: active ? 'pointer' : 'not-allowed', height: '48px', whiteSpace: 'nowrap' }),
    footer: { marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #1e293b', display: isMobile ? 'none' : 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' },
    resultPanel: { position: 'absolute', top: '16px', right: '16px', zIndex: 20, width: '256px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(12px)', padding: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' },
    imgContainer: { borderRadius: '8px', overflow: 'hidden', backgroundColor: '#020617', border: '1px solid #1e293b', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '8px' },
    mobileMapBadge: { position: 'absolute', top: '16px', right: '16px', zIndex: 30, backgroundColor: '#06b6d4', color: '#0f172a', border: 'none', padding: '10px 14px', borderRadius: '30px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(6, 182, 212, 0.4)' },
    modalMask: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' },
    modalBody: { backgroundColor: '#0f172a', border: '1px solid #334155', width: '100%', maxWidth: '400px', borderRadius: '16px', padding: '20px', color: '#fff' },
    legendGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '16px', fontSize: '11px', color: '#94a3b8' },
    legendItem: { display: 'flex', alignItems: 'center', gap: '6px' },
    dot: (color) => ({ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, display: 'inline-block' })
  };

  return (
    <div style={styles.container}>
      <div style={styles.videoLayer}>
        <video ref={videoRef} style={styles.video} playsInline />
      </div>

      <div ref={mountRef} style={styles.threeLayer} />

      {result && isMobile && (
        <button style={styles.mobileMapBadge} onClick={() => setShowResultModal(true)}>
          📊 View Map
        </button>
      )}

      <div style={styles.panel}>
        <div style={styles.headerGroup}>
          <h1 style={styles.title}><span style={styles.indicator} />AR Inspector</h1>
          <p style={styles.subtitle}>Align model reference to environment.</p>
        </div>

        <div style={styles.actionGroup}>
          <label style={styles.uploadZone}>
            <span style={{ fontSize: isMobile ? '12px' : '13px', color: '#cbd5e1', fontWeight: '500', padding: '0 8px' }}>
              {loadingModel ? "Loading..." : cadRef.current ? "🔄 Change STL" : "📁 Load STL"}
            </span>
            <input type="file" accept=".stl" onChange={handleUpload} style={{ display: 'none' }} />
          </label>

          {!streamStarted && (
            <button onClick={startCamera} style={styles.btnStream}>Camera</button>
          )}

          <button onClick={captureAndCompare} disabled={!cadRef.current} style={styles.btnAnalyze(!!cadRef.current)}>
            Compare
          </button>
        </div>

        <div style={styles.footer}>
          <span>🖱️ Drag to Rotate</span>
          <span>📜 Scroll to Zoom</span>
        </div>
      </div>

      {result && !isMobile && (
        <div style={styles.resultPanel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#cbd5e1' }}>Deviation Map</span>
            <button onClick={() => setResult(null)} style={{ border: 'none', background: '#1e293b', color: '#94a3b8', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>Clear</button>
          </div>
          <div style={styles.imgContainer}>
            <img src={result} alt="Analysis" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div style={styles.legendGrid}>
            <div style={styles.legendItem}><span style={styles.dot('#10b981')} /> Match</div>
            <div style={styles.legendItem}><span style={styles.dot('#ef4444')} /> Missing</div>
            <div style={styles.legendItem}><span style={styles.dot('#f97316')} /> Warning</div>
            <div style={styles.legendItem}><span style={styles.dot('#334155')} /> Outer Space</div>
          </div>
        </div>
      )}

      {result && isMobile && showResultModal && (
        <div style={styles.modalMask} onClick={() => setShowResultModal(false)}>
          <div style={styles.modalBody} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '14px' }}>Deviation Analysis Map</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { setResult(null); setShowResultModal(false); }} style={{ border: 'none', background: '#27272a', color: '#ef4444', fontSize: '11px', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}>Reset</button>
                <button onClick={() => setShowResultModal(false)} style={{ border: 'none', background: '#1e293b', color: '#fff', fontSize: '11px', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}>Close</button>
              </div>
            </div>
            <div style={{ ...styles.imgContainer, aspectRatio: '4/3' }}>
              <img src={result} alt="Analysis" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div style={styles.legendGrid}>
              <div style={styles.legendItem}><span style={styles.dot('#10b981')} /> Perfect Match</div>
              <div style={styles.legendItem}><span style={styles.dot('#ef4444')} /> Missing Edge</div>
              <div style={styles.legendItem}><span style={styles.dot('#f97316')} /> Outer Warning</div>
              <div style={styles.legendItem}><span style={styles.dot('#334155')} /> Background</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
