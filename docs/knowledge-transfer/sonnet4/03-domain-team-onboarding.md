# Domain Team Onboarding Guide

## Quick Start Guide

### Prerequisites
- Node.js 20+
- macOS (recommended for full feature support)
- Git access to repository
- Basic understanding of Electron, TypeScript, and Three.js

### Initial Setup
```bash
# Clone and setup
git clone <repository-url>
cd openai-gpt-5-music-visualizer
npm install

# Start development
npm run dev
```

### First Run Verification
1. Application launches successfully
2. Load an audio file (MP3, WAV, AIFF)
3. Verify visual response to audio
4. Test live audio capture
5. Try different visual presets

## Integration Workflow

### Adding New Visual Effects

1. **Create Effect Class**
```typescript
// src/three/CustomEffect.ts
export class CustomEffect {
  init(scene: THREE.Scene): void { /* setup */ }
  update(dt: number, audioFeatures: AudioFeatures): void { /* animate */ }
  dispose(scene: THREE.Scene): void { /* cleanup */ }
}
```

2. **Register in SceneView**
```typescript
// Add to SceneView constructor
this.customEffect = new CustomEffect();
this.customEffect.init(this.scene);

// Add to animation loop
this.customEffect.update(dt, audioFeatures);
```

3. **Add UI Controls**
```typescript
// src/ui/EffectControls.tsx
const EffectControls = () => (
  <button onClick={() => scene.triggerCustomEffect()}>
    Custom Effect
  </button>
);
```

### Audio Feature Extension

1. **Add Feature Extraction**
```typescript
// src/analysis/CustomFeatureExtractor.ts
export function extractCustomFeature(freqData: Uint8Array): number {
  // Custom analysis logic
  return computedValue;
}
```

2. **Integrate into AudioEngine**
```typescript
// Add to tick() method
const customFeature = extractCustomFeature(this.freqData);
const frame = { ...existingFrame, customFeature };
```

### Theme System Extension

1. **Define New Theme**
```typescript
// src/ui/presets.ts
export const customTheme: CrystalTheme = {
  name: 'Custom Theme',
  colors: [new THREE.Color(0xff0000), new THREE.Color(0x00ff00)],
  coreColor: new THREE.Color(0x0000ff),
  edgeColor: new THREE.Color(0xffffff),
};
```

2. **Register Theme**
```typescript
// Add to themes array in CrystalSphere
private themes: CrystalTheme[] = [
  // ... existing themes
  customTheme,
];
```

## Development Workflow

### Code Organization Standards
- **Modular Design**: Each effect in separate file
- **Type Safety**: Full TypeScript coverage
- **Resource Management**: Proper disposal in dispose() methods
- **Performance**: 60 FPS target, monitor frame timing

### Testing Requirements
```typescript
// Required test coverage
describe('CustomEffect', () => {
  it('should initialize without errors', () => {});
  it('should respond to audio input', () => {});
  it('should dispose resources properly', () => {});
});
```

### Pull Request Process
1. Feature branch from main
2. Implement with tests
3. Update documentation
4. Code review with performance check
5. Merge after approval

## Troubleshooting Common Issues

### WebGL Context Issues
- **Symptom**: Black screen or fallback to 2D
- **Solution**: Check GPU drivers, reduce effect complexity

### Audio Permission Denied
- **Symptom**: Live capture fails
- **Solution**: Grant microphone/screen recording permissions

### Performance Issues
- **Symptom**: Frame drops, high CPU usage
- **Solution**: Profile with DevTools, optimize shaders/geometry

### Memory Leaks
- **Symptom**: Increasing memory usage over time
- **Solution**: Verify dispose() methods, check for retained references

## Best Practices

### Performance Optimization
- Reuse geometries and materials
- Use object pooling for dynamic effects
- Minimize allocations in render loop
- Profile regularly with browser DevTools

### Code Quality
- Follow existing naming conventions
- Document complex algorithms
- Use TypeScript strict mode
- Maintain test coverage above 80%

### User Experience
- Provide immediate visual feedback
- Handle edge cases gracefully
- Support keyboard shortcuts
- Maintain 60 FPS performance

This guide provides the essential information for domain teams to successfully integrate and extend the music visualizer system.