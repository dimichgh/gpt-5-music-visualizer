## Subtask: Visualization Engine (M1–M2)

### Objectives
- Create Three.js scene manager with composable visual layers and post-processing.

### Layers (Initial)
- `AuroraFieldLayer`: curl-noise-driven fragment shader, color palettes, reacts to low/mid energy for flow speed and hue shift.
- `StarfieldLayer`: instanced points with parallax, subtle twinkle on high-band transients.

### M2 Additions
- `NebulaParticlesLayer`: GPU-accelerated particles with emission rate tied to beat and mid energy.
- PostFX: UnrealBloom, Film grain, Chromatic aberration (light touch).
 - `CrystalSphere`: sphere of points + wireframe + energy core with four effects (resonance, prism, rift, spikes). Reacts to instrument and energy; timed effect switching; spikes on intensity surges.

### API
```ts
interface VisualParams {
  palette: string;
  lowEnergy: number;
  midEnergy: number;
  highEnergy: number;
  beat: boolean;
  tempo: number | null;
}

interface VisualLayer {
  init(scene: THREE.Scene, renderer: THREE.WebGLRenderer, composer?: EffectComposer): void;
  update(dt: number, params: VisualParams): void;
  dispose(): void;
}
```

### Tests
- Pure functions for param mapping and color grading; snapshot shader uniforms on known frames.
 - Validate `CrystalSphere` update loop does not allocate per frame (profiling), and that spike lifecycle removes geometry to prevent leaks.


