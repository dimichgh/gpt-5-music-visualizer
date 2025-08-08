import * as THREE from 'three';

export type CrystalTheme = {
  name: string;
  colors: THREE.Color[];
  coreColor: THREE.Color;
  edgeColor: THREE.Color;
};

export type EffectState = 'idle' | 'resonance' | 'prism' | 'rift' | 'spikes';

export class CrystalSphere {
  group: THREE.Group | null = null;
  private particles: THREE.Points | null = null;
  private wireframe: THREE.LineSegments | null = null;
  private energyCore: THREE.Mesh | null = null;
  private twinkleFactors: number[] = [];

  private effectGroups = {
    resonance: new THREE.Group(),
    prism: new THREE.Group(),
    rift: new THREE.Group(),
    spikes: new THREE.Group(),
  };

  private _bloomStrength = 1.2;
  get bloomStrength(): number { return this._bloomStrength; }

  private themes: CrystalTheme[] = [
    {
      name: 'Crystal Resonance',
      colors: [new THREE.Color(0x00ffff), new THREE.Color(0x00aaff), new THREE.Color(0x80aaff)],
      coreColor: new THREE.Color(0x00ffff),
      edgeColor: new THREE.Color(0x40a0ff),
    },
    {
      name: 'Prism Flare',
      colors: [
        new THREE.Color(0xff8080),
        new THREE.Color(0xffff80),
        new THREE.Color(0x80ff80),
        new THREE.Color(0x80ffff),
        new THREE.Color(0x8080ff),
        new THREE.Color(0xff80ff),
      ],
      coreColor: new THREE.Color(0xffa0a0),
      edgeColor: new THREE.Color(0xffffff),
    },
    {
      name: 'Galactic Rift',
      colors: [new THREE.Color(0x9400d3), new THREE.Color(0xff00ff), new THREE.Color(0x8a2be2)],
      coreColor: new THREE.Color(0xdda0dd),
      edgeColor: new THREE.Color(0x9370db),
    },
    {
      name: 'Solar Spikes',
      colors: [new THREE.Color(0xffc107), new THREE.Color(0xff5722), new THREE.Color(0xff9800)],
      coreColor: new THREE.Color(0xffd54f),
      edgeColor: new THREE.Color(0xffb300),
    },
  ];

  private themeIndex = 0;
  private activeEffect: EffectState = 'idle';

  init(scene: THREE.Scene, radius = 0.9, icoDetail = 5) {
    if (this.group) return;
    this.group = new THREE.Group();

    const ico = new THREE.IcosahedronGeometry(radius, icoDetail);
    const pos = (ico.attributes.position.array as unknown as number[]);
    const pPos: number[] = [];
    const pCol: number[] = [];
    this.twinkleFactors = [];
    for (let i = 0; i < pos.length; i += 3) {
      pPos.push(pos[i + 0], pos[i + 1], pos[i + 2]);
      pCol.push(0.2, 0.6, 1.0);
      this.twinkleFactors.push(Math.random() < 0.22 ? Math.random() * 3 + 1 : 0);
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.Float32BufferAttribute(pPos, 3));
    pg.setAttribute('color', new THREE.Float32BufferAttribute(pCol, 3));
    const pm = new THREE.PointsMaterial({
      vertexColors: true,
      size: 0.018,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.particles = new THREE.Points(pg, pm);

    const wm = new THREE.LineBasicMaterial({
      color: 0x4080ff,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
    });
    this.wireframe = new THREE.LineSegments(new THREE.WireframeGeometry(ico), wm);

    // Remove inner core ball per request – do not create; keep API tolerant
    this.energyCore = null;

    this.group.add(this.particles, this.wireframe);
    this.group.add(this.effectGroups.resonance, this.effectGroups.prism, this.effectGroups.rift, this.effectGroups.spikes);
    scene.add(this.group);

    this.applyTheme(this.themes[this.themeIndex]);
  }

  private applyTheme(theme: CrystalTheme) {
    if (!this.particles || !this.wireframe || !this.energyCore) return;
    const colAttr = (this.particles.geometry.getAttribute('color') as THREE.BufferAttribute);
    for (let i = 0; i < colAttr.count; i++) {
      const c = theme.colors[i % theme.colors.length];
      colAttr.setXYZ(i, c.r, c.g, c.b);
    }
    colAttr.needsUpdate = true;
    (this.wireframe.material as THREE.LineBasicMaterial).color.set(theme.edgeColor);
    if (this.energyCore) (this.energyCore.material as THREE.MeshBasicMaterial).color.set(theme.coreColor);
  }

  setThemeByEnergyInstrument(energy: number, instrument: 'none' | 'drums' | 'bass' | 'guitar') {
    // Map instrument/energy to theme index for subtle variation
    let idx = 0;
    if (instrument === 'bass') idx = 0;
    else if (instrument === 'guitar') idx = 1;
    else if (instrument === 'drums') idx = 2;
    if (energy > 0.35) idx = (idx + 1) % this.themes.length;
    if (idx !== this.themeIndex) {
      this.themeIndex = idx;
      this.applyTheme(this.themes[this.themeIndex]);
    }
  }

  triggerNextEffect() {
    const order: EffectState[] = ['resonance', 'prism', 'rift', 'spikes'];
    const next = order[(order.indexOf(this.activeEffect) + 1) % order.length];
    this.triggerEffect(next);
  }

  triggerEffect(kind: EffectState) {
    if (!this.group) return;
    // Ensure exclusivity: clear other effects before triggering
    this.clearAllEffects();
    const theme = this.themes[this.themeIndex];
    switch (kind) {
      case 'resonance':
        this.emitResonance(theme, 3);
        this._bloomStrength = 1.3;
        this.activeEffect = 'resonance';
        break;
      case 'prism':
        this.emitPrism(theme, 120);
        this._bloomStrength = 1.35;
        this.activeEffect = 'prism';
        break;
      case 'rift':
        this.emitRift(theme, 2000);
        this._bloomStrength = 1.6;
        this.activeEffect = 'rift';
        break;
      case 'spikes':
        // spikes triggered immediately; leave active for update to animate
        this.createSpikes(36);
        this._bloomStrength = 1.4;
        this.activeEffect = 'spikes';
        break;
      default:
        break;
    }
  }

  triggerSpikesFromAudio(low: number, mid: number, high: number) {
    // More spikes for higher intensity in any band
    const intensity = Math.min(1, low * 0.5 + mid * 0.8 + high * 1.0);
    const count = Math.floor(12 + intensity * 48);
    this.createSpikes(count, low, mid, high);
  }

  private createSpikes(count: number, low = 0.2, mid = 0.2, high = 0.2) {
    const theme = this.themes[this.themeIndex];
    for (let i = 0; i < count; i++) {
      const len = 0.6 + Math.random() * 1.1 + high * 0.8;
      const g = new THREE.ConeGeometry(0.02 + high * 0.06, len, 6, 1, true);
      const colorPick = theme.colors[i % theme.colors.length].clone();
      // tint by bands
      colorPick.r = Math.min(1, colorPick.r + high * 0.4);
      colorPick.g = Math.min(1, colorPick.g + mid * 0.3);
      colorPick.b = Math.min(1, colorPick.b + low * 0.2);
      const m = new THREE.MeshBasicMaterial({
        color: colorPick,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const spike = new THREE.Mesh(g, m);
      const dir = new THREE.Vector3().randomDirection();
      spike.position.set(0, 0, 0);
      spike.lookAt(dir);
      spike.rotateX(Math.PI);
      const speed = 0.35 + Math.random() * 1.0;
      const seed = Math.random();
      (spike as any).userData = { life: 1.0, speed, seed, baseLen: len };
      this.effectGroups.spikes.add(spike);
    }
  }

  update(dt: number, time: number, low: number, mid: number, high: number, rms: number, beat: boolean) {
    if (!this.group || !this.particles) return;
    // idle rotation
    this.group.rotation.y += 0.15 * dt;
    // inner core removed

    // sparkle colors driven by theme and twinkle factors
    const colAttr = (this.particles.geometry.getAttribute('color') as THREE.BufferAttribute);
    const theme = this.themes[this.themeIndex];
    for (let i = 0; i < colAttr.count; i++) {
      const tw = this.twinkleFactors[i] ?? 0;
      if (tw > 0) {
        const pulse = Math.sin(tw * time + i * 0.1) * 0.5 + 0.5;
        const bright = 1 + pulse * (1.5 + high * 2.0);
        const c = theme.colors[i % theme.colors.length];
        colAttr.setXYZ(i, c.r * bright, c.g * bright, c.b * bright);
      }
    }
    colAttr.needsUpdate = true;

    // Animate effects
    this.updateResonance(dt);
    this.updatePrism(dt);
    this.updateRift(dt);
    this.updateSpikes(dt, time);
  }

  private updateResonance(dt: number) {
    const group = this.effectGroups.resonance;
    if (!group.children.length) return;
    const survivors: THREE.Object3D[] = [];
    for (const w of group.children as THREE.Mesh[]) {
      const ud = (w as any).userData as { life: number; delay: number };
      if (ud.delay > 0) { ud.delay -= dt; survivors.push(w); continue; }
      ud.life -= dt * 0.6;
      const p = 1 - ud.life;
      w.scale.setScalar(0.1 + p * 1.4);
      (w.material as THREE.MeshBasicMaterial).opacity = Math.max(0, Math.sin(ud.life * Math.PI));
      if (ud.life > 0) survivors.push(w); else { w.geometry.dispose(); (w.material as THREE.Material).dispose?.(); }
    }
    group.children = survivors;
    if (!group.children.length) this._bloomStrength = 1.2;
  }

  private updatePrism(dt: number) {
    const group = this.effectGroups.prism;
    if (!group.children.length) return;
    const survivors: THREE.Object3D[] = [];
    for (const r of group.children as THREE.Mesh[]) {
      const ud = (r as any).userData as { life: number; phase: number };
      ud.phase += dt * 3.5;
      const m = r.material as THREE.MeshBasicMaterial;
      if (ud.phase < 1) m.opacity = ud.phase; else { ud.life -= dt * 0.9; m.opacity = Math.max(0, ud.life); }
      if (ud.life > 0) survivors.push(r); else { r.geometry.dispose(); m.dispose(); }
    }
    group.children = survivors;
    if (!group.children.length) this._bloomStrength = 1.2;
  }

  private updateRift(dt: number) {
    const group = this.effectGroups.rift;
    if (!group.children.length) return;
    const neb = group.children[0] as THREE.Points | undefined;
    if (!neb) return;
    const posAttr = neb.geometry.getAttribute('position') as THREE.BufferAttribute;
    const uArr = (neb.geometry as any).userData as { life: number; velocity: THREE.Vector3; rotationSpeed: number }[];
    for (let i = 0; i < uArr.length; i++) {
      const pd = uArr[i];
      pd.life -= dt;
      if (pd.life > 0) {
        const vec = new THREE.Vector3(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
        vec.add(pd.velocity.clone().multiplyScalar(dt));
        vec.applyAxisAngle(pd.velocity, pd.rotationSpeed);
        posAttr.setXYZ(i, vec.x, vec.y, vec.z);
      }
    }
    posAttr.needsUpdate = true;
    const m = neb.material as THREE.PointsMaterial;
    m.opacity -= dt * 0.4;
    if (m.opacity <= 0) {
      group.remove(neb);
      neb.geometry.dispose();
      m.dispose();
      this._bloomStrength = 1.2;
    }
  }

  private updateSpikes(dt: number, time: number) {
    const group = this.effectGroups.spikes;
    if (!group.children.length) return;
    const survivors: THREE.Object3D[] = [];
    for (const s of group.children as THREE.Mesh[]) {
      const ud = (s as any).userData as { life: number; speed: number; seed: number; baseLen: number };
      ud.life -= dt * 0.8;
      s.position.add(s.getWorldDirection(new THREE.Vector3()).multiplyScalar(ud.speed * dt));
      const m = s.material as THREE.MeshBasicMaterial;
      // random per-spike color modulation
      const hsl = { h: 0, s: 0, l: 0 } as any;
      m.color.getHSL(hsl);
      hsl.h = (hsl.h + (ud.seed * 0.3 + time * 0.07)) % 1;
      m.color.setHSL(hsl.h, 0.85, 0.55);
      // length wobble
      const wobble = 0.85 + Math.sin(time * (1.2 + ud.seed * 2.0)) * 0.15;
      s.scale.y = wobble;
      m.opacity = Math.min(1, m.opacity + dt * 2);
      m.opacity = Math.max(0, Math.min(1, Math.min(m.opacity, ud.life)));
      if (ud.life > 0) survivors.push(s); else { s.geometry.dispose(); m.dispose(); }
    }
    group.children = survivors;
    if (!group.children.length && this.activeEffect === 'spikes') this._bloomStrength = 1.2;
  }

  clearAllEffects() {
    const groups = [this.effectGroups.resonance, this.effectGroups.prism, this.effectGroups.rift, this.effectGroups.spikes];
    for (const g of groups) {
      for (const obj of [...g.children]) {
        if ((obj as any).geometry) (obj as any).geometry.dispose?.();
        if ((obj as any).material) (obj as any).material.dispose?.();
        g.remove(obj);
      }
    }
    this.activeEffect = 'idle';
  }

  setExclusiveEffect(kind: EffectState) {
    if (kind === 'idle') { this.clearAllEffects(); return; }
    if (this.activeEffect === kind && this.isAnyEffectActive()) return;
    this.triggerEffect(kind);
  }

  isAnyEffectActive(): boolean {
    return this.effectGroups.resonance.children.length > 0 || this.effectGroups.prism.children.length > 0 || this.effectGroups.rift.children.length > 0 || this.effectGroups.spikes.children.length > 0;
  }

  getActiveEffect(): EffectState { return this.activeEffect; }

  // --- Emission helpers (music-triggered quantities supplied by caller) ---
  emitResonance(theme?: CrystalTheme, rings = 3) {
    const th = theme ?? this.themes[this.themeIndex];
    for (let i = 0; i < rings; i++) {
      const g = new THREE.TorusGeometry(1.0 + i * 0.22, 0.02, 12, 72);
      const m = new THREE.MeshBasicMaterial({
        color: th.colors[i % th.colors.length],
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const w = new THREE.Mesh(g, m);
      w.rotation.x = Math.PI / 2;
      w.scale.setScalar(0.1);
      (w as any).userData = { life: 1, delay: i * 0.06 };
      this.effectGroups.resonance.add(w);
    }
  }

  emitPrism(theme?: CrystalTheme, rays = 100) {
    const th = theme ?? this.themes[this.themeIndex];
    for (let i = 0; i < rays; i++) {
      const g = new THREE.CylinderGeometry(0.004, 0.004, 5.5, 6);
      const m = new THREE.MeshBasicMaterial({
        color: th.colors[i % th.colors.length],
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ray = new THREE.Mesh(g, m);
      const dir = new THREE.Vector3().randomDirection();
      ray.position.set(0, 0, 0);
      ray.lookAt(dir);
      ray.rotateX(Math.PI / 2);
      (ray as any).userData = { life: 1, phase: 0 };
      this.effectGroups.prism.add(ray);
    }
  }

  emitRift(theme?: CrystalTheme, count = 1800) {
    const th = theme ?? this.themes[this.themeIndex];
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const uD: { life: number; velocity: THREE.Vector3; rotationSpeed: number }[] = [];
    for (let i = 0; i < count; i++) {
      const c = th.colors[i % th.colors.length];
      col[i * 3 + 0] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      uD.push({
        life: 1.2 + Math.random() * 1.2,
        velocity: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
          .normalize().multiplyScalar(Math.random() * 3 + 1.5),
        rotationSpeed: (Math.random() - 0.5) * 0.04,
      });
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    bg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    (bg as any).userData = uD;
    const mat = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });
    const neb = new THREE.Points(bg, mat);
    this.effectGroups.rift.add(neb);
  }
}


