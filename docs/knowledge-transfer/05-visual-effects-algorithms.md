## Visual Effects Algorithms

This document explains how audio features map to the rendered visuals, with implementation notes to extend or tune the system.

### Audio Features
- rms: spectrum-derived RMS proxy in [0,1].
- bands: low/mid/high averages from analyser bins (simple third-split). Returned as [0,1].
- beat: boolean from instant energy vs. rolling mean/std threshold with sensitivity and min interval.

Implementation references:
- `app/renderer/src/audio/AudioEngine.ts`
  - `computeBands`, `computeRmsFromFreq`, `computeInstantEnergy`, `detectBeat`.

### Scene Orchestration
- `SceneView.updateFromAudio(rms, low, mid, high, beat)`
  - Updates state used by animation loop.
  - Chooses an exclusive effect via `chooseEffect(low, mid, high, rms, beat)`.
  - Applies bloom strength from the active effect.
  - Modulates `NebulaOverlay` alpha from `rms`.
  - Classifies instrument and selects a color theme.

### Effect Bundle: Crystal Sphere
File: `app/renderer/src/three/CrystalSphere.ts`

Structure
- Points (icosahedron vertices) with theme-driven vertex colors and per-vertex twinkle factors.
- Wireframe overlay for subtle edges.
- Four effect groups (exclusive): `resonance`, `prism`, `rift`, `spikes`.

Effect Selection (high-level)
- `spikes`: priority on beat with strong highs.
- `prism`: strong highs + mids.
- `resonance`: strong mid with comparatively lower low.
- `rift`: strong low energy.
- Fallback on overall energy to `prism` or `resonance`.

Bloom Mapping
- `bloomStrength` is set per effect to emphasize brightness:
  - resonance ~1.3, prism ~1.35, rift ~1.6, spikes ~1.4. Idle ~1.2.

Color Themes
- `setThemeByEnergyInstrument(energy, instrument)` changes theme index using instrument and energy level. Higher energy bumps to next palette for variation.

Resonance (Expanding Rings)
- Emission: `emitResonance(theme, rings)` creates torus meshes aligned to the equator.
- Update: scale rings and fade opacity with a sine of remaining life; staggered delays for multiple rings.
- Triggers: reinforced on beat or strong mid when active.

Prism (Radial Rays)
- Emission: `emitPrism(theme, rays)` creates thin cylinders oriented to random outward directions.
- Update: opacity ramps in (phase < 1), then fades out by life.
- Triggers: reinforced by strong highs when active.

Rift (Nebula Burst)
- Emission: `emitRift(theme, count)` creates many colored points with per-point velocity and rotation speed.
- Update: particles advect by velocity, rotate around their velocity axis, and global opacity fades.
- Triggers: reinforced by strong lows when active.

Spikes (Conic Bursts)
- Emission: `createSpikes(count, low, mid, high)` creates cones pointing in random outward directions with band-tinted colors.
- Update: cones advance along forward direction, wobble in length (scale.y), hue rotates subtly per spike; opacity clamps to life.
- Music Modulation: `triggerSpikesFromAudio(low, mid, high)` increases spike count with band intensity.

Twinkle and Particle Colors
- On each update, vertices with non-zero twinkle factor receive time-sin brightness modulated by `high` band.

### Fullscreen Nebula Overlay
File: `app/renderer/src/three/NebulaOverlay.ts`

Shader
- fbm-based fragment shader with multiple noise octaves.
- Color mix and mask weighted by bands: `uLow`, `uMid`, `uHigh`.
- Alpha: `uAlpha` in [0,1], set from `rms` in `SceneView`.

Viewport Coverage
- Plane scaled to cover the camera frustum at depth of the overlay, updating on resize.

### Post-Processing Bloom
File: `app/renderer/src/three/PostFX.ts`

- UnrealBloom configured with default strength, radius, threshold.
- `setBloom(strength)` is invoked per frame to reflect the active effect’s desired intensity (`CrystalSphere.bloomStrength`).

### Instrument Classifier & Silhouettes
- Classifier (`InstrumentClassifier.ts`) provides coarse ‘none|drums|bass|guitar’ using band thresholds and beat.
- `ParticleFigures` can morph points into silhouettes:
  - `bass` → torus, `drums` → sphere, `guitar` → Lissajous figure; lerps positions and rotates slowly.
- Currently not integrated in `SceneView`; to enable, instantiate and call `setFigure(currentInstrument)` and `update(...)`.

### Audio→Visual Mapping Summary
- Beats: prefer `spikes`; otherwise favor `prism` on highs, `resonance` on mids, `rift` on lows.
- RMS: controls nebula alpha and subtle 3D breathing scale.
- High band: increases twinkle brightness and spike tinting.
- Mid band: encourages resonance rings.
- Low band: powers rift bursts and scale breathing.

### Extension Guidelines
- Add a new effect:
  1) Create a new group in `CrystalSphere.effectGroups` and add `emitNew`, `updateNew`.
  2) Ensure disposal of geometries/materials when life ends.
  3) Adjust `chooseEffect` in `SceneView` to route conditions to the new effect.
  4) Provide a `bloomStrength` profile for visual balance.

- Add new audio features:
  - Compute in `AudioEngine.tick` and include in the `AudioFeaturesFrame`.
  - Thread through `SceneView.updateFromAudio` and incorporate into effect selection or shader uniforms.

- Performance tips:
  - Keep geometry counts bounded; avoid mixing effects simultaneously.
  - Use additive blending and disable depth write where possible for overlays.
  - Recycle objects or pools if adding sustained particle systems.

### Tuning Knobs
- Analyser `fftSize`, `smoothingTimeConstant` for feature stability.
- Beat sensitivity (0..1) exposed in UI; affects threshold multiplier.
- Bloom strength per effect to match palette brightness.
- Nebula `uAlpha` scaling from RMS.


