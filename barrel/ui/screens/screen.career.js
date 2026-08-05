// barrel/ui/screens/screen.career.js
import { el, topNav, screenHeader, playUISound } from './_shared.js';

export async function mount(root, payload, ctx) {
  root.appendChild(topNav());
  const screen = el('div', 'screen');
  screen.appendChild(screenHeader('CAREER', 'Progress through the underground ranks'));
  const body = el('div', 'screen-body');

  const nodes = [
    { id: 'c1', name: 'First Race', desc: 'Complete your first race', status: 'completed', reward: '500 CR' },
    { id: 'c2', name: 'Drift Apprentice', desc: 'Score 5,000 drift points in one race', status: 'completed', reward: '1,000 CR + XP' },
    { id: 'c3', name: 'Burnout Master', desc: 'Perform 10 burnouts', status: 'completed', reward: 'Vixen RS Unlock' },
    { id: 'c4', name: 'Sprint Champion', desc: 'Win 3 sprint races', status: 'current', reward: '2,500 CR + Decal' },
    { id: 'c5', name: 'Circuit Veteran', desc: 'Win 5 circuit races', status: 'locked', reward: 'Titan V8 Discount' },
    { id: 'c6', name: 'Item Tactician', desc: 'Hit 20 racers with items', status: 'locked', reward: 'Mystery Bundle' },
    { id: 'c7', name: 'Underground King', desc: 'Win a race on every track', status: 'locked', reward: 'Legendary Livery' },
    { id: 'c8', name: 'Season Champion', desc: 'Reach Tier 100', status: 'locked', reward: 'Gold Vehicle Skin' }
  ];

  body.innerHTML = `
    <div style="display:grid; grid-template-columns: 1fr 320px; gap:var(--space-2xl);">
      <div>
        <div style="display:flex; align-items:center; gap:var(--space-l); margin-bottom:var(--space-l);">
          <div style="width:120px; height:120px; border-radius:50%; background:var(--gradient-hero); display:flex; align-items:center; justify-content:center; font-family:var(--font-display); font-size:48px; color:#0a0a0a;">7</div>
          <div>
            <div class="hud-label">CURRENT RANK</div>
            <div style="font-family:var(--font-display); font-size:var(--text-display-l); line-height:0.9;">UNDERGROUND<br>RACER</div>
            <div style="color:var(--text-secondary); margin-top:var(--space-s);">Next: Underground Veteran · 2,400 / 5,000 XP</div>
          </div>
        </div>
        <div class="career-grid" id="career-grid">
          ${nodes.map((n, idx) => `
            <div class="career-node ${n.status}" data-id="${n.id}">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-s);">
                <div style="font-family:var(--font-display); font-size:var(--text-heading-l); color:var(--accent-tertiary);">${(idx + 1).toString().padStart(2, '0')}</div>
                ${n.status === 'completed' ? '<span class="badge badge-success">DONE</span>' : ''}
                ${n.status === 'current' ? '<span class="badge badge-accent">CURRENT</span>' : ''}
                ${n.status === 'locked' ? '<span class="badge">LOCKED</span>' : ''}
              </div>
              <div style="font-weight:700; margin-bottom:var(--space-xs);">${n.name}</div>
              <div style="font-size:var(--text-body-s); color:var(--text-secondary); line-height:1.4; min-height:36px;">${n.desc}</div>
              <div style="margin-top:var(--space-s); padding-top:var(--space-s); border-top:1px solid var(--border-subtle); font-size:var(--text-caption); color:var(--accent-tertiary); letter-spacing:var(--tracking-wide); text-transform:uppercase;">REWARD · ${n.reward}</div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="card" style="height:fit-content;">
        <div class="hud-label">CURRENT OBJECTIVE</div>
        <h3 style="font-family:var(--font-display); font-size:var(--text-heading-l); margin:var(--space-s) 0;">Sprint Champion</h3>
        <p style="color:var(--text-secondary); line-height:1.5;">Win 3 sprint races. Sprint races are pure driving skill — no items, single lap, top speed matters.</p>
        <div style="margin-top:var(--space-l);">
          <div style="display:flex; justify-content:space-between; font-size:var(--text-caption); letter-spacing:var(--tracking-wide); text-transform:uppercase; color:var(--text-secondary); margin-bottom:var(--space-s);">
            <span>PROGRESS</span><span>1 / 3</span>
          </div>
          <div class="loading-bar"><div class="loading-bar-fill" style="width:33%"></div></div>
        </div>
        <button class="btn btn-primary" style="width:100%; margin-top:var(--space-l);">CONTINUE OBJECTIVE</button>
      </div>
    </div>
  `;

  screen.appendChild(body);
  root.appendChild(screen);

  root.querySelectorAll('.career-node').forEach(node => {
    node.addEventListener('click', () => {
      if (node.classList.contains('locked')) return;
      playUISound('navigate');
    });
  });
}

export async function unmount(root) {}
export default { mount, unmount };
