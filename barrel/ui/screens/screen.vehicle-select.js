// barrel/ui/screens/screen.vehicle-select.js
import { el, topNav, screenHeader, statBar, playUISound } from './_shared.js';

export async function mount(root, payload, ctx) {
  const engine = window.__engine;
  const vehicles = engine.resolver.list('vehicles');
  root.appendChild(topNav());
  const screen = el('div', 'screen');
  screen.appendChild(screenHeader('SELECT VEHICLE', `${vehicles.length} vehicles in your garage`));
  const body = el('div', 'screen-body');
  body.style.display = 'grid';
  body.style.gridTemplateColumns = '1.4fr 1fr';
  body.style.gap = 'var(--space-2xl)';

  const grid = el('div', 'select-grid');
  const preview = el('div', 'select-preview');

  const renderPreview = (vehicle) => {
    if (!vehicle) {
      preview.innerHTML = `<div class="select-preview-card"><div style="color:var(--text-secondary); text-align:center; padding:var(--space-xl);">Select a vehicle to view stats</div></div>`;
      return;
    }
    preview.innerHTML = `
      <div class="select-preview-card anim-scale-in">
        <div style="height:200px; border-radius:var(--radius-l); margin-bottom:var(--space-l);
          background:linear-gradient(135deg, ${vehicle.cosmetic?.bodyColor || '#ff4d2e'}, ${vehicle.cosmetic?.accentColor || '#ffd23f'});
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 8px 32px -8px ${vehicle.cosmetic?.bodyColor || '#ff4d2e'}40;">
          <div style="font-family:var(--font-display); font-size:80px; color:rgba(255,255,255,0.2);">${vehicle.displayName.charAt(0)}</div>
        </div>
        <div class="select-preview-title">${vehicle.displayName}</div>
        <div class="badge" style="margin-top:var(--space-s);">${vehicle.class.toUpperCase()}</div>
        <div class="select-preview-stats">
          ${statBar('Top Speed',     vehicle.stats.topSpeed).outerHTML}
          ${statBar('Acceleration',  vehicle.stats.acceleration).outerHTML}
          ${statBar('Handling',      vehicle.stats.handling).outerHTML}
          ${statBar('Weight',        vehicle.stats.weight).outerHTML}
        </div>
        <div style="margin-top:var(--space-l); padding-top:var(--space-l); border-top:1px solid var(--border-subtle); display:flex; flex-direction:column; gap:var(--space-s); font-size:var(--text-body-s);">
          <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-secondary);">Engine Power</span><span style="font-family:var(--font-mono);">${vehicle.tuning.enginePower}</span></div>
          <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-secondary);">Max Steer</span><span style="font-family:var(--font-mono);">${vehicle.tuning.maxSteer.toFixed(2)}</span></div>
          <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-secondary);">Drift Grip</span><span style="font-family:var(--font-mono);">${vehicle.tuning.driftGripMultiplier.toFixed(2)}×</span></div>
          <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-secondary);">Burnout Boost</span><span style="font-family:var(--font-mono);">${vehicle.tuning.burnoutTorqueBoost.toFixed(1)}×</span></div>
        </div>
        <button class="btn btn-primary btn-lg" style="width:100%; margin-top:var(--space-l);" id="confirm-vehicle">CONFIRM ‹</button>
      </div>
    `;
    preview.querySelector('#confirm-vehicle').addEventListener('click', () => {
      playUISound('confirm');
      engine.state.set('race.payload', { ...(engine.state.get('race.payload') || {}), vehicle: vehicle.id });
      window.__uiRouter.push('character-select');
    });
  };

  vehicles.forEach((vehicle, idx) => {
    const tile = el('div', 'select-tile stagger');
    tile.style.animationDelay = `${0.05 * idx}s`;
    tile.innerHTML = `
      <div class="select-tile-visual" style="background:linear-gradient(135deg, ${vehicle.cosmetic?.bodyColor || '#ff4d2e'}22, ${vehicle.cosmetic?.accentColor || '#ffd23f'}11);">
        <div style="font-family:var(--font-display); font-size:96px; color:${vehicle.cosmetic?.bodyColor || '#ff4d2e'}; opacity:0.7; letter-spacing:var(--tracking-tight);">${vehicle.displayName.charAt(0)}</div>
        ${vehicle.unlock.type !== 'default' ? `<div style="position:absolute; top:var(--space-s); right:var(--space-s);" class="badge badge-warning">LOCKED</div>` : ''}
      </div>
      <div class="select-tile-info">
        <div class="select-tile-name">${vehicle.displayName}</div>
        <div class="select-tile-class">${vehicle.class.toUpperCase()}</div>
      </div>
    `;
    tile.addEventListener('click', () => {
      playUISound('navigate');
      document.querySelectorAll('.select-tile').forEach(t => t.classList.remove('selected'));
      tile.classList.add('selected');
      renderPreview(vehicle);
    });
    if (idx === 0) {
      tile.classList.add('selected');
      renderPreview(vehicle);
    }
    grid.appendChild(tile);
  });

  body.appendChild(grid);
  body.appendChild(preview);
  screen.appendChild(body);
  root.appendChild(screen);
}

export async function unmount(root) {}
export default { mount, unmount };
