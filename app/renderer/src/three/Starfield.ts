import * as THREE from 'three';

export class Starfield {
  private points: THREE.Points | null = null;
  private material: THREE.PointsMaterial | null = null;
  private geometry: THREE.BufferGeometry | null = null;

  init(scene: THREE.Scene, density: number, radius = 50) {
    if (this.points) return;
    const count = Math.max(100, Math.floor(density));
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = radius * (0.3 + Math.random() * 0.7);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      positions[i * 3 + 0] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.material = new THREE.PointsMaterial({ size: 0.12, color: 0xffffff, transparent: true, opacity: 0.8 });
    this.points = new THREE.Points(this.geometry, this.material);
    scene.add(this.points);
  }

  update(t: number, highEnergy: number) {
    if (!this.points) return;
    // Subtle parallax-like rotation and twinkle via opacity
    this.points.rotation.y = t * 0.02 + highEnergy * 0.2;
    if (this.material) this.material.opacity = 0.6 + highEnergy * 0.4;
  }

  dispose(scene: THREE.Scene) {
    if (this.points) scene.remove(this.points);
    this.points = null;
    if (this.geometry) this.geometry.dispose();
    if (this.material) this.material.dispose();
    this.geometry = null;
    this.material = null;
  }

  setDensity(scene: THREE.Scene, density: number) {
    if (!this.points) return this.init(scene, density);
    // Rebuild geometry for new density
    this.dispose(scene);
    this.init(scene, density);
  }
}


