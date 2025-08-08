## Subtask: Instrument Silhouettes (M4)

### Minimal Heuristic (No ML)
- Map band patterns and centroid to instrument families:
  - Low sustained energy → Bass/Cello shadow
  - Mid transient + harmonic content → Guitar/Keys shadow
  - High transient clusters → Drums/Cymbals

### Optional ML (Stretch)
- Use `onnxruntime-web` with a small audio classifier model to improve detection; run in a worker.

### Visuals
- Transparent, volumetric silhouettes with subtle motion; respect user toggle.


