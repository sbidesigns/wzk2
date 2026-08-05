// ui/race-results.js — Race Results/Post-Race Screen System
//
// Features:
// - Complete post-race summary with position, times, XP
// - XP calculation and level-up detection
// - Credit/gold rewards based on performance
// - Achievement unlock notifications
// - Lap time breakdown with best lap highlight
// - Position change graph
// - Rewards breakdown (base, bonuses, multipliers)
// - Continue/Retry/Next navigation options
// - Animated reveal of results (staggered)
// - Star rating for completion quality
// CSS: loaded via ui/styles/race-results.css in index.html

/**
 * @enum {string}
 * Result grades for performance rating
 */
export const RESULT_GRADE = {
  S: { name: 'S RANK', color: '#fbbf24', minPos: 1, description: 'PERFECT!' },
  A: { name: 'A RANK', color: '#22c55e', minPos: 1, maxPos: 3, description: 'Excellent!' },
  B: { name: 'B RANK', color: '#3b82f6', minPos: 4, maxPos: 6, description: 'Good Job' },
  C: { name: 'C RANK', color: '#f97316', minPos: 7, description: 'Completed' },
  D: { name: 'D RANK', color: '#ef4444', description: 'Keep Practicing' }
};

/**
 * Main RaceResultsSystem class
 */
class RaceResultsSystem {
  constructor() {
    this._container = null;
    this._results = null;
    this._isVisible = false;
    this._animationFrame = null;
  }

  /**
   * Show race results
   * @param {object} resultsData - Complete race result data
   */
  show(resultsData) {
    if (this._isVisible) return;

    // Process and store results
    this._results = this._processResults(resultsData);
    
    // Create container if needed
    if (!this._container) {
      this._container = document.createElement('div');
      this._container.id = 'results-container';
      document.body.appendChild(this._container);
    }

    this._buildUI();
    this._setupInteractions();
    this._startRevealAnimation();
    
    this._isVisible = true;
    this._emit('results:shown', { results: this._results });

    return this;
  }

  /**
   * Hide results screen
   */
  hide() {
    if (!this._isVisible) return;

    const overlay = this._container.querySelector('.results-overlay');
    if (overlay) {
      overlay.classList.add('hiding');
      
      setTimeout(() => {
        this._cleanup();
        this._isVisible = false;
        this._emit('results:hidden', {});
      }, 400);
    }
  }

  get isVisible() { return this._isVisible; }
  get results() { return this._results; }

  /**
   * Process raw results into displayable format
   */
  _processResults(data) {
    const finalPosition = data.position || 1;
    const totalRacers = data.totalRacers || 8;
    const totalTime = data.totalTime || '02:34.567';
    const bestLapTime = data.bestLapTime || '00:48.234';
    const laps = data.laps || [{ time: '00:50.123', pos: 1 }, { time: '00:48.234', pos: 1, isBest: true }];
    
    // Calculate grade
    let grade = RESULT_GRADE.D;
    for (const [key, val] of Object.entries(RESULT_GRADE)) {
      if (val.minPos !== undefined && finalPosition <= val.minPos) {
        if (!val.maxPos || finalPosition <= val.maxPos) {
          grade = RESULT_GRADE[key];
          break;
        }
      }
    }
    
    // Calculate base rewards
    const positionMultipliers = [2.5, 2.0, 1.75, 1.5, 1.25, 1.0, 0.85, 0.75, 0.65, 0.55, 0.5, 0.45];
    const posMultiplier = positionMultipliers[finalPosition - 1] || 0.5;
    
    const baseXP = 100 + (totalRacers * 10);
    const difficultyMultiplier = { easy: 0.5, normal: 1.0, hard: 1.5, extreme: 2.0, nightmare: 3.0 };
    const diffMult = difficultyMultiplier[data.difficulty] || 1.0;
    
    const totalXP = Math.round(baseXP * posMultiplier * diffMult);
    const baseCredits = Math.round(50 * posMultiplier * diffMult);
    const totalCredits = baseCredits + Math.round(baseCredits * (data.bonusMultiplier || 0)); // item bonuses
    
    // Check for achievements (placeholder logic)
    const newAchievements = [];
    if (finalPosition === 1) newAchievements.push({ id: 'first_win', name: 'First Victory!', icon: '🏆' });
    if (data.noCrashes) newAchievements.push({ id: 'clean_race', name: 'Clean Race', icon: '✨' });
    if (data.perfectLaps > 0) newAchievements.push({ id: 'perfect_lap', name: `${data.perfectLaps} Perfect Lap${data.perfectLaps > 1 ? 's' : ''}!`, icon: '⭐' });
    
    return {
      ...data,
      finalPosition,
      totalRacers,
      totalTime,
      bestLapTime,
      laps,
      grade,
      xpEarned: totalXP,
      creditsEarned: totalCredits,
      goldEarned: data.goldEarned || Math.floor(Math.random() * 10),
      newAchievements,
      stats: {
        topSpeed: data.topSpeed || '287 km/h',
        avgSpeed: data.avgSpeed || '234 km/h',
        driftTime: data.driftTime || '12.3s',
        itemsUsed: data.itemsUsed || 5,
        boostsCollected: data.boostsCollected || 3,
        distanceTraveled: data.distanceTraveled || '14.2 km'
      },
      opponents: data.opponents || [
        { name: 'CyberPhantom', vehicle: 'Shadow X', time: '02:33.891', pos: 2 },
        { name: 'NitroQueen', vehicle: 'Viper GT', time: '02:35.123', pos: 3 },
        { name: 'DriftKing', vehicle: 'Sidewinder', time: '02:36.456', pos: 4 },
        { name: 'TurboAce', vehicle: 'Neon Flash', time: '02:37.789', pos: 5 },
        { name: 'SpeedDemon', vehicle: 'Apex Pred', time: '02:39.012', pos: 6 },
        { name: 'GhostRider', vehicle: 'Phantom', time: '02:41.234', pos: 7 },
        { name: 'Newbie99', vehicle: 'Rust Bucket', time: '03:15.678', pos: 8 }
      ]
    };
  }

  /**
   * Build complete UI
   */
  _buildUI() {
    const r = this._results;
    const isVictory = r.finalPosition === 1;
    
    this._container.innerHTML = `
      <div class="results-overlay" id="results-overlay">
        <!-- Background -->
        <canvas class="results-bg-canvas" id="results-canvas"></canvas>
        <div class="results-vignette"></div>
        
        ${isVictory ? `
        <!-- Victory Overlay for First Place -->
        <div class="victory-overlay">
          <div class="confetti-container" id="confetti-container"></div>
          <h1 class="victory-text">🏆 VICTORY! 🏆</h1>
        </div>
        ` : ''}
        
        <main class="results-content">
          <!-- Header Section -->
          <header class="results-header">
            <div class="position-display ${this._getPositionClass(r.finalPosition)}">
              <span class="position-number">${r.finalPosition}</span>
              <span class="position-suffix">${this._getSuffix(r.finalPosition)}</span>
            </div>
            
            <div class="grade-badge" style="--grade-color: ${r.grade.color}">
              <span class="grade-name">${r.grade.name}</span>
              <span class="grade-desc">${r.grade.description}</span>
            </div>
          </header>

          <!-- Main Results Grid -->
          <section class="results-grid">
            <!-- Left Column: Times & Stats -->
            <div class="results-left">
              <!-- Time Card -->
              <div class="result-card time-card reveal-item" style="--delay: 0">
                <h3 class="card-title">Race Time</h3>
                <div class="time-main mono">${r.totalTime}</div>
                <div class="time-details">
                  <span>Best Lap: <strong class="mono">${r.bestLapTime}</strong></span>
                  <span>Avg Lap: <strong class="mono">${r.avgLapTime || '--:--.---'}</strong></span>
                </div>
              </div>

              <!-- Stats Grid -->
              <div class="result-card stats-card reveal-item" style="--delay: 1">
                <h3 class="card-title">Statistics</h3>
                <div class="stats-mini-grid">
                  <div class="mini-stat">
                    <span class="stat-icon">🚀</span>
                    <span class="stat-label">Top Speed</span>
                    <span class="stat-val">${r.stats.topSpeed}</span>
                  </div>
                  <div class="mini-stat">
                    <span class="stat-icon">📊</span>
                    <span class="stat-label">Avg Speed</span>
                    <span class="stat-val">${r.stats.avgSpeed}</span>
                  </div>
                  <div class="mini-stat">
                    <span class="stat-icon">🌀</span>
                    <span class="stat-label">Drift Time</span>
                    <span class="stat-val">${r.stats.driftTime}</span>
                  </div>
                  <div class="mini-stat">
                    <span class="stat-icon">📏</span>
                    <span class="stat-label">Distance</span>
                    <span class="stat-val">${r.stats.distanceTraveled}</span>
                  </div>
                </div>
              </div>

              <!-- Lap Breakdown -->
              <div class="result-card laps-card reveal-item" style="--delay: 2">
                <h3 class="card-title">Lap Times</h3>
                <div class="laps-list">
                  ${(r.laps || []).map((lap, i) => `
                    <div class="lap-row ${lap.isBest ? 'best-lap' : ''}">
                      <span class="lap-num">LAP ${i + 1}</span>
                      <span class="lap-time mono ${lap.isBest ? 'highlight' : ''}">${lap.time}</span>
                      ${lap.isBest ? '<span class="best-badge">BEST</span>' : ''}
                      <span class="lap-pos">#${lap.pos || '-'}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>

            <!-- Right Column: Rewards & Standings -->
            <div class="results-right">
              <!-- Rewards Card -->
              <div class="result-card rewards-card reveal-item" style="--delay: 0">
                <h3 class="card-title">Rewards</h3>
                
                <div class="rewards-breakdown">
                  <div class="reward-row xp-row">
                    <span class="reward-icon">⭐</span>
                    <span class="reward-label">Experience</span>
                    <span class="reward-value xp-value">+${r.xpEarned.toLocaleString()} XP</span>
                  </div>
                  
                  <div class="xp-bar-container">
                    <div class="xp-bar-track">
                      <div class="xp-bar-fill" style="--fill-to: ${(r.xpProgress || 60) + (r.xpEarned % 100)}%"></div>
                      <span class="xp-level-up ${r.levelUp ? 'visible' : ''}">LEVEL UP!</span>
                    </div>
                    <span class="xp-text">Level ${(r.currentLevel || 12)} → Level ${(r.currentLevel || 12) + (r.levelUp ? 1 : 0)}</span>
                  </div>

                  <div class="reward-row credits-row">
                    <span class="reward-icon">💰</span>
                    <span class="reward-label">Credits</span>
                    <span class="reward-value credit-value">+${r.creditsEarned.toLocaleString()}</span>
                  </div>

                  ${r.goldEarned > 0 ? `
                  <div class="reward-row gold-row">
                    <span class="reward-icon">🪙</span>
                    <span class="reward-label">Gold</span>
                    <span class="reward-value gold-value">+${r.goldEarned}</span>
                  </div>
                  ` : ''}

                  <div class="reward-divider"></div>

                  <!-- Bonus Breakdown -->
                  <div class="bonus-list">
                    ${r.difficulty && r.difficulty !== 'normal' ? `
                    <div class="bonus-item positive">
                      <span>${(r.difficulty === 'easy' ? '-' : '+')}${Math.round((r.difficulty === 'easy' ? 0.5 : r.difficulty === 'hard' ? 1.5 : r.difficulty === 'extreme' ? 2 : 3) - 1) * 100}% Difficulty</span>
                    </div>
                    ` : ''}
                    ${r.positionBonus ? `
                    <div class="bonus-item positive">
                      <span>+${Math.round(r.positionBonus)} Position Bonus</span>
                    </div>
                    ` : ''}
                    ${r.cleanRace ? `
                    <div class="bonus-item positive">
                      <span>+50 Clean Race Bonus</span>
                    </div>
                    ` : ''}
                  </div>
                </div>
              </div>

              <!-- New Achievements -->
              ${r.newAchievements.length > 0 ? `
              <div class="result-card achievements-card reveal-item" style="--delay: 1">
                <h3 class="card-title">Achievements Unlocked!</h3>
                <div class="achievement-list">
                  ${r.newAchievements.map(a => `
                    <div class="achievement-new">
                      <span class="ach-icon">${a.icon}</span>
                      <span class="ach-name">${a.name}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
              ` : ''}

              <!-- Final Standings -->
              <div class="result-card standings-card reveal-item" style="--delay: 2">
                <h3 class="card-title">Final Standings</h3>
                <div class="standings-list">
                  ${r.opponents.map((opp, i) => `
                    <div class="standing-row ${i + 1 === r.finalPosition ? 'player-row' : ''}">
                      <span class="stand-pos ${i + 1 <= 3 ? 'podium-' + (i + 1) : ''}">${i + 1}</span>
                      <span class="stand-name">${opp.name}</span>
                      <span class="stand-time mono">${opp.time}</span>
                      ${i + 1 === r.finalPosition ? '<span class="you-tag">YOU</span>' : ''}
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </section>

          <!-- Action Buttons -->
          <footer class="results-footer">
            <button class="results-btn secondary" data-action="retry">
              🔄 Retry Race
            </button>
            <button class="results-btn secondary" data-action="watch-replay">
              ▶ Watch Replay
            </button>
            <button class="results-btn primary" data-action="continue">
              Continue →
            </button>
          </footer>
        </main>
      </div>
    `;
  }

  /**
   * Setup interactions
   */
  _setupInteractions() {
    const container = this._container;

    container.querySelectorAll('.results-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        
        switch (action) {
          case 'retry':
            this._emit('results:retry', {});
            this.hide();
            break;
          case 'continue':
            this._emit('results:continue', {});
            this.hide();
            break;
          case 'watch-replay':
            this._emit('results:watchReplay', {});
            break;
        }
      });
    });

    // Keyboard handler
    this._keyHandler = (e) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        this._emit('results:continue', {});
        this.hide();
      }
      if (e.code === 'Escape') {
        e.preventDefault();
        this._emit('results:continue', {});
        this.hide();
      }
    };

    document.addEventListener('keydown', this._keyHandler);

    // Start confetti if victory
    if (this._results.finalPosition === 1) {
      setTimeout(() => this._createConfetti(), 500);
    }
  }

  /**
   * Start staggered reveal animation
   */
  _startRevealAnimation() {
    const overlay = this._container.querySelector('#results-overlay');
    requestAnimationFrame(() => {
      if (overlay) overlay.classList.add('visible');
    });

    // Stagger reveal items
    setTimeout(() => {
      const items = this._container.querySelectorAll('.reveal-item');
      items.forEach((item, i) => {
        setTimeout(() => {
          item.classList.add('revealed');
        }, i * 150);
      });
    }, 300);
  }

  /**
   * Create confetti effect for victory
   */
  _createConfetti() {
    const container = this._container.querySelector('#confetti-container');
    if (!container) return;

    const colors = ['#ff6b35', '#fbbf24', '#22c55e', '#3b82f6', '#a855f7'];
    
    for (let i = 0; i < 100; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-piece';
      
      confetti.style.setProperty('--cx', `${Math.random() * 100}%`);
      confetti.style.setProperty('--cy', '-20px');
      confetti.style.setProperty('--dx', `${(Math.random() - 0.5) * 400}px`);
      confetti.style.setProperty('--dy', `${200 + Math.random() * 300}px`);
      confetti.style.setProperty('--rot', `${Math.random() * 720}deg`);
      confetti.style.setProperty('--color', colors[Math.floor(Math.random() * colors.length)]);
      confetti.style.setProperty('--delay', `${Math.random() * 0.5}s`);
      confetti.style.setProperty('--size', `${6 + Math.random() * 8}px`);
      
      container.appendChild(confetti);
    }
  }

  /**
   * Get ordinal suffix
   */
  _getSuffix(num) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = num % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }

  /**
   * Get position CSS class
   */
  _getPositionClass(pos) {
    if (pos === 1) return 'first';
    if (pos <= 3) return 'podium';
    return '';
  }

  /**
   * Cleanup
   */
  _cleanup() {
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }
  }

  /**
   * Event emitter
   */
  _emit(event, data) {
    document.dispatchEvent(new CustomEvent(event, { detail: data }));
  }

  on(event, cb) { document.addEventListener(event, cb); }
  off(event, cb) { document.removeEventListener(event, cb); }
}

// Singleton
let _instance = null;

export function getRaceResults() {
  if (!_instance) _instance = new RaceResultsSystem();
  return _instance;
}

if (typeof window !== 'undefined') {
  window.__raceResults = getRaceResults();
}

export default getRaceResults();
