## Music Visualizer — Architecture Overview

### Goals
- Ethereal, psychedelic, cosmic visualizations driven by music.
- Input: macOS system audio capture when available, or offline analysis of audio files (WAV/AIFF/MP3). Primary v1 path will be audio-file analysis; live system-audio capture is added in M3 with macOS permissions.
- Electron app implemented in TypeScript. Tests with mocha + chai + sinon (no sinon-chain).

### High-Level Architecture
- Electron Main Process (`app/main`):
  - App lifecycle, windows, secure IPC.
  - File open dialogs and sandboxed file read (passes ArrayBuffer to renderer via IPC).
  - Optional: orchestrates screen-capture permissions for system audio capture.
- Preload (`app/preload`):
  - Exposes a minimal, typed `ipcBridge` API to the renderer for file selection and secure operations.
- Renderer (`app/renderer`):
  - UI (React + Vite) and Visualization (Three.js/WebGL2 + custom shaders).
  - Web Audio graph and feature extraction (Meyda or custom FFT on AnalyserNode).
  - Visualization engine reacts to a stream of extracted features.

### Core Modules (Renderer)
- Audio Engine (`renderer/audio`)
  - File path: `renderer/audio/AudioEngine.ts`
  - Responsibilities:
    - Create and manage `AudioContext`, buffer sources, `AnalyserNode`, optional `ScriptProcessor`/`AudioWorklet` for custom DSP.
    - Provide a unified `AudioSource` interface for: decoded file buffer | live capture stream | display-capture system audio.
    - Publish time-domain and frequency-domain data at a stable tick (e.g., 60 fps, throttled).
- Feature Extraction (`renderer/analysis`)
  - Uses Meyda (or custom WASM/FFT later) to compute features: RMS, energy bands, spectral centroid, rolloff, flatness, MFCC, chroma, onset/beat.
  - Derived signals: low/mid/high band energy, beat events, tempo estimate, envelope followers.
  - Optional M2+: lightweight instrument-heuristics from band energy + centroid; M4+: optional ONNX runtime (web) model for classification.
- Visualization Engine (`renderer/viz`)
  - Three.js Scene Manager with composable layers:
    - `AuroraFieldLayer` (smooth noise fields)
    - `NebulaParticlesLayer` (GPU particle system)
    - `StarfieldLayer` (parallax stars)
    - `FractalBloomLayer` (shader-based)
  - Each layer exposes `update(parameters: VisualParams)` that maps audio features → visual params (color palettes, noise speed, bloom strength, particle emission rate).
  - Post-processing chain with `EffectComposer` (bloom, god-rays, chromatic aberration, film grain).
- Control UI (`renderer/ui`)
  - React components for: input selection, scene presets, color themes, sensitivity, tempo sync, recording.
  - Preset system: JSON-based, import/export.

### Data Flow
1) Source (file | live | system-audio) → Web Audio Graph → Feature Extraction → FeatureBus (RxJS Subject or simple event emitter)
2) Visualization Engine subscribes to FeatureBus → maps to scene parameters → renders via Three.js.
3) UI reads settings and influences feature mapping and visual layer parameters.

### Live System-Audio Capture on macOS (M3)
- Preferred method: `navigator.mediaDevices.getDisplayMedia({ audio: true, video: <optional> })` via Electron’s Chromium, which can capture system audio on macOS with Screen Recording permission.
- Alternative: instruct user to route output to a virtual device (e.g., BlackHole/Loopback), capture via `getUserMedia({audio: true})` and select that device.
- Fallback: microphone capture.

### Security & Permissions
- Use a strict preload bridge. No direct `remote` usage.
- Isolated context; disable nodeIntegration in renderer.
- Request macOS Screen Recording permission only when starting system-audio capture.

### Performance Notes
- Use `AudioWorklet` for heavy feature extraction if main thread becomes saturated.
- Prefer typed arrays and reuse buffers to avoid GC thrash.
- Limit allocations in render loop; push uniforms via shared structures.
- Cap post-processing passes; provide performance presets.

### Dependencies (initial)
- Runtime: `electron`, `react`, `react-dom`, `three`, `meyda`, `rxjs` (optional), `zod` (settings schema), `onnxruntime-web` (optional later).
- Tooling: `typescript`, `vite` (renderer), `esbuild` or `tsc` (main/preload), `eslint`, `prettier`.
- Test: `mocha`, `chai`, `sinon` (avoid sinon-chain), `ts-node`.

### Deliverables by Milestone
- M1: File-based audio analysis + one scene (Aurora + Stars) with beat/energy response.
- M2: Particle nebula, presets, recording of visuals.
- M3: System-audio capture path on macOS.
- M4: Instrument silhouettes (heuristics), optional ONNX classifier.

### Mermaid Diagram
```mermaid
graph TD
  A[Audio Source\n(file | live | system)] --> B[Web Audio Graph\n(Analyser/Worklet)]
  B --> C[Feature Extraction\n(Meyda + derived signals)]
  C --> D[FeatureBus]
  D --> E[Visualization Engine\n(Three.js Layers + PostFX)]
  F[Control UI\n(React)] --> E
  F --> C
  G[Electron Main] --> H[Preload Bridge]
  H --> F
```


