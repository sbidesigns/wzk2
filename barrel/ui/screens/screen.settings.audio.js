// barrel/ui/screens/screen.settings.audio.js
import { el, topNav, screenHeader, playUISound } from './_shared.js';

export async function mount(root, payload, ctx) {
  const engine = window.__engine;
  const buses = engine.audio.getBuses();
  root.appendChild(topNav());
  const screen = el('div', 'screen');
  screen.appendChild(screenHeader('AUDIO', 'Bus volumes, output device, positional audio'));
  const body = el('div', 'screen-body');

  const rows = (label, desc, control) => `<div class="settings-row">
    <div class="settings-row-label"><div class="settings-row-title">${label}</div><div class="settings-row-desc">${desc}</div></div>
    <div class="settings-row-control">${control}</div>
  </div>`;

  const slider = (bus, value) => `<div style="display:flex; align-items:center; gap:var(--space-s); width:100%;">
    <input type="range" class="slider" min="0" max="100" value="${Math.round(value * 100)}" data-bus="${bus}" />
    <span style="font-family:var(--font-mono); font-size:var(--text-body-s); min-width:36px; text-align:right;">${Math.round(value * 100)}</span>
  </div>`;

  body.innerHTML = `
    <div class="settings-layout">
      <div class="settings-nav">
        ${['audio','video','controls','gameplay','accessibility'].map(s => `
          <div class="settings-nav-item ${s === 'audio' ? 'active' : ''}" data-section="settings.${s}">
            <div style="width:32px; height:32px; border-radius:50%; background:var(--surface-glass); display:flex; align-items:center; justify-content:center; font-family:var(--font-display); color:var(--accent-tertiary);">${s.charAt(0).toUpperCase()}</div>
            <div>${s.charAt(0).toUpperCase() + s.slice(1)}</div>
          </div>
        `).join('')}
      </div>
      <div class="settings-panel">
        <div class="card">
          <div class="hud-label">VOLUME MIXER</div>
          <div style="display:flex; flex-direction:column; gap:var(--space-s); margin-top:var(--space-l);">
            ${rows('Master', 'Overall volume', slider('master', buses.master.volume))}
            ${rows('Music', 'Background music', slider('music', buses.music.volume))}
            ${rows('SFX', 'In-race sound effects', slider('sfx', buses.sfx.volume))}
            ${rows('Voice', 'Voice chat / announcements', slider('voice', buses.voice.volume))}
            ${rows('UI', 'Menu and button sounds', slider('ui', buses.ui.volume))}
            ${rows('Engine', 'Vehicle engine audio', slider('engine', buses.engine.volume))}
          </div>
        </div>
        <div class="card">
          <div class="hud-label">OUTPUT</div>
          <div style="display:flex; flex-direction:column; gap:var(--space-s); margin-top:var(--space-l);">
            ${rows('Output Device', 'Audio output', '<select class="input" style="min-width:220px;"><option>System Default</option><option>Headphones</option><option>Speakers</option><option>HDMI</option></select>')}
            ${rows('Positional Audio', '3D spatial sound in race', '<label class="badge badge-success"><input type="checkbox" checked> ENABLED</label>')}
            ${rows('Voice Chat', 'Push-to-talk in lobby', '<label class="badge"><input type="checkbox"> DISABLED</label>')}
            ${rows('Subtitles', 'Show voice subtitles', '<label class="badge badge-success"><input type="checkbox" checked> ENABLED</label>')}
          </div>
        </div>
      </div>
    </div>
  `;
  screen.appendChild(body);
  root.appendChild(screen);

  root.querySelectorAll('input[type="range"][data-bus]').forEach(input => {
    input.addEventListener('input', (e) => {
      const bus = e.target.dataset.bus;
      const vol = e.target.value / 100;
      engine.audio.setBusVolume(bus, vol);
      e.target.nextElementSibling.textContent = e.target.value;
    });
  });
  root.querySelectorAll('.settings-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      playUISound('navigate');
      window.__uiRouter.replace(item.dataset.section);
    });
  });
}
export async function unmount(root) {}
export default { mount, unmount };
