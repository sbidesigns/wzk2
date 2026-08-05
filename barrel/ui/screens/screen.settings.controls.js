// barrel/ui/screens/screen.settings.controls.js
import { el, topNav, screenHeader, playUISound } from './_shared.js';

export async function mount(root, payload, ctx) {
  const engine = window.__engine;
  const inputConfig = engine.state.get('input.config');
  const kbd = inputConfig.controllers.keyboard.defaultBindings;
  root.appendChild(topNav());
  const screen = el('div', 'screen');
  screen.appendChild(screenHeader('CONTROLS', 'Bindings, sensitivity, deadzone'));
  const body = el('div', 'screen-body');

  body.innerHTML = `
    <div class="settings-layout">
      <div class="settings-nav">
        ${['audio','video','controls','gameplay','accessibility'].map(s => `
          <div class="settings-nav-item ${s === 'controls' ? 'active' : ''}" data-section="settings.${s}">
            <div style="width:32px; height:32px; border-radius:50%; background:var(--surface-glass); display:flex; align-items:center; justify-content:center; font-family:var(--font-display); color:var(--accent-tertiary);">${s.charAt(0).toUpperCase()}</div>
            <div>${s.charAt(0).toUpperCase() + s.slice(1)}</div>
          </div>
        `).join('')}
      </div>
      <div class="settings-panel">
        <div class="card">
          <div class="hud-label">CONTROLLERS</div>
          <div style="display:flex; flex-direction:column; gap:var(--space-s); margin-top:var(--space-l);">
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">Keyboard &amp; Mouse</div><div class="settings-row-desc">Always active</div></div><div class="settings-row-control"><label class="badge badge-success"><input type="checkbox" checked> ENABLED</label></div></div>
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">Gamepad</div><div class="settings-row-desc">XInput / DInput via navigator.getGamepads()</div></div><div class="settings-row-control"><label class="badge badge-success"><input type="checkbox" checked> ENABLED</label></div></div>
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">Touch</div><div class="settings-row-desc">Auto-detected on touch devices</div></div><div class="settings-row-control"><label class="badge badge-success"><input type="checkbox" checked> ENABLED</label></div></div>
          </div>
        </div>
        <div class="card">
          <div class="hud-label">KEYBOARD BINDINGS</div>
          <div style="display:flex; flex-direction:column; gap:var(--space-s); margin-top:var(--space-l);">
            ${Object.entries(kbd).filter(([a]) => !['up','down','left','right','tabLeft','tabRight'].includes(a)).map(([action, keys]) => `
              <div class="settings-row">
                <div class="settings-row-label"><div class="settings-row-title">${action.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())}</div><div class="settings-row-desc">${action.startsWith('steer') ? 'Steering axis' : 'Action button'}</div></div>
                <div class="settings-row-control">${keys.map(k => `<span class="badge" style="font-family:var(--font-mono);">${k}</span>`).join(' ')}</div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="card">
          <div class="hud-label">GAMEPAD</div>
          <div style="display:flex; flex-direction:column; gap:var(--space-s); margin-top:var(--space-l);">
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">Stick Deadzone</div><div class="settings-row-desc">Ignore small stick movement</div></div><div class="settings-row-control"><input type="range" class="slider" min="0" max="40" value="18" style="width:160px;"><span style="font-family:var(--font-mono);">0.18</span></div></div>
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">Steer Sensitivity</div><div class="settings-row-desc">Response curve</div></div><div class="settings-row-control"><select class="input" style="min-width:120px;"><option>Linear</option><option selected>Exponential</option><option>Aggressive</option></select></div></div>
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">Vibration</div><div class="settings-row-desc">Haptic feedback</div></div><div class="settings-row-control"><label class="badge badge-success"><input type="checkbox" checked> ON</label></div></div>
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
      window.__uiRouter.replace(item.dataset.section);
    });
  });
}
export async function unmount(root) {}
export default { mount, unmount };
