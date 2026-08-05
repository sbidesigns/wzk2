// barrel/scenes/scene.cutscene.js
// Minimal cutscene player — for season intros / post-race cinematic.
// Plays a sequence of camera moves + parallax layers + text overlays.

import * as THREE from 'three';

class CutsceneScene {
  constructor() {
    this.id = 'cutscene';
    this.type = 'cutscene';
    this._elapsed = 0;
    this._duration = 6;
    this._layers = [];
  }

  async mount(payload = {}) {
    const engine = window.__engine;
    engine.renderer.show();
    const scene = engine.renderer.getScene();

    // Parallax background layers
    const layerSpecs = [
      { color: '#05060a', depth: -50, speed: 0.1 },
      { color: '#1a1a2e', depth: -30, speed: 0.3 },
      { color: '#ff4d2e', depth: -10, speed: 0.6, opacity: 0.3 }
    ];
    for (const spec of layerSpecs) {
      const geo = new THREE.PlaneGeometry(200, 100);
      const mat = new THREE.MeshBasicMaterial({ color: spec.color, transparent: true, opacity: spec.opacity || 1, depthWrite: false });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, 0, spec.depth);
      scene.add(mesh);
      this._layers.push({ mesh, spec });
    }

    // Title text overlay
    const titleEl = document.createElement('div');
    titleEl.className = 'cutscene-title';
    titleEl.innerHTML = `
      <div class="cutscene-eyebrow">SEASON 01</div>
      <h1 class="cutscene-headline">NEON UNDERGROUND</h1>
      <div class="cutscene-sub">Three new tracks · Two vehicles · Battle Pass Tier 100</div>
    `;
    document.body.appendChild(titleEl);
    this._titleEl = titleEl;
    if (window.gsap) {
      gsap.fromTo(titleEl, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out' });
    }
  }

  update(dt) {
    this._elapsed += dt;
    const cam = window.__engine.renderer.getCamera();
    cam.position.x = Math.sin(this._elapsed * 0.3) * 5;
    cam.position.y = Math.sin(this._elapsed * 0.2) * 2;
    cam.position.z = 10 - this._elapsed * 0.3;
    cam.lookAt(0, 0, 0);
    for (const layer of this._layers) {
      layer.mesh.position.x = Math.sin(this._elapsed * layer.spec.speed) * 3;
    }
    if (this._elapsed > this._duration) {
      window.__engine.bus.emit('cutscene:complete');
    }
  }

  async unmount() {
    const engine = window.__engine;
    for (const layer of this._layers) engine.renderer.removeObject(layer.mesh);
    this._layers = [];
    if (this._titleEl) { this._titleEl.remove(); this._titleEl = null; }
    engine.renderer.hide();
  }
}

const instance = new CutsceneScene();
export function mount(payload) { return instance.mount(payload); }
export function unmount() { return instance.unmount(); }
export function update(dt) { instance.update(dt); }
export default { mount, unmount, update, id: 'cutscene', type: 'cutscene' };
