// barrel/ui/screens/screen.splash.js
import { el } from './_shared.js';

export async function mount(root, payload, ctx) {
  root.innerHTML = `
    <div class="screen screen-splash">
      <div class="splash-content">
        <div class="splash-logo anim-parallax-rise">WARZONE<br>KART</div>
        <div class="splash-tagline anim-fade-in" style="animation-delay:0.4s">NEON UNDERGROUND · SEASON 01</div>
      </div>
      <div class="splash-loading anim-fade-in" style="animation-delay:0.8s">
        <div class="splash-loading-label"><span id="splash-status">Initializing engine…</span><span id="splash-percent">0%</span></div>
        <div class="loading-bar"><div class="loading-bar-fill" id="splash-bar" style="width:0%"></div></div>
      </div>
    </div>
  `;
  // Animate the loading bar as a fake boot sequence
  const bar = root.querySelector('#splash-bar');
  const status = root.querySelector('#splash-status');
  const pct = root.querySelector('#splash-percent');
  const steps = [
    { p: 12, s: 'Initializing renderer…' },
    { p: 28, s: 'Loading physics world…' },
    { p: 45, s: 'Wiring audio buses…' },
    { p: 62, s: 'Resolving barrel components…' },
    { p: 78, s: 'Validating schemas…' },
    { p: 92, s: 'Mounting UI shell…' },
    { p: 100, s: 'Ready' }
  ];
  let i = 0;
  await new Promise(resolve => {
    const tick = () => {
      if (i >= steps.length) { resolve(); return; }
      const step = steps[i++];
      bar.style.width = step.p + '%';
      status.textContent = step.s;
      pct.textContent = step.p + '%';
      setTimeout(tick, 350 + Math.random() * 200);
    };
    tick();
  });
  // Auto-advance to main-menu
  setTimeout(() => {
    if (window.__uiRouter) window.__uiRouter.replace('main-menu');
  }, 600);
}

export async function unmount(root) {
  // nothing to clean
}

export default { mount, unmount };
