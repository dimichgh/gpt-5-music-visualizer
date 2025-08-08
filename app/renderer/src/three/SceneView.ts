import * as THREE from 'three';
import { PostFX } from './PostFX';
import { InstrumentClassifier, Instrument } from '../analysis/InstrumentClassifier';
import { CrystalSphere, EffectState } from './CrystalSphere';
import { NebulaOverlay } from './NebulaOverlay';

export class SceneView {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial> | null = null;
  private frameHandle: number | null = null;
  private start = performance.now();
  private lastRms = 0;
  private lastLow = 0;
  private lastMid = 0;
  private lastHigh = 0;
  private is2D = false;
  private canvas2d: HTMLCanvasElement | null = null;
  private ctx2d: CanvasRenderingContext2D | null = null;
  private postfx: PostFX | null = null;
  private nebula: NebulaOverlay | null = null;
  private instrumentClassifier = new InstrumentClassifier(5);
  private currentInstrument: Instrument = 'none';
  private crystal: CrystalSphere | null = null;
  private lastEffectSwitchAt = 0;
  private minHoldSeconds = 3.0;

  constructor(private container: HTMLElement) {
    const rect = container.getBoundingClientRect();
    let width = Math.max(1, Math.floor(rect.width || window.innerWidth));
    let height = Math.max(1, Math.floor(rect.height || window.innerHeight));
    const force2D = (localStorage.getItem('force2d') ?? '0') === '1';
    if (force2D) {
      throw new Error('2D fallback disabled by user');
    }

    try {
      // Try WebGL2, fall back to WebGL1 via context attributes
      const canvas = document.createElement('canvas');
      const glAttribs: WebGLContextAttributes = { antialias: true, preserveDrawingBuffer: false, depth: true, stencil: false, desynchronized: true, powerPreference: 'high-performance' as any };
      const gl2 = canvas.getContext('webgl2', glAttribs as any);
      const gl1 = gl2 ? null : canvas.getContext('webgl', glAttribs);
      if (!gl2 && !gl1) throw new Error('No WebGL context');
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        context: (gl2 as any) || (gl1 as any),
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
      } as any);
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.domElement.style.width = '100%';
      this.renderer.domElement.style.height = '100%';
      container.appendChild(this.renderer.domElement);

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x000000);

      this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
      this.camera.position.set(0, 0, 3);

      const light = new THREE.DirectionalLight(0xffffff, 1);
      light.position.set(1, 1, 1);
      this.scene.add(light);
      this.scene.add(new THREE.AmbientLight(0x404040, 0.6));

      // Remove original foreground mesh; keep for debug if needed but hidden
      const geometry = new THREE.SphereGeometry(0.7, 48, 32);
      const material = new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, opacity: 0.0 });
      this.mesh = new THREE.Mesh(geometry, material);
      this.mesh.visible = false;
      this.scene.add(this.mesh);

      // Post processing
      this.postfx = new PostFX();
      this.postfx.init(this.renderer, this.scene, this.camera, new THREE.Vector2(width, height));
      this.postfx.setBloom(0.7, 0.9, 0.85);

      // Fullscreen nebula overlay
      this.nebula = new NebulaOverlay();
      this.nebula.init(this.scene, width, height);
      this.nebula.coverViewport(this.camera, width, height);

      // Crystal sphere effect bundle
      this.crystal = new CrystalSphere();
      this.crystal.init(this.scene, 0.9, 5);
    } catch (e) {
      // Fallback to 2D canvas rendering to avoid crashing when WebGL is not available
      this.is2D = true;
      const canvas2d = document.createElement('canvas');
      canvas2d.width = width;
      canvas2d.height = height;
      canvas2d.style.width = '100%';
      canvas2d.style.height = '100%';
      const ctx = canvas2d.getContext('2d');
      if (!ctx) throw e;
      this.canvas2d = canvas2d;
      this.ctx2d = ctx;
      container.appendChild(canvas2d);
    }

    window.addEventListener('resize', this.onResize);
    this.animate();
  }

  updateFromAudio(rms: number, low: number, mid: number, high: number, beat?: boolean) {
    this.lastRms = rms;
    this.lastLow = low;
    this.lastMid = mid;
    this.lastHigh = high;
    // reduce intensity: disable emissive pulse

    // Drive crystal sphere colors and occasional effect switching
    if (this.crystal) {
      const now = performance.now() * 0.001;
      // Map instrument in animate and theme here by energy-band mix
      const energy = Math.min(1, low * 0.5 + mid * 0.3 + high * 0.2 + rms * 0.3);
      this.crystal.setThemeByEnergyInstrument(energy, this.currentInstrument);
      // Music-driven effect selection with hold time (no mixing)
      const chosen = this.chooseEffect(low, mid, high, this.lastRms, !!beat);
      const canSwitch = (now - this.lastEffectSwitchAt) > this.minHoldSeconds;
      if (chosen && chosen !== this.crystal.getActiveEffect()) {
        if (canSwitch) {
          this.crystal.setExclusiveEffect(chosen);
          this.lastEffectSwitchAt = now;
        }
      }
      // During spikes, only modulate spikes themselves
      if (this.crystal.getActiveEffect() === 'spikes' && (beat || high > 0.5)) {
        this.crystal.triggerSpikesFromAudio(low, mid, high);
      }
      // Music-driven emissions to reinforce active effect (no mixing)
      const active = this.crystal.getActiveEffect();
      if (active === 'resonance' && (beat || mid > 0.55)) {
        this.crystal.emitResonance((this.crystal as any).themes?.[(this.crystal as any).themeIndex] ?? undefined, 2);
      } else if (active === 'prism' && high > 0.55) {
        this.crystal.emitPrism((this.crystal as any).themes?.[(this.crystal as any).themeIndex] ?? undefined, 60);
      } else if (active === 'rift' && low > 0.55) {
        this.crystal.emitRift((this.crystal as any).themes?.[(this.crystal as any).themeIndex] ?? undefined, 900);
      }
      // Tune bloom to crystal desired level
      if (this.postfx) this.postfx.setBloom(this.crystal.bloomStrength, 0.9, 0.85);
    }
  }

  private animate = () => {
    const t = (performance.now() - this.start) * 0.001;
    const rms = Math.max(0.05, this.lastRms); // idle pulse

    if (this.is2D && this.ctx2d && this.canvas2d) {
      const ctx = this.ctx2d;
      const W = this.canvas2d.width;
      const H = this.canvas2d.height;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      const breathing = 1 + Math.sin(t * 2.0) * 0.05;
      const radius = Math.min(W, H) * 0.2 * (breathing + rms * 1.2);
      const hue = ((this.lastLow * 0.6 + this.lastMid * 0.3 + this.lastHigh * 0.1) * 300) | 0;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, Math.max(5, radius), 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = `hsl(${hue}, 80%, 55%)`;
      ctx.shadowBlur = 40;
      ctx.shadowColor = ctx.fillStyle;
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (this.renderer && this.scene && this.camera && this.mesh) {
      const breathing = 1 + Math.sin(t * 2.0) * 0.05;
      const scale = (1 + 0.2) * breathing + rms * 0.8;
      this.mesh.scale.setScalar(scale);
      this.mesh.rotation.y = t * (0.6 + this.lastHigh * 1.2);
      this.mesh.rotation.x = t * (0.3 + this.lastMid * 0.8);

      const hue = (this.lastLow * 0.6 + this.lastMid * 0.3 + this.lastHigh * 0.1) * 0.8;
      const color = new THREE.Color().setHSL(hue, 0.8, 0.5);
      this.mesh.material.color = color;
      // decay emissive pulse
      this.mesh.material.emissiveIntensity = Math.max(0.2, this.mesh.material.emissiveIntensity * 0.92);
      // Instrument
      this.currentInstrument = this.instrumentClassifier.update(t, this.lastRms, this.lastLow, this.lastMid, this.lastHigh, this.lastRms > 0.12);
      // Nebula overlay reacts to music; lower alpha for reduced intensity
      if (this.nebula && this.camera) {
        const alpha = 0.22 + Math.min(0.35, this.lastRms * 0.6);
        this.nebula.update(t, this.lastLow, this.lastMid, this.lastHigh, alpha);
      }
      // Update crystal after instrument is known
      this.crystal?.update(1/60, t, this.lastLow, this.lastMid, this.lastHigh, this.lastRms, this.lastRms > 0.12);
      if (this.postfx) this.postfx.render(0);
      else this.renderer.render(this.scene, this.camera);
    }
    this.frameHandle = requestAnimationFrame(this.animate);
  };

  dispose() {
    if (this.frameHandle) {
      cancelAnimationFrame(this.frameHandle);
      this.frameHandle = null;
    }
    window.removeEventListener('resize', this.onResize);

    if (this.renderer) {
      try {
        this.renderer.dispose();
      } catch {}
      const el = (this.renderer.domElement as any) as HTMLElement;
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }
    if (this.scene && this.nebula) { this.nebula.dispose(this.scene); this.nebula = null; }

    if (this.canvas2d) {
      if (this.canvas2d.parentNode) this.canvas2d.parentNode.removeChild(this.canvas2d);
      this.canvas2d = null;
      this.ctx2d = null;
    }

    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.mesh = null;
  }

  private onResize = () => {
    const rect = this.container.getBoundingClientRect();
    let width = Math.max(1, Math.floor(rect.width || window.innerWidth));
    let height = Math.max(1, Math.floor(rect.height || window.innerHeight));
    if (height <= 1 || width <= 1) return; // skip degenerate layout pass
    if (this.is2D && this.canvas2d && this.ctx2d) {
      this.canvas2d.width = width;
      this.canvas2d.height = height;
    } else if (this.renderer && this.camera && this.scene) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height, false);
      if (this.nebula) this.nebula.coverViewport(this.camera, width, height);
      if (this.postfx) this.postfx.setSize(width, height);
      this.renderer.render(this.scene, this.camera);
    }
  };

  // Exposed to UI for presets
  setStarDensity(density: number) {
    // no-op: starfield removed
  }

  private chooseEffect(low: number, mid: number, high: number, rms: number, beat: boolean): EffectState | null {
    const energy = low * 0.45 + mid * 0.35 + high * 0.2 + rms * 0.3;
    // Priority by musical characteristics
    if (beat && high > 0.55) return 'spikes';
    if (high > 0.6 && mid > 0.5) return 'prism';
    if (mid > 0.55 && low < 0.4) return 'resonance';
    if (low > 0.55) return 'rift';
    // fallback based on overall energy cycling
    if (energy > 0.5) return 'prism';
    if (energy > 0.35) return 'resonance';
    return null;
  }

  // Capture current frame as PNG data URL
  captureFrame(): string | null {
    if (this.renderer) {
      return this.renderer.domElement.toDataURL('image/png');
    }
    if (this.canvas2d) {
      return this.canvas2d.toDataURL('image/png');
    }
    return null;
  }
}


