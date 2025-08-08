## Subtask: Feature Extraction (M1)

### Features
- RMS, spectral centroid, rolloff, flatness, MFCC, chroma (optional), low/mid/high band energy, onset detection.

### Libraries
- Start with `meyda` on `AudioWorklet` for throughput; fall back to main thread if needed.

### Output Rate
- 60 fps target with throttling; provide fixed hop size for determinism during file playback.

### Tests
- Fixtures with known tones and sweeps; verify centroid tracks frequency; band energy mapping correctness.


