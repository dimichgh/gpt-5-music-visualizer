## Architecture Overview

### Goals
- Ethereal, psychedelic, cosmic music visualizations reacting to low/mid/high bands and beat.
- macOS-first Electron app with TypeScript; supports audio file playback and live/system audio capture.
- Visual stack built on Three.js with post-processing bloom and shader-based overlays.

### High-Level Components
- Main process (`app/main/src/main.ts`):
  - Creates `BrowserWindow`, wires secure IPC handlers for saving frames, selecting folders, and encoding video via `ffmpeg`.
  - Development GPU mode controls via Chromium flags (`GPU_MODE=metal|gl_angle|desktop_gl|swiftshader|disable`).
- Preload (`app/preload/src/preload.ts`):
  - Exposes a minimal, typed IPC bridge (`window.ipcBridge`) to the renderer: select/save directories, save frames, encode frames, save/load JSON.
- Renderer (React + Three.js):
  - UI and lifecycle (`app/renderer/src/main.tsx`) host the visualization canvas and control panel.
  - Audio analysis and feature extraction (`app/renderer/src/audio/AudioEngine.ts`).
  - Visualization engine (`app/renderer/src/three/SceneView.ts`) orchestrating effects:
    - Crystal sphere effect bundle (`CrystalSphere.ts`)
    - Fullscreen nebula shader overlay (`NebulaOverlay.ts`)
    - Post-processing (`PostFX.ts`, Unreal Bloom)
    - Optional particle figures for instrument silhouettes (`ParticleFigures.ts`) – currently unused but ready to integrate.

### Data & Control Flow
1) Audio source (file, test tone, or MediaStream for live/system audio) → Web Audio analyser graph.
2) `AudioEngine` computes per-frame features:
   - Frequency bins (Uint8Array), RMS proxy from spectrum, band averages: low/mid/high, instant energy from waveform, basic beat detection.
3) Renderer frame loop (`SceneView.animate`) consumes features to:
   - Classify dominant instrument heuristically (`InstrumentClassifier`),
   - Select theme and exclusive effect in `CrystalSphere` based on bands/beat, reinforce active effect emissions,
   - Drive `NebulaOverlay` shader uniforms and `PostFX` bloom strength.
4) Three.js composer renders the scene; if recording is enabled, the current frame is exported to PNG via canvas and persisted through IPC.

### Audio Pipeline
- Web Audio graph is created lazily per source.
- `AnalyserNode` configured with `fftSize=1024` and smoothing for stable visuals.
- Features per frame:
  - Bands: third-split of magnitudes across frequency bins.
  - RMS: square-mean over normalized magnitudes.
  - Beat detection: rolling mean/std of instant energy with sensitivity mapping and min interval.

### Visualization Pipeline
- Scene: perspective camera at z=3, ambient + directional lights.
- Crystal Sphere: particle points + wireframe, with four mutually exclusive effects:
  - Resonance (expanding torus rings), Prism (radial rays), Rift (nebula particle burst), Spikes (outward cones).
- Nebula Overlay: full-screen plane with fbm shader, alpha modulated by energy.
- PostFX: UnrealBloom pass; bloom tuned per active effect.
- 2D Fallback: if WebGL context fails, a minimal canvas-based radial pulse renders instead.

### IPC & Recording
- Renderer captures data URLs from the WebGL canvas and sends them to main for disk writes.
- Video encoding is delegated to `ffmpeg` (user-provided), invoked from main with cwd set to the capture folder.

### Security Considerations
- `contextIsolation: true`, no `nodeIntegration` in renderer.
- Preload exposes only necessary, parameter-validated functions.
- Navigation and window open are disabled.

### Performance Considerations
- Avoid allocations in the render loop; reuse typed arrays.
- Keep `fftSize` modest for stability; raise only if needed.
- Limit effect mixing; enforce exclusivity to bound draw calls and material count.
- Optional: migrate analysis to `AudioWorklet` if main-thread stalls are observed.

### Dependencies
- Electron, React, Three.js, TypeScript, Vite, mocha/chai/sinon (no sinon-chain), and `three/examples` postprocessing.

### References
- Detailed visual effects documentation: see `05-visual-effects-algorithms.md`.


