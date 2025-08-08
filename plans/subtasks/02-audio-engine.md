## Subtask: Audio Engine (M1)

### Objectives
- Implement `AudioEngine` providing unified API for file and live audio sources.

### API
```ts
type AudioSourceKind = 'file' | 'mic' | 'system';

interface AudioFeaturesFrame {
  time: number; // seconds
  rms: number;
  bands: { low: number; mid: number; high: number };
  centroid: number;
  rolloff: number;
  beat: boolean;
}

interface AudioEngine {
  loadFile(arrayBuffer: ArrayBuffer): Promise<void>;
  start(): Promise<void>;
  stop(): void;
  onFrame(callback: (frame: AudioFeaturesFrame) => void): () => void; // returns unsubscribe
}
```

### Implementation Notes
- Use `AudioContext`, `AnalyserNode`, windowing, and smoothing filters for stable frames.
- For beats, use energy-based onset detection with adaptive threshold.

### Tests
- Deterministic WAV fixtures; assert RMS/band trends; mock `AnalyserNode` with sinon.


