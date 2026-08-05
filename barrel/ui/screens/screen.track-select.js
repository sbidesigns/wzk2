// barrel/ui/screens/screen.track-select.js
import { el, topNav, screenHeader, playUISound } from './_shared.js';

export async function mount(root, payload, ctx) {
  const engine = window.__engine;
  const tracks = engine.resolver.list('tracks');
  root.appendChild(topNav());
  const screen = el('div', 'screen');
  screen.appendChild(screenHeader('SELECT TRACK', `${tracks.length} tracks available`));
  const body = el('div', 'screen-body');
  const grid = el('div', 'select-grid');

  tracks.forEach((track, idx) => {
    const tile = el('div', 'select-tile stagger');
    tile.style.animationDelay = `${0.05 * idx}s`;
    const difficultyDots = '●'.repeat(track.difficulty) + '○'.repeat(5 - track.difficulty);
    tile.innerHTML = `
      <div class="select-tile-visual" style="background:linear-gradient(135deg, #0a0c14, #1a1a2e);">
        <div style="position:absolute; inset:0; background:radial-gradient(ellipse at 50% 60%, rgba(255,77,46,0.15), transparent 60%);"></div>
        <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-family:var(--font-display); font-size:80px; color:rgba(255,255,255,0.12);">${track.biome.split('-')[0].toUpperCase()}</div>
        <div style="position:absolute; bottom:var(--space-m); left:var(--space-m); display:flex; gap:var(--space-s);">
          <span class="badge badge-warning">${difficultyDots}</span>
          <span class="badge">${track.laps} LAPS</span>
        </div>
      </div>
      <div class="select-tile-info">
        <div class="select-tile-name">${track.displayName}</div>
        <div class="select-tile-class">${track.biome.toUpperCase().replace('-', ' ')}</div>
      </div>
    `;
    tile.addEventListener('click', () => {
      playUISound('confirm');
      document.querySelectorAll('.select-tile').forEach(t => t.classList.remove('selected'));
      tile.classList.add('selected');
      engine.state.set('race.payload', { ...(engine.state.get('race.payload') || {}), track: track.id });
      setTimeout(() => window.__uiRouter.push('vehicle-select'), 350);
    });
    grid.appendChild(tile);
  });

  body.appendChild(grid);
  screen.appendChild(body);
  root.appendChild(screen);
}

export async function unmount(root) {}
export default { mount, unmount };
