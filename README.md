## OpenAI GPT-5 Music Visualizer

Electron-based, macOS-first music visualizer with TypeScript, React, and Three.js. It reacts to audio files or live/system audio with ethereal, psychedelic visuals and post-processing bloom.

### Features
- Audio file playback, test tone, or live/system audio capture
- Audio analysis: low/mid/high bands, RMS, basic beat detection
- Visuals: Crystal Sphere bundle (Resonance, Prism, Rift, Spikes) and Nebula overlay shader
- Post-processing bloom
- Frame recording to PNG and `ffmpeg` mp4 encoding
- Preset save/load (JSON)

### Requirements
- Node.js 20+
- macOS recommended (system audio capture may require Screen Recording permission)
- `ffmpeg` in PATH for encoding videos

### Getting Started
```bash
npm install
npm run dev
```
This runs:
- tsup watch for main and preload
- Vite dev server for renderer (port 5183)
- Electron once the dev server is ready

Open the app and either:
- Load an audio file (file picker)
- Click Live Capture for system/mic audio
- Click Test Tone to generate a sine wave

### Scripts
- `npm run dev`: Start development (main/preload/renderer/Electron)
- `npm run build`: Build main, preload, and renderer
- `npm run test`: Run mocha tests
- `npm run lint`: ESLint
- `npm run typecheck`: TypeScript type checking
- `npm run format`: Prettier

### Recording Frames & Encoding
1) Click "Record Frames" and select a folder. Frames will be saved as PNGs.
2) Click again to stop recording.
3) Click "Encode Video" to choose an mp4 output and encode with `ffmpeg`.

If encoding fails, ensure `ffmpeg` is installed and available on PATH.

### GPU Mode (Development)
In development, you can switch GPU modes by setting `GPU_MODE` before launching dev:
```bash
GPU_MODE=metal npm run dev      # default on macOS
GPU_MODE=gl_angle npm run dev
GPU_MODE=desktop_gl npm run dev
GPU_MODE=swiftshader npm run dev
GPU_MODE=disable npm run dev
```

### Project Structure
```
app/
  main/      # Electron main process
  preload/   # Secure preload bridge exposing window.ipcBridge
  renderer/  # React UI + Three.js visualization + Audio analysis
docs/knowledge-transfer/  # Architecture & engineering docs
plans/       # Architecture plans and subtask breakdowns
tests/       # Mocha tests
```

### Docs
- Architecture: `docs/knowledge-transfer/01-architecture-overview.md`
- Engineering: `docs/knowledge-transfer/02-engineering-guide.md`
- Onboarding: `docs/knowledge-transfer/03-domain-team-onboarding.md`
- Visual effects algorithms: `docs/knowledge-transfer/05-visual-effects-algorithms.md`

### Troubleshooting
- WebGL fails: the app falls back to a simple 2D visualization. Try a different `GPU_MODE`.
- Recording buttons fail on first run: restart dev to ensure the preload bridge is initialized.
- System audio not available: `getDisplayMedia` support varies by OS/Chromium; fallback to `getUserMedia` microphone.

# gpt-5-music-visualizer
