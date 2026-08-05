// barrel/ui/screens/screen.store.js — Battle Pass + Store
import { el, topNav, screenHeader, playUISound } from './_shared.js';

export async function mount(root, payload, ctx) {
  const engine = window.__engine;
  const gameConfig = engine.state.get('game.config');
  const season = gameConfig.season;
  root.appendChild(topNav());
  const screen = el('div', 'screen');
  screen.appendChild(screenHeader('STORE', `${season.displayName} · ${season.battlePass.tiers} tiers`));
  const body = el('div', 'screen-body');

  body.innerHTML = `
    <div class="store-layout">
      <div>
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-l);">
          <div>
            <div class="hud-label">SEASON PROGRESS</div>
            <div style="display:flex; align-items:baseline; gap:var(--space-m); margin-top:var(--space-s);">
              <span style="font-family:var(--font-display); font-size:var(--text-display-l); background:var(--gradient-hero); -webkit-background-clip:text; background-clip:text; color:transparent;">TIER 7</span>
              <span style="color:var(--text-secondary);">/ ${season.battlePass.tiers}</span>
            </div>
          </div>
          <div style="text-align:right;">
            <div class="hud-label">XP TO NEXT TIER</div>
            <div style="font-family:var(--font-display); font-size:var(--text-heading-l); color:var(--accent-tertiary);">540 / 1000</div>
            <div class="loading-bar" style="width:200px; margin-top:var(--space-s);"><div class="loading-bar-fill" style="width:54%"></div></div>
          </div>
        </div>
        <div class="tab-bar" style="margin-bottom:var(--space-l);">
          <div class="tab tab-active">BATTLE PASS</div>
          <div class="tab">FEATURED</div>
          <div class="tab">VEHICLES</div>
          <div class="tab">CHARACTERS</div>
          <div class="tab">BUNDLES</div>
        </div>
        <div class="battle-pass-track" id="battle-pass-track"></div>
      </div>
      <div>
        <div class="card" style="margin-bottom:var(--space-l);">
          <div class="badge badge-accent">FEATURED</div>
          <h3 style="font-family:var(--font-display); font-size:var(--text-heading-l); margin:var(--space-s) 0;">NEON DRIFT BUNDLE</h3>
          <div style="color:var(--text-secondary); margin-bottom:var(--space-l);">Vixen RS vehicle + 3 neon liverities + 1000 gold</div>
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <div>
              <div style="text-decoration:line-through; color:var(--text-tertiary);">2,400</div>
              <div style="font-family:var(--font-display); font-size:var(--text-heading-l); color:var(--accent-tertiary);">1,800 GOLD</div>
            </div>
            <button class="btn btn-primary">BUY</button>
          </div>
        </div>
        <div class="card">
          <div class="hud-label">DAILY ITEMS</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-s); margin-top:var(--space-s);">
            ${[
              { name: '1000 Credits', price: '100 GOLD', color: '#ffd23f' },
              { name: 'Mystery Box', price: '300 GOLD', color: '#00e5ff' },
              { name: 'XP Boost x5', price: '200 GOLD', color: '#3ddc84' },
              { name: 'Drift King Decal', price: '500 GOLD', color: '#ff4d2e' }
            ].map(item => `
              <div style="padding:var(--space-m); background:var(--surface-glass); border:1px solid var(--border-subtle); border-radius:var(--radius-m);">
                <div style="height:80px; background:linear-gradient(135deg, ${item.color}33, transparent); border-radius:var(--radius-s); margin-bottom:var(--space-s);"></div>
                <div style="font-weight:600; font-size:var(--text-body-s);">${item.name}</div>
                <div style="display:flex; align-items:center; justify-content:space-between; margin-top:var(--space-s);">
                  <span style="color:var(--accent-tertiary); font-size:var(--text-caption);">${item.price}</span>
                  <button class="btn btn-sm btn-ghost">BUY</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  // Render battle pass tiers
  const track = root.querySelector('#battle-pass-track');
  const tiers = season.battlePass.tiers;
  let tiersHtml = '';
  for (let i = 1; i <= tiers; i++) {
    const isUnlocked = i <= 7;
    const isCurrent = i === 7;
    const isFree = season.battlePass.freeTiers.includes(i);
    const isPremium = !isFree;
    tiersHtml += `
      <div class="battle-pass-tier ${isUnlocked ? 'unlocked' : ''} ${isCurrent ? 'current' : ''} ${!isUnlocked ? 'locked' : ''}">
        <div class="battle-pass-tier-num">${i}</div>
        <div>
          <div style="font-weight:600; font-size:var(--text-body-s);">${isFree ? 'FREE' : 'PREMIUM'} REWARD</div>
          <div style="color:var(--text-secondary); font-size:var(--text-caption);">
            ${['Credits', 'Gold', 'Vehicle Skin', 'Boost', 'Emote', 'Spray', 'Banner'][i % 7]} × ${i * 100}
          </div>
        </div>
        <div>${isUnlocked ? '<button class="btn btn-sm">CLAIM</button>' : '<span class="badge">LOCKED</span>'}</div>
      </div>
    `;
  }
  track.innerHTML = tiersHtml;

  screen.appendChild(body);
  root.appendChild(screen);
}

export async function unmount(root) {}
export default { mount, unmount };
