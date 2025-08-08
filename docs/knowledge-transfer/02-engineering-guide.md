## Engineering Guide

### Repository Layout
- `app/main`: Electron main process (TypeScript)
- `app/preload`: Preload context bridge (TypeScript)
- `app/renderer`: React UI, audio analysis, Three.js visualization
- `docs/knowledge-transfer`: Architecture and operation docs
- `plans`: High-level and subtask plans
- `tests`: Mocha tests (smoke and unit)

### Scripts
- `npm run dev`: concurrently builds main and preload with tsup, runs Vite dev server for renderer, and launches Electron after port 5183 is ready.
- `npm run build`: builds main (ESM), preload (CJS), and bundles renderer with Vite.
- `npm run test`: mocha in TypeScript via ts-node; see `tests/*.test.ts`.
- `npm run lint|typecheck|format` for DX.

### Running Locally
1. Install Node 20+ and `ffmpeg` in PATH for encoding.
2. `npm i`
3. `npm run dev`
4. Use UI to load an audio file, start test tone, or Live Capture (system/mic audio).

### Packaging
- TBD (Electron Builder planned). Current build creates distributable assets for renderer; main/preload are bundled by tsup.

### Audio Analysis (`AudioEngine`)
- Creates an `AnalyserNode (fftSize=1024, smoothing=0.85)`.
- Features per frame: `rms` (spectrum RMS), `bands` (third-split averages), `beat` (instant energy vs. rolling mean/std with sensitivity and min interval).
- Sources:
  - File playback (decoded via `decodeAudioData` on-demand in `start()`).
  - Test tone (sine oscillator + gain).
  - Live/system audio (`getDisplayMedia` if available; fallback to `getUserMedia`).

### Renderer & Effects
- `SceneView` bootstraps WebGL renderer, camera, lights, post-processing, nebula overlay, and crystal sphere bundle.
- 2D fallback is provided when WebGL fails, drawing a minimal radial pulse for stability.
- Per-frame:
  - Instrument classification (`InstrumentClassifier`) with a hold timer to avoid frequent switches.
  - Exclusive effect selection using `chooseEffect` (beats/band thresholds + energy fallback).
  - Bloom strength from `CrystalSphere.bloomStrength` applied to `PostFX`.
  - Nebula alpha scaled from RMS.

### IPC Bridge & Recording
- `window.ipcBridge` functions exposed from preload:
  - `selectCaptureDir`, `saveFrame(dir, filename, dataURL)`, `selectVideoOutput`, `encodeFrames(dir, pattern, fps, output)`, `saveTextFile`, `openJsonFile`.
- PNG frames are written by main; `ffmpeg` is spawned in that directory to encode to mp4.

### Testing
- Unit tests: audio feature helpers (`computeBands`, `computeRmsFromFreq`, beat detection edge cases), mapping logic (`chooseEffect`).
- Smoke test: Electron boots renderer and `SceneView` constructs without throwing.
- Frameworks: mocha + chai + sinon (avoid sinon-chain per repo rule).

### Performance Tips
- Avoid object creation inside animation loops; reuse vectors and arrays.
- Keep shader work minimal; leverage post-processing bloom sparingly.
- Do not enable multiple effect groups simultaneously; use `setExclusiveEffect`.

### Extending
- For new effects: create a new effect group in `CrystalSphere`, implement `emitX` and `updateX`, and integrate into `chooseEffect`.
- For new audio features: compute in `AudioEngine` and thread through `SceneView.updateFromAudio` to the effect.
- For instrument silhouettes: integrate `ParticleFigures` by reacting to `currentInstrument`.

See also: detailed visual algorithms in `05-visual-effects-algorithms.md`.


