## Execution Plan

### Milestones
- M0 — Scaffold
  - Initialize Electron + TypeScript monorepo-style structure: `app/main`, `app/preload`, `app/renderer` (Vite + React), shared `packages/types`.
  - Configure ESLint/Prettier, mocha/chai/sinon, basic CI workflow.
- M1 — File Analysis + Base Visuals
  - Implement `AudioEngine` with file decode path; implement `FeatureExtractionService` with RMS, bands, centroid, onset.
  - Build `VisualizationEngine` and first layers: `AuroraField`, `Starfield`; connect features to params.
  - UI to pick local audio file; play/pause; sensitivity controls.
- M2 — Particles, Presets, Recording
  - Add `NebulaParticles` layer (GPU instancing); preset system; theme editor.
  - Add render-to-video (image sequence + ffmpeg integration) or screen-record helper.
- M3 — Live System Audio (macOS)
  - Implement system audio via `getDisplayMedia({audio:true})` with permissions; device picker fallback.
  - Latency handling and smoothing filters.
- M4 — Instrument Silhouettes (Optional ML)
  - Heuristic instrument presence mapping; silhouettes/shadows overlay.
  - Optional ONNX classifier for instrument families.
- M5 — Packaging
  - Notarized mac app via `electron-builder` (developer ID later); auto-updates optional.

### Workstreams & Sub-Tasks
1) Bootstrapping (`plans/subtasks/01-bootstrapping.md`)
2) Audio Engine (`plans/subtasks/02-audio-engine.md`)
3) Feature Extraction (`plans/subtasks/03-feature-extraction.md`)
4) Visualization Engine (`plans/subtasks/04-visualization-engine.md`)
5) Live Audio Capture (`plans/subtasks/05-live-audio-capture.md`)
6) UI & Presets (`plans/subtasks/06-ui-controls-and-presets.md`)
7) Instrument Silhouettes (`plans/subtasks/07-instrument-silhouettes.md`)
8) Packaging & Distribution (`plans/subtasks/08-packaging.md`)
9) Testing Strategy (`plans/subtasks/09-testing-strategy.md`)

### Acceptance for M1
- Open audio file; visualize with smooth 60fps; features visibly affecting visuals; CPU/GPU stable on MacBook Pro.
- Unit tests for feature extraction and mapping; CI green.


