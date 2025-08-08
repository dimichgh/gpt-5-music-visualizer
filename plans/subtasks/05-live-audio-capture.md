## Subtask: Live Audio Capture (M3)

### Approach
1) Preferred: `getDisplayMedia({ audio: true })` for macOS system audio (requires Screen Recording permission). Provide UX to request and explain permissions.
2) Device alternative: guide user to install a virtual audio device (e.g., BlackHole) and select as input via `getUserMedia` device picker.
3) Fallback: microphone.

### Notes
- Handle latency by smoothing and compensating feature mapping; provide latency slider.
- Detect unavailable capabilities and degrade gracefully.


