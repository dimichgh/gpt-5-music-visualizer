import * as THREE from 'three';

const auroraFrag = `
precision highp float;
uniform float uTime;
uniform vec2 uRes;
uniform float uLow;
uniform float uMid;
uniform float uHigh;

// Simple fbm noise
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);} 
float noise(vec2 p){
  vec2 i=floor(p); vec2 f=fract(p);
  float a=hash(i),b=hash(i+vec2(1.0,0.0)),c=hash(i+vec2(0.0,1.0)),d=hash(i+vec2(1.0,1.0));
  vec2 u=f*f*(3.0-2.0*f);
  return mix(a,b,u.x)+ (c-a)*u.y*(1.0-u.x)+ (d-b)*u.x*u.y;
}
float fbm(vec2 p){
  float v=0.0; float a=0.5; mat2 m=mat2(1.6,1.2,-1.2,1.6);
  for(int i=0;i<5;i++){v+=a*noise(p); p=m*p; a*=0.5;} return v;
}

void main(){
  vec2 uv = (gl_FragCoord.xy/uRes.xy);
  vec2 p = (uv-0.5)*vec2(uRes.x/uRes.y,1.0);
  float t = uTime*0.05;
  float n = fbm(p*1.2 + t);
  float flow = fbm(p*2.5 - t*1.2 + n);
  float energy = uLow*0.6 + uMid*0.3 + uHigh*0.1;
  float mask = smoothstep(0.2, 0.8, flow + energy*0.8);
  vec3 col = mix(vec3(0.02,0.0,0.05), vec3(0.1,0.8,1.0), mask);
  col.r += uHigh*0.3; col.g += uMid*0.2; col.b += uLow*0.1;
  gl_FragColor = vec4(col, 0.85);
}
`;

export class AuroraLayer {
  private mesh: THREE.Mesh | null = null;
  private material: THREE.ShaderMaterial | null = null;

  init(scene: THREE.Scene, width: number, height: number) {
    const geom = new THREE.PlaneGeometry(10, 10, 1, 1);
    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uRes: { value: new THREE.Vector2(width, height) },
        uLow: { value: 0 },
        uMid: { value: 0 },
        uHigh: { value: 0 },
      },
      fragmentShader: auroraFrag,
    });
    this.mesh = new THREE.Mesh(geom, this.material);
    this.mesh.position.z = -2.0;
    scene.add(this.mesh);
  }

  update(dt: number, time: number, low: number, mid: number, high: number) {
    if (!this.material) return;
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uLow.value = low;
    this.material.uniforms.uMid.value = mid;
    this.material.uniforms.uHigh.value = high;
  }

  setSize(width: number, height: number) {
    if (this.material) (this.material.uniforms.uRes.value as THREE.Vector2).set(width, height);
  }

  dispose(scene: THREE.Scene) {
    if (this.mesh) scene.remove(this.mesh);
    this.mesh = null;
    if (this.material) this.material.dispose();
    this.material = null;
  }
}


