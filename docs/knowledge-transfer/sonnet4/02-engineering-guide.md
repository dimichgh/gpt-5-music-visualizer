# Engineering Guide - OpenAI GPT-5 Music Visualizer

## Development Environment Setup

### Prerequisites
- **Node.js 20+**: Required for Electron and build tools
- **macOS**: Primary development platform (system audio features)
- **FFmpeg**: Optional, for video encoding functionality
- **Git**: Version control and repository management

### Installation & Setup
```bash
# Clone repository
git clone <repository-url>
cd openai-gpt-5-music-visualizer

# Install dependencies
npm install

# Start development environment
npm run dev
```

### Development Scripts
```bash
# Development (all processes)
npm run dev

# Individual process development
npm run dev:main      # Main process only
npm run dev:preload   # Preload script only
npm run dev:renderer  # Renderer process only
npm run dev:electron  # Electron app only

# Production builds
npm run build         # Build all processes
npm run build:main    # Main process only
npm run build:preload # Preload script only
npm run build:renderer# Renderer process only

# Code quality
npm run lint          # ESLint
npm run format        # Prettier
npm run typecheck     # TypeScript validation
npm run test          # Run tests
```

## Codebase Structure

### Directory Organization
```
app/
├── main/                    # Electron main process
│   ├── src/main.ts         # Main process entry point
│   └── tsconfig.json       # Main process TypeScript config
├── preload/                # Secure IPC bridge
│   ├── src/preload.ts      # Preload script
│   └── tsconfig.json       # Preload TypeScript config
└── renderer/               # UI and visualization
    ├── src/
    │   ├── main.tsx        # React application entry
    │   ├── audio/          # Audio processing
    │   ├── analysis/       # Feature extraction
    │   ├── three/          # 3D visualization
    │   ├── ui/             # React components
    │   └── types/          # TypeScript definitions
    ├── index.html          # Renderer HTML template
    └── vite.config.ts      # Vite configuration

docs/knowledge-transfer/    # Documentation
plans/                      # Architecture plans
tests/                      # Test suites
```

### Key Modules

#### Audio Engine (`src/audio/AudioEngine.ts`)
**Responsibilities:**
- Web Audio API wrapper and abstraction
- Multiple audio source handling (files, live, system)
- Real-time feature extraction coordination
- Beat detection and energy analysis

**Key Methods:**
```typescript
class AudioEngine {
  async loadFile(file: File): Promise<void>
  async start(): Promise<void>
  stop(): void
  onFrame(callback: FrameCallback): () => void
  async startTestTone(frequency: number): Promise<void>
  async startFromMediaStream(stream: MediaStream): Promise<void>
  setBeatSensitivity(sensitivity: number): void
  setVolume(volume: number): void
}
```

**Integration Points:**
- Connects to Web Audio API AnalyserNode
- Publishes AudioFeaturesFrame events at 60 FPS
- Manages audio context lifecycle and permissions

#### Visualization Engine (`src/three/SceneView.ts`)
**Responsibilities:**
- Three.js scene management and orchestration
- Visual effect coordination and switching
- Audio-to-visual parameter mapping
- Frame capture for recording

**Key Methods:**
```typescript
class SceneView {
  constructor(container: HTMLElement)
  updateFromAudio(rms: number, low: number, mid: number, high: number, beat?: boolean): void
  captureFrame(): string | null
  dispose(): void
}
```

**Effect Management:**
- Manages CrystalSphere, NebulaOverlay, and other effects
- Implements exclusive effect switching with hold times
- Maps audio features to visual parameters

#### Crystal Sphere Effects (`src/three/CrystalSphere.ts`)
**Responsibilities:**
- Multi-effect visual system (Resonance, Prism, Rift, Spikes)
- Theme-based color management
- Music-reactive effect triggering
- GPU particle system management

**Effect Types:**
- **Resonance**: Expanding torus rings
- **Prism**: Radiating light rays
- **Rift**: Explosive particle clouds
- **Spikes**: Directional cone projections

## Audio Processing Implementation

### Feature Extraction Pipeline

#### 1. FFT Analysis
```typescript
// AudioEngine configuration
analyser.fftSize = 1024;              // Balance quality/performance
analyser.smoothingTimeConstant = 0.85; // Smooth frequency transitions

// Real-time analysis
analyser.getByteFrequencyData(freqData);
analyser.getByteTimeDomainData(timeData);
```

#### 2. Frequency Band Separation
```typescript
function computeBands(freq: Uint8Array): { low: number; mid: number; high: number } {
  const n = freq.length;
  const oneThird = Math.floor(n / 3);
  const low = average(freq, 0, oneThird);           // ~0-170 Hz
  const mid = average(freq, oneThird, 2 * oneThird); // ~170-340 Hz  
  const high = average(freq, 2 * oneThird, n);       // ~340+ Hz
  return { low, mid, high };
}
```

#### 3. Beat Detection Algorithm
```typescript
private detectBeat(energy: number, nowSec: number): { isBeat: boolean } {
  // Maintain rolling energy statistics
  this.energyHistory.push(energy);
  if (this.energyHistory.length > this.maxEnergyHistory) this.energyHistory.shift();
  
  // Calculate adaptive threshold
  const mean = averageArray(this.energyHistory);
  const variance = calculateVariance(this.energyHistory, mean);
  const std = Math.sqrt(Math.max(variance, 1e-8));
  
  // Sensitivity-based threshold
  const k = 2.0 - 1.5 * this.beatSensitivity; // 0.5..2.0
  const threshold = mean + k * std;
  
  // Prevent rapid-fire beats
  const minInterval = 0.12; // seconds
  const canTrigger = nowSec - this.lastBeatAt > minInterval;
  
  const isBeat = canTrigger && energy > threshold;
  if (isBeat) this.lastBeatAt = nowSec;
  return { isBeat };
}
```

### Instrument Classification

#### Heuristic Algorithm
```typescript
private classifyInstant(rms: number, low: number, mid: number, high: number, beat: boolean): Instrument {
  // Drums: High-frequency transients with beats
  if (beat && high > 0.5 && mid < 0.6) return 'drums';
  
  // Bass: Low-frequency dominance
  if (low > 0.45 && mid < 0.35) return 'bass';
  
  // Guitar: Mid-frequency focus
  if (mid > 0.5 && high < 0.5) return 'guitar';
  
  // Silence detection
  if (rms < 0.08) return 'none';
  
  return 'none';
}
```

#### Classification Stability
- **Hold Time**: 5-second minimum before instrument changes
- **Confidence Threshold**: Requires consistent classification
- **Fallback Strategy**: Defaults to 'none' for ambiguous signals

## Common Issues & Solutions

### WebGL Context Loss
```typescript
// Handle WebGL context restoration
constructor(private container: HTMLElement) {
  try {
    // ... WebGL setup ...
    
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestored);
  } catch (e) {
    // Fallback to 2D canvas
    this.initFallback2D();
  }
}

private onContextLost = (event: Event) => {
  event.preventDefault();
  console.warn('WebGL context lost');
};

private onContextRestored = () => {
  console.log('WebGL context restored');
  this.reinitializeWebGL();
};
```

### Audio Permission Issues
```typescript
// Handle audio permission failures gracefully
async startFromMediaStream(stream: MediaStream): Promise<void> {
  try {
    const context = (this.audioContext ||= new AudioContext());
    // ... setup code ...
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      console.error('Microphone permission denied');
      // Show user-friendly error message
    } else if (error.name === 'NotFoundError') {
      console.error('No audio input device found');
      // Suggest checking audio hardware
    }
    throw error;
  }
}
```

### Memory Leaks Prevention
```typescript
// Comprehensive cleanup
dispose() {
  // Cancel animation frames
  if (this.frameHandle) {
    cancelAnimationFrame(this.frameHandle);
    this.frameHandle = null;
  }
  
  // Remove event listeners
  window.removeEventListener('resize', this.onResize);
  
  // Dispose Three.js resources
  this.disposeThreeJSResources();
  
  // Clear callbacks to prevent memory retention
  this.callbacks.clear();
  this.onEndedCallbacks.clear();
  
  // Disconnect audio nodes
  this.disconnectAudioNodes();
}
```

This engineering guide provides the technical foundation needed to understand, maintain, and extend the music visualizer codebase effectively.