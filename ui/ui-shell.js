// ui/ui-shell.js
// Mounts the persistent UI layer: parallax background, top nav, screen mount point.
// Transitions orchestrated via GSAP if available, else CSS animations.

import { EventBus } from '../core/EventBus.js';

export class UIShell {
  constructor() {
    this._root = null;
    this._parallaxLayers = [];
    this._mouseX = 0;
    this._mouseY = 0;
  }

  init() {
    this._root = document.createElement('div');
    this._root.id = 'ui-shell';
    this._root.innerHTML = `
      <div class="parallax-bg" id="parallax-bg">
        <div class="bg-grid"></div>
        <div class="bg-glow-orb" style="background:#ff4d2e; width:600px; height:600px; top:-100px; left:-100px;"></div>
        <div class="bg-glow-orb" style="background:#00e5ff; width:500px; height:500px; bottom:-100px; right:-100px; animation-delay:2s;"></div>
        <div class="parallax-layer" data-depth="0.05" style="inset:0;"></div>
        <div class="parallax-layer" data-depth="0.15" style="inset:0;">
          <div style="position:absolute; top:20%; left:15%; width:200px; height:200px; background:radial-gradient(circle, rgba(255,77,46,0.15), transparent); filter:blur(40px);"></div>
          <div style="position:absolute; bottom:30%; right:20%; width:300px; height:300px; background:radial-gradient(circle, rgba(0,229,255,0.12), transparent); filter:blur(60px);"></div>
        </div>
        <div class="bg-vignette"></div>
      </div>
      <div id="screen-mount-point"></div>
    `;
    document.body.appendChild(this._root);

    // Track mouse for parallax
    window.addEventListener('mousemove', (e) => {
      this._mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      this._mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
      this._updateParallax();
    });

    // Listen for global navigation events
    EventBus.on('ui:navigate', ({ screenId, payload }) => {
      window.__uiRouter.push(screenId, payload);
    });
    EventBus.on('ui:pop', () => window.__uiRouter.pop());
    EventBus.on('ui:popToRoot', () => window.__uiRouter.popToRoot());
    EventBus.on('ui:replace', ({ screenId, payload }) => window.__uiRouter.replace(screenId, payload));

    return this;
  }

  _updateParallax() {
    const layers = this._root.querySelectorAll('.parallax-layer');
    layers.forEach(layer => {
      const depth = parseFloat(layer.dataset.depth || '0.1');
      layer.style.transform = `translate3d(${this._mouseX * depth * -40}px, ${this._mouseY * depth * -40}px, 0)`;
    });
  }

  show() { this._root.style.display = 'block'; }
  hide() { this._root.style.display = 'none'; }
}

export const uiShell = new UIShell();
