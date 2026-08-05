// ui/daily-challenges.js — Daily Challenges and Reward System for Warzone Kart: Neon Underground
//
// Features:
// - Multiple challenge types (Racing, Skill, Item, Special)
// - Daily rotation with seeded generation
// - Progress tracking per challenge
// - Reward system (Credits, XP, Item Unlocks)
// - Streak bonus for completing all challenges
// - Full UI rendering with progress bars and countdown
// - localStorage persistence
// CSS: loaded via ui/styles/challenges.css in index.html

/**
 * @enum {string}
 * Challenge type categories
 */
export const CHALLENGE_TYPE = {
  RACING: 'racing',
  SKILL: 'skill',
  ITEMS: 'items',
  SPECIAL: 'special'
};

/**
 * @enum {string}
 * Difficulty levels with associated colors
 */
export const CHALLENGE_DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
  EXTREME: 'extreme'
};

/**
 * Difficulty color mapping
 */
const DIFFICULTY_COLORS = {
  [CHALLENGE_DIFFICULTY.EASY]: '#3ddc84',
  [CHALLENGE_DIFFICULTY.MEDIUM]: '#ffb13d',
  [CHALLENGE_DIFFICULTY.HARD]: '#ff8c42',
  [CHALLENGE_DIFFICULTY.EXTREME]: '#ff3d5a'
};

/**
 * Challenge type icons
 */
const TYPE_ICONS = {
  [CHALLENGE_TYPE.RACING]: '🏁',
  [CHALLENGE_TYPE.SKILL]: '🎯',
  [CHALLENGE_TYPE.ITEMS]: '📦',
  [CHALLENGE_TYPE.SPECIAL]: '⭐'
};

/**
 * All available challenge definitions (pool for daily selection)
 */
const CHALLENGE_POOL = [
  // Racing Challenges
  {
    id: 'win_3_races',
    type: CHALLENGE_TYPE.RACING,
    title: 'Victory Lap',
    description: 'Win 3 races today to prove your dominance',
    targetValue: 3,
    reward: { credits: 500, xp: 100 },
    difficulty: CHALLENGE_DIFFICULTY.EASY,
    statKey: 'wins'
  },
  {
    id: 'podium_5_times',
    type: CHALLENGE_TYPE.RACING,
    title: 'Podium Regular',
    description: 'Finish in top 3 position 5 times',
    targetValue: 5,
    reward: { credits: 400, xp: 80 },
    difficulty: CHALLENGE_DIFFICULTY.EASY,
    statKey: 'podiumFinishes'
  },
  {
    id: 'race_all_tracks',
    type: CHALLENGE_TYPE.RACING,
    title: 'World Tour',
    description: 'Complete a race on every available track',
    targetValue: 5,
    reward: { credits: 750, xp: 150 },
    difficulty: CHALLENGE_DIFFICULTY.MEDIUM,
    statKey: 'uniqueTracks'
  },
  {
    id: 'win_without_damage',
    type: CHALLENGE_TYPE.RACING,
    title: 'Flawless Victory',
    description: 'Win a race without taking any damage',
    targetValue: 1,
    reward: { credits: 600, xp: 120 },
    difficulty: CHALLENGE_DIFFICULTY.MEDIUM,
    statKey: 'flawlessWins'
  },

  // Skill Challenges
  {
    id: 'reach_200_kmh',
    type: CHALLENGE_TYPE.SKILL,
    title: 'Speed Demon',
    description: 'Reach 200 km/h in any race',
    targetValue: 1,
    reward: { credits: 300, xp: 60 },
    difficulty: CHALLENGE_DIFFICULTY.EASY,
    statKey: 'topSpeed200'
  },
  {
    id: 'drift_30_seconds',
    type: CHALLENGE_TYPE.SKILL,
    title: 'Drift Master',
    description: 'Accumulate 30 seconds of drift time total',
    targetValue: 30,
    reward: { credits: 450, xp: 90 },
    difficulty: CHALLENGE_DIFFICULTY.MEDIUM,
    statKey: 'driftTime'
  },
  {
    id: 'perfect_lap',
    type: CHALLENGE_TYPE.SKILL,
    title: 'Perfect Lap',
    description: 'Complete a full lap without hitting any walls',
    targetValue: 1,
    reward: { credits: 500, xp: 100 },
    difficulty: CHALLENGE_DIFFICULTY.MEDIUM,
    statKey: 'perfectLaps'
  },
  {
    id: 'overtake_10_racers',
    type: CHALLENGE_TYPE.SKILL,
    title: 'Overtake King',
    description: 'Overtake 10 opponents during races',
    targetValue: 10,
    reward: { credits: 400, xp: 80 },
    difficulty: CHALLENGE_DIFFICULTY.EASY,
    statKey: 'overtakes'
  },
  {
    id: 'max_speed_250',
    type: CHALLENGE_TYPE.SKILL,
    title: 'Breaking Limits',
    description: 'Hit 250 km/h using boost pads and drafting',
    targetValue: 1,
    reward: { credits: 800, xp: 160 },
    difficulty: CHALLENGE_DIFFICULTY.HARD,
    statKey: 'topSpeed250'
  },

  // Item Challenges
  {
    id: 'use_20_items',
    type: CHALLENGE_TYPE.ITEMS,
    title: 'Item Collector',
    description: 'Use 20 items during races',
    targetValue: 20,
    reward: { credits: 350, xp: 70 },
    difficulty: CHALLENGE_DIFFICULTY.EASY,
    statKey: 'itemsUsed'
  },
  {
    id: 'missile_hits_5',
    type: CHALLENGE_TYPE.ITEMS,
    title: 'Sharpshooter',
    description: 'Hit 5 opponents with missiles',
    targetValue: 5,
    reward: { credits: 500, xp: 100 },
    difficulty: CHALLENGE_DIFFICULTY.MEDIUM,
    statKey: 'missileHits'
  },
  {
    id: 'block_10_attacks',
    type: CHALLENGE_TYPE.ITEMS,
    title: 'Untouchable',
    description: 'Block or dodge 10 incoming attacks with shields',
    targetValue: 10,
    reward: { credits: 550, xp: 110 },
    difficulty: CHALLENGE_DIFFICULTY.HARD,
    statKey: 'blocks'
  },
  {
    id: 'boost_pads_15',
    type: CHALLENGE_TYPE.ITEMS,
    title: 'Boost Addict',
    description: 'Hit 15 boost pads during races',
    targetValue: 15,
    reward: { credits: 300, xp: 60 },
    difficulty: CHALLENGE_DIFFICULTY.EASY,
    statKey: 'boostPads'
  },

  // Special Challenges
  {
    id: 'comeback_win',
    type: CHALLENGE_TYPE.SPECIAL,
    title: 'The Comeback',
    description: 'Start in last place and win the race',
    targetValue: 1,
    reward: { credits: 1000, xp: 200 },
    difficulty: CHALLENGE_DIFFICULTY.EXTREME,
    statKey: 'comebackWins'
  },
  {
    id: 'win_no_items',
    type: CHALLENGE_TYPE.SPECIAL,
    title: 'Pure Racer',
    description: 'Win a race without picking up any items',
    targetValue: 1,
    reward: { credits: 800, xp: 160 },
    difficulty: CHALLENGE_DIFFICULTY.HARD,
    statKey: 'noItemWins'
  },
  {
    id: 'night_race',
    type: CHALLENGE_TYPE.SPECIAL,
    title: 'Night Owl',
    description: 'Complete a race between midnight and 6 AM local time',
    targetValue: 1,
    reward: { credits: 600, xp: 120, itemUnlock: 'skin_nightowl' },
    difficulty: CHALLENGE_DIFFICULTY.EXTREME,
    statKey: 'nightRaces',
    isTimeGated: true
  },
  {
    id: 'win_streak_3',
    type: CHALLENGE_TYPE.SPECIAL,
    title: 'Hot Streak',
    description: 'Win 3 races in a row without losing',
    targetValue: 3,
    reward: { credits: 700, xp: 140 },
    difficulty: CHALLENGE_DIFFICULTY.HARD,
    statKey: 'winStreak'
  }
];

/**
 * @class DailyChallengeSystem
 * Manages daily challenges including generation, tracking, rewards, and UI rendering.
 */
class DailyChallengeSystem {
  constructor() {
    /** @type {Object|null} Reference to save system */
    this._saveSystem = null;

    /** @type {boolean} Initialization state flag */
    this._isInitialized = false;

    /** @type {Map} Event listeners storage */
    this._listeners = new Map();

    /** @type {Array} Current day's challenges */
    this._challenges = [];

    /** @type {Object} Challenge progress storage (persists across sessions) */
    this._progressData = {};

    /** @type {Object} Streak data */
    this._streakData = {
      currentStreak: 0,
      bestStreak: 0,
      lastCompletedDate: null
    };

    /** @type {string} Storage key prefix */
    this._storagePrefix = 'wzk_challenges';

    /** @type {number|null} Countdown timer reference */
    this._countdownTimer = null;

    /** @type {Object} Temporary session tracking for current day */
    this._sessionStats = {};

    // Initialize session stats
    this._resetSessionStats();
  }

  /**
   * Initialize the daily challenge system
   * @param {Object} options - Configuration options
   * @param {Object} [options.saveSystem] - SaveSystem instance for integration
   * @returns {Promise<DailyChallengeSystem>} This instance for chaining
   */
  async init(options = {}) {
    if (this._isInitialized) return this;

    this._saveSystem = options.saveSystem || null;

    try {
      // Load persisted data
      this._loadFromStorage();

      // Generate or validate today's challenges
      this._ensureDailyChallenges();

      // Start countdown timer
      this._startCountdown();

      this._isInitialized = true;
      console.log('[DailyChallenges] System initialized');
      
      this.emit('initialized', {
        challengesCount: this._challenges.length,
        streak: this._streakData.currentStreak
      });

      return this;
    } catch (err) {
      console.error('[DailyChallenges] Init failed:', err);
      this._isInitialized = true;
      return this;
    }
  }

  /**
   * Reset temporary session statistics
   * @private
   */
  _resetSessionStats() {
    this._sessionStats = {
      wins: 0,
      podiumFinishes: 0,
      uniqueTracks: new Set(),
      flawlessWins: 0,
      topSpeed200: 0,
      topSpeed250: 0,
      driftTime: 0,
      perfectLaps: 0,
      overtakes: 0,
      itemsUsed: 0,
      missileHits: 0,
      blocks: 0,
      boostPads: 0,
      comebackWins: 0,
      noItemWins: 0,
      nightRaces: 0,
      winStreak: 0
    };
  }

  /**
   * Get today's date string (YYYY-MM-DD format)
   * @returns {string} Date string
   * @private
   */
  _getTodayString() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Check if it's a weekend
   * @returns {boolean}
   * @private
   */
  _isWeekend() {
    const day = new Date().getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }

  /**
   * Get midnight timestamp for countdown
   * @returns {number} Milliseconds until next midnight
   * @private
   */
  _getTimeUntilReset() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime() - now.getTime();
  }

  /**
   * Create seeded random generator based on date
   * @param {string} dateString - Date string seed
   * @returns {Function} Seeded random function
   * @private
   */
  _createSeededRandom(dateString) {
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
      const char = dateString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }

    let s = Math.abs(hash);
    return () => {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  /**
   * Ensure we have valid challenges for today (generate or load)
   * @private
   */
  _ensureDailyChallenges() {
    const today = this._getTodayString();

    // Check if challenges are from today
    if (
      this._challenges.length > 0 &&
      this._progressData.date === today
    ) {
      // Challenges are current, restore progress state
      this._restoreChallengeProgress();
      return;
    }

    // Need to generate new challenges
    this._generateDailyChallenges(today);
  }

  /**
   * Generate challenges for a specific day
   * @param {string} dateStr - Date string
   * @private
   */
  _generateDailyChallenges(dateStr) {
    const seededRandom = this._createSeededRandom(dateStr);
    const isWeekend = this._isWeekend();

    // Filter pool by availability
    let pool = [...CHALLENGE_POOL];

    // Handle time-gated challenges
    const hour = new Date().getHours();
    const isNightTime = hour >= 0 && hour < 6;
    
    // Select challenges by difficulty distribution:
    // - 1 easy, 1 medium, 1 hard (always)
    // - +1 extreme on weekends
    const selectedIds = [];
    const difficulties = [
      CHALLENGE_DIFFICULTY.EASY,
      CHALLENGE_DIFFICULTY.MEDIUM,
      CHALLENGE_DIFFICULTY.HARD
    ];

    if (isWeekend) {
      difficulties.push(CHALLENGE_DIFFICULTY.EXTREME);
    }

    // Pick one challenge of each required difficulty
    difficulties.forEach(difficulty => {
      const candidates = pool.filter(
        c => c.difficulty === difficulty && !selectedIds.includes(c.id)
      );

      if (candidates.length > 0) {
        const idx = Math.floor(seededRandom() * candidates.length);
        selectedIds.push(candidates[idx].id);
      }
    });

    // Build challenge objects
    this._challenges = selectedIds.map(id => {
      const template = CHALLENGE_POOL.find(c => c.id === id);
      if (!template) return null;

      return {
        ...template,
        currentValue: 0,
        completed: false,
        claimed: false,
        expiresAt: this._getEndOfDay()
      };
    }).filter(Boolean);

    // Reset streak if missed yesterday
    if (this._streakData.lastCompletedDate) {
      const lastCompleted = new Date(this._streakData.lastCompletedDate);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(23, 59, 59, 999);

      if (lastCompleted < yesterday) {
        this._streakData.currentStreak = 0;
      }
    }

    // Save progress structure
    this._progressData = {
      date: dateStr,
      challenges: {}
    };

    this._challenges.forEach(challenge => {
      this._progressData.challenges[challenge.id] = {
        currentValue: 0,
        completed: false,
        claimed: false
      };
    });

    // Reset session stats
    this._resetSessionStats();

    this._saveToStorage();
    this.emit('challengesGenerated', { 
      count: this._challenges.length, 
      isWeekend,
      date: dateStr 
    });
  }

  /**
   * Restore saved progress to challenge objects
   * @private
   */
  _restoreChallengeProgress() {
    this._challenges.forEach(challenge => {
      const saved = this._progressData.challenges?.[challenge.id];
      if (saved) {
        challenge.currentValue = saved.currentValue || 0;
        challenge.completed = saved.completed || false;
        challenge.claimed = saved.claimed || false;
      }
    });
  }

  /**
   * Get end of day timestamp
   * @returns {string} ISO string of end of day
   * @private
   */
  _getEndOfDay() {
    const eod = new Date();
    eod.setHours(23, 59, 59, 999);
    return eod.toISOString();
  }

  /**
   * Start countdown timer to reset
   * @private
   */
  _startCountdown() {
    if (this._countdownTimer) {
      clearInterval(this._countdownTimer);
    }

    this._countdownTimer = setInterval(() => {
      this.emit('tick', { timeUntilReset: this._getTimeUntilReset() });
    }, 1000);
  }

  /**
   * Load persisted data from localStorage
   * @private
   */
  _loadFromStorage() {
    try {
      const progressRaw = localStorage.getItem(`${this._storagePrefix}_progress`);
      if (progressRaw) {
        this._progressData = JSON.parse(progressRaw);
      }

      const streakRaw = localStorage.getItem(`${this._storagePrefix}_streak`);
      if (streakRaw) {
        this._streakData = JSON.parse(streakRaw);
      }

      const sessionRaw = localStorage.getItem(`${this._storagePrefix}_session`);
      if (sessionRaw) {
        const session = JSON.parse(sessionRaw);
        if (session.date === this._getTodayString()) {
          this._sessionStats = {
            ...this._sessionStats,
            ...session.stats,
            uniqueTracks: new Set(session.stats.uniqueTracks || [])
          };
        }
      }
    } catch (err) {
      console.warn('[DailyChallenges] Failed to load:', err.message);
    }
  }

  /**
   * Save current data to localStorage
   * @private
   */
  _saveToStorage() {
    try {
      localStorage.setItem(`${this._storagePrefix}_progress`, JSON.stringify(this._progressData));
      localStorage.setItem(`${this._storagePrefix}_streak`, JSON.stringify(this._streakData));

      // Save session stats (resets daily anyway, but useful for same-session refreshes)
      const sessionData = {
        date: this._getTodayString(),
        stats: {
          ...this._sessionStats,
          uniqueTracks: Array.from(this._sessionStats.uniqueTracks || [])
        }
      };
      localStorage.setItem(`${this._storagePrefix}_session`, JSON.stringify(sessionData));
    } catch (err) {
      console.error('[DailyChallenges] Failed to save:', err.message);
    }
  }

  // ==================== PROGRESS TRACKING ====================

  /**
   * Update challenge progress based on an event
   * @param {string} statKey - Stat key to update
   * @param {number} value - Value to add
   * @param {Object} [metadata] - Additional context
   */
  updateProgress(statKey, value = 1, metadata = {}) {
    // Update session stats
    if (statKey === 'uniqueTracks' && metadata.trackId) {
      this._sessionStats.uniqueTracks.add(metadata.trackId);
      value = this._sessionStats.uniqueTracks.size;
    } else if (typeof this._sessionStats[statKey] === 'number') {
      this._sessionStats[statKey] += value;
    } else {
      this._sessionStats[statKey] = value;
    }

    // Find matching challenges and update
    let newlyCompleted = [];

    this._challenges.forEach(challenge => {
      if (challenge.completed || challenge.statKey !== statKey) return;

      // Calculate current value
      let currentValue = 0;
      if (statKey === 'uniqueTracks') {
        currentValue = this._sessionStats.uniqueTracks.size;
      } else {
        currentValue = this._sessionStats[statKey] || 0;
      }

      challenge.currentValue = Math.min(currentValue, challenge.targetValue);

      // Update progress data
      if (this._progressData.challenges[challenge.id]) {
        this._progressData.challenges[challenge.id].currentValue = challenge.currentValue;
      }

      // Check completion
      if (challenge.currentValue >= challenge.targetValue && !challenge.completed) {
        challenge.completed = true;
        if (this._progressData.challenges[challenge.id]) {
          this._progressData.challenges[challenge.id].completed = true;
        }
        newlyCompleted.push(challenge);

        this.emit('challengeCompleted', { challenge });
      }
    });

    this._saveToStorage();

    // Emit progress update event
    this.emit('progressUpdated', {
      statKey,
      value,
      challenges: this._challenges
    });

    // Check for all-complete bonus
    if (newlyCompleted.length > 0) {
      this._checkAllComplete();
    }

    return newlyCompleted;
  }

  /**
   * Check if player can complete a time-gated challenge now
   * @param {string} challengeId - Challenge ID to check
   * @returns {boolean} Whether the challenge is completable
   */
  canCompleteChallenge(challengeId) {
    const challenge = this._challenges.find(c => c.id === challengeId);
    if (!challenge) return false;

    if (!challenge.isTimeGated) return true;

    const hour = new Date().getHours();
    return hour >= 0 && hour < 6;
  }

  /**
   * Claim rewards for a completed challenge
   * @param {string} challengeId - ID of completed challenge
   * @returns {Object|null} Reward info or null if unable to claim
   */
  claimReward(challengeId) {
    const challenge = this._challenges.find(c => c.id === challengeId);
    
    if (!challenge || !challenge.completed || challenge.claimed) {
      console.warn('[DailyChallenges] Cannot claim reward for:', challengeId);
      return null;
    }

    // Mark as claimed
    challenge.claimed = true;
    if (this._progressData.challenges[challengeId]) {
      this._progressData.challenges[challengeId].claimed = true;
    }

    // Award through save system if available
    if (this._saveSystem && challenge.reward) {
      if (challenge.reward.credits) {
        this._saveSystem.addCurrency('credits', challenge.reward.credits, 'daily_challenge');
      }
      if (challenge.reward.xp) {
        this._saveSystem.addXP(challenge.reward.xp, 'daily_challenge');
      }
    }

    this._saveToStorage();
    this.emit('rewardClaimed', { challenge, reward: challenge.reward });

    return {
      challenge,
      reward: challenge.reward
    };
  }

  /**
   * Check if all challenges are complete and award streak bonus
   * @private
   */
  _checkAllComplete() {
    const allCompleted = this._challenges.every(c => c.completed);
    const allClaimed = this._challenges.every(c => c.claimed);

    if (allCompleted && !allClaimed) {
      this.emit('allChallengesCompleted', { 
        streak: this._streakData.currentStreak + 1 
      });
    }

    if (allClaimed) {
      // Update streak
      this._streakData.currentStreak += 1;
      this._streakData.lastCompletedDate = new Date().toISOString();
      
      if (this._streakData.currentStreak > this._streakData.bestStreak) {
        this._streakData.bestStreak = this._streakData.currentStreak;
      }

      this._saveToStorage();
      this.emit('streakUpdated', this._streakData);
    }
  }

  /**
   * Get current streak information
   * @returns {Object} Streak data
   */
  getStreak() {
    return { ...this._streakData };
  }

  /**
   * Get current day's challenges
   * @param {boolean} includeProgress - Include current progress values
   * @returns {Array} Challenge array
   */
  getChallenges(includeProgress = true) {
    if (!includeProgress) {
      return this._challenges.map(c => ({
        ...c,
        currentValue: 0,
        completed: false,
        claimed: false
      }));
    }
    return [...this._challenges];
  }

  /**
   * Get summary stats for UI display
   * @returns {Object} Summary object
   */
  getSummary() {
    const total = this._challenges.length;
    const completed = this._challenges.filter(c => c.completed).length;
    const claimed = this._challenges.filter(c => c.claimed).length;
    const pending = total - completed;

    return {
      total,
      completed,
      claimed,
      pending,
      completionPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
      streak: this._streakData.currentStreak,
      bestStreak: this._streakData.bestStreak,
      timeUntilReset: this._getTimeUntilReset(),
      isWeekend: this._isWeekend(),
      hasExtreme: this._challenges.some(c => c.difficulty === CHALLENGE_DIFFICULTY.EXTREME)
    };
  }

  // ==================== EVENT HANDLERS FOR INTEGRATION ====================

  /**
   * Process race result and update relevant challenges
   * Called automatically when integrated with main game events
   * @param {Object} result - Race result data
   */
  onRaceResult(result) {
    if (!result) return;

    // Win tracking
    if (result.position === 1) {
      this.updateProgress('wins', 1);
      this._sessionStats.winStreak = (this._sessionStats.winStreak || 0) + 1;
    } else {
      this._sessionStats.winStreak = 0;
    }

    // Podium finishes (top 3)
    if (result.position && result.position <= 3) {
      this.updateProgress('podiumFinishes', 1);
    }

    // Unique tracks
    if (result.trackId) {
      this.updateProgress('uniqueTracks', 1, { trackId: result.trackId });
    }

    // Items used
    if (result.itemsUsed) {
      this.updateProgress('itemsUsed', result.itemsUsed);
    }

    // Flawless win check
    if (result.position === 1 && result.perfectRace) {
      this.updateProgress('flawlessWins', 1);
    }

    // No-item win check
    if (result.position === 1 && result.itemsUsed === 0) {
      this.updateProgress('noItemWins', 1);
    }

    // Night race check
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 6) {
      this.updateProgress('nightRaces', 1);
    }

    // Win streak check
    if (result.position === 1) {
      this.updateProgress('winStreak', this._sessionStats.winStreak);
    }
  }

  /**
   * Process speed change event
   * @param {number} speedKmh - Speed in km/h
   */
  onSpeedChange(speedKmh) {
    if (speedKmh >= 250) {
      this.updateProgress('topSpeed250', 1);
    }
    if (speedKmh >= 200) {
      this.updateProgress('topSpeed200', 1);
    }
  }

  /**
   * Process drift time accumulation
   * @param {number} seconds - Drift duration in seconds
   */
  onDrift(seconds) {
    this.updateProgress('driftTime', seconds);
  }

  /**
   * Process overtake event
   */
  onOvertake() {
    this.updateProgress('overtakes', 1);
  }

  /**
   * Process item usage event
   * @param {string} itemType - Type of item used
   */
  onItemUse(itemType) {
    if (itemType === 'missile') {
      // Will be updated on hit confirmation
    }
    this.updateProgress('itemsUsed', 1);
  }

  /**
   * Process missile hit event
   */
  onMissileHit() {
    this.updateProgress('missileHits', 1);
  }

  /**
   * Process shield block event
   */
  onShieldBlock() {
    this.updateProgress('blocks', 1);
  }

  /**
   * Process boost pad hit event
   */
  onBoostPadHit() {
    this.updateProgress('boostPads', 1);
  }

  /**
   * Process perfect lap event
   */
  onPerfectLap() {
    this.updateProgress('perfectLaps', 1);
  }

  // ==================== UI RENDERING ====================

  /**
   * Render full daily challenges panel into container
   * @param {HTMLElement|string} container - DOM element or selector
   * @param {Object} [options] - Render options
   * @returns {HTMLElement} The rendered element
   */
  render(container, options = {}) {
    const el = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    if (!el) {
      console.error('[DailyChallenges] Invalid container');
      return null;
    }

    const summary = this.getSummary();
    const animate = options.animate !== false;

    const html = `
      <div class="dc-container ${animate ? 'dc-animate-in' : ''}">
        ${this._renderHeader(summary)}
        ${this._renderResetNotification(summary)}
        ${this._renderStreakBanner()}
        <div class="dc-challenges-list">
          ${this._challenges.map((challenge, idx) =>
            this._renderChallengeCard(challenge, idx)
          ).join('')}
        </div>
        ${this._renderFooter(summary)}
      </div>
    `;

    el.innerHTML = html;

    // Attach event handlers
    this._attachCardHandlers(el);

    return el;
  }

  /**
   * Render header section
   * @param {Object} summary - Summary data
   * @returns {string} HTML string
   * @private
   */
  _renderHeader(summary) {
    return `
      <div class="dc-header">
        <h2 class="dc-title">Daily Challenges</h2>
        <div class="dc-header-meta">
          <span class="dc-progress-text">
            ${summary.completed}/${summary.total} Complete
          </span>
          <div class="dc-countdown" data-countdown>
            Resets in: <span class="dc-countdown-time">--:--:--</span>
          </div>
        </div>
        <div class="dc-progress-bar-wrapper">
          <div class="dc-progress-bar">
            <div class="dc-progress-fill" style="--fill-percent: ${summary.completionPercent}%"></div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render reset notification banner (if needed)
   * @param {Object} summary - Summary data
   * @returns {string} HTML string
   * @private
   */
  _renderResetNotification(summary) {
    // Show notification if challenges just reset (less than 5 minutes ago)
    // This would require tracking when they were generated
    return '';
  }

  /**
   * Render streak bonus indicator
   * @returns {string} HTML string
   * @private
   */
  _renderStreakBanner() {
    const streak = this._streakData.currentStreak;
    if (streak === 0) return '';

    const fireEmojis = Math.min(streak, 5);
    const fires = '🔥'.repeat(fireEmojis);

    return `
      <div class="dc-streak-banner">
        <span class="dc-streak-fire">${fires}</span>
        <span class="dc-streak-text">${streak} Day Streak!</span>
        <span class="dc-streak-best">Best: ${this._streakData.bestStreak}</span>
      </div>
    `;
  }

  /**
   * Render a single challenge card
   * @param {Object} challenge - Challenge data
   * @param {number} index - Card index for animation
   * @returns {string} HTML string
   * @private
   */
  _renderChallengeCard(challenge, index) {
    const percent = Math.min(100, (challenge.currentValue / challenge.targetValue) * 100);
    const isCompleted = challenge.completed;
    const isClaimed = challenge.claimed;
    const difficultyColor = DIFFICULTY_COLORS[challenge.difficulty] || '#888';
    const typeIcon = TYPE_ICONS[challenge.type] || '❓';
    const canComplete = this.canCompleteChallenge(challenge.id);

    return `
      <div class="dc-card ${isCompleted ? 'dc-card-completed' : ''} ${isClaimed ? 'dc-card-claimed' : ''}"
           style="--card-delay: ${index * 80}ms; --difficulty-color: ${difficultyColor};"
           data-challenge-id="${challenge.id}">
        
        <div class="dc-card-header">
          <div class="dc-card-type-icon">${typeIcon}</div>
          <div class="dc-card-info">
            <h4 class="dc-card-title">${challenge.title}</h4>
            <p class="dc-card-desc">${challenge.description}</p>
          </div>
          <div class="dc-card-difficulty dc-diff-${challenge.difficulty}">
            ${challenge.difficulty.toUpperCase()}
          </div>
        </div>

        <div class="dc-card-progress">
          <div class="dc-progress-ring-container">
            <svg class="dc-progress-ring" viewBox="0 0 44 44">
              <circle class="dc-progress-ring-bg" cx="22" cy="22" r="19"></circle>
              <circle class="dc-progress-ring-fill" cx="22" cy="22" r="19"
                      style="--ring-percent: ${percent}%; --ring-color: ${difficultyColor}">
              </circle>
            </svg>
            <span class="dc-progress-ring-text">${Math.round(percent)}%</span>
          </div>

          <div class="dc-progress-details">
            <span class="dc-current-value">${challenge.currentValue}</span>
            <span class="dc-separator">/</span>
            <span class="dc-target-value">${challenge.targetValue}</span>
          </div>
        </div>

        <div class="dc-card-rewards">
          <div class="dc-reward-items">
            ${challenge.reward.credits ? `
              <span class="dc-reward dc-reward-credits">
                💰 ${challenge.reward.credits.toLocaleString()}
              </span>
            ` : ''}
            ${challenge.reward.xp ? `
              <span class="dc-reward dc-reward-xp">
                ⭐ ${challenge.reward.xp} XP
              </span>
            ` : ''}
            ${challenge.reward.itemUnlock ? `
              <span class="dc-reward dc-reward-special">
                🎁 Unlock!
              </span>
            ` : ''}
          </div>
          
          ${isCompleted && !isClaimed ? `
            <button class="dc-btn-claim" data-claim-id="${challenge.id}">
              Claim Rewards
            </button>
          ` : ''}
          
          ${isClaimed ? `
            <div class="dc-claimed-badge">
              <span class="dc-checkmark">✓</span> Claimed
            </div>
          ` : ''}
          
          ${!isCompleted && challenge.isTimeGated && !canComplete ? `
            <div class="dc-time-gated">
              🌙 Available Midnight-6AM
            </div>
          ` : ''}
        </div>

        ${isCompleted && !isClaimed ? `
          <div class="dc-celebration-frame"></div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render footer section
   * @param {Object} summary - Summary data
   * @returns {string} HTML string
   * @private
   */
  _renderFooter(summary) {
    return `
      <div class="dc-footer">
        <div class="dc-summary-stats">
          <div class="dc-stat">
            <span class="dc-stat-value">${summary.pending}</span>
            <span class="dc-stat-label">Remaining</span>
          </div>
          <div class="dc-stat">
            <span class="dc-stat-value">${summary.streak}</span>
            <span class="dc-stat-label">Day Streak</span>
          </div>
          <div class="dc-stat">
            <span class="dc-stat-value">${summary.hasExtreme ? 'Yes' : 'No'}</span>
            <span class="dc-stat-label">Extreme?</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Attach click handlers to cards
   * @param {HTMLElement} el - Container element
   * @private
   */
  _attachCardHandlers(el) {
    // Claim buttons
    el.querySelectorAll('.dc-btn-claim').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const challengeId = e.currentTarget.dataset.claimId;
        const result = this.claimReward(challengeId);
        
        if (result) {
          this.emit('rewardClaimedUI', result);
          // Re-render to show claimed state
          this.render(el, { animate: false });
        }
      });
    });

    // Start countdown timer
    this._updateCountdown(el);
    if (this._countdownInterval) {
      clearInterval(this._countdownInterval);
    }
    this._countdownInterval = setInterval(() => this._updateCountdown(el), 1000);
  }

  /**
   * Update countdown display
   * @param {HTMLElement} el - Container element
   * @private
   */
  _updateCountdown(el) {
    const timeEl = el?.querySelector('.dc-countdown-time');
    if (!timeEl) return;

    const remaining = this._getTimeUntilReset();
    const hours = Math.floor(remaining / 3600000);
    const mins = Math.floor((remaining % 3600000) / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);

    timeEl.textContent = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  // ==================== EVENT SYSTEM ====================

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Handler function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - Handler function
   */
  off(event, callback) {
    if (!this._listeners.has(event)) return;
    const callbacks = this._listeners.get(event);
    const idx = callbacks.indexOf(callback);
    if (idx > -1) callbacks.splice(idx, 1);
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {*} data - Event payload
   */
  emit(event, data) {
    if (!this._listeners.has(event)) return;
    this._listeners.get(event).forEach(cb => {
      try { cb(data); } catch (err) {
        console.error(`[DailyChallenges] Event error (${event}):`, err);
      }
    });
  }

  /**
   * Check if initialized
   * @returns {boolean}
   */
  get isInitialized() {
    return this._isInitialized;
  }

  /**
   * Clean up timers and resources
   */
  destroy() {
    if (this._countdownTimer) clearInterval(this._countdownTimer);
    if (this._countdownInterval) clearInterval(this._countdownInterval);
    this._listeners.clear();
  }
}

// Singleton instance export
const dailyChallengeSystem = new DailyChallengeSystem();

export { DailyChallengeSystem, dailyChallengeSystem, CHALLENGE_TYPE, CHALLENGE_DIFFICULTY };
export default dailyChallengeSystem;
