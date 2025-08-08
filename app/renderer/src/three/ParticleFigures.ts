import * as THREE from 'three';
import type { Instrument } from '../analysis/InstrumentClassifier';

export class ParticleFigures {
  private points: THREE.Points | null = null;
  private material: THREE.PointsMaterial | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private targetPositions: Float32Array | null = null;
  private currentPositions: Float32Array | null = null;
  private lerpAlpha = 0.08;

  init(scene: THREE.Scene, count = 4000) {
    if (this.points) return;
    this.geometry = new THREE.BufferGeometry();
    this.currentPositions = new Float32Array(count * 3);
    this.targetPositions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      this.currentPositions[i * 3 + 0] = (Math.random() - 0.5) * 2;
      this.currentPositions[i * 3 + 1] = (Math.random() - 0.5) * 2;
      this.currentPositions[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.currentPositions, 3));
    this.material = new THREE.PointsMaterial({ size: 0.03, color: 0xffffff, transparent: true, opacity: 0.9 });
    this.points = new THREE.Points(this.geometry, this.material);
    scene.add(this.points);
  }

  setFigure(instrument: Instrument) {
    if (!this.targetPositions) return;
    const count = this.targetPositions.length / 3;
    switch (instrument) {
      case 'bass':
        this.makeTorus(count, 1.0, 0.35);
        break;
      case 'drums':
        this.makeSphere(count, 1.0);
        break;
      case 'guitar':
        this.makeLissajous(count, 1.2);
        break;
      case 'none':
      default:
        this.makeSphere(count, 0.7);
    }
  }

  update(t: number, hue: number, rotationSpeed = 0.2) {
    if (!this.points || !this.geometry || !this.currentPositions || !this.targetPositions) return;
    // Lerp towards target figure
    for (let i = 0; i < this.currentPositions.length; i++) {
      this.currentPositions[i] += (this.targetPositions[i] - this.currentPositions[i]) * this.lerpAlpha;
    }
    const attr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    attr.needsUpdate = true;
    // Rotate slowly
    this.points.rotation.y = t * rotationSpeed;
    if (this.material) this.material.color.setHSL(hue, 0.8, 0.6);
  }

  dispose(scene: THREE.Scene) {
    if (this.points) scene.remove(this.points);
    if (this.geometry) this.geometry.dispose();
    if (this.material) this.material.dispose();
    this.points = null; this.geometry = null; this.material = null;
  }

  private makeSphere(count: number, r: number) {
    if (!this.targetPositions) return;
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      this.targetPositions[i * 3 + 0] = x;
      this.targetPositions[i * 3 + 1] = y;
      this.targetPositions[i * 3 + 2] = z;
    }
  }

  private makeTorus(count: number, R: number, r: number) {
    if (!this.targetPositions) return;
    for (let i = 0; i < count; i++) {
      const u = Math.random() * Math.PI * 2;
      const v = Math.random() * Math.PI * 2;
      const x = (R + r * Math.cos(v)) * Math.cos(u);
      const y = (R + r * Math.cos(v)) * Math.sin(u);
      const z = r * Math.sin(v);
      this.targetPositions[i * 3 + 0] = x;
      this.targetPositions[i * 3 + 1] = y;
      this.targetPositions[i * 3 + 2] = z;
    }
  }

  private makeLissajous(count: number, scale: number) {
    if (!this.targetPositions) return;
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 2 * 3.0;
      const x = Math.sin(3 * t + Math.PI / 2) * scale;
      const y = Math.sin(4 * t) * scale * 0.6;
      const z = Math.sin(5 * t) * scale * 0.4;
      this.targetPositions[i * 3 + 0] = x + (Math.random() - 0.5) * 0.15;
      this.targetPositions[i * 3 + 1] = y + (Math.random() - 0.5) * 0.15;
      this.targetPositions[i * 3 + 2] = z + (Math.random() - 0.5) * 0.15;
    }
  }
}


