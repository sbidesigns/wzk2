// barrel/ui/screens/screen.settings.accessibility.js
import { el, topNav, screenHeader, playUISound } from './_shared.js';

export async function mount(root, payload, ctx) {
  root.appendChild(topNav());
  const screen = el('div', 'screen');
  screen.appendChild(screenHeader('ACCESSIBILITY', 'Visual, audio, and motor accessibility options'));
  const body = el('div', 'screen-body');

  body.innerHTML = `
    <div class="settings-layout">
      <div class="settings-nav">
        ${['audio','video','controls','gameplay','accessibility'].map(s => `
          <div class="settings-nav-item ${s === 'accessibility' ? 'active' : ''}" data-section="settings.${s}">
            <div style="width:32px; height:32px; border-radius:50%; background:var(--surface-glass); display:flex; align-items:center; justify-content:center; font-family:var(--font-display); color:var(--accent-tertiary);">${s.charAt(0).toUpperCase()}</div>
            <div>${s.charAt(0).toUpperCase() + s.slice(1)}</div>
          </div>
        `).join('')}
      </div>
      <div class="settings-panel">
        <div class="card">
          <div class="hud-label">VISUAL</div>
          <div style="display:flex; flex-direction:column; gap:var(--space-s); margin-top:var(--space-l);">
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">Colorblind Mode</div><div class="settings-row-desc">Adjusts palette for color vision deficiency</div></div><div class="settings-row-control"><select class="input" style="min-width:160px;"><option>None</option><option>Protanopia</option><option>Deuteranopia</option><option>Tritanopia</option></select></div></div>
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">UI Contrast</div><div class="settings-row-desc">Boosts text/background contrast</div></div><div class="settings-row-control"><select class="input" style="min-width:160px;"><option>Default</option><option>High</option><option>Maximum</option></select></div></div>
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">Text Size</div><div class="settings-row-desc">Global UI text scale</div></div><div class="settings-row-control"><input type="range" class="slider" min="80" max="140" value="100" style="width:160px;"><span style="font-family:var(--font-mono);">100%</span></div></div>
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">Reduce Motion</div><div class="settings-row-desc">Minimizes parallax, shake, micro-animations</div></div><div class="settings-row-control"><label class="badge"><input type="checkbox"> OFF</label></div></div>
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">Screen Flash Reduction</div><div class="settings-row-desc">Softens flash effects (boosts, hits)</div></div><div class="settings-row-control"><label class="badge badge-success"><input type="checkbox" checked> ON</label></div></div>
          </div>
        </div>
        <div class="card">
          <div class="hud-label">AUDIO</div>
          <div style="display:flex; flex-direction:column; gap:var(--space-s); margin-top:var(--space-l);">
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">Mono Audio</div><div class="settings-row-desc">Downmix stereo to mono</div></div><div class="settings-row-control"><label class="badge"><input type="checkbox"> OFF</label></div></div>
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">Visual Cues for Audio</div><div class="settings-row-desc">On-screen indicators for important SFX</div></div><div class="settings-row-control"><label class="badge badge-success"><input type="checkbox" checked> ON</label></div></div>
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">Subtitle Background</div><div class="settings-row-desc">Opaque backdrop for subtitles</div></div><div class="settings-row-control"><label class="badge badge-success"><input type="checkbox" checked> ON</label></div></div>
          </div>
        </div>
        <div class="card">
          <div class="hud-label">MOTOR</div>
          <div style="display:flex; flex-direction:column; gap:var(--space-s); margin-top:var(--space-l);">
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">Hold Instead of Tap</div><div class="settings-row-desc">Convert tap actions to hold</div></div><div class="settings-row-control"><label class="badge"><input type="checkbox"> OFF</label></div></div>
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">Input Repeat Rate</div><div class="settings-row-desc">Key repeat speed in menus</div></div><div class="settings-row-control"><input type="range" class="slider" min="50" max="200" value="100" style="width:160px;"><span style="font-family:var(--font-mono);">100%</span></div></div>
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">One-Hand Mode</div><div class="settings-row-desc">Remap all controls to one side</div></div><div class="settings-row-control"><label class="badge"><input type="checkbox"> OFF</label></div></div>
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
