// barrel/ui/screens/screen.main-menu.js
import { el, button, playUISound } from './_shared.js';

export async function mount(root, payload, ctx) {
  root.innerHTML = `
    <div class="screen screen-main-menu">
      <div class="main-menu-left stagger">
        <div class="main-menu-eyebrow">SEASON 01 · NEON UNDERGROUND</div>
        <h1 class="main-menu-title">WARZONE<br>KART</h1>
        <div style="color:var(--text-secondary); max-width:480px; line-height:1.6;">
          The chaos of an ATV drop into a hot zone. The drift physics of underground street racing.
          The meta-loop of a AAA season. All in one arcade driver.
        </div>
        <div class="main-menu-actions">
          <button class="btn btn-primary btn-lg" data-action="play">
            <span>PLAY</span><span>›</span>
          </button>
          <button class="btn btn-lg" data-action="garage"><span>GARAGE</span><span>›</span></button>
          <button class="btn btn-lg" data-action="career"><span>CAREER</span><span>›</span></button>
          <button class="btn btn-lg" data-action="store"><span>STORE &amp; BATTLE PASS</span><span>›</span></button>
          <button class="btn btn-lg" data-action="settings"><span>SETTINGS</span><span>›</span></button>
          <button class="btn btn-lg" data-action="cutscene"><span>SEASON INTRO</span><span>›</span></button>
        </div>
        <div style="display:flex; gap:var(--space-l); margin-top:var(--space-l); color:var(--text-tertiary); font-size:var(--text-caption); letter-spacing:var(--tracking-wide); text-transform:uppercase;">
          <span>v0.1.0</span><span>·</span><span>Build ${new Date().toISOString().slice(0,10)}</span><span>·</span><span>3rd-party: three r160 / cannon-es 0.20 / howler 2.2.4 / gsap 3.12.5</span>
        </div>
      </div>
      <div class="main-menu-right anim-parallax-rise">
        <div class="bg-grid"></div>
        <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:80%; height:80%;
          background:radial-gradient(ellipse at center, rgba(255,77,46,0.2) 0%, transparent 60%);
          filter:blur(20px);"></div>
        <div style="position:absolute; top:40%; left:50%; transform:translate(-50%,-50%); font-family:var(--font-display); font-size:200px; color:rgba(255,255,255,0.04); letter-spacing:var(--tracking-tight);">01</div>
        <div class="season-ticker">S01 · LIVE NOW</div>
        <div class="main-menu-hero">
          <div class="main-menu-hero-content">
            <div class="main-menu-hero-label">FEATURED THIS WEEK</div>
            <h2 class="main-menu-hero-title">DOWNTOWN<br>UNDERGROUND</h2>
            <div style="color:var(--text-secondary); max-width:380px;">Night city circuit. 3 laps. Items enabled. Double XP all weekend.</div>
            <div style="margin-top:var(--space-m); display:flex; gap:var(--space-s);">
              <span class="badge badge-accent">DOUBLE XP</span>
              <span class="badge badge-secondary">3 LAPS</span>
              <span class="badge">12 PLAYERS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Wire up navigation
  root.querySelector('[data-action="play"]').addEventListener('click', () => {
    playUISound('confirm');
    window.__uiRouter.push('mode-select');
  });
  root.querySelector('[data-action="garage"]').addEventListener('click', () => {
    playUISound('navigate');
    window.__uiRouter.push('garage');
  });
  root.querySelector('[data-action="career"]').addEventListener('click', () => {
    playUISound('navigate');
    window.__uiRouter.push('career');
  });
  root.querySelector('[data-action="store"]').addEventListener('click', () => {
    playUISound('navigate');
    window.__uiRouter.push('store');
  });
  root.querySelector('[data-action="settings"]').addEventListener('click', () => {
    playUISound('navigate');
    window.__uiRouter.push('settings.root');
  });
  root.querySelector('[data-action="cutscene"]').addEventListener('click', () => {
    playUISound('navigate');
    window.__engine.bus.emit('cutscene:play', { id: 'season-intro' });
    window.__uiRouter.push('cutscene');
  });
}

export async function unmount(root) {}

export default { mount, unmount };
