import * as THREE from 'three';

const frag = `
precision highp float;
uniform float uTime;
uniform vec2 uRes;
uniform float uLow;
uniform float uMid;
uniform float uHigh;
uniform float uAlpha;

float hash(vec2 p){return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453);} 
float noise(vec2 p){
  vec2 i=floor(p); vec2 f=fract(p);
  float a=hash(i), b=hash(i+vec2(1.0,0.0)), c=hash(i+vec2(0.0,1.0)), d=hash(i+vec2(1.0,1.0));
  vec2 u=f*f*(3.0-2.0*f);
  return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
}
float fbm(vec2 p){
  float v=0.0; float a=0.5; mat2 m=mat2(1.6,1.2,-1.2,1.6);
  for(int i=0;i<5;i++){ v+=a*noise(p); p=m*p; a*=0.5; }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes.xy;
  vec2 p = (uv - 0.5) * vec2(uRes.x/uRes.y, 1.0);
  float t = uTime * 0.03;
  float base = fbm(p*1.4 + t);
  float swirl = fbm(p*3.0 - t*1.5 + base);
  float energy = uLow*0.5 + uMid*0.35 + uHigh*0.15;
  float mask = smoothstep(0.15, 0.85, swirl + energy*0.6);
  vec3 col = mix(vec3(0.01,0.02,0.05), vec3(0.1 + 0.8*uHigh, 0.2 + 0.7*uMid, 0.4 + 0.5*uLow), mask);
  float alpha = clamp(uAlpha * (0.4 + 0.6*mask), 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}
`;

export class NebulaOverlay {
  private mesh: THREE.Mesh | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private z = -2.5;

  init(scene: THREE.Scene, width: number, height: number) {
    const geom = new THREE.PlaneGeometry(1, 1, 1, 1);
    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uRes: { value: new THREE.Vector2(width, height) },
        uLow: { value: 0 },
        uMid: { value: 0 },
        uHigh: { value: 0 },
        uAlpha: { value: 0.35 },
      },
      fragmentShader: frag,
    });
    this.mesh = new THREE.Mesh(geom, this.material);
    this.mesh.position.z = this.z;
    scene.add(this.mesh);
  }

  update(time: number, low: number, mid: number, high: number, alpha: number) {
    if (!this.material) return;
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uLow.value = low;
    this.material.uniforms.uMid.value = mid;
    this.material.uniforms.uHigh.value = high;
    this.material.uniforms.uAlpha.value = alpha;
  }

  // Scale plane to cover full viewport given camera and renderer size
  coverViewport(camera: THREE.PerspectiveCamera, width: number, height: number) {
    if (!this.mesh || !this.material) return;
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const dist = (camera.position.z - this.z);
    const planeHeight = 2 * Math.tan(vFov / 2) * dist;
    const planeWidth = planeHeight * (width / height);
    this.mesh.scale.set(planeWidth, planeHeight, 1);
    (this.material.uniforms.uRes.value as THREE.Vector2).set(width, height);
  }

  dispose(scene: THREE.Scene) {
    if (this.mesh) scene.remove(this.mesh);
    if (this.mesh && this.mesh.geometry) this.mesh.geometry.dispose();
    if (this.material) this.material.dispose();
    this.mesh = null; this.material = null;
  }
}


