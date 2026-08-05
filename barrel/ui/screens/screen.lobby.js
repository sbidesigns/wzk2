// barrel/ui/screens/screen.lobby.js — pre-game lobby (online/MMO ready, supports AI fill)
import { el, topNav, screenHeader, playUISound } from './_shared.js';

export async function mount(root, payload, ctx) {
  const engine = window.__engine;
  const racePayload = engine.state.get('race.payload') || {};
  const modeEntry = engine.resolver.resolve('modes', racePayload.mode);
  const vehEntry = engine.resolver.resolve('vehicles', racePayload.vehicle);
  const trackEntry = engine.resolver.resolve('tracks', racePayload.track);
  const maxPlayers = modeEntry?.entry?.matchConfig?.maxPlayers || 8;

  root.appendChild(topNav());
  const screen = el('div', 'screen');
  screen.appendChild(screenHeader('PRE-GAME LOBBY', `Match fills in 30s · AI fills below 4 players`));
  const body = el('div', 'screen-body');

  body.innerHTML = `
    <div class="lobby-layout">
      <div>
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-l);">
          <div>
            <div class="hud-label">PLAYERS</div>
            <div style="font-family:var(--font-display); font-size:var(--text-display-l); line-height:0.9;">
              <span id="lobby-count">1</span> <span style="color:var(--text-tertiary);">/ ${maxPlayers}</span>
            </div>
          </div>
          <div style="text-align:right;">
            <div class="hud-label">AUTO-START IN</div>
            <div style="font-family:var(--font-display); font-size:var(--text-display-l); color:var(--accent-tertiary);" id="lobby-timer">30</div>
          </div>
        </div>
        <div class="lobby-players" id="lobby-players"></div>
      </div>
      <div class="lobby-sidebar">
        <div class="card">
          <div class="hud-label">MATCH SUMMARY</div>
          <div style="margin-top:var(--space-s); display:flex; flex-direction:column; gap:var(--space-s); font-size:var(--text-body-s);">
            <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-secondary);">Mode</span><span>${modeEntry?.entry?.displayName || '—'}</span></div>
            <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-secondary);">Track</span><span>${trackEntry?.entry?.displayName || '—'}</span></div>
            <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-secondary);">Vehicle</span><span>${vehEntry?.entry?.displayName || '—'}</span></div>
            <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-secondary);">Laps</span><span>${modeEntry?.entry?.matchConfig?.laps || '—'}</span></div>
            <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-secondary);">Items</span><span>${modeEntry?.entry?.matchConfig?.allowItems ? 'Enabled' : 'Disabled'}</span></div>
            <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-secondary);">Max Players</span><span>${maxPlayers}</span></div>
          </div>
        </div>
        <div class="card">
          <div class="hud-label">CHAT</div>
          <div id="lobby-chat" style="margin-top:var(--space-s); height:160px; overflow-y:auto; display:flex; flex-direction:column; gap:var(--space-xs); font-size:var(--text-body-s);"></div>
          <input class="input" placeholder="Type to chat…" style="margin-top:var(--space-s);" id="lobby-chat-input" />
        </div>
        <button class="btn btn-primary btn-lg" id="lobby-start">READY UP &amp; START</button>
        <button class="btn btn-ghost" id="lobby-leave">LEAVE LOBBY</button>
      </div>
    </div>
  `;

  screen.appendChild(body);
  root.appendChild(screen);

  // Simulate player join over time
  const playersEl = root.querySelector('#lobby-players');
  const countEl = root.querySelector('#lobby-count');
  const timerEl = root.querySelector('#lobby-timer');
  const chatEl = root.querySelector('#lobby-chat');
  const playerNames = ['Ace', 'Nova', 'Brick', 'Vex', 'Jett', 'Rogue', 'Echo', 'Zero', 'Saint', 'Blaze', 'Onyx', 'Quill'];
  const aiNames = ['AI Brutus', 'AI Viper', 'AI Comet', 'AI Talon', 'AI Reaper', 'AI Sable'];
  const chatLines = [
    { who: 'System', msg: 'Lobby opened.' },
    { who: 'Nova', msg: 'gl hf' },
    { who: 'Brick', msg: 'i call titan' },
    { who: 'Ace', msg: 'lets race' },
    { who: 'System', msg: 'AI填充 enabled below 4 players.' },
  ];

  let players = [{ name: 'You', avatar: 'Y', isPlayer: true, ready: true }];
  let timeLeft = 30;
  let chatIdx = 0;

  const renderPlayers = () => {
    playersEl.innerHTML = players.map(p => `
      <div class="lobby-player ${p.ready ? 'lobby-player-ready' : ''}">
        <div class="lobby-player-header">
          <div class="lobby-player-avatar" style="${p.isPlayer ? 'background:var(--gradient-hero);' : ''}">${p.avatar}</div>
          <div>
            <div style="font-weight:600;">${p.name}</div>
            <div style="font-size:var(--text-caption); color:var(--text-secondary);">${p.ready ? 'READY' : 'JOINING…'}</div>
          </div>
        </div>
        ${p.isPlayer ? '<span class="badge badge-accent">YOU</span>' : '<span class="badge">GUEST</span>'}
      </div>
    `).join('');
    countEl.textContent = players.length;
  };

  const addChat = () => {
    if (chatIdx >= chatLines.length) return;
    const line = chatLines[chatIdx++];
    const div = el('div', '', `<span style="color:var(--accent-secondary); font-weight:600;">${line.who}:</span> <span style="color:var(--text-secondary);">${line.msg}</span>`);
    chatEl.appendChild(div);
    chatEl.scrollTop = chatEl.scrollHeight;
  };

  renderPlayers();
  addChat();
  const joinInterval = setInterval(() => {
    if (players.length >= maxPlayers) { clearInterval(joinInterval); return; }
    const pool = players.length < 4 ? playerNames : aiNames;
    const isAI = players.length >= 4;
    const name = pool[(players.length - 1) % pool.length] + (isAI ? '' : '');
    players.push({ name, avatar: name.charAt(0), isPlayer: false, ready: Math.random() > 0.4 });
    renderPlayers();
    if (Math.random() > 0.5) addChat();
  }, 1800);

  const timerInterval = setInterval(() => {
    timeLeft--;
    if (timerEl) timerEl.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      clearInterval(joinInterval);
      startRace();
    }
  }, 1000);

  const startRace = () => {
    clearInterval(joinInterval);
    clearInterval(timerInterval);
    playUISound('confirm');
    engine.bus.emit('race:start', racePayload);
    engine.state.set('race.payload', racePayload);
    // Hide UI shell, transition to race scene
    document.getElementById('ui-shell').style.display = 'none';
    engine.scenes.transition(engine.resolver.resolve('scenes', 'race'), racePayload);
  };

  root.querySelector('#lobby-start').addEventListener('click', startRace);
  root.querySelector('#lobby-leave').addEventListener('click', () => {
    clearInterval(joinInterval); clearInterval(timerInterval);
    window.__uiRouter.popToRoot();
  });
  root.querySelector('#lobby-chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      const div = el('div', '', `<span style="color:var(--accent-primary); font-weight:600;">You:</span> <span>${e.target.value}</span>`);
      chatEl.appendChild(div);
      chatEl.scrollTop = chatEl.scrollHeight;
      e.target.value = '';
    }
  });

  // Cleanup on unmount
  root._cleanup = () => { clearInterval(joinInterval); clearInterval(timerInterval); };
}

export async function unmount(root) {
  if (root._cleanup) root._cleanup();
}
export default { mount, unmount };
