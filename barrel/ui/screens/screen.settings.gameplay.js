// barrel/ui/screens/screen.settings.gameplay.js
import { el, topNav, screenHeader, playUISound } from './_shared.js';

export async function mount(root, payload, ctx) {
  const engine = window.__engine;
  const gameConfig = engine.state.get('game.config');
  root.appendChild(topNav());
  const screen = el('div', 'screen');
  screen.appendChild(screenHeader('GAMEPLAY', 'Difficulty, assists, camera behavior'));
  const body = el('div', 'screen-body');

  body.innerHTML = `
    <div class="settings-layout">
      <div class="settings-nav">
        ${['audio','video','controls','gameplay','accessibility'].map(s => `
          <div class="settings-nav-item ${s === 'gameplay' ? 'active' : ''}" data-section="settings.${s}">
            <div style="width:32px; height:32px; border-radius:50%; background:var(--surface-glass); display:flex; align-items:center; justify-content:center; font-family:var(--font-display); color:var(--accent-tertiary);">${s.charAt(0).toUpperCase()}</div>
            <div>${s.charAt(0).toUpperCase() + s.slice(1)}</div>
          </div>
        `).join('')}
      </div>
      <div class="settings-panel">
        <div class="card">
          <div class="hud-label">DIFFICULTY</div>
          <div style="display:flex; flex-direction:column; gap:var(--space-s); margin-top:var(--space-l);">
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">AI Difficulty</div><div class="settings-row-desc">How aggressive AI racers are</div></div><div class="settings-row-control"><select class="input" style="min-width:160px;">${gameConfig.ai.difficultyLevels.map(d => `<option ${d === gameConfig.ai.defaultDifficulty ? 'selected' : ''}>${d.charAt(0).toUpperCase() + d.slice(1)}</option>`).join('')}</select></div></div>
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">Rubber-Band AI</div><div class="settings-row-desc">AI catches up when behind, slows when ahead</div></div><div class="settings-row-control"><label class="badge ${gameConfig.ai.rubberBand.enabled ? 'badge-success' : ''}"><input type="checkbox" ${gameConfig.ai.rubberBand.enabled ? 'checked' : ''}> ${gameConfig.ai.rubberBand.enabled ? 'ON' : 'OFF'}</label></div></div>
          </div>
        </div>
        <div class="card">
          <div class="hud-label">DRIVING ASSISTS</div>
          <div style="display:flex; flex-direction:column; gap:var(--space-s); margin-top:var(--space-l);">
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">Auto-Steer Assist</div><div class="settings-row-desc">Gently nudges car toward track center</div></div><div class="settings-row-control"><label class="badge"><input type="checkbox"> OFF</label></div></div>
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">Auto-Brake Assist</div><div class="settings-row-desc">Brakes before sharp corners</div></div><div class="settings-row-control"><label class="badge"><input type="checkbox"> OFF</label></div></div>
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">Drift Assist</div><div class="settings-row-desc">Easier drift entry / exit</div></div><div class="settings-row-control"><label class="badge badge-success"><input type="checkbox" checked> ON</label></div></div>
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">Reset to Track</div><div class="settings-row-desc">Auto-reset when stuck or flipped</div></div><div class="settings-row-control"><label class="badge badge-success"><input type="checkbox" checked> ON</label></div></div>
          </div>
        </div>
        <div class="card">
          <div class="hud-label">CAMERA</div>
          <div style="display:flex; flex-direction:column; gap:var(--space-s); margin-top:var(--space-l);">
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">Camera Mode</div><div class="settings-row-desc">Chase camera style</div></div><div class="settings-row-control"><select class="input" style="min-width:160px;"><option>Chase (default)</option><option>Far Chase</option><option>Near Bumper</option><option>Cockpit</option><option>Drift</option></select></div></div>
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">Camera Shake</div><div class="settings-row-desc">Impact and speed shake</div></div><div class="settings-row-control"><input type="range" class="slider" min="0" max="100" value="60" style="width:160px;"><span style="font-family:var(--font-mono);">60</span></div></div>
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">Look-Ahead</div><div class="settings-row-desc">Camera turns into corners</div></div><div class="settings-row-control"><label class="badge badge-success"><input type="checkbox" checked> ON</label></div></div>
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
