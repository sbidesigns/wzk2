// barrel/ui/screens/screen.settings.video.js
import { el, topNav, screenHeader, playUISound } from './_shared.js';

export async function mount(root, payload, ctx) {
  const engine = window.__engine;
  const currentQuality = engine.renderer.getQuality();
  const presets = ['low', 'medium', 'high', 'ultra'];
  root.appendChild(topNav());
  const screen = el('div', 'screen');
  screen.appendChild(screenHeader('VIDEO', 'Quality, resolution, post-processing'));
  const body = el('div', 'screen-body');

  body.innerHTML = `
    <div class="settings-layout">
      <div class="settings-nav">
        ${['audio','video','controls','gameplay','accessibility'].map(s => `
          <div class="settings-nav-item ${s === 'video' ? 'active' : ''}" data-section="settings.${s}">
            <div style="width:32px; height:32px; border-radius:50%; background:var(--surface-glass); display:flex; align-items:center; justify-content:center; font-family:var(--font-display); color:var(--accent-tertiary);">${s.charAt(0).toUpperCase()}</div>
            <div>${s.charAt(0).toUpperCase() + s.slice(1)}</div>
          </div>
        `).join('')}
      </div>
      <div class="settings-panel">
        <div class="card">
          <div class="hud-label">QUALITY PRESET</div>
          <div class="tab-bar" style="margin-top:var(--space-s);" id="quality-tabs">
            ${presets.map(p => `<div class="tab ${p === currentQuality ? 'tab-active' : ''}" data-quality="${p}">${p.toUpperCase()}</div>`).join('')}
          </div>
          <div id="quality-desc" style="color:var(--text-secondary); margin-top:var(--space-m); font-size:var(--text-body-s); line-height:1.5;">
            ${currentQuality === 'high' ? 'High preset: 1.5× pixel ratio, soft shadows at 2048, bloom enabled.' : 'Click a preset to see details.'}
          </div>
        </div>
        <div class="card">
          <div class="hud-label">DISPLAY</div>
          <div style="display:flex; flex-direction:column; gap:var(--space-s); margin-top:var(--space-l);">
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">Resolution</div><div class="settings-row-desc">Native (auto-detected)</div></div><div class="settings-row-control"><span class="badge">${window.innerWidth}×${window.innerHeight}</span></div></div>
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">VSync</div><div class="settings-row-desc">Sync to display refresh</div></div><div class="settings-row-control"><label class="badge badge-success"><input type="checkbox" checked> ON</label></div></div>
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">Field of View</div><div class="settings-row-desc">Camera FOV in race</div></div><div class="settings-row-control"><input type="range" class="slider" min="60" max="100" value="72" style="width:160px;"><span style="font-family:var(--font-mono);">72°</span></div></div>
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">FPS Limit</div><div class="settings-row-desc">Cap frame rate</div></div><div class="settings-row-control"><select class="input" style="min-width:120px;"><option>Unlimited</option><option>60</option><option>120</option><option>144</option></select></div></div>
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">HDR</div><div class="settings-row-desc">High dynamic range (if display supports)</div></div><div class="settings-row-control"><label class="badge"><input type="checkbox"> OFF</label></div></div>
          </div>
        </div>
        <div class="card">
          <div class="hud-label">POST-PROCESSING</div>
          <div style="display:flex; flex-direction:column; gap:var(--space-s); margin-top:var(--space-l);">
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">Bloom</div><div class="settings-row-desc">Neon glow effect</div></div><div class="settings-row-control"><label class="badge badge-success"><input type="checkbox" checked> ON</label></div></div>
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">Motion Blur</div><div class="settings-row-desc">Speed blur at high velocity</div></div><div class="settings-row-control"><label class="badge badge-success"><input type="checkbox" checked> ON</label></div></div>
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">Film Grain</div><div class="settings-row-desc">Underground aesthetic</div></div><div class="settings-row-control"><label class="badge badge-success"><input type="checkbox" checked> ON</label></div></div>
            <div class="settings-row"><div class="settings-row-label"><div class="settings-row-title">Chromatic Aberration</div><div class="settings-row-desc">Color fringing at screen edges</div></div><div class="settings-row-control"><label class="badge"><input type="checkbox"> OFF</label></div></div>
          </div>
        </div>
      </div>
    </div>
  `;
  screen.appendChild(body);
  root.appendChild(screen);

  root.querySelectorAll('[data-quality]').forEach(tab => {
    tab.addEventListener('click', () => {
      playUISound('navigate');
      root.querySelectorAll('[data-quality]').forEach(t => t.classList.remove('tab-active'));
      tab.classList.add('tab-active');
      const q = tab.dataset.quality;
      engine.renderer.setQuality(q);
      const descs = {
        low: 'Low preset: 0.75× pixel ratio, no shadows, no bloom, no antialiasing. Best for low-end devices.',
        medium: 'Medium preset: 1.0× pixel ratio, 1024 shadows, no bloom, antialiasing on.',
        high: 'High preset: 1.5× pixel ratio, soft shadows at 2048, bloom enabled. Recommended.',
        ultra: 'Ultra preset: 2.0× pixel ratio, 4096 shadows, strong bloom. For high-end GPUs.'
      };
      root.querySelector('#quality-desc').textContent = descs[q];
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
