// ui/tournament.js — Tournament and Season Progression System for Warzone Kart: Neon Underground
//
// Features:
// - Season structure with countdown and progress
// - Ranked tiers (Bronze → Champion) with divisions
// - Multiple tournament types (Daily, Weekly, Grand Prix, Special)
// - Reward tiers based on placement
// - Leaderboard integration (Tournament, Friends, Global)
// - RP (Rank Points) system with promotion/demotion
// - localStorage persistence
// CSS: loaded via ui/styles/tournament.css in index.html

/**
 * @enum {string}
 * Ranked tier levels
 */
export const RANKED_TIER = {
  BRONZE: { id: 'bronze', name: 'Bronze', icon: '🥉', color: '#cd7f32', rpRequired: 0 },
  SILVER: { id: 'silver', name: 'Silver', icon: '🥈', color: '#c0c0c0', rpRequired: 100 },
  GOLD: { id: 'gold', name: 'Gold', icon: '🥇', color: '#ffd700', rpRequired: 300 },
  PLATINUM: { id: 'platinum', name: 'Platinum', icon: '💎', color: '#e5e4e2', rpRequired: 600 },
  DIAMOND: { id: 'diamond', name: 'Diamond', icon: '💠', color: '#b9f2ff', rpRequired: 1000 },
  CHAMPION: { id: 'champion', name: 'Champion', icon: '👑', color: '#ff4d2e', rpRequired: 1500 }
};

/**
 * Division within each tier
 */
const DIVISIONS = ['III', 'II', 'I'];

/**
 * Tournament types
 */
export const TOURNAMENT_TYPE = {
  DAILY: { id: 'daily', name: 'Daily Race', icon: '🏁', color: '#3ddc84' },
  WEEKLY: { id: 'weekly', name: 'Weekly Challenge', icon: '🎯', color: '#00e5ff' },
  GRANDPRIX: { id: 'grandprix', name: 'Grand Prix', icon: '🏆', color: '#ffd23f' },
  SPECIAL: { id: 'special', name: 'Special Event', icon: '✨', color: '#aa00ff' }
};

/**
 * Default tournament state
 */
const DEFAULT_TOURNAMENT_STATE = {
  // Season info
  currentSeason: 3,
  seasonName: 'Neon Nights',
  seasonStart: new Date().toISOString(),
  seasonDuration: 30, // days
  
  // Ranked progress
  currentTier: RANKED_TIER.BRONZE.id,
  currentDivision: 1, // 0 = III, 1 = II, 2 = I
  currentRP: 0,
  lp: 0, // League Points within division
  demotionProtection: false,
  
  // Season stats
  seasonRP: 0,
  highestTier: RANKED_TIER.BRONZE.id,
  
  // Active tournaments
  activeTournaments: {},
  
  // Tournament history
  completedTournaments: [],
  
  // Rewards claimed
  claimedRewards: []
};

/**
 * Mock tournament definitions for demo mode
 */
function generateMockTournaments() {
  const now = new Date();
  
  return [
    // Daily Race
    {
      id: 'daily-' + now.toISOString().split('T')[0],
      type: TOURNAMENT_TYPE.DAILY.id,
      name: 'Daily Sprint',
      description: 'Complete 3 races to earn daily rewards',
      objective: 'Win 3 races today',
      targetValue: 3,
      currentValue: Math.floor(Math.random() * 4),
      startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(),
      endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString(),
      rewards: [
        { type: 'currency', amount: 500 },
        { type: 'xp', amount: 200 }
      ],
      isJoined: true,
      status: 'active'
    },
    
    // Weekly Challenge
    {
      id: 'weekly-week' + getWeekNumber(now),
      type: TOURNAMENT_TYPE.WEEKLY.id,
      name: 'Downtown Dominance',
      description: 'Prove your skills on Downtown Dash track',
      objective: '5 wins on Downtown Dash',
      targetValue: 5,
      currentValue: Math.floor(Math.random() * 6),
      startTime: new Date(now.getTime() - (now.getDay() * 24 * 60 * 60 * 1000)).toISOString(),
      endTime: new Date(now.getTime() + ((7 - now.getDay()) * 24 * 60 * 60 * 1000)).toISOString(),
      rewards: [
        { type: 'currency', amount: 2000 },
        { type: 'item', name: 'Boost Pack x3' },
        { type: 'cosmetic', name: 'Neon Trail' }
      ],
      isJoined: true,
      status: 'active'
    },
    
    // Grand Prix
    {
      id: 'grandprix-season' + getCurrentMonth(),
      type: TOURNAMENT_TYPE.GRANDPRIX.id,
      name: 'Neon Grand Prix Season ' + (now.getMonth() + 1),
      description: 'Multi-race event with cumulative scoring across all tracks',
      objective: 'Score 500 total points in 10 races',
      targetValue: 500,
      currentValue: Math.floor(Math.random() * 400),
      startTime: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      endTime: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
      rewards: [
        { type: 'currency', amount: 10000 },
        { type: 'vehicle', name: 'Special Kart' },
        { type: 'title', name: 'GP Champion' }
      ],
      isJoined: true,
      status: 'active'
    },
    
    // Special Event
    {
      id: 'special-newyear2025',
      type: TOURNAMENT_TYPE.SPECIAL.id,
      name: "New Year's Blast",
      description: 'Limited-time event! Complete challenges before time runs out!',
      objective: 'Complete all bonus objectives',
      targetValue: 7,
      currentValue: Math.floor(Math.random() * 8),
      startTime: new Date(now.getFullYear(), 11, 25).toISOString(),
      endTime: new Date(nextYear(now), 0, 5).toISOString(),
      rewards: [
        { type: 'currency', amount: 15000 },
        { type: 'vehicle', name: 'Firework Racer' },
        { type: 'title', name: 'Celebration King' },
        { type: 'frame', name: 'Golden Frame' }
      ],
      isJoined: Math.random() > 0.3,
      status: 'active',
      limitedTime: true
    }
  ];
}

/**
 * Generate mock leaderboard data
 */
function generateMockLeaderboard(type, count = 10) {
  const names = [
    'NeonAce99', 'SpeedDemonX', 'ShadowRacer', 'TurboKing', 'CyberBlaze',
    'VortexRacer', 'QuantumDrift', 'PixelPilot', 'GlitchRunner', 'DataStream',
    'NightHawk', 'StormChaser', 'ThunderBolt', 'FrostByte', 'ChromeHeart'
  ];
  
  return Array.from({ length: count }, (_, i) => ({
    position: i + 1,
    playerId: `player_${i}`,
    playerName: names[i % names.length] + (i >= names.length ? Math.floor(i / names.length) : ''),
    rp: Math.floor(1500 - (i * 80)) + Math.floor(Math.random() * 50),
    avatar: ['🏎️', '🚀', '👻', '⚡', '✨'][i % 5],
    isYou: i === 3 // Assume player is at position 4
  }));
}

/**
 * Get week number from date
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

/**
 * Get next year helper
 */
function nextYear(date) {
  return date.getFullYear() + 1;
}

/**
 * Get current month as string
 */
function getCurrentMonth() {
  return new Date().getMonth();
}

/**
 * Calculate LP needed for promotion to next division/tier
 */
function calculateLPForPromotion(tierId, divisionIndex) {
  // Base LP increases with tier
  const tierOrder = Object.keys(RANKED_TIER);
  const tierLevel = tierOrder.indexOf(tierId);
  const baseLP = 50 + (tierLevel * 20);
  const divisionBonus = divisionIndex * 20; // Division I needs more than II, etc.
  return baseLP + divisionBonus;
}

/**
 * Calculate RP earned based on race result
 */
function calculateRPEarned(position, isRanked) {
  if (!isRanked) return 0;
  
  const baseRP = [25, 22, 19, 16, 13, 10, 7, 5];
  return baseRP[position - 1] || 3;
}

/**
 * Format seconds to HH:MM:SS
 */
function formatCountdown(totalSeconds) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * TournamentSystem class - Main entry point for tournament UI
 */
class TournamentSystem {
  constructor() {
    /** @type {HTMLElement|null} Current container element */
    this.container = null;
    
    /** @type {Object} Tournament state */
    this.state = { ...DEFAULT_TOURNAMENT_STATE };
    
    /** @type {boolean} Whether data has been loaded */
    this.isLoaded = false;
    
    /** @type {Array} Current tournaments */
    this.tournaments = [];
    
    /** @type {string} Current leaderboard tab */
    this.currentLeaderboardTab = 'tournament';
    
    /** @type {Function|null} Callback on tournament join/leave */
    this.onTournamentAction = null;
    
    /** @type {number|null} Countdown interval handle */
    this._countdownInterval = null;

    // Bind methods
    this.render = this.render.bind(this);
    this.joinTournament = this.joinTournament.bind(this);
    this.submitRaceResult = this.submitRaceResult.bind(this);
  }

  /**
   * Initialize and render the tournament system into a container
   * @param {HTMLElement|string} container - DOM element or selector
   */
  async renderTournament(container) {
    if (typeof container === 'string') {
      this.container = document.querySelector(container);
    } else {
      this.container = container;
    }
    
    if (!this.container) {
      console.error('[TournamentSystem] Invalid container provided');
      return false;
    }

    try {
      await this._loadState();
      this.isLoaded = true;
      this.tournaments = generateMockTournaments();
      
      this._render();
      this._startCountdown();
      return true;
    } catch (error) {
      console.error('[TournamentSystem] Error loading tournament:', error);
      this._renderError(error.message);
      return false;
    }
  }

  /**
   * Load tournament state from storage
   * @private
   */
  async _loadState() {
    try {
      const stored = localStorage.getItem('wz_tournament_state');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.state = { ...DEFAULT_TOURNAMENT_STATE, ...parsed };
      }
    } catch (e) {
      console.warn('[TournamentSystem] Failed to load state:', e);
    }
  }

  /**
   * Save current tournament state
   * @private
   */
  _saveState() {
    try {
      localStorage.setItem('wz_tournament_state', JSON.stringify(this.state));
    } catch (e) {
      console.warn('[TournamentSystem] Failed to save state:', e);
    }
  }

  /**
   * Start countdown timer updates
   * @private
   */
  _startCountdown() {
    if (this._countdownInterval) {
      clearInterval(this._countdownInterval);
    }
    
    this._countdownInterval = setInterval(() => {
      if (this.isLoaded && this.container) {
        this._updateCountdownDisplays();
      }
    }, 1000);
  }

  /**
   * Update all countdown displays
   * @private
   */
  _updateCountdownDisplays() {
    const now = new Date();
    
    // Update season countdown
    const seasonEnd = new Date(this.state.seasonStart);
    seasonEnd.setDate(seasonEnd.getDate() + this.state.seasonDuration);
    const seasonRemaining = Math.max(0, Math.floor((seasonEnd - now) / 1000));
    
    const seasonDaysEl = this.container.querySelector('.season-countdown-days');
    const seasonHoursEl = this.container.querySelector('.season-countdown-hours');
    const seasonMinsEl = this.container.querySelector('.season-countdown-mins');
    
    if (seasonDaysEl) seasonDaysEl.textContent = Math.floor(seasonRemaining / 86400);
    if (seasonHoursEl) seasonHoursEl.textContent = Math.floor((seasonRemaining % 86400) / 3600);
    if (seasonMinsEl) seasonMinsEl.textContent = Math.floor((seasonRemaining % 3600) / 60);
    
    // Update tournament timers
    this.tournaments.forEach(t => {
      const end = new Date(t.endTime);
      const remaining = Math.max(0, Math.floor((end - now) / 1000));
      const timerEl = this.container.querySelector(`[data-timer="${t.id}"]`);
      if (timerEl) timerEl.textContent = formatCountdown(remaining);
    });
  }

  /**
   * Main render method
   * @private
   */
  _render() {
    this.container.innerHTML = '';
    this.container.className = 'tournament-system';
    
    const mainContainer = document.createElement('div');
    mainContainer.className = 'tournament-container';
    
    mainContainer.appendChild(this._renderSeasonBanner());
    mainContainer.appendChild(this._renderRankedSection());
    mainContainer.appendChild(this._renderTournamentsGrid());
    mainContainer.appendChild(this._renderLeaderboardSection());
    mainContainer.appendChild(this._renderRewardLadder());
    
    this.container.appendChild(mainContainer);
  }

  /**
   * Render error state
   * @param {string} message 
   * @private
   */
  _renderError(message) {
    this.container.innerHTML = `
      <div class="tournament-error" style="
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 400px;
        color: var(--text-secondary);
        font-family: var(--font-body);
        text-align: center;
        padding: var(--space-xl);
      ">
        <div>
          <div style="font-size: 48px; margin-bottom: 16px;">🏆</div>
          <h3 style="margin: 0 0 8px; color: var(--text-primary);">Failed to Load Tournaments</h3>
          <p style="margin: 0; opacity: 0.7;">${message}</p>
        </div>
      </div>
    `;
  }

  /**
   * Render season banner with countdown
   * @returns {HTMLElement}
   * @private
   */
  _renderSeasonBanner() {
    const banner = document.createElement('section');
    banner.className = 'season-banner';
    
    const now = new Date();
    const seasonEnd = new Date(this.state.seasonStart);
    seasonEnd.setDate(seasonEnd.getDate() + this.state.seasonDuration);
    const seasonTotal = this.state.seasonDuration * 24 * 60 * 60;
    const seasonElapsed = (now - new Date(this.state.seasonStart)) / 1000;
    const seasonProgress = Math.min(100, (seasonElapsed / seasonTotal) * 100);
    
    // Generate particles
    let particles = '';
    for (let i = 0; i < 12; i++) {
      particles += `<span class="season-particle" style="
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        animation-delay: ${Math.random() * 8}s;
        width: ${3 + Math.random() * 4}px;
        height: ${3 + Math.random() * 4}px;
      "></span>`;
    }
    
    banner.innerHTML = `
      <div class="season-particles">${particles}</div>
      <div class="season-content">
        <div class="season-label">Season ${this.currentSeason}</div>
        <h1 class="season-name">${this.state.seasonName}</h1>
        
        <div class="season-countdown-row">
          <div class="countdown-item">
            <span class="countdown-value season-countdown-days">${Math.max(0, Math.floor((seasonEnd - now) / 86400000))}</span>
            <span class="countdown-label">Days</span>
          </div>
          <div class="countdown-item">
            <span class="countdown-value season-countdown-hours">${Math.max(0, Math.floor(((seasonEnd - now) % 86400000) / 3600000))}</span>
            <span class="countdown-label">Hours</span>
          </div>
          <div class="countdown-item">
            <span class="countdown-value season-countdown-mins">${Math.max(0, Math.floor(((seasonEnd - now) % 3600000) / 60000))}</span>
            <span class="countdown-label">Minutes</span>
          </div>
        </div>
        
        <div class="season-progress">
          <div class="season-progress-bar">
            <div class="season-progress-fill" style="width: ${seasonProgress}%"></div>
          </div>
          <div class="season-progress-text">
            <span>Season Progress</span>
            <span>${Math.round(seasonProgress)}% complete</span>
          </div>
        </div>
      </div>
    `;
    
    return banner;
  }

  /**
   * Render ranked tier section
   * @returns {HTMLElement}
   * @private
   */
  _renderRankedSection() {
    const section = document.createElement('section');
    section.className = 'ranked-section';
    
    const tierData = RANKED_TIER[this.state.currentTier.toUpperCase()] || RANKED_TIER.BRONZE;
    const divisionName = DIVISIONS[this.state.currentDivision] || 'III';
    const lpForNext = calculateLPForPromotion(this.state.currentTier, this.state.currentDivision);
    const lpPercent = Math.min(100, (this.state.lp / lpForNext) * 100);
    
    section.innerHTML = `
      <div class="ranked-header">
        <h2 class="ranked-title">Ranked Progress</h2>
      </div>
      
      <!-- Current Tier Display -->
      <div class="current-tier-display">
        <div class="tier-badge tier-${this.state.currentTier}">
          <div class="tier-badge-inner">
            <span class="tier-icon">${tierData.icon}</span>
            <span class="tier-name">${tierData.name}</span>
            <span class="tier-division">Division ${divisionName}</span>
          </div>
        </div>
        
        <div class="rp-progress-section">
          <div class="rp-header">
            <span class="rp-label">League Points</span>
            <span class="rp-value">${this.state.lp} / ${lpForNext} LP</span>
          </div>
          <div class="rp-bar-container">
            <div class="rp-bar">
              <div class="rp-bar-fill" style="width: ${lpPercent}%"></div>
              <div class="rp-markers">
                ${Array.from({ length: 5 }, () => '<span class="rp-marker"></span>').join('')}
              </div>
            </div>
          </div>
          <div class="rp-info">
            <span>Total RP This Season: ${this.state.seasonRP.toLocaleString()}</span>
            ${this.state.demotionProtection ? `<span class="demotion-shield"><span class="demotion-shield-icon">🛡️</span> Demotion Protection Active</span>` : ''}
          </div>
        </div>
      </div>
      
      <!-- Tier Ladder -->
      <div class="tier-ladder">
        ${Object.values(RANKED_TIER).reverse().map(tier => {
          const isCurrent = tier.id === this.state.currentTier;
          const isCompleted = Object.keys(RANKED_TIER).indexOf(tier.id) < Object.keys(RANKED_TIER).indexOf(this.state.currentTier);
          
          return `
            <div class="ladder-tier ${isCurrent ? 'current' : ''} ${isCompleted ? 'completed' : ''}">
              <div class="ladder-tier-icon tier-${tier.id}">${tier.icon}</div>
              <div class="ladder-tier-info">
                <div class="ladder-tier-name">${tier.name}</div>
                <div class="ladder-tier-division">${tier.rpRequired} RP Required</div>
              </div>
              ${isCompleted || isCurrent ? '<span class="ladder-tier-check">✓</span>' : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
    
    return section;
  }

  /**
   * Render tournaments grid
   * @returns {HTMLElement}
   * @private
   */
  _renderTournamentsGrid() {
    const section = document.createElement('section');
    section.className = 'tournaments-section';
    
    const now = new Date();
    
    section.innerHTML = `
      <div class="section-header-with-action">
        <h2 class="section-title" style="font-family: var(--font-display); font-size: 24px; font-weight: 800;">Active Tournaments</h2>
      </div>
      
      <div class="tournaments-grid">
        ${this.tournaments.map(t => this._renderTournamentCard(t, now)).join('')}
      </div>
    `;
    
    return section;
  }

  /**
   * Render single tournament card
   * @param {Object} tournament 
   * @param {Date} now 
   * @returns {string}
   * @private
   */
  _renderTournamentCard(tournament, now) {
    const typeData = Object.values(TOURNAMENT_TYPE).find(t => t.id === tournament.type) || TOURNAMENT_TYPE.DAILY;
    const end = new Date(tournament.endTime);
    const remaining = Math.max(0, Math.floor((end - now) / 1000));
    const progress = Math.min(100, (tournament.currentValue / tournament.targetValue) * 100);
    const isExpired = remaining <= 0;
    
    return `
      <div class="tournament-card ${tournament.type} ${tournament.isJoined ? 'active' : ''}" data-tournament-id="${tournament.id}">
        <div class="tournament-card-header">
          <div class="tournament-type-icon">${typeData.icon}</div>
          <div class="tournament-card-info">
            <div class="tournament-type-label">${typeData.name}${tournament.limitedTime ? ' ⚡ Limited' : ''}</div>
            <div class="tournament-name">${tournament.name}</div>
            <div class="tournament-description">${tournament.description}</div>
          </div>
        </div>
        
        <div class="tournament-card-body">
          <div class="tournament-duration">
            <span class="duration-icon">⏱️</span>
            <span class="duration-time" data-timer="${tournament.id}">${formatCountdown(remaining)}</span>
            ${isExpired ? ' (Ended)' : ''}
          </div>
          
          <div class="tournament-objective">
            <span class="objective-text">${tournament.objective}</span>
            <span class="objective-progress">${tournament.currentValue}/${tournament.targetValue}</span>
          </div>
          
          <div class="tournament-rewards">
            <span class="reward-label">Rewards:</span>
            ${tournament.rewards.map(r => `
              <span class="reward-item">
                <span class="reward-icon">${
                  r.type === 'currency' ? '💰' :
                  r.type === 'xp' ? '⭐' :
                  r.type === 'item' ? '📦' :
                  r.type === 'vehicle' ? '🏎️' :
                  r.type === 'title' ? '🏷️' :
                  r.type === 'cosmetic' ? '✨' : '🎁'
                }</span>
                ${r.amount ? r.amount.toLocaleString() : r.name}
              </span>
            `).join('')}
          </div>
        </div>
        
        <div class="tournament-card-footer">
          <button 
            class="entry-btn ${isExpired ? '' : ''}"
            ${isExpired ? 'disabled' : ''}
            onclick="window.__tournamentSystem?.${tournament.isJoined ? 'leaveTournament' : 'joinTournament'}('${tournament.id}')"
          >
            ${isExpired ? 'ENDED' : tournament.isJoined ? 'ENTERED ✓' : 'ENTER'}
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render leaderboard section
   * @returns {HTMLElement}
   * @private
   */
  _renderLeaderboardSection() {
    const section = document.createElement('section');
    section.className = 'leaderboard-section';
    
    const leaderboard = generateMockLeaderboard('tournament', 15);
    
    section.innerHTML = `
      <div class="section-header-with-action">
        <h2 style="font-family: var(--font-display); font-size: 24px; font-weight: 800; margin: 0;">Leaderboard</h2>
      </div>
      
      <div class="leaderboard-tabs">
        <button class="leaderboard-tab active" onclick="window.__tournamentSystem?.switchLeaderboardTab('tournament', this)">Tournament</button>
        <button class="leaderboard-tab" onclick="window.__tournamentSystem?.switchLeaderboardTab('friends', this)">Friends</button>
        <button class="leaderboard-tab" onclick="window.__tournamentSystem?.switchLeaderboardTab('global', this)">Global</button>
      </div>
      
      <div class="leaderboard-mini-list">
        ${leaderboard.map(entry => `
          <div class="leaderboard-entry ${entry.isYou ? 'highlight' : ''}">
            <span class="lb-position pos-${entry.position <= 3 ? entry.position : ''}">${entry.position}</span>
            <span class="lb-avatar">${entry.avatar}</span>
            <div class="lb-info">
              <span class="lb-name">${entry.playerName}${entry.isYou ? ' (You)' : ''}</span>
            </div>
            <span class="lb-rp">${entry.rp.toLocaleString()} RP</span>
          </div>
        `).join('')}
      </div>
    `;
    
    return section;
  }

  /**
   * Render reward ladder
   * @returns {HTMLElement}
   * @private
   */
  _renderRewardLadder() {
    const section = document.createElement('section');
    section.className = 'reward-ladder';
    
    const rewardTiers = [
      { rank: 'Participation', rewards: [{ icon: '💰', value: '500 Credits' }], status: 'unlocked' },
      { rank: 'Top 75%', rewards: [{ icon: '💰', value: '1,000 Credits' }, { icon: '⭐', value: '100 XP' }], status: this.state.lp >= 20 ? 'unlocked' : 'current' },
      { rank: 'Top 50%', rewards: [{ icon: '💰', value: '2,500 Credits' }, { icon: '⭐', value: '250 XP' }], status: this.state.lp >= 40 ? 'unlocked' : 'locked' },
      { rank: 'Top 25%', rewards: [{ icon: '💰', value: '5,000 Credits' }, { icon: '📦', value: 'Item Pack' }], status: this.state.lp >= 60 ? 'unlocked' : 'locked' },
      { rank: 'Top 10%', rewards: [{ icon: '💰', value: '10,000 Credits' }, { icon: '✨', value: 'Cosmetic' }], status: this.state.lp >= 80 ? 'unlocked' : 'locked' },
      { rank: 'Top 3', rewards: [{ icon: '💰', value: '25,000 Credits' }, { icon: '🏆', value: 'Title' }], status: this.state.lp >= 95 ? 'unlocked' : 'locked' },
      { rank: 'Champion', rewards: [{ icon: '💰', value: '50,000 Credits' }, { icon: '👑', value: 'Champion Badge' }, { icon: '🏎️', value: 'Exclusive Vehicle' }], status: this.state.lp >= 100 ? 'unlocked' : 'locked' }
    ];
    
    section.innerHTML = `
      <div class="section-header-with-action">
        <h2 style="font-family: var(--font-display); font-size: 24px; font-weight: 800; margin: 0;">Season Rewards</h2>
      </div>
      
      <div class="reward-tier-list">
        ${rewardTiers.map((tier, index) => `
          <div class="reward-tier-item ${tier.status}">
            <span class="reward-tier-rank">${tier.rank}</span>
            <div class="reward-tier-rewards">
              ${tier.rewards.map(r => `
                <span class="reward-mini-item">
                  ${r.icon} ${r.value}
                </span>
              `).join('')}
            </div>
            <span class="reward-status-icon">
              ${tier.status === 'unlocked' ? '✅' : tier.status === 'current' ? '▶️' : '🔒'}
            </span>
          </div>
        `).join('')}
      </div>
    `;
    
    return section;
  }

  // ==================== EVENT HANDLERS ====================

  /**
   * Join a tournament
   * @param {string} tournamentId 
   */
  joinTournament(tournamentId) {
    const tournament = this.tournaments.find(t => t.id === tournamentId);
    if (!tournament) return;
    
    tournament.isJoined = true;
    this.state.activeTournaments[tournamentId] = { joinedAt: new Date().toISOString() };
    this._saveState();
    this._rerenderTournamentCard(tournamentId);
    
    if (typeof this.onTournamentAction === 'function') {
      this.onTournamentAction('join', tournament);
    }
  }

  /**
   * Leave a tournament
   * @param {string} tournamentId 
   */
  leaveTournament(tournamentId) {
    const tournament = this.tournaments.find(t => t.id === tournamentId);
    if (!tournament) return;
    
    tournament.isJoined = false;
    delete this.state.activeTournaments[tournamentId];
    this._saveState();
    this._rerenderTournamentCard(tournamentId);
    
    if (typeof this.onTournamentAction === 'function') {
      this.onTournamentAction('leave', tournament);
    }
  }

  /**
   * Submit a ranked race result
   * @param {Object} result { position, trackId, vehicleId }
   */
  submitRaceResult(result) {
    const rpEarned = calculateRPEarned(result.position, true);
    const lpGained = Math.floor(rpEarned * 1.5);
    const isWin = result.position <= 3;
    
    // Update state
    this.state.seasonRP += rpEarned;
    this.state.currentRP += rpEarned;
    
    // Handle LP changes
    const lpForNext = calculateLPForPromotion(this.state.currentTier, this.state.currentDivision);
    
    if (isWin) {
      this.state.lp += lpGained;
    } else {
      this.state.lp -= Math.floor(lpGained * 0.5);
      
      // Demotion protection at 0 LP in new tier
      if (this.state.demotionProtection && this.state.lp < 0) {
        this.state.lp = 0;
      } else if (this.state.lp < 0) {
        this.state.lp = 0;
      }
    }
    
    // Check for promotion/demotion
    let tierChanged = false;
    let promoted = false;
    
    if (this.state.lp >= lpForNext && this.state.currentDivision < 2) {
      this.state.currentDivision++;
      this.state.lp = 0;
      tierChanged = true;
      promoted = true;
    } else if (this.state.lp >= lpForNext) {
      // Promote to next tier
      const tierOrder = Object.keys(RANKED_TIER);
      const currentIndex = tierOrder.indexOf(this.state.currentTier);
      if (currentIndex < tierOrder.length - 1) {
        this.state.currentTier = tierOrder[currentIndex + 1];
        this.state.currentDivision = 0;
        this.state.lp = 0;
        this.state.demotionProtection = true;
        tierChanged = true;
        promoted = true;
        
        // Update highest tier
        const newIndex = tierOrder.indexOf(this.state.currentTier);
        const highestIndex = tierOrder.indexOf(this.state.highestTier);
        if (newIndex > highestIndex) {
          this.state.highestTier = this.state.currentTier;
        }
      }
    }
    
    this._saveState();
    
    // Re-render and show animation
    if (this.isLoaded && this.container) {
      this._render();
      
      if (tierChanged) {
        setTimeout(() => {
          const rankedSection = this.container.querySelector('.ranked-section');
          if (rankedSection) {
            rankedSection.classList.add(promoted ? 'promotion-flash' : 'demotion-flash');
            setTimeout(() => rankedSection.classList.remove('promotion-flash', 'demotion-flash'), 1500);
          }
        }, 100);
      }
    }
    
    return { rpEarned, lpChange: isWin ? lpGained : -lpGained, promoted };
  }

  /**
   * Switch leaderboard tab
   * @param {string} tab 
   * @param {HTMLElement} btnElement 
   */
  switchLeaderboardTab(tab, btnElement) {
    this.currentLeaderboardTab = tab;
    
    // Update active tab styling
    const tabs = this.container.querySelectorAll('.leaderboard-tab');
    tabs.forEach(t => t.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    
    // Regenerate leaderboard content
    const listEl = this.container.querySelector('.leaderboard-mini-list');
    if (listEl) {
      const leaderboard = generateMockLeaderboard(tab, 15);
      listEl.innerHTML = leaderboard.map(entry => `
        <div class="leaderboard-entry ${entry.isYou ? 'highlight' : ''}">
          <span class="lb-position pos-${entry.position <= 3 ? entry.position : ''}">${entry.position}</span>
          <span class="lb-avatar">${entry.avatar}</span>
          <div class="lb-info">
            <span class="lb-name">${entry.playerName}${entry.isYou ? ' (You)' : ''}</span>
          </div>
          <span class="lb-rp">${entry.rp.toLocaleString()} RP</span>
        </div>
      `).join('');
    }
  }

  /**
   * Re-render a specific tournament card
   * @param {string} tournamentId 
   * @private
   */
  _rerenderTournamentCard(tournamentId) {
    const card = this.container.querySelector(`[data-tournament-id="${tournamentId}"]`);
    const tournament = this.tournaments.find(t => t.id === tournamentId);
    
    if (card && tournament) {
      const newCard = document.createElement('div');
      newCard.innerHTML = this._renderTournamentCard(tournament, new Date());
      card.replaceWith(newCard.firstElementChild);
    }
  }

  /**
   * Claim a seasonal reward
   * @param {string} tierRank 
   */
  claimReward(tierRank) {
    if (this.state.claimedRewards.includes(tierRank)) {
      console.warn('[TournamentSystem] Reward already claimed:', tierRank);
      return false;
    }
    
    this.state.claimedRewards.push(tierRank);
    this._saveState();
    
    if (this.isLoaded && this.container) {
      this._render();
    }
    
    return true;
  }

  /**
   * Clean up and destroy instance
   */
  destroy() {
    if (this._countdownInterval) {
      clearInterval(this._countdownInterval);
    }
    
    if (this.container) {
      this.container.innerHTML = '';
      this.container.className = '';
    }
    this.container = null;
    this.isLoaded = false;
  }
}

// Export singleton instance
const tournamentSystemInstance = new TournamentSystem();

if (typeof window !== 'undefined') {
  window.__tournamentSystem = tournamentSystemInstance;
}

export default TournamentSystem;
export { tournamentSystemInstance };
