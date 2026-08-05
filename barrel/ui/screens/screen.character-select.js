// barrel/ui/screens/screen.character-select.js
import { el, topNav, screenHeader, playUISound } from './_shared.js';

export async function mount(root, payload, ctx) {
  const engine = window.__engine;
  const characters = engine.resolver.list('characters');
  root.appendChild(topNav());
  const screen = el('div', 'screen');
  screen.appendChild(screenHeader('SELECT CHARACTER', `${characters.length} drivers available`));
  const body = el('div', 'screen-body');
  const grid = el('div', 'select-grid');

  characters.forEach((character, idx) => {
    const tile = el('div', 'select-tile stagger');
    tile.style.animationDelay = `${0.05 * idx}s`;
    tile.innerHTML = `
      <div class="select-tile-visual" style="background:linear-gradient(135deg, ${character.cosmetic?.color || '#ff4d2e'}33, transparent);">
        <div style="font-family:var(--font-display); font-size:140px; color:${character.cosmetic?.color || '#ff4d2e'}; opacity:0.6; letter-spacing:var(--tracking-tight);">${character.displayName.charAt(0)}</div>
        <div style="position:absolute; top:var(--space-s); right:var(--space-s);" class="badge badge-accent">${character.archetype.toUpperCase()}</div>
      </div>
      <div class="select-tile-info">
        <div class="select-tile-name">${character.displayName}</div>
        <div class="select-tile-class">${character.signatureAbility.displayName.toUpperCase()}</div>
      </div>
    `;
    tile.addEventListener('click', () => {
      playUISound('confirm');
      document.querySelectorAll('.select-tile').forEach(t => t.classList.remove('selected'));
      tile.classList.add('selected');
      engine.state.set('race.payload', { ...(engine.state.get('race.payload') || {}), character: character.id });
      setTimeout(() => window.__uiRouter.push('lobby'), 400);
    });
    grid.appendChild(tile);
  });

  // Ability detail panel
  const detail = el('div', 'card', `
    <div style="display:flex; align-items:center; gap:var(--space-m); margin-bottom:var(--space-m);">
      <span class="badge badge-secondary">SIGNATURE ABILITY</span>
    </div>
    <div style="font-family:var(--font-heading); font-weight:700; font-size:var(--text-heading-m);">Hover a character to inspect</div>
    <div style="color:var(--text-secondary); margin-top:var(--space-s);">Each driver has a unique signature ability that defines their playstyle. Some are aggressive, some are defensive, some are utility.</div>
  `);
  detail.id = 'character-detail';

  body.appendChild(grid);
  body.appendChild(detail);
  screen.appendChild(body);
  root.appendChild(screen);

  // Update detail panel on hover
  root.querySelectorAll('.select-tile').forEach((tile, idx) => {
    tile.addEventListener('mouseenter', () => {
      const c = characters[idx];
      detail.innerHTML = `
        <div style="display:flex; align-items:center; gap:var(--space-m); margin-bottom:var(--space-m);">
          <span class="badge badge-secondary">SIGNATURE ABILITY</span>
          <span class="badge">${c.archetype.toUpperCase()}</span>
        </div>
        <div style="font-family:var(--font-heading); font-weight:700; font-size:var(--text-heading-m);">${c.signatureAbility.displayName}</div>
        <div style="color:var(--text-secondary); margin-top:var(--space-s); line-height:1.5;">${c.signatureAbility.description}</div>
        <div style="display:flex; gap:var(--space-l); margin-top:var(--space-l);">
          <div><div class="hud-label">COOLDOWN</div><div style="font-family:var(--font-display); font-size:var(--text-heading-m); color:var(--accent-tertiary);">${(c.signatureAbility.cooldownMs / 1000).toFixed(1)}s</div></div>
          <div><div class="hud-label">DURATION</div><div style="font-family:var(--font-display); font-size:var(--text-heading-m); color:var(--accent-secondary);">${(c.signatureAbility.durationMs / 1000).toFixed(1)}s</div></div>
        </div>
        <div style="margin-top:var(--space-l); display:flex; gap:var(--space-l);">
          <div style="flex:1;">${statBarMini('Aggression', c.stats.aggression)}</div>
          <div style="flex:1;">${statBarMini('Focus', c.stats.focus)}</div>
          <div style="flex:1;">${statBarMini('Luck', c.stats.luck)}</div>
        </div>
      `;
    });
  });
}

function statBarMini(label, value) {
  return `<div class="stat-bar">
    <div class="stat-bar-label"><span>${label}</span><span>${value}</span></div>
    <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${value * 10}%"></div></div>
  </div>`;
}

export async function unmount(root) {}
export default { mount, unmount };
