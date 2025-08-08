# Visual Effects Algorithms - OpenAI GPT-5 Music Visualizer

## Overview

This document provides detailed explanations of the visual effects algorithms implemented in the OpenAI GPT-5 Music Visualizer. The system creates ethereal, psychedelic, and cosmic visualizations through a combination of procedural noise, particle systems, shader programming, and audio-reactive parameters.

## Audio-Visual Mapping Framework

### Audio Feature Extraction

#### Frequency Band Analysis
The system divides the audio spectrum into three primary bands:

```typescript
function computeBands(freq: Uint8Array): { low: number; mid: number; high: number } {
  const n = freq.length;
  const oneThird = Math.floor(n / 3);
  
  // Frequency band mapping (assuming 44.1kHz sample rate, 1024 FFT)
  const low = average(freq, 0, oneThird);           // ~0-5.5kHz (bass, kick drums)
  const mid = average(freq, oneThird, 2 * oneThird); // ~5.5-11kHz (vocals, snare)
  const high = average(freq, 2 * oneThird, n);       // ~11-22kHz (cymbals, harmonics)
  
  return { low, mid, high };
}
```

**Mathematical Foundation:**
- **Low Band**: Captures fundamental frequencies and bass content
- **Mid Band**: Contains most vocal and melodic content
- **High Band**: Represents harmonics, transients, and percussive elements

#### Beat Detection Algorithm
The beat detection uses energy-based analysis with adaptive thresholding:

```typescript
private detectBeat(energy: number, nowSec: number): { isBeat: boolean } {
  // Maintain rolling window of energy values
  this.energyHistory.push(energy);
  if (this.energyHistory.length > this.maxEnergyHistory) this.energyHistory.shift();
  
  // Statistical analysis
  const mean = Σ(energyHistory) / energyHistory.length;
  const variance = Σ((e - mean)²) / energyHistory.length;
  const standardDeviation = √(variance);
  
  // Adaptive threshold with sensitivity control
  const sensitivityFactor = 2.0 - 1.5 * this.beatSensitivity; // Maps 0-1 to 2.0-0.5
  const threshold = mean + sensitivityFactor * standardDeviation;
  
  // Beat validation with minimum interval
  const minimumBeatInterval = 0.12; // 120ms prevents false positives
  const canTrigger = (nowSec - this.lastBeatAt) > minimumBeatInterval;
  
  const isBeat = canTrigger && energy > threshold;
  if (isBeat) this.lastBeatAt = nowSec;
  
  return { isBeat };
}
```

**Algorithm Properties:**
- **Adaptive**: Threshold adjusts to music dynamics
- **Debounced**: Prevents rapid-fire false positives
- **Configurable**: Sensitivity parameter allows user tuning

### Audio-to-Visual Parameter Mapping

#### Energy-Based Scaling
```typescript
// Linear mapping with saturation
function mapAudioToVisual(audioValue: number, minOutput: number, maxOutput: number): number {
  const saturated = Math.min(1.0, audioValue); // Prevent over-driving
  return minOutput + saturated * (maxOutput - minOutput);
}

// Exponential mapping for more dramatic response
function mapAudioExponential(audioValue: number, exponent: number = 2.0): number {
  return Math.pow(Math.min(1.0, audioValue), exponent);
}

// Logarithmic mapping for subtle response
function mapAudioLogarithmic(audioValue: number): number {
  return Math.log(1 + audioValue * 9) / Math.log(10); // Maps 0-1 to 0-1 logarithmically
}
```

## Core Visual Effects

### 1. Crystal Sphere System

The Crystal Sphere is the central visual element, consisting of multiple layered effects:

#### Icosahedral Particle Distribution
```typescript
// Generate particles on icosahedron surface
const icosahedron = new THREE.IcosahedronGeometry(radius, subdivisions);
const vertices = icosahedron.attributes.position.array;

// Create particle system
for (let i = 0; i < vertices.length; i += 3) {
  const position = new THREE.Vector3(vertices[i], vertices[i+1], vertices[i+2]);
  
  // Assign twinkling behavior (22% of particles)
  const twinkleFactor = Math.random() < 0.22 ? Math.random() * 3 + 1 : 0;
  
  particles.push({
    position,
    baseColor: themeColors[i % themeColors.length],
    twinkleFactor
  });
}
```

**Mathematical Properties:**
- **Icosahedron**: 20 triangular faces, optimal sphere approximation
- **Subdivision**: Each level quadruples triangle count (Level 5 = 20,480 triangles)
- **Distribution**: Uniform surface distribution prevents clustering artifacts

#### Twinkling Animation Algorithm
```typescript
// Per-frame particle animation
for (let i = 0; i < particles.length; i++) {
  const particle = particles[i];
  
  if (particle.twinkleFactor > 0) {
    // Phase-shifted sinusoidal brightness modulation
    const phase = particle.twinkleFactor * time + i * 0.1;
    const brightness = Math.sin(phase) * 0.5 + 0.5; // 0-1 range
    
    // Audio-reactive intensity boost
    const audioBoost = 1 + highFrequencyEnergy * 2.0;
    const finalBrightness = 1 + brightness * (1.5 + audioBoost);
    
    // Apply to color channels
    particle.color.r = particle.baseColor.r * finalBrightness;
    particle.color.g = particle.baseColor.g * finalBrightness;
    particle.color.b = particle.baseColor.b * finalBrightness;
  }
}
```

### 2. Dynamic Effect System

The Crystal Sphere supports four distinct effect modes:

#### A. Resonance Effect (Expanding Rings)
```typescript
emitResonance(theme: CrystalTheme, ringCount: number = 3) {
  for (let i = 0; i < ringCount; i++) {
    // Torus geometry with increasing radius
    const innerRadius = 0.02;
    const outerRadius = 1.0 + i * 0.22;
    const geometry = new THREE.TorusGeometry(outerRadius, innerRadius, 12, 72);
    
    // Animated material properties
    const material = new THREE.MeshBasicMaterial({
      color: theme.colors[i % theme.colors.length],
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.x = Math.PI / 2; // Horizontal orientation
    
    // Animation state
    ring.userData = {
      life: 1.0,                    // Normalized lifetime (1.0 → 0.0)
      delay: i * 0.06,              // Staggered start time
      initialScale: 0.1             // Starting scale factor
    };
    
    this.effectGroups.resonance.add(ring);
  }
}

// Per-frame animation update
updateResonance(deltaTime: number) {
  for (const ring of this.effectGroups.resonance.children) {
    const userData = ring.userData;
    
    // Handle delay phase
    if (userData.delay > 0) {
      userData.delay -= deltaTime;
      continue;
    }
    
    // Animate lifetime
    userData.life -= deltaTime * 0.6; // 1.67 second duration
    
    if (userData.life > 0) {
      // Scale animation: exponential expansion
      const progress = 1 - userData.life;
      const scale = userData.initialScale + progress * 1.4;
      ring.scale.setScalar(scale);
      
      // Opacity animation: sine wave fade
      const opacity = Math.sin(userData.life * Math.PI);
      ring.material.opacity = Math.max(0, opacity);
    } else {
      // Cleanup expired ring
      ring.geometry.dispose();
      ring.material.dispose();
      this.effectGroups.resonance.remove(ring);
    }
  }
}
```

**Algorithm Characteristics:**
- **Staggered Timing**: Creates wave-like propagation
- **Exponential Scaling**: Natural expansion feeling
- **Sinusoidal Fade**: Smooth opacity transitions

#### B. Prism Effect (Light Rays)
```typescript
emitPrism(theme: CrystalTheme, rayCount: number = 100) {
  for (let i = 0; i < rayCount; i++) {
    // Thin cylindrical geometry for light rays
    const geometry = new THREE.CylinderGeometry(0.004, 0.004, 5.5, 6);
    
    const material = new THREE.MeshBasicMaterial({
      color: theme.colors[i % theme.colors.length],
      transparent: true,
      opacity: 0,                   // Start invisible
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    const ray = new THREE.Mesh(geometry, material);
    
    // Random direction using spherical coordinates
    const direction = new THREE.Vector3().randomDirection();
    ray.position.set(0, 0, 0);      // Origin at center
    ray.lookAt(direction);           // Point toward random direction
    ray.rotateX(Math.PI / 2);       // Align with cylinder axis
    
    ray.userData = {
      life: 1.0,                    // Total lifetime
      phase: 0.0                    // Animation phase (0 = fade in, 1 = fade out)
    };
    
    this.effectGroups.prism.add(ray);
  }
}

// Animation update with two-phase lifecycle
updatePrism(deltaTime: number) {
  for (const ray of this.effectGroups.prism.children) {
    const userData = ray.userData;
    
    // Phase progression
    userData.phase += deltaTime * 3.5; // Phase speed control
    
    if (userData.phase < 1.0) {
      // Fade-in phase: opacity increases linearly
      ray.material.opacity = userData.phase;
    } else {
      // Fade-out phase: lifetime decreases
      userData.life -= deltaTime * 0.9;
      ray.material.opacity = Math.max(0, userData.life);
      
      if (userData.life <= 0) {
        // Cleanup
        ray.geometry.dispose();
        ray.material.dispose();
        this.effectGroups.prism.remove(ray);
      }
    }
  }
}
```

**Visual Properties:**
- **Radial Distribution**: Rays emanate from center in all directions
- **Two-Phase Animation**: Distinct fade-in and fade-out behaviors
- **Additive Blending**: Creates bright, overlapping light effects

#### C. Rift Effect (Particle Explosion)
```typescript
emitRift(theme: CrystalTheme, particleCount: number = 1800) {
  // Pre-allocate typed arrays for performance
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const particleData: RiftParticle[] = [];
  
  for (let i = 0; i < particleCount; i++) {
    const colorIndex = i % theme.colors.length;
    const color = theme.colors[colorIndex];
    
    // Color data
    colors[i * 3 + 0] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
    
    // Initial positions (all at origin)
    positions[i * 3 + 0] = 0;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = 0;
    
    // Particle physics data
    particleData.push({
      life: 1.2 + Math.random() * 1.2,              // Variable lifetime (1.2-2.4s)
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 2,                   // Random direction
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(
        Math.random() * 3 + 1.5                     // Speed: 1.5-4.5 units/sec
      ),
      rotationSpeed: (Math.random() - 0.5) * 0.04   // Angular velocity
    });
  }
  
  // Create particle system
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.userData = particleData;
  
  const material = new THREE.PointsMaterial({
    size: 0.05,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 1.0,
    depthWrite: false
  });
  
  const particleSystem = new THREE.Points(geometry, material);
  this.effectGroups.rift.add(particleSystem);
}

// Physics simulation update
updateRift(deltaTime: number) {
  for (const system of this.effectGroups.rift.children as THREE.Points[]) {
    const positionAttribute = system.geometry.getAttribute('position') as THREE.BufferAttribute;
    const particleData = system.geometry.userData as RiftParticle[];
    
    let anyAlive = false;
    
    for (let i = 0; i < particleData.length; i++) {
      const particle = particleData[i];
      
      // Update lifetime
      particle.life -= deltaTime;
      
      if (particle.life > 0) {
        anyAlive = true;
        
        // Physics integration (Euler method)
        const currentPos = new THREE.Vector3(
          positionAttribute.getX(i),
          positionAttribute.getY(i),
          positionAttribute.getZ(i)
        );
        
        // Position update: p(t+dt) = p(t) + v * dt
        const displacement = particle.velocity.clone().multiplyScalar(deltaTime);
        currentPos.add(displacement);
        
        // Rotation update (for future use with oriented particles)
        const rotationAxis = particle.velocity.clone().normalize();
        currentPos.applyAxisAngle(rotationAxis, particle.rotationSpeed * deltaTime);
        
        // Write back to buffer
        positionAttribute.setXYZ(i, currentPos.x, currentPos.y, currentPos.z);
      }
    }
    
    // Mark geometry for GPU update
    positionAttribute.needsUpdate = true;
    
    // Fade out system as particles die
    const material = system.material as THREE.PointsMaterial;
    material.opacity -= deltaTime * 0.4;
    
    // Cleanup when all particles are dead or invisible
    if (!anyAlive || material.opacity <= 0) {
      system.geometry.dispose();
      material.dispose();
      this.effectGroups.rift.remove(system);
    }
  }
}
```

**Physics Simulation:**
- **Euler Integration**: Simple but stable for this use case
- **Variable Lifetime**: Creates natural particle death patterns
- **3D Velocity Vectors**: Full 3D explosion effect
- **Rotational Motion**: Adds visual complexity to particle paths

#### D. Spikes Effect (Directional Projections)
```typescript
createSpikes(spikeCount: number, lowEnergy: number, midEnergy: number, highEnergy: number) {
  for (let i = 0; i < spikeCount; i++) {
    // Audio-reactive geometry parameters
    const length = 0.6 + Math.random() * 1.1 + highEnergy * 0.8;
    const radius = 0.02 + highEnergy * 0.06;
    
    const geometry = new THREE.ConeGeometry(radius, length, 6, 1, true);
    
    // Audio-reactive color tinting
    const baseColor = theme.colors[i % theme.colors.length].clone();
    baseColor.r = Math.min(1, baseColor.r + highEnergy * 0.4);  // Red boost from highs
    baseColor.g = Math.min(1, baseColor.g + midEnergy * 0.3);   // Green boost from mids
    baseColor.b = Math.min(1, baseColor.b + lowEnergy * 0.2);   // Blue boost from lows
    
    const material = new THREE.MeshBasicMaterial({
      color: baseColor,
      transparent: true,
      opacity: 0.0,                    // Start invisible
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    
    const spike = new THREE.Mesh(geometry, material);
    
    // Random direction and orientation
    const direction = new THREE.Vector3().randomDirection();
    spike.position.set(0, 0, 0);
    spike.lookAt(direction);
    spike.rotateX(Math.PI);             // Flip to point outward
    
    // Animation parameters
    spike.userData = {
      life: 1.0,
      speed: 0.35 + Math.random() * 1.0,  // Movement speed
      seed: Math.random(),                 // Random seed for variations
      baseLength: length
    };
    
    this.effectGroups.spikes.add(spike);
  }
}

// Complex animation with multiple effects
updateSpikes(deltaTime: number, time: number) {
  for (const spike of this.effectGroups.spikes.children as THREE.Mesh[]) {
    const userData = spike.userData;
    const material = spike.material as THREE.MeshBasicMaterial;
    
    // Lifetime management
    userData.life -= deltaTime * 0.8;
    
    if (userData.life > 0) {
      // 1. Movement: spikes fly outward
      const direction = spike.getWorldDirection(new THREE.Vector3());
      const displacement = direction.multiplyScalar(userData.speed * deltaTime);
      spike.position.add(displacement);
      
      // 2. Color cycling: HSL color space rotation
      const hsl = { h: 0, s: 0, l: 0 };
      material.color.getHSL(hsl);
      hsl.h = (hsl.h + (userData.seed * 0.3 + time * 0.07)) % 1.0; // Hue rotation
      material.color.setHSL(hsl.h, 0.85, 0.55);
      
      // 3. Length wobble: sinusoidal scaling
      const wobbleFreq = 1.2 + userData.seed * 2.0;
      const wobbleAmount = 0.85 + Math.sin(time * wobbleFreq) * 0.15;
      spike.scale.y = wobbleAmount;
      
      // 4. Opacity animation: fade in then fade out based on lifetime
      if (material.opacity < 1.0) {
        material.opacity = Math.min(1.0, material.opacity + deltaTime * 2.0); // Fade in
      }
      material.opacity = Math.min(material.opacity, userData.life); // Fade out with life
      
    } else {
      // Cleanup expired spike
      spike.geometry.dispose();
      material.dispose();
      this.effectGroups.spikes.remove(spike);
    }
  }
}
```

**Multi-layered Animation:**
- **Kinematic Motion**: Linear outward movement
- **Color Cycling**: HSL space hue rotation for rainbow effects
- **Geometric Wobble**: Sinusoidal length modulation
- **Opacity Management**: Complex fade-in/fade-out behavior

### 3. Nebula Overlay System

The Nebula Overlay creates atmospheric background effects using procedural noise:

#### Fractal Brownian Motion (fBm) Implementation
```glsl
// GLSL fragment shader
precision highp float;

uniform float uTime;
uniform vec2 uRes;
uniform float uLow, uMid, uHigh, uAlpha;

// Hash function for pseudo-random values
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// 2D Perlin-style noise
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  
  // Four corner values
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  
  // Smooth interpolation (Hermite curve)
  vec2 u = f * f * (3.0 - 2.0 * f);
  
  // Bilinear interpolation
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// Fractal Brownian Motion with 5 octaves
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  
  // Rotation matrix for octave variation
  mat2 rotation = mat2(1.6, 1.2, -1.2, 1.6);
  
  for(int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p = rotation * p;           // Rotate for each octave
    amplitude *= 0.5;           // Decrease amplitude
  }
  
  return value;
}

void main() {
  // Screen space to normalized coordinates
  vec2 uv = gl_FragCoord.xy / uRes.xy;
  
  // Aspect ratio correction
  vec2 p = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  
  // Time-based animation
  float t = uTime * 0.03; // Slow evolution
  
  // Two-layer noise for complexity
  float baseNoise = fbm(p * 1.4 + t);                    // Large-scale structures
  float detailNoise = fbm(p * 3.0 - t * 1.5 + baseNoise); // Fine details with feedback
  
  // Audio reactivity
  float audioEnergy = uLow * 0.5 + uMid * 0.35 + uHigh * 0.15;
  
  // Threshold function creates nebula boundaries
  float mask = smoothstep(0.15, 0.85, detailNoise + audioEnergy * 0.6);
  
  // Color mixing based on audio bands
  vec3 darkColor = vec3(0.01, 0.02, 0.05);               // Deep space
  vec3 brightColor = vec3(
    0.1 + 0.8 * uHigh,    // Red channel responds to highs
    0.2 + 0.7 * uMid,     // Green channel responds to mids
    0.4 + 0.5 * uLow      // Blue channel responds to lows
  );
  
  vec3 finalColor = mix(darkColor, brightColor, mask);
  
  // Alpha blending with audio reactivity
  float alpha = clamp(uAlpha * (0.4 + 0.6 * mask), 0.0, 1.0);
  
  gl_FragColor = vec4(finalColor, alpha);
}
```

**Algorithm Properties:**
- **Fractal Detail**: 5 octaves provide detail at multiple scales
- **Temporal Evolution**: Time-based animation creates flowing motion
- **Audio Integration**: Energy levels directly affect color and intensity
- **Smooth Thresholding**: `smoothstep` prevents hard edges

#### Viewport Coverage Calculation
```typescript
// Ensure nebula covers entire viewport regardless of camera settings
coverViewport(camera: THREE.PerspectiveCamera, width: number, height: number) {
  if (!this.mesh || !this.material) return;
  
  // Calculate plane dimensions to cover viewport
  const verticalFOV = THREE.MathUtils.degToRad(camera.fov);
  const distance = camera.position.z - this.z;  // Distance from camera to plane
  
  // Trigonometric calculation of required plane height
  const planeHeight = 2 * Math.tan(verticalFOV / 2) * distance;
  
  // Aspect ratio determines width
  const planeWidth = planeHeight * (width / height);
  
  // Scale plane geometry
  this.mesh.scale.set(planeWidth, planeHeight, 1);
  
  // Update shader resolution uniform
  (this.material.uniforms.uRes.value as THREE.Vector2).set(width, height);
}
```

### 4. Post-Processing Pipeline

#### Unreal Bloom Implementation
The system uses Three.js's UnrealBloomPass for HDR bloom effects:

```typescript
class PostFX {
  private bloomPass: UnrealBloomPass | null = null;
  
  init(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, size: THREE.Vector2) {
    this.composer = new EffectComposer(renderer);
    
    // Base render pass
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);
    
    // Bloom configuration
    this.bloomPass = new UnrealBloomPass(
      size.clone(),    // Resolution for bloom texture
      0.6,            // Strength (brightness multiplier)
      0.8,            // Radius (blur amount)
      0.85            // Threshold (minimum brightness for bloom)
    );
    this.composer.addPass(this.bloomPass);
  }
  
  // Dynamic bloom adjustment based on visual intensity
  setBloom(strength: number, radius: number = 0.8, threshold: number = 0.85) {
    if (!this.bloomPass) return;
    
    this.bloomPass.strength = strength;      // 0.6-1.6 typical range
    this.bloomPass.radius = radius;          // 0.8 provides good balance
    this.bloomPass.threshold = threshold;    // 0.85 prevents over-blooming
  }
}
```

**Bloom Algorithm Steps:**
1. **Threshold**: Extract bright pixels above threshold
2. **Gaussian Blur**: Multi-pass blur for smooth falloff
3. **Additive Blend**: Combine with original image
4. **Tone Mapping**: HDR to LDR conversion

### 5. Performance Optimization Algorithms

#### Memory Management
```typescript
// Automatic cleanup system for expired effects
private cleanupExpiredEffects() {
  const effectGroups = [
    this.effectGroups.resonance,
    this.effectGroups.prism,
    this.effectGroups.rift,
    this.effectGroups.spikes
  ];
  
  for (const group of effectGroups) {
    const survivors: THREE.Object3D[] = [];
    
    for (const effect of group.children) {
      const userData = (effect as any).userData;
      
      if (userData && userData.life > 0) {
        survivors.push(effect);
      } else {
        // Dispose Three.js resources
        if ((effect as any).geometry) (effect as any).geometry.dispose();
        if ((effect as any).material) (effect as any).material.dispose();
      }
    }
    
    // Batch update children array (more efficient than individual removes)
    group.children = survivors;
  }
}
```

#### Frame Rate Monitoring
```typescript
// Performance monitoring and adaptive quality
class PerformanceMonitor {
  private frameTimes: number[] = [];
  private maxSamples = 60; // 1 second at 60 FPS
  
  recordFrame(deltaTime: number) {
    this.frameTimes.push(deltaTime);
    if (this.frameTimes.length > this.maxSamples) {
      this.frameTimes.shift();
    }
  }
  
  getAverageFrameTime(): number {
    if (this.frameTimes.length === 0) return 16.67; // 60 FPS default
    return this.frameTimes.reduce((a, b) => a + b) / this.frameTimes.length;
  }
  
  shouldReduceQuality(): boolean {
    const avgFrameTime = this.getAverageFrameTime();
    return avgFrameTime > 20; // Below 50 FPS
  }
  
  shouldIncreaseQuality(): boolean {
    const avgFrameTime = this.getAverageFrameTime();
    return avgFrameTime < 14; // Above 70 FPS with headroom
  }
}
```

## Mathematical Foundations

### Color Space Transformations
```typescript
// HSL to RGB conversion for dynamic color effects
function hslToRgb(h: number, s: number, l: number): THREE.Color {
  const c = (1 - Math.abs(2 * l - 1)) * s; // Chroma
  const x = c * (1 - Math.abs((h * 6) % 2 - 1)); // Second largest component
  const m = l - c / 2; // Lightness adjustment
  
  let r = 0, g = 0, b = 0;
  
  if (0 <= h && h < 1/6) { r = c; g = x; b = 0; }
  else if (1/6 <= h && h < 2/6) { r = x; g = c; b = 0; }
  else if (2/6 <= h && h < 3/6) { r = 0; g = c; b = x; }
  else if (3/6 <= h && h < 4/6) { r = 0; g = x; b = c; }
  else if (4/6 <= h && h < 5/6) { r = x; g = 0; b = c; }
  else if (5/6 <= h && h < 1) { r = c; g = 0; b = x; }
  
  return new THREE.Color(r + m, g + m, b + m);
}
```

### Easing Functions
```typescript
// Smooth animation transitions
const EasingFunctions = {
  // Quadratic ease-in-out
  easeInOutQuad: (t: number): number => {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  },
  
  // Exponential ease-out
  easeOutExpo: (t: number): number => {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  },
  
  // Elastic ease-out (bouncy effect)
  easeOutElastic: (t: number): number => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }
};
```

### Vector Mathematics
```typescript
// Spherical coordinate conversion for particle distribution
function sphericalToCartesian(radius: number, theta: number, phi: number): THREE.Vector3 {
  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.sin(phi) * Math.sin(theta);
  const z = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// Random point on sphere surface (uniform distribution)
function randomPointOnSphere(radius: number): THREE.Vector3 {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;      // Azimuthal angle
  const phi = Math.acos(2 * v - 1);   // Polar angle (uniform distribution)
  return sphericalToCartesian(radius, theta, phi);
}
```

## Future Enhancement Algorithms

### Machine Learning Integration
```typescript
// Placeholder for future ML-based instrument classification
interface MLInstrumentClassifier {
  // Real-time classification using ONNX.js
  classifyAudioFrame(features: Float32Array): Promise<{
    instrument: string;
    confidence: number;
    probabilities: Map<string, number>;
  }>;
  
  // Adaptive learning from user corrections
  updateModel(features: Float32Array, correctLabel: string): void;
}

// Advanced audio feature extraction for ML
function extractMelFrequencyCepstralCoefficients(audioBuffer: Float32Array): Float32Array {
  // Implementation would use Web Audio API or WASM-based DSP
  // Returns MFCC features for ML classification
  return new Float32Array(13); // 13 MFCC coefficients typical
}
```

### Procedural Music Generation
```typescript
// Future: Generate visual-driven ambient soundscapes
interface ProceduralAudioGenerator {
  generateAmbientLayer(visualState: {
    activeEffect: string;
    intensity: number;
    colorPalette: THREE.Color[];
  }): AudioBuffer;
  
  // Reactive synthesis based on user interaction
  synthesizeReactiveAudio(interactionEvents: InteractionEvent[]): AudioBuffer;
}
```

This comprehensive documentation provides the mathematical and algorithmic foundation for understanding, maintaining, and extending the visual effects system in the OpenAI GPT-5 Music Visualizer.
