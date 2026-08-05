// barrel/ui/screens/screen.results.js — post-race results, XP, rewards
import { el, topNav, screenHeader, playUISound } from './_shared.js';

export async function mount(root, payload, ctx) {
  const engine = window.__engine;
  const racePayload = engine.state.get('race.payload') || {};
  const modeEntry = engine.resolver.resolve('modes', racePayload.mode);
  const vehEntry = engine.resolver.resolve('vehicles', racePayload.vehicle);

  // Generate fake results if none provided
  const results = payload?.results || [
    { id: 'player', time: 184.3, isPlayer: true },
    { id: 'ai-1', time: 187.1 },
    { id: 'ai-2', time: 192.8 },
    { id: 'ai-3', time: 198.5 }
  ];
  results.sort((a, b) => (a.time || 0) - (b.time || 0));
  const playerPosition = results.findIndex(r => r.isPlayer) + 1;
  const baseXp = 200;
  const winBonus = playerPosition === 1 ? 300 : 0;
  const objectiveBonus = 100;
  const totalXp = baseXp + winBonus + objectiveBonus;

  root.appendChild(topNav());
  const screen = el('div', 'screen');
  screen.appendChild(screenHeader('RESULTS', `${modeEntry?.entry?.displayName || 'Race'} · ${vehEntry?.entry?.displayName || ''}`));
  const body = el('div', 'screen-body');

  body.innerHTML = `
    <div class="results-layout">
      <div class="results-position anim-parallax-rise">${playerPosition}<span style="font-size:0.5em; color:var(--text-secondary);">${ordinalSuffix(playerPosition)}</span></div>
      <div style="color:var(--text-secondary); letter-spacing:var(--tracking-ultra-wide); text-transform:uppercase; font-size:var(--text-body-s);">
        ${playerPosition === 1 ? 'VICTORY' : playerPosition <= 3 ? 'PODIUM FINISH' : 'BETTER LUCK NEXT TIME'}
      </div>
      <div class="results-table">
        ${results.map((r, i) => `
          <div class="results-row ${r.isPlayer ? 'player' : ''}">
            <div class="results-row-pos">${i + 1}</div>
            <div>
              <div style="font-weight:600;">${r.id === 'player' ? 'You' : r.id.toUpperCase()}</div>
              <div style="font-size:var(--text-caption); color:var(--text-secondary);">${vehEntry?.entry?.displayName || 'Vehicle'}</div>
            </div>
            <div style="font-family:var(--font-mono); color:var(--text-secondary);">${formatTime(r.time)}</div>
            <div style="text-align:right;"><span class="badge ${i === 0 ? 'badge-accent' : ''}">${i === 0 ? 'WIN' : '+' + (100 - i * 20) + ' XP'}</span></div>
          </div>
        `).join('')}
      </div>
      <div class="card" style="width:100%; max-width:720px;">
        <div class="hud-label">REWARDS EARNED</div>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:var(--space-l); margin-top:var(--space-m);">
          <div><div style="font-family:var(--font-display); font-size:var(--text-heading-l); color:var(--accent-tertiary);">+${totalXp}</div><div class="hud-label">XP EARNED</div></div>
          <div><div style="font-family:var(--font-display); font-size:var(--text-heading-l); color:var(--success);">+1,200</div><div class="hud-label">CREDITS</div></div>
          <div><div style="font-family:var(--font-display); font-size:var(--text-heading-l); color:var(--accent-secondary);">+50</div><div class="hud-label">GOLD</div></div>
        </div>
        <div style="margin-top:var(--space-l);">
          <div style="display:flex; justify-content:space-between; font-size:var(--text-caption); letter-spacing:var(--tracking-wide); text-transform:uppercase; color:var(--text-secondary); margin-bottom:var(--space-s);">
            <span>BATTLE PASS TIER 7 → ${7 + Math.floor(totalXp / 1000)}</span><span>${totalXp} / 1000 XP</span>
          </div>
          <div class="loading-bar"><div class="loading-bar-fill" style="width:${(totalXp % 1000) / 10}%"></div></div>
        </div>
      </div>
      <div style="display:flex; gap:var(--space-m); margin-top:var(--space-l);">
        <button class="btn btn-primary btn-lg" data-action="rematch">RACE AGAIN</button>
        <button class="btn btn-lg" data-action="garage">GO TO GARAGE</button>
        <button class="btn btn-ghost btn-lg" data-action="main-menu">MAIN MENU</button>
      </div>
    </div>
  `;
  screen.appendChild(body);
  root.appendChild(screen);

  root.querySelector('[data-action="rematch"]').addEventListener('click', () => {
    playUISound('confirm');
    document.getElementById('ui-shell').style.display = 'none';
    engine.scenes.transition(engine.resolver.resolve('scenes', 'race'), racePayload);
  });
  root.querySelector('[data-action="garage"]').addEventListener('click', () => {
    playUISound('navigate');
    window.__uiRouter.popToRoot();
    window.__uiRouter.push('garage');
  });
  root.querySelector('[data-action="main-menu"]').addEventListener('click', () => {
    playUISound('back');
    window.__uiRouter.popToRoot();
  });
}

function ordinalSuffix(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
function formatTime(seconds) {
  if (!seconds) return 'DNF';
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(2);
  return `${m}:${s.padStart(5, '0')}`;
}

export async function unmount(root) {}
export default { mount, unmount };
