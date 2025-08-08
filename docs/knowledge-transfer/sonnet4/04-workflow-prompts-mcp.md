# Workflow Prompts & MCP Configuration Guide

## Overview

This guide covers the integration of Model Context Protocol (MCP) servers and workflow prompts for the OpenAI GPT-5 Music Visualizer project. While this project doesn't currently implement MCP servers directly, this document provides guidance for teams looking to integrate workflow automation and AI-assisted development.

## Workflow Automation Patterns

### Development Workflow Prompts

#### Code Review Prompt
```markdown
## Music Visualizer Code Review Checklist

Please review this code change for the OpenAI GPT-5 Music Visualizer:

**Performance Considerations:**
- [ ] Maintains 60 FPS target in visualization loops
- [ ] Properly disposes of Three.js resources (geometry, materials, textures)
- [ ] Avoids allocations in render/audio analysis loops
- [ ] Uses object pooling for dynamic effects when appropriate

**Audio Processing:**
- [ ] Handles Web Audio API context lifecycle correctly
- [ ] Implements proper error handling for audio permissions
- [ ] Uses appropriate FFT sizes and smoothing parameters
- [ ] Maintains real-time processing constraints

**Visual Effects:**
- [ ] Follows additive blending patterns for performance
- [ ] Implements proper cleanup in dispose() methods
- [ ] Uses consistent coordinate systems and transformations
- [ ] Maintains visual coherence with existing effects

**TypeScript & Architecture:**
- [ ] Maintains type safety throughout the codebase
- [ ] Follows established architectural patterns
- [ ] Implements proper error boundaries and fallbacks
- [ ] Documents complex algorithms and shader code

**Testing:**
- [ ] Includes unit tests for new functionality
- [ ] Tests audio processing edge cases
- [ ] Verifies resource cleanup and memory management
- [ ] Validates visual effect parameters and behaviors
```

#### Feature Development Prompt
```markdown
## Music Visualizer Feature Development Guide

When implementing new features for the music visualizer:

**Audio Feature Integration:**
1. Add feature extraction to `AudioEngine.ts`
2. Update `AudioFeaturesFrame` type definition
3. Map feature to visual parameters in `SceneView.ts`
4. Test with various audio sources and genres

**Visual Effect Creation:**
1. Create new effect class extending base patterns
2. Implement `init()`, `update()`, and `dispose()` methods
3. Add to effect switching logic in `SceneView.ts`
4. Create corresponding UI controls

**Shader Development:**
1. Write GLSL shaders with audio-reactive uniforms
2. Optimize for mobile/integrated GPUs
3. Include fallback behaviors for unsupported features
4. Document mathematical concepts and parameters

**Performance Optimization:**
1. Profile with browser DevTools
2. Monitor memory usage over extended sessions
3. Test on lower-end hardware configurations
4. Validate 60 FPS maintenance under load

**Integration Testing:**
1. Test with various audio file formats
2. Verify live audio capture functionality
3. Test system audio capture on macOS
4. Validate preset save/load functionality
```

### Debugging Workflow Prompts

#### Performance Analysis Prompt
```markdown
## Performance Debugging Guide

When investigating performance issues in the music visualizer:

**Frame Rate Analysis:**
- Monitor `performance.now()` deltas in animation loop
- Check for frame drops during complex visual effects
- Profile GPU usage with browser DevTools
- Identify bottlenecks in audio analysis pipeline

**Memory Leak Detection:**
- Use browser memory profiler over extended sessions
- Verify Three.js resource disposal patterns
- Check for retained event listeners and callbacks
- Monitor audio buffer and texture memory usage

**Audio Processing Performance:**
- Profile FFT computation timing
- Check for audio context state issues
- Monitor Web Audio API node creation/destruction
- Verify real-time processing constraints

**Optimization Strategies:**
- Reduce particle counts for complex effects
- Implement level-of-detail systems for distant objects
- Use texture atlasing for multiple materials
- Optimize shader complexity based on hardware capabilities
```

## MCP Server Integration Patterns

### Audio Analysis MCP Server

#### Server Configuration
```json
{
  "name": "music-visualizer-audio",
  "description": "Audio analysis and feature extraction for music visualizer",
  "version": "1.0.0",
  "tools": [
    {
      "name": "analyze_audio_file",
      "description": "Extract comprehensive audio features from file",
      "parameters": {
        "type": "object",
        "properties": {
          "filePath": {"type": "string"},
          "analysisType": {"enum": ["basic", "detailed", "ml-enhanced"]}
        }
      }
    },
    {
      "name": "generate_visualization_preset",
      "description": "Create visualization preset based on audio analysis",
      "parameters": {
        "type": "object",
        "properties": {
          "audioFeatures": {"type": "object"},
          "visualStyle": {"enum": ["ethereal", "psychedelic", "cosmic", "minimal"]}
        }
      }
    }
  ]
}
```

#### Tool Implementation Example
```typescript
// MCP Tool: analyze_audio_file
export async function analyzeAudioFile(args: {
  filePath: string;
  analysisType: 'basic' | 'detailed' | 'ml-enhanced';
}) {
  const audioBuffer = await loadAudioFile(args.filePath);
  
  switch (args.analysisType) {
    case 'basic':
      return extractBasicFeatures(audioBuffer);
    case 'detailed':
      return extractDetailedFeatures(audioBuffer);
    case 'ml-enhanced':
      return await extractMLFeatures(audioBuffer);
  }
}

function extractBasicFeatures(audioBuffer: AudioBuffer) {
  // Implement basic feature extraction
  return {
    duration: audioBuffer.duration,
    sampleRate: audioBuffer.sampleRate,
    channels: audioBuffer.numberOfChannels,
    rmsEnergy: computeRMS(audioBuffer),
    spectralCentroid: computeSpectralCentroid(audioBuffer),
    estimatedTempo: estimateTempo(audioBuffer)
  };
}
```

### Visual Effects MCP Server

#### Shader Generation Tool
```typescript
// MCP Tool: generate_effect_shader
export function generateEffectShader(args: {
  effectType: 'particle' | 'field' | 'geometric';
  audioReactivity: 'low' | 'medium' | 'high';
  colorScheme: string[];
  complexity: 'simple' | 'moderate' | 'complex';
}) {
  const shaderTemplate = getShaderTemplate(args.effectType);
  const audioUniforms = generateAudioUniforms(args.audioReactivity);
  const colorLogic = generateColorLogic(args.colorScheme);
  
  return {
    vertexShader: compileVertexShader(shaderTemplate, audioUniforms),
    fragmentShader: compileFragmentShader(shaderTemplate, audioUniforms, colorLogic),
    uniforms: generateUniformDefinitions(audioUniforms),
    metadata: {
      performance: estimatePerformance(args.complexity),
      audioInputs: audioUniforms.map(u => u.name),
      description: generateDescription(args)
    }
  };
}
```

### Development Assistant MCP Server

#### Code Generation Tools
```typescript
// MCP Tool: generate_effect_class
export function generateEffectClass(args: {
  effectName: string;
  baseType: 'particles' | 'mesh' | 'shader';
  audioInputs: string[];
  animationStyle: 'smooth' | 'reactive' | 'pulsing';
}) {
  const className = pascalCase(args.effectName);
  const baseClass = getBaseClass(args.baseType);
  
  return {
    filename: `${className}.ts`,
    content: generateClassContent({
      className,
      baseClass,
      audioInputs: args.audioInputs,
      animationStyle: args.animationStyle
    }),
    tests: generateTestContent(className, args.audioInputs),
    documentation: generateDocumentation(className, args)
  };
}

// MCP Tool: optimize_performance
export async function optimizePerformance(args: {
  codeSnippet: string;
  context: 'audio-processing' | 'rendering' | 'shader';
  targetFPS: number;
}) {
  const analysis = await analyzePerformance(args.codeSnippet, args.context);
  const optimizations = generateOptimizations(analysis, args.targetFPS);
  
  return {
    originalCode: args.codeSnippet,
    optimizedCode: applyOptimizations(args.codeSnippet, optimizations),
    improvements: optimizations.map(opt => ({
      type: opt.type,
      description: opt.description,
      estimatedImprovement: opt.impact
    })),
    warnings: validateOptimizations(optimizations)
  };
}
```

## Workflow Integration Examples

### Automated Testing Workflows

#### Audio Processing Test Generation
```typescript
// Workflow: Generate comprehensive audio tests
export const generateAudioTests = {
  name: "generate-audio-tests",
  description: "Generate test cases for audio processing components",
  steps: [
    {
      tool: "analyze_audio_component",
      params: { componentPath: "src/audio/AudioEngine.ts" }
    },
    {
      tool: "generate_test_cases",
      params: { 
        componentType: "audio-engine",
        testTypes: ["unit", "integration", "performance"]
      }
    },
    {
      tool: "create_mock_audio_data",
      params: {
        scenarios: ["silence", "sine-wave", "complex-music", "noise"]
      }
    }
  ]
};
```

#### Visual Effect Validation Workflow
```typescript
// Workflow: Validate visual effect performance
export const validateVisualEffect = {
  name: "validate-visual-effect",
  description: "Comprehensive validation of new visual effects",
  steps: [
    {
      tool: "analyze_shader_complexity",
      params: { shaderPath: "src/three/shaders/custom.frag" }
    },
    {
      tool: "estimate_gpu_usage",
      params: { effectClass: "CustomEffect" }
    },
    {
      tool: "generate_performance_tests",
      params: { 
        targetFPS: 60,
        testDurations: [30, 300, 1800] // 30s, 5min, 30min
      }
    },
    {
      tool: "validate_resource_cleanup",
      params: { effectClass: "CustomEffect" }
    }
  ]
};
```

### Documentation Generation Workflows

#### API Documentation Workflow
```typescript
// Workflow: Generate comprehensive API documentation
export const generateAPIDocs = {
  name: "generate-api-docs",
  description: "Generate and update API documentation",
  steps: [
    {
      tool: "extract_type_definitions",
      params: { sourceDir: "src/" }
    },
    {
      tool: "generate_class_diagrams",
      params: { 
        classes: ["AudioEngine", "SceneView", "CrystalSphere"],
        format: "mermaid"
      }
    },
    {
      tool: "create_usage_examples",
      params: {
        components: ["audio-processing", "visual-effects", "ui-integration"]
      }
    },
    {
      tool: "validate_code_examples",
      params: { examplesDir: "docs/examples/" }
    }
  ]
};
```

## Best Practices for MCP Integration

### Tool Design Principles
1. **Single Responsibility**: Each tool should have one clear purpose
2. **Composability**: Tools should work well together in workflows
3. **Error Handling**: Robust error handling with meaningful messages
4. **Performance**: Tools should execute efficiently for real-time use
5. **Documentation**: Clear parameter descriptions and usage examples

### Security Considerations
1. **Input Validation**: Sanitize all tool parameters
2. **File Access**: Restrict file system access to project directories
3. **Resource Limits**: Implement timeouts and memory limits
4. **Audit Logging**: Log tool usage for debugging and security

### Testing MCP Integration
```typescript
// Example MCP tool test
describe('MCP Audio Analysis Tools', () => {
  it('should extract basic audio features', async () => {
    const result = await analyzeAudioFile({
      filePath: 'test/fixtures/test-audio.wav',
      analysisType: 'basic'
    });
    
    expect(result).to.have.property('duration');
    expect(result).to.have.property('rmsEnergy');
    expect(result.rmsEnergy).to.be.within(0, 1);
  });
  
  it('should handle invalid audio files gracefully', async () => {
    await expect(analyzeAudioFile({
      filePath: 'test/fixtures/invalid.txt',
      analysisType: 'basic'
    })).to.be.rejectedWith('Invalid audio file format');
  });
});
```

This guide provides the foundation for integrating MCP servers and workflow automation into the music visualizer development process, enabling more efficient and consistent development practices.