// barrel/ui/screens/screen.settings.root.js — settings landing with sub-nav
import { el, topNav, screenHeader, playUISound } from './_shared.js';

export async function mount(root, payload, ctx) {
  root.appendChild(topNav());
  const screen = el('div', 'screen');
  screen.appendChild(screenHeader('SETTINGS', 'Configure your game'));
  const body = el('div', 'screen-body');

  const sections = [
    { id: 'settings.audio',         name: 'Audio',          desc: 'Master volume, music, SFX, voice, UI sounds, engine audio', icon: 'A' },
    { id: 'settings.video',         name: 'Video',          desc: 'Quality preset, resolution, shadows, bloom, FOV, vsync', icon: 'V' },
    { id: 'settings.controls',      name: 'Controls',       desc: 'Keyboard, gamepad, touch bindings, deadzone, sensitivity', icon: 'C' },
    { id: 'settings.gameplay',      name: 'Gameplay',       desc: 'Difficulty, rubber-band, camera, auto-drift assist', icon: 'G' },
    { id: 'settings.accessibility', name: 'Accessibility',  desc: 'Colorblind mode, subtitles, motion reduction, text size', icon: 'X' }
  ];

  body.innerHTML = `
    <div class="settings-layout">
      <div class="settings-nav">
        ${sections.map((s, i) => `
          <div class="settings-nav-item ${i === 0 ? 'active' : ''}" data-section="${s.id}">
            <div style="width:32px; height:32px; border-radius:50%; background:var(--surface-glass); display:flex; align-items:center; justify-content:center; font-family:var(--font-display); color:var(--accent-tertiary);">${s.icon}</div>
            <div>${s.name}</div>
          </div>
        `).join('')}
        <div style="margin-top:auto; padding-top:var(--space-l); border-top:1px solid var(--border-subtle);">
          <button class="btn btn-ghost btn-sm" style="width:100%;">RESET TO DEFAULTS</button>
        </div>
      </div>
      <div class="settings-panel" id="settings-panel">
        <div class="card">
          <div class="hud-label">WELCOME</div>
          <h3 style="font-family:var(--font-display); font-size:var(--text-heading-l); margin:var(--space-s) 0;">CONFIGURE YOUR GAME</h3>
          <p style="color:var(--text-secondary); line-height:1.6;">Select a category on the left to configure. All settings are persisted to local storage and applied immediately. Most settings can be changed mid-race via the pause menu.</p>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-s); margin-top:var(--space-l);">
            <div class="settings-row" style="padding:var(--space-m);">
              <div class="settings-row-label"><div class="settings-row-title">Profile</div><div class="settings-row-desc">Local player data</div></div>
              <div class="badge">ACE · LVL 7</div>
            </div>
            <div class="settings-row" style="padding:var(--space-m);">
              <div class="settings-row-label"><div class="settings-row-title">Save Data</div><div class="settings-row-desc">Last synced</div></div>
              <div class="badge badge-success">SYNCED</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  screen.appendChild(body);
  root.appendChild(screen);

  root.querySelectorAll('.settings-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      playUISound('navigate');
      window.__uiRouter.push(item.dataset.section);
    });
  });
}

export async function unmount(root) {}
export default { mount, unmount };
