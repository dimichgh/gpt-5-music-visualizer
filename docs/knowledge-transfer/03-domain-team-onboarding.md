## Onboarding

### Prereqs
- Node 20+, pnpm or yarn, macOS with Screen Recording permission for system audio (M3).

### Run
1) Install dependencies: `npm i`
2) Start development: `npm run dev`
3) Load audio via the UI (file picker), or click Live Capture to analyze system/mic audio, or start a Test Tone.
4) Use Presets to adjust beat sensitivity and star density; Save/Load presets via JSON.

### Packaging
- Electron Builder for macOS (M5).

### Recording Frames and Encoding Video
1) Click "Record Frames" to choose a capture folder and start saving PNG frames.
2) Click again to stop. Then click "Encode Video" and choose an mp4 output path.
3) Ensure `ffmpeg` is installed and available in PATH.

### Troubleshooting
- If WebGL fails, the app falls back to a simple 2D visualization. Check GPU flags in main if needed (`GPU_MODE`).
- If recording buttons error on first run, restart dev to ensure preload bridge is initialized.


