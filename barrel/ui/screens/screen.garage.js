// barrel/ui/screens/screen.garage.js
import { el, topNav, screenHeader, statBar, playUISound } from './_shared.js';

export async function mount(root, payload, ctx) {
  const engine = window.__engine;
  const vehicles = engine.resolver.list('vehicles');
  root.appendChild(topNav());
  const screen = el('div', 'screen');
  screen.appendChild(screenHeader('GARAGE', 'Upgrade, paint, and tune your vehicles'));
  const body = el('div', 'screen-body');

  body.innerHTML = `
    <div class="garage-layout">
      <div class="garage-stage">
        <div class="bg-grid"></div>
        <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-family:var(--font-display); font-size:240px; color:rgba(255,77,46,0.12); letter-spacing:var(--tracking-tight);" id="garage-letter">S</div>
        <div style="position:absolute; top:var(--space-l); left:var(--space-l);" class="badge badge-accent" id="garage-class">SPORTS</div>
        <div style="position:absolute; bottom:var(--space-l); left:var(--space-l); right:var(--space-l); display:flex; gap:var(--space-s); overflow-x:auto;" id="garage-vehicles-strip"></div>
        <div class="garage-stage-floor"></div>
      </div>
      <div class="garage-panel">
        <div>
          <div class="hud-label">SELECTED VEHICLE</div>
          <h2 id="garage-name" style="font-family:var(--font-display); font-size:var(--text-display-l); margin:0; background:var(--gradient-hero); -webkit-background-clip:text; background-clip:text; color:transparent;">Spectre GT</h2>
        </div>
        <div id="garage-stats" style="display:flex; flex-direction:column; gap:var(--space-m);"></div>
        <div>
          <div class="hud-label" style="margin-bottom:var(--space-s);">UPGRADES</div>
          <div style="display:flex; flex-direction:column; gap:var(--space-s);">
            ${upgradeRow('Engine', 3, 5).outerHTML}
            ${upgradeRow('Tires', 2, 5).outerHTML}
            ${upgradeRow('Brakes', 4, 5).outerHTML}
            ${upgradeRow('Suspension', 1, 5).outerHTML}
            ${upgradeRow('Nitro', 2, 5).outerHTML}
          </div>
        </div>
        <div>
          <div class="hud-label" style="margin-bottom:var(--space-s);">PAINT</div>
          <div style="display:flex; gap:var(--space-s);">
            ${['#ff4d2e','#00e5ff','#ffd23f','#3ddc84','#ff3d5a','#a855f7','#1a1a1a','#f5f6fa'].map(c =>
              `<div style="width:36px; height:36px; border-radius:50%; background:${c}; border:2px solid var(--border-subtle); cursor:pointer;" data-paint="${c}"></div>`
            ).join('')}
          </div>
        </div>
        <button class="btn btn-primary btn-lg" id="garage-test-drive">TEST DRIVE</button>
      </div>
    </div>
  `;

  screen.appendChild(body);
  root.appendChild(screen);

  const strip = root.querySelector('#garage-vehicles-strip');
  vehicles.forEach((v, idx) => {
    const btn = el('div', 'card', `<div style="display:flex; align-items:center; gap:var(--space-s); padding:var(--space-s);">
      <div style="width:32px; height:32px; border-radius:50%; background:${v.cosmetic?.bodyColor || '#ff4d2e'};"></div>
      <div><div style="font-weight:600;">${v.displayName}</div><div style="font-size:var(--text-caption); color:var(--text-secondary);">${v.class.toUpperCase()}</div></div>
    </div>`);
    btn.style.minWidth = '180px';
    btn.style.cursor = 'pointer';
    if (idx === 0) btn.classList.add('card-selected');
    btn.addEventListener('click', () => {
      playUISound('navigate');
      root.querySelectorAll('#garage-vehicles-strip .card').forEach(c => c.classList.remove('card-selected'));
      btn.classList.add('card-selected');
      updateVehicle(v);
    });
    strip.appendChild(btn);
  });

  const updateVehicle = (v) => {
    root.querySelector('#garage-name').textContent = v.displayName;
    root.querySelector('#garage-class').textContent = v.class.toUpperCase();
    root.querySelector('#garage-letter').textContent = v.displayName.charAt(0);
    root.querySelector('#garage-letter').style.color = v.cosmetic?.bodyColor + '20';
    const statsEl = root.querySelector('#garage-stats');
    statsEl.innerHTML = `
      ${statBar('Top Speed', v.stats.topSpeed).outerHTML}
      ${statBar('Acceleration', v.stats.acceleration).outerHTML}
      ${statBar('Handling', v.stats.handling).outerHTML}
      ${statBar('Weight', v.stats.weight).outerHTML}
    `;
  };

  updateVehicle(vehicles[0]);

  root.querySelector('#garage-test-drive').addEventListener('click', () => {
    playUISound('confirm');
    engine.bus.emit('race:start', { mode: 'sprint', vehicle: vehicles[0].id, character: 'ace', track: 'downtown' });
    document.getElementById('ui-shell').style.display = 'none';
    engine.scenes.transition(engine.resolver.resolve('scenes', 'race'), { mode: 'sprint', vehicle: vehicles[0].id, character: 'ace', track: 'downtown' });
  });
}

function upgradeRow(label, current, max) {
  const dots = Array.from({ length: max }, (_, i) =>
    `<div style="width:20px; height:20px; border-radius:50%; background:${i < current ? 'var(--gradient-hero)' : 'var(--bg-tertiary)'}; border:1px solid var(--border-subtle);"></div>`
  ).join('');
  return el('div', 'garage-upgrade-row', `
    <div><div style="font-weight:600;">${label}</div><div style="font-size:var(--text-caption); color:var(--text-secondary);">Level ${current} / ${max}</div></div>
    <div style="display:flex; gap:var(--space-s);">${dots}</div>
    <button class="btn btn-sm btn-ghost">UPGRADE</button>
  `);
}

export async function unmount(root) {}
export default { mount, unmount };
