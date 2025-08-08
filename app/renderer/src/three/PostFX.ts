import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export class PostFX {
  composer: EffectComposer | null = null;
  private renderPass: RenderPass | null = null;
  private bloomPass: UnrealBloomPass | null = null;

  init(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, size: THREE.Vector2) {
    this.composer = new EffectComposer(renderer);
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    this.bloomPass = new UnrealBloomPass(size.clone(), 0.6, 0.8, 0.85);
    this.composer.addPass(this.bloomPass);
  }

  setBloom(strength: number, radius = 0.8, threshold = 0.85) {
    if (!this.bloomPass) return;
    this.bloomPass.strength = strength;
    this.bloomPass.radius = radius;
    this.bloomPass.threshold = threshold;
  }

  setSize(width: number, height: number) {
    if (this.composer) this.composer.setSize(width, height);
  }

  render(delta: number) {
    if (this.composer) this.composer.render(delta);
  }
}


