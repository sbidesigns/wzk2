// ui/achievements.js — Comprehensive Achievements/Trophy System for Warzone Kart: Neon Underground
// 
// Features:
// - 30+ achievements across 7 categories (Racing, Drift, Items, Collection, Challenge, Distance, Special)
// - Progress tracking with partial completion support
// - Rarity system: Common → Uncommon → Rare → Epic → Legendary
// - Animated popup notifications on unlock
// - Full UI panel with filtering, searching, and sorting
// - Auto-save to localStorage with save-system integration
// - Event-based unlocking via engine.bus (EventBus)
// - Sound integration with audio-effects.js
// CSS: loaded via ui/styles/achievements.css in index.html

/**
 * Achievement rarity levels with associated colors and weights
 * @enum {string}
 */
export const ACHIEVEMENT_RARITY = {
  COMMON: 'common',      // Grey - 60% of achievements
  UNCOMMON: 'uncommon',  // Green - 25% of achievements  
  RARE: 'rare',          // Blue - 10% of achievements
  EPIC: 'epic',          // Purple - 4% of achievements
  LEGENDARY: 'legendary' // Gold - 1% of achievements
};

/**
 * Color mapping for rarity levels (CSS-compatible)
 */
export const RARITY_COLORS = {
  [ACHIEVEMENT_RARITY.COMMON]: '#8a8a8a',
  [ACHIEVEMENT_RARITY.UNCOMMON]: '#00ffa8',
  [ACHIEVEMENT_RARITY.RARE]: '#00e5ff',
  [ACHIEVEMENT_RARITY.EPIC]: '#aa00ff',
  [ACHIEVEMENT_RARITY.LEGENDARY]: '#ffd23f'
};

/**
 * Achievement categories for organization and filtering
 */
export const ACHIEVEMENT_CATEGORY = {
  RACING: 'racing',
  DRIFT: 'drift',
  ITEMS: 'items',
  COLLECTION: 'collection',
  CHALLENGE: 'challenge',
  DISTANCE: 'distance',
  SPECIAL: 'special'
};

/**
 * Category display names and icons
 */
export const CATEGORY_INFO = {
  [ACHIEVEMENT_CATEGORY.RACING]: { name: 'Racing', icon: '🏁' },
  [ACHIEVEMENT_CATEGORY.DRIFT]: { name: 'Drifting', icon: '🌀' },
  [ACHIEVEMENT_CATEGORY.ITEMS]: { name: 'Items', icon: '📦' },
  [ACHIEVEMENT_CATEGORY.COLLECTION]: { name: 'Collection', icon: '🎨' },
  [ACHIEVEMENT_CATEGORY.CHALLENGE]: { name: 'Challenge', icon: '⚡' },
  [ACHIEVEMENT_CATEGORY.DISTANCE]: { name: 'Distance', icon: '🛣️' },
  [ACHIEVEMENT_CATEGORY.SPECIAL]: { name: 'Special', icon: '⭐' }
};

/**
 * Complete achievement definitions for Warzone Kart
 * Each achievement includes: id, name, description, category, rarity, target (for progress), hidden flag
 */
const ACHIEVEMENT_DEFINITIONS = [
  // ==================== RACING ACHIEVEMENTS ====================
  {
    id: 'first_race',
    name: 'First Race',
    description: 'Complete your first race',
    category: ACHIEVEMENT_CATEGORY.RACING,
    rarity: ACHIEVEMENT_RARITY.COMMON,
    target: 1,
    hidden: false,
    icon: '🏁'
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Reach 200 km/h in any race',
    category: ACHIEVEMENT_CATEGORY.RACING,
    rarity: ACHIEVEMENT_RARITY.UNCOMMON,
    target: 200, // speed in km/h
    hidden: false,
    icon: '💨'
  },
  {
    id: 'perfect_lap',
    name: 'Perfect Lap',
    description: 'Complete a lap without hitting any walls',
    category: ACHIEVEMENT_CATEGORY.RACING,
    rarity: ACHIEVEMENT_RARITY.RARE,
    target: 1,
    hidden: false,
    icon: '✨'
  },
  {
    id: 'hat_trick',
    name: 'Hat Trick',
    description: 'Win 3 races in a row',
    category: ACHIEVEMENT_CATEGORY.RACING,
    rarity: ACHIEVEMENT_RARITY.RARE,
    target: 3,
    hidden: false,
    icon: '🎩'
  },
  {
    id: 'unstoppable',
    name: 'Unstoppable',
    description: 'Win 10 races total',
    category: ACHIEVEMENT_CATEGORY.RACING,
    rarity: ACHIEVEMENT_RARITY.EPIC,
    target: 10,
    hidden: false,
    icon: '🔥'
  },
  {
    id: 'last_to_first',
    name: 'Last To First',
    description: 'Come from last place to win a race',
    category: ACHIEVEMENT_CATEGORY.RACING,
    rarity: ACHIEVEMENT_RARITY.EPIC,
    target: 1,
    hidden: false,
    icon: '👑'
  },

  // ==================== DRIFT ACHIEVEMENTS ====================
  {
    id: 'drift_king',
    name: 'Drift King',
    description: 'Drift for 10 seconds total in one race',
    category: ACHIEVEMENT_CATEGORY.DRIFT,
    rarity: ACHIEVEMENT_RARITY.UNCOMMON,
    target: 10, // seconds
    hidden: false,
    icon: '🌀'
  },
  {
    id: 'around_the_bend',
    name: 'Around The Bend',
    description: 'Drift through 5 corners perfectly',
    category: ACHIEVEMENT_CATEGORY.DRIFT,
    rarity: ACHIEVEMENT_RARITY.RARE,
    target: 5,
    hidden: false,
    icon: '↪️'
  },
  {
    id: 'close_call',
    name: 'Close Call',
    description: 'Drift within 0.5s of a collision',
    category: ACHIEVEMENT_CATEGORY.DRIFT,
    rarity: ACHIEVEMENT_RARITY.UNCOMMON,
    target: 1,
    hidden: false,
    icon: '⚡'
  },
  {
    id: 'drift_master',
    name: 'Drift Master',
    description: 'Accumulate 5 minutes of total drift time',
    category: ACHIEVEMENT_CATEGORY.DRIFT,
    rarity: ACHIEVEMENT_RARITY.EPIC,
    target: 300, // seconds (5 minutes)
    hidden: false,
    icon: '🏆'
  },

  // ==================== ITEM ACHIEVEMENTS ====================
  {
    id: 'item_master',
    name: 'Item Master',
    description: 'Use 50 items total',
    category: ACHIEVEMENT_CATEGORY.ITEMS,
    rarity: ACHIEVEMENT_RARITY.UNCOMMON,
    target: 50,
    hidden: false,
    icon: '📦'
  },
  {
    id: 'shield_bearer',
    name: 'Shield Bearer',
    description: 'Block 10 attacks with shield',
    category: ACHIEVEMENT_CATEGORY.ITEMS,
    rarity: ACHIEVEMENT_RARITY.RARE,
    target: 10,
    hidden: false,
    icon: '🛡️'
  },
  {
    id: 'missile_madness',
    name: 'Missile Madness',
    description: 'Hit 5 opponents with missiles',
    category: ACHIEVEMENT_CATEGORY.ITEMS,
    rarity: ACHIEVEMENT_RARITY.RARE,
    target: 5,
    hidden: false,
    icon: '🚀'
  },
  {
    id: 'boost_junkie',
    name: 'Boost Junkie',
    description: 'Use 25 boost pads or boost items',
    category: ACHIEVEMENT_CATEGORY.ITEMS,
    rarity: ACHIEVEMENT_RARITY.UNCOMMON,
    target: 25,
    hidden: false,
    icon: '🚀'
  },
  {
    id: 'mine_sweeper',
    name: 'Mine Sweeper',
    description: 'Land 10 mine hits on opponents',
    category: ACHIEVEMENT_CATEGORY.ITEMS,
    rarity: ACHIEVEMENT_RARITY.EPIC,
    target: 10,
    hidden: false,
    icon: '💣'
  },

  // ==================== COLLECTION ACHIEVEMENTS ====================
  {
    id: 'collector',
    name: 'Collector',
    description: 'Own 5 different vehicles',
    category: ACHIEVEMENT_CATEGORY.COLLECTION,
    rarity: ACHIEVEMENT_RARITY.UNCOMMON,
    target: 5,
    hidden: false,
    icon: '🚗'
  },
  {
    id: 'fashionista',
    name: 'Fashionista',
    description: 'Unlock 10 character skins',
    category: ACHIEVEMENT_CATEGORY.COLLECTION,
    rarity: ACHIEVEMENT_RARITY.RARE,
    target: 10,
    hidden: false,
    icon: '👗'
  },
  {
    id: 'explorer',
    name: 'Explorer',
    description: 'Race on every track at least once',
    category: ACHIEVEMENT_CATEGORY.COLLECTION,
    rarity: ACHIEVEMENT_RARITY.EPIC,
    target: 0, // Dynamic based on track count
    hidden: false,
    icon: '🗺️'
  },

  // ==================== CHALLENGE ACHIEVEMENTS ====================
  {
    id: 'time_attack',
    name: 'Time Attack',
    description: "Beat a track's target time",
    category: ACHIEVEMENT_CATEGORY.CHALLENGE,
    rarity: ACHIEVEMENT_RARITY.RARE,
    target: 1,
    hidden: false,
    icon: '⏱️'
  },
  {
    id: 'hardcore',
    name: 'Hardcore',
    description: 'Win a race on hard difficulty',
    category: ACHIEVEMENT_CATEGORY.CHALLENGE,
    rarity: ACHIEVEMENT_RARITY.EPIC,
    target: 1,
    hidden: false,
    icon: '💀'
  },
  {
    id: 'no_items',
    name: 'Pacifist',
    description: 'Win a race without using any items',
    category: ACHIEVEMENT_CATEGORY.CHALLENGE,
    rarity: ACHIEVEMENT_RARITY.EPIC,
    target: 1,
    hidden: false,
    icon: '🕊️'
  },
  {
    id: 'from_behind',
    name: 'Comeback Kid',
    description: 'Overtake 5 opponents in one lap',
    category: ACHIEVEMENT_CATEGORY.CHALLENGE,
    rarity: ACHIEVEMENT_RARITY.RARE,
    target: 5,
    hidden: false,
    icon: '📈'
  },

  // ==================== DISTANCE/TIME ACHIEVEMENTS ====================
  {
    id: 'marathon_racer',
    name: 'Marathon Racer',
    description: 'Travel 100km total distance',
    category: ACHIEVEMENT_CATEGORY.DISTANCE,
    rarity: ACHIEVEMENT_RARITY.UNCOMMON,
    target: 100000, // meters
    hidden: false,
    icon: '🛣️'
  },
  {
    id: 'veteran',
    name: 'Veteran',
    description: 'Play for 10 hours total',
    category: ACHIEVEMENT_CATEGORY.DISTANCE,
    rarity: ACHIEVEMENT_RARITY.EPIC,
    target: 36000, // seconds (10 hours)
    hidden: false,
    icon: '⏰'
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Play a race between midnight and 6am (local time)',
    category: ACHIEVEMENT_CATEGORY.DISTANCE,
    rarity: ACHIEVEMENT_RARITY.RARE,
    target: 1,
    hidden: false,
    icon: '🦉'
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Play a race between 5am and 7am (local time)',
    category: ACHIEVEMENT_CATEGORY.DISTANCE,
    rarity: ACHIEVEMENT_RARITY.UNCOMMON,
    target: 1,
    hidden: false,
    icon: '🐦'
  },
  {
    id: 'century_club',
    name: 'Century Club',
    description: 'Complete 100 races total',
    category: ACHIEVEMENT_CATEGORY.DISTANCE,
    rarity: ACHIEVEMENT_RARITY.LEGENDARY,
    target: 100,
    hidden: false,
    icon: '💯'
  },

  // ==================== SPECIAL/HIDDEN ACHIEVEMENTS ====================
  {
    id: 'secret',
    name: 'Secret Finder',
    description: 'Find all shortcuts on any track',
    category: ACHIEVEMENT_CATEGORY.SPECIAL,
    rarity: ACHIEVEMENT_RARITY.LEGENDARY,
    target: 1,
    hidden: true, // Hidden until unlocked
    icon: '❓'
  },
  {
    id: 'completionist',
    name: 'Completionist',
    description: 'Unlock all other achievements',
    category: ACHIEVEMENT_CATEGORY.SPECIAL,
    rarity: ACHIEVEMENT_RARITY.LEGENDARY,
    target: 0, // Calculated dynamically
    hidden: true,
    icon: '🌟'
  },
  {
    id: 'legend',
    name: 'Legend',
    description: 'Reach maximum player level',
    category: ACHIEVEMENT_CATEGORY.SPECIAL,
    rarity: ACHIEVEMENT_RARITY.LEGENDARY,
    target: 50, // Max level assumption
    hidden: false,
    icon: '👑'
  },
  {
    id: 'speedrunner',
    name: 'Speedrunner',
    description: 'Complete any race in under 60 seconds',
    category: ACHIEVEMENT_CATEGORY.SPECIAL,
    rarity: ACHIEVEMENT_RARITY.EPIC,
    target: 60000, // ms
    hidden: false,
    icon: '⚡'
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Get 3 stars on every track',
    category: ACHIEVEMENT_CATEGORY.SPECIAL,
    rarity: ACHIEVEMENT_RARITY.LEGENDARY,
    target: 0, // Dynamic based on track count
    hidden: false,
    icon: '💎'
  }
];

/**
 * @class AchievementSystem
 * Main achievement tracking and management class
 * 
 * @example
 * // Initialize the system
 * const achievements = new AchievementSystem();
 * await achievements.init();
 * 
 * // Check/unlock achievements
 * achievements.check('speed_demon', currentSpeed);
 * achievements.unlock('first_race');
 * 
 * // Get progress
 * const progress = achievements.getProgress('item_master');
 * const list = achievements.getList();
 */
class AchievementSystem {
  constructor() {
    /** @type {Map<string, Object>} Achievement definitions map */
    this.definitions = new Map();
    
    /** @type {Map<string, Object>} Player's achievement progress state */
    this._progress = new Map();
    
    /** @type {Set<string>} Set of unlocked achievement IDs */
    this._unlocked = new Set();
    
    /** @type {boolean} Initialization state flag */
    this._isInitialized = false;
    
    /** @type {string} localStorage key for persistence */
    this._storageKey = 'wzk_achievements_v2';
    
    /** @type {Object|null} Reference to save system if available */
    this._saveSystem = null;
    
    /** @type {Object|null} Reference to audio effects if available */
    this._audioEffects = null;
    
    /** @type {Object|null} Reference to EventBus if available */
    this._eventBus = null;
    
    /** @type {HTMLElement|null} Popup container element */
    this._popupContainer = null;
    
    /** @type {HTMLElement|null} Main panel element */
    this._panelElement = null;
    
    /** @type {number} Currently active popup timeout ID */
    this._popupTimeout = null;
    
    /** @type {Array} Event listeners for cleanup */
    this._eventListeners = [];
    
    /** @type {Object} Race session tracking data */
    this._raceSession = {
      isActive: false,
      startSpeed: 0,
      maxSpeed: 0,
      startPosition: 0,
      currentPosition: 0,
      itemsUsed: 0,
      driftTime: 0,
      perfectLap: true,
      overtakesThisLap: 0,
      lapsCompleted: 0,
      hitsBlockedWithShield: 0,
      missileHits: 0,
      mineHits: 0,
      boostsUsed: 0,
      usedItemsThisRace: false,
      trackId: null,
      difficulty: 'normal'
    };

    // Initialize definitions
    this._loadDefinitions();
  }

  /**
   * Load achievement definitions into internal map
   * @private
   */
  _loadDefinitions() {
    ACHIEVEMENT_DEFINITIONS.forEach(def => {
      this.definitions.set(def.id, def);
    });
  }

  /**
   * Initialize the achievement system
   * Loads saved progress, sets up event listeners, creates UI elements
   * 
   * @param {Object} [options] - Initialization options
   * @param {Object} [options.saveSystem] - SaveSystem instance for integration
   * @param {Object} [options.audioEffects] - AudioEffects instance for sounds
   * @param {Object} [options.eventBus] - EventBus instance for events
   * @returns {Promise<AchievementSystem>} This instance for chaining
   */
  async init(options = {}) {
    if (this._isInitialized) return this;

    // Store references to optional dependencies
    this._saveSystem = options.saveSystem || window.__saveSystem || null;
    this._audioEffects = options.audioEffects || window.__audioEffects || null;
    this._eventBus = options.eventBus || window.__engine?.bus || null;

    try {
      // Load saved progress
      await this._loadProgress();
      
      // Create UI elements
      this._createPopupContainer();
      
      // Setup event listeners
      this._setupEventListeners();
      
      this._isInitialized = true;
      console.log(`[AchievementSystem] Initialized with ${this.definitions.size} achievements`);
      console.log(`[AchievementSystem] Unlocked: ${this._unlocked.size}/${this.definitions.size}`);
      
      this.emit('initialized', {
        total: this.definitions.size,
        unlocked: this._unlocked.size,
        percentage: this.getCompletionPercentage()
      });
      
      return this;
    } catch (err) {
      console.error('[AchievementSystem] Init failed:', err);
      throw err;
    }
  }

  /**
   * Load progress from localStorage
   * @private
   */
  async _loadProgress() {
    try {
      const raw = localStorage.getItem(this._storageKey);
      
      if (raw) {
        const data = JSON.parse(raw);
        
        if (data.unlocked) {
          this._unlocked = new Set(data.unlocked);
        }
        
        if (data.progress) {
          this._progress = new Map(Object.entries(data.progress));
        }
        
        console.log(`[AchievementSystem] Loaded ${this._unlocked.size} unlocked achievements`);
      } else {
        // Initialize default progress for all achievements
        this._initializeDefaultProgress();
      }
      
      // Also sync with save-system if available
      if (this._saveSystem?.data?.career?.achievements) {
        this._syncFromSaveSystem();
      }
    } catch (err) {
      console.warn('[AchievementSystem] Failed to load progress:', err);
      this._initializeDefaultProgress();
    }
  }

  /**
   * Initialize default progress values for all achievements
   * @private
   */
  _initializeDefaultProgress() {
    this.definitions.forEach((def, id) => {
      if (!this._progress.has(id)) {
        this._progress.set(id, {
          current: 0,
          target: def.target,
          unlocked: false,
          unlockedAt: null
        });
      }
    });
  }

  /**
   * Sync achievement data from save-system
   * @private
   */
  _syncFromSaveSystem() {
    if (!this._saveSystem?.data) return;
    
    const stats = this._saveSystem.data.stats || {};
    const career = this._saveSystem.data.career || {};
    
    // Update progress based on save system stats
    this._updateProgress('item_master', stats.itemsUsed || 0);
    this._updateProgress('marathon_racer', stats.distanceTraveled || 0);
    this._updateProgress('drift_master', stats.driftTime || 0);
    this._updateProgress('veteran', stats.playTime || 0);
    this._updateProgress('century_club', stats.racesFinished || 0);
    this._updateProgress('unstoppable', stats.racesWon || 0);
    
    // Collection progress
    const ownedVehicles = this._saveSystem.data.garage?.ownedVehicles || [];
    this._updateProgress('collector', ownedVehicles.length);
    
    const ownedCharacters = this._saveSystem.data.characters?.owned || [];
    this._updateProgress('fashionista', ownedCharacters.length);
  }

  /**
   * Save current progress to localStorage
   * @private
   */
  _saveProgress() {
    try {
      const data = {
        unlocked: [...this._unlocked],
        progress: Object.fromEntries(this._progress),
        savedAt: Date.now(),
        version: '2.0'
      };
      
      localStorage.setItem(this._storageKey, JSON.stringify(data));
      
      // Also update save-system if available
      if (this._saveSystem) {
        this._saveSystem.update('career.achievements', [...this._unlocked]);
      }
    } catch (err) {
      console.error('[AchievementSystem] Failed to save:', err);
    }
  }

  /**
   * Create the popup container element for unlock notifications
   * @private
   */
  _createPopupContainer() {
    // Check if container already exists
    this._popupContainer = document.getElementById('achievement-popup-container');
    
    if (!this._popupContainer) {
      this._popupContainer = document.createElement('div');
      this._popupContainer.id = 'achievement-popup-container';
      this._popupContainer.className = 'achievement-popup-container';
      document.body.appendChild(this._popupContainer);
    }
  }

  /**
   * Setup event listeners for game events
   * @private
   */
  _setupEventListeners() {
    if (!this._eventBus) {
      console.warn('[AchievementSystem] No EventBus available - events disabled');
      return;
    }

    // Race events
    const unsubRaceStart = this._eventBus.on('race:start', (payload) => {
      this._onRaceStart(payload);
    });
    this._eventListeners.push(unsubRaceStart);

    const unsubRaceEnd = this._eventBus.on('race:end', (result) => {
      this._onRaceEnd(result);
    });
    this._eventListeners.push(unsubRaceEnd);

    // Player events
    const unsubSpeedChanged = this._eventBus.on('player:speedChanged', ({ speed }) => {
      this._onSpeedChanged(speed);
    });
    this._eventListeners.push(unsubSpeedChanged);

    const unsubPositionChanged = this._eventBus.on('player:positionChanged', ({ position, totalRacers }) => {
      this._onPositionChanged(position, totalRacers);
    });
    this._eventListeners.push(unsubPositionChanged);

    const unsubItemUsed = this._eventBus.on('player:itemUsed', ({ itemType }) => {
      this._onItemUsed(itemType);
    });
    this._eventListeners.push(unsubItemUsed);

    const unsubItemPicked = this._eventBus.on('player:itemPicked', () => {
      this._onItemPicked();
    });
    this._eventListeners.push(unsubItemPicked);

    // Drift events
    const unsubDriftStart = this._eventBus.on('player:driftStart', () => {
      this._onDriftStart();
    });
    this._eventListeners.push(unsubDriftStart);

    const unsubDriftEnd = this._eventBus.on('player:driftEnd', ({ duration }) => {
      this._onDriftEnd(duration);
    });
    this._eventListeners.push(unsubDriftEnd);

    // Combat events
    const unsubShieldBlock = this._eventBus.on('player:shieldBlock', () => {
      this._onShieldBlock();
    });
    this._eventListeners.push(unsubShieldBlock);

    const unsubMissileHit = this._eventBus.on('player:missileHit', ({ targetCount = 1 }) => {
      this._onMissileHit(targetCount);
    });
    this._eventListeners.push(unsubMissileHit);

    const unsubMineHit = this._eventBus.on('player:mineHit', () => {
      this._onMineHit();
    });
    this._eventListeners.push(unsubMineHit);

    // Overtake events
    const unsubOvertake = this._eventBus.on('player:overtake', () => {
      this._onOvertake();
    });
    this._eventListeners.push(unsubOvertake);

    // Lap events
    const unsubLapComplete = this._eventBus.on('player:lapCompleted', ({ wasPerfect }) => {
      this._onLapCompleted(wasPerfect);
    });
    this._eventListeners.push(unsubLapComplete);

    // Collision events
    const unsubCollision = this._eventBus.on('player:collision', () => {
      this._onCollision();
    });
    this._eventListeners.push(unsubCollision);

    // Power-up events (integrated with PowerUpSystem)
    const unsubPowerupCollected = this._eventBus.on('powerup:collected', ({ type }) => {
      this._onPowerupCollected(type);
    });
    this._eventListeners.push(unsubPowerupCollected);

    const unsubPowerupUsed = this._eventBus.on('powerup:used', ({ type }) => {
      this._onPowerupUsed(type);
    });
    this._eventListeners.push(unsubPowerupUsed);

    // Boost pad hit
    const unsubBoostPad = this._eventBus.on('player:boostPadHit', () => {
      this._onBoostPadHit();
    });
    this._eventListeners.push(unsubBoostPad);

    console.log(`[AchievementSystem] Registered ${this._eventListeners.length} event handlers`);
  }

  // ==================== EVENT HANDLERS ====================

  /**
   * Handle race start event
   * @private
   */
  _onRaceStart(payload) {
    this._raceSession = {
      isActive: true,
      startSpeed: 0,
      maxSpeed: 0,
      startPosition: payload?.position || 0,
      currentPosition: payload?.position || 0,
      itemsUsed: 0,
      driftTime: 0,
      perfectLap: true,
      overtakesThisLap: 0,
      lapsCompleted: 0,
      hitsBlockedWithShield: 0,
      missileHits: 0,
      mineHits: 0,
      boostsUsed: 0,
      usedItemsThisRace: false,
      trackId: payload?.trackId || null,
      difficulty: payload?.difficulty || 'normal'
    };
  }

  /**
   * Handle race end event - check race-related achievements
   * @private
   */
  _onRaceEnd(result) {
    if (!this._raceSession.isActive) return;

    const position = result?.position || result?.playerPosition || 1;
    const wonRace = position === 1;

    // First Race
    this.unlock('first_race');

    // Track races completed for century club
    const currentProgress = this._progress.get('century_club');
    if (currentProgress) {
      this._updateProgress('century_club', (currentProgress.current || 0) + 1);
    }

    // Perfect Lap check
    if (this._raceSession.perfectLap) {
      this.unlock('perfect_lap');
    }

    // Win streak check (Hat Trick, Unstoppable)
    if (wonRace) {
      // Update consecutive wins tracking
      const streakData = JSON.parse(localStorage.getItem('wzk_win_streak') || '{"streak":0,"total":0}');
      streakData.streak += 1;
      streakData.total += 1;
      localStorage.setItem('wzk_win_streak', JSON.stringify(streakData));

      this.check('hat_trick', streakData.streak);
      this.check('unstoppable', streakData.total);

      // Last to first check
      if (this._raceSession.startPosition === this._raceSession.totalRacers) {
        this.unlock('last_to_first');
      }

      // Hardcore difficulty check
      if (this._raceSession.difficulty === 'hard') {
        this.unlock('hardcore');
      }

      // Pacifist check (no items used)
      if (!this._raceSession.usedItemsThisRace) {
        this.unlock('no_items');
      }
    } else {
      // Reset win streak on loss
      localStorage.setItem('wzk_win_streak', JSON.stringify({ streak: 0, total: JSON.parse(localStorage.getItem('wzk_win_streak') || '{"total":0}').total }));
    }

    // Time Attack / Speedrunner check
    if (result?.raceTime) {
      this.check('time_attack', 1); // Simplified - would need target time comparison
      if (result.raceTime < 60000) { // Under 60 seconds
        this.unlock('speedrunner');
      }
    }

    // Night Owl / Early Bird check
    const hour = new Date().getHours();
    if ((hour >= 0 && hour < 6)) {
      this.unlock('night_owl');
    }
    if (hour >= 5 && hour < 7) {
      this.unlock('early_bird');
    }

    // Session-based achievements
    this.check('drift_king', this._raceSession.driftTime);
    this.check('around_the_bend', Math.floor(this._raceSession.driftTime / 2)); // Approximate corners
    
    // Shield & combat achievements
    this.check('shield_bearer', this._raceSession.hitsBlockedWithShield);
    this.check('missile_madness', this._raceSession.missileHits);
    this.check('mine_sweeper', this._raceSession.mineHits);
    this.check('boost_junkie', this._raceSession.boostsUsed);

    // Comeback Kid check
    this.check('from_behind', this._raceSession.overtakesThisLap);

    // Reset session
    this._raceSession.isActive = false;

    // Force save after race
    this._saveProgress();

    // Check for Completionist achievement
    this._checkCompletionist();
  }

  /**
   * Handle speed change event
   * @private
   */
  _onSpeedChanged(speed) {
    if (!this._raceSession.isActive) return;
    
    this._raceSession.maxSpeed = Math.max(this._raceSession.maxSpeed, speed);
    
    // Speed Demon - check for 200 km/h (convert from m/s if needed)
    const speedKmh = speed * 3.6; // m/s to km/h conversion
    this.check('speed_demon', speedKmh);
  }

  /**
   * Handle position change event
   * @private
   */
  _onPositionChanged(position, totalRacers) {
    if (!this._raceSession.isActive) return;
    
    const prevPos = this._raceSession.currentPosition;
    this._raceSession.currentPosition = position;
    this._raceSession.totalRacers = totalRacers;
    
    // Track overtakes
    if (position < prevPos) {
      this._raceSession.overtakesThisLap += (prevPos - position);
    }
  }

  /**
   * Handle item use event
   * @private
   */
  _onItemUsed(itemType) {
    if (this._raceSession.isActive) {
      this._raceSession.itemsUsed += 1;
      this._raceSession.usedItemsThisRace = true;
    }
    
    // Item Master - global counter
    const current = this._progress.get('item_master');
    if (current) {
      this._updateProgress('item_master', (current.current || 0) + 1);
    }
  }

  /**
   * Handle item pickup event
   * @private
   */
  _onItemPicked() {
    // Could track item pickups separately
  }

  /**
   * Handle drift start event
   * @private
   */
  _onDriftStart() {
    // Mark drift start time for duration tracking
  }

  /**
   * Handle drift end event
   * @private
   */
  _onDriftEnd(duration) {
    if (this._raceSession.isActive) {
      this._raceSession.driftTime += duration;
      
      // Check Drift King (10s in one race)
      this.check('drift_king', this._raceSession.driftTime);
    }
    
    // Drift Master (total 5 min)
    const current = this._progress.get('drift_master');
    if (current) {
      this._updateProgress('drift_master', (current.current || 0) + duration);
    }
  }

  /**
   * Handle shield block event
   * @private
   */
  _onShieldBlock() {
    if (this._raceSession.isActive) {
      this._raceSession.hitsBlockedWithShield += 1;
    }
    
    // Global counter
    const current = this._progress.get('shield_bearer');
    if (current) {
      this._updateProgress('shield_bearer', (current.current || 0) + 1);
      this.check('shield_bearer', current.current + 1);
    }
  }

  /**
   * Handle missile hit event
   * @private
   */
  _onMissileHit(targetCount = 1) {
    if (this._raceSession.isActive) {
      this._raceSession.missileHits += targetCount;
    }
    
    // Global counter
    const current = this._progress.get('missile_madness');
    if (current) {
      this._updateProgress('missile_madness', (current.current || 0) + targetCount);
      this.check('missile_madness', current.current + targetCount);
    }
  }

  /**
   * Handle mine hit event
   * @private
   */
  _onMineHit() {
    if (this._raceSession.isActive) {
      this._raceSession.mineHits += 1;
    }
    
    // Global counter
    const current = this._progress.get('mine_sweeper');
    if (current) {
      this._updateProgress('mine_sweeper', (current.current || 0) + 1);
      this.check('mine_sweeper', current.current + 1);
    }
  }

  /**
   * Handle overtake event
   * @private
   */
  _onOvertake() {
    // Already tracked via position changes
  }

  /**
   * Handle lap complete event
   * @private
   */
  _onLapCompleted(wasPerfect) {
    if (this._raceSession.isActive) {
      this._raceSession.lapsCompleted += 1;
      if (!wasPerfect) {
        this._raceSession.perfectLap = false;
      }
    }
  }

  /**
   * Handle collision event
   * @private
   */
  _onCollision() {
    if (this._raceSession.isActive) {
      this._raceSession.perfectLap = false;
    }
  }

  /**
   * Handle power-up collected event
   * @private
   */
  _onPowerupCollected(type) {
    // Could track specific power-up collections
  }

  /**
   * Handle power-up used event
   * @private
   */
  _onPowerupUsed(type) {
    // Count as item usage
    this._onItemUsed(type);
    
    if (type === 'boost' || type === 'nitro' || type === 'superNitro') {
      if (this._raceSession.isActive) {
        this._raceSession.boostsUsed += 1;
      }
      const current = this._progress.get('boost_junkie');
      if (current) {
        this._updateProgress('boost_junkie', (current.current || 0) + 1);
        this.check('boost_junkie', current.current + 1);
      }
    }
  }

  /**
   * Handle boost pad hit event
   * @private
   */
  _onBoostPadHit() {
    if (this._raceSession.isActive) {
      this._raceSession.boostsUsed += 1;
    }
    const current = this._progress.get('boost_junkie');
    if (current) {
      this._updateProgress('boost_junkie', (current.current || 0) + 1);
      this.check('boost_junkie', current.current + 1);
    }
  }

  /**
   * Check for Completionist achievement (all others unlocked)
   * @private
   */
  _checkCompletionist() {
    const nonSpecialAchievements = [...this.definitions.values()]
      .filter(a => a.id !== 'completionist');
    
    const totalNonSpecial = nonSpecialAchievements.length;
    const unlockedNonSpecial = nonSpecialAchievements.filter(a => 
      this._unlocked.has(a.id)
    ).length;
    
    // Update explorer target dynamically based on tracks
    const explorerDef = this.definitions.get('explorer');
    if (explorerDef && window.__engine?.resolver) {
      const trackCount = window.__engine.resolver.listWithModules('tracks').length || 1;
      explorerDef.target = trackCount;
    }

    // All unlocked?
    if (unlockedNonSpecial >= totalNonSpecial && totalNonSpecial > 0) {
      this.unlock('completionist');
    }
  }

  // ==================== PUBLIC API ====================

  /**
   * Check if an achievement criteria is met and auto-unlock if so
   * 
   * @param {string} achievementId - The achievement ID to check
   * @param {number} currentValue - The current progress value
   * @returns {boolean} True if achievement was newly unlocked
   * 
   * @example
   * // Check if player has enough items used
   * achievements.check('item_master', 45); // Shows "45/50"
   * achievements.check('item_master', 50); // Unlocks!
   */
  check(achievementId, currentValue) {
    const def = this.definitions.get(achievementId);
    if (!def) {
      console.warn(`[AchievementSystem] Unknown achievement: ${achievementId}`);
      return false;
    }
    
    if (this._unlocked.has(achievementId)) {
      return false; // Already unlocked
    }
    
    // Update progress
    this._updateProgress(achievementId, currentValue);
    
    // Check if target met
    if (def.target > 0 && currentValue >= def.target) {
      return this.unlock(achievementId);
    }
    
    return false;
  }

  /**
   * Manually unlock an achievement
   * 
   * @param {string} achievementId - The achievement ID to unlock
   * @returns {boolean} True if achievement was newly unlocked
   * 
   * @example
   * achievements.unlock('first_race');
   */
  unlock(achievementId) {
    const def = this.definitions.get(achievementId);
    if (!def) {
      console.warn(`[AchievementSystem] Unknown achievement: ${achievementId}`);
      return false;
    }
    
    if (this._unlocked.has(achievementId)) {
      return false; // Already unlocked
    }
    
    // Mark as unlocked
    this._unlocked.add(achievementId);
    
    // Update progress data
    const progress = this._progress.get(achievementId) || {};
    progress.current = def.target || progress.current || 1;
    progress.unlocked = true;
    progress.unlockedAt = Date.now();
    this._progress.set(achievementId, progress);
    
    // Show notification
    this.showUnlockNotification(def);
    
    // Play sound
    this._playUnlockSound(def.rarity);
    
    // Emit event
    this.emit('unlocked', {
      achievement: def,
      id: achievementId,
      totalUnlocked: this._unlocked.size,
      totalAchievements: this.definitions.size,
      percentage: this.getCompletionPercentage()
    });
    
    // Also emit to engine bus if available
    if (this._eventBus) {
      this._eventBus.emit('achievement:unlocked', def);
    }
    
    // Auto-save
    this._saveProgress();
    
    // Check for dependent achievements
    if (achievementId !== 'completionist') {
      setTimeout(() => this._checkCompletionist(), 100);
    }
    
    console.log(`[AchievementSystem] Unlocked: ${def.name} (${def.rarity})`);
    
    return true;
  }

  /**
   * Update progress value without unlocking
   * @private
   */
  _updateProgress(achievementId, value) {
    const def = this.definitions.get(achievementId);
    if (!def) return;
    
    const progress = this._progress.get(achievementId) || {
      current: 0,
      target: def.target,
      unlocked: false,
      unlockedAt: null
    };
    
    progress.current = value;
    progress.target = def.target;
    this._progress.set(achievementId, progress);
  }

  /**
   * Get current progress for an achievement
   * 
   * @param {string} achievementId - The achievement ID
   * @returns {Object|null} Progress object with current/target/unlocked fields
   * 
   * @example
   * const progress = achievements.getProgress('item_master');
   * console.log(`${progress.current}/${progress.target}`); // "45/50"
   */
  getProgress(achievementId) {
    const def = this.definitions.get(achievementId);
    if (!def) return null;
    
    const progress = this._progress.get(achievementId) || {
      current: 0,
      target: def.target,
      unlocked: false,
      unlockedAt: null
    };
    
    return {
      ...progress,
      definition: def,
      isUnlocked: this._unlocked.has(achievementId),
      percentage: def.target > 0 ? Math.min(100, (progress.current / def.target) * 100) : 0
    };
  }

  /**
   * Get full list of achievements with their states
   * 
   * @param {Object} [options] - Filter/sort options
   * @param {string} [options.category] - Filter by category
   * @param {string} [options.rarity] - Filter by rarity
   * @param {boolean} [options.unlockedOnly] - Only show unlocked
   * @param {boolean} [options.lockedOnly] - Only show locked
   * @param {string} [options.search] - Search term filter
   * @param {string} [options.sortBy='id'] - Sort field (recent, rarity, progress, name)
   * @returns {Array} Array of achievement objects with state
   * 
   * @example
   * // Get all racing achievements sorted by progress
   * const racing = achievements.getList({ category: 'racing', sortBy: 'progress' });
   */
  getList(options = {}) {
    let achievements = [...this.definitions.values()];
    
    // Apply filters
    if (options.category) {
      achievements = achievements.filter(a => a.category === options.category);
    }
    
    if (options.rarity) {
      achievements = achievements.filter(a => a.rarity === options.rarity);
    }
    
    if (options.unlockedOnly) {
      achievements = achievements.filter(a => this._unlocked.has(a.id));
    }
    
    if (options.lockedOnly) {
      achievements = achievements.filter(a => !this._unlocked.has(a.id));
    }
    
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      achievements = achievements.filter(a =>
        a.name.toLowerCase().includes(searchLower) ||
        a.description.toLowerCase().includes(searchLower)
      );
    }
    
    // Hide hidden achievements unless they're unlocked
    if (!options.includeHidden) {
      achievements = achievements.filter(a => 
        !a.hidden || this._unlocked.has(a.id)
      );
    }
    
    // Apply sorting
    const sortBy = options.sortBy || 'id';
    switch (sortBy) {
      case 'recent':
        achievements.sort((a, b) => {
          const pa = this._progress.get(a.id)?.unlockedAt || 0;
          const pb = this._progress.get(b.id)?.unlockedAt || 0;
          return pb - pa;
        });
        break;
        
      case 'rarity':
        const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
        achievements.sort((a, b) => 
          rarityOrder.indexOf(b.rarity) - rarityOrder.indexOf(a.rarity)
        );
        break;
        
      case 'progress':
        achievements.sort((a, b) => {
          const pa = this._unlocked.has(a.id) ? 100 : (this._progress.get(a.id)?.current || 0);
          const pb = this._unlocked.has(b.id) ? 100 : (this._progress.get(b.id)?.current || 0);
          return pb - pa;
        });
        break;
        
      case 'name':
        achievements.sort((a, b) => a.name.localeCompare(b.name));
        break;
        
      default:
        // Keep original order
        break;
    }
    
    // Attach state to each achievement
    return achievements.map(def => ({
      ...def,
      state: this.getProgress(def.id),
      color: RARITY_COLORS[def.rarity]
    }));
  }

  /**
   * Check if an achievement is unlocked
   * 
   * @param {string} achievementId - The achievement ID
   * @returns {boolean} True if unlocked
   */
  isUnlocked(achievementId) {
    return this._unlocked.has(achievementId);
  }

  /**
   * Get overall completion statistics
   * 
   * @returns {Object} Stats object with counts and percentages
   * 
   * @example
   * const stats = achievements.getStats();
   * console.log(`${stats.percentage}% complete (${stats.unlocked}/${stats.total})`);
   */
 getStats() {
    const total = this.definitions.size;
    const unlocked = this._unlocked.size;
    const byCategory = {};
    const byRarity = {};
    
    this.definitions.forEach((def, id) => {
      // Category stats
      if (!byCategory[def.category]) {
        byCategory[def.category] = { total: 0, unlocked: 0 };
      }
      byCategory[def.category].total++;
      if (this._unlocked.has(id)) {
        byCategory[def.category].unlocked++;
      }
      
      // Rarity stats
      if (!byRarity[def.rarity]) {
        byRarity[def.rarity] = { total: 0, unlocked: 0 };
      }
      byRarity[def.rarity].total++;
      if (this._unlocked.has(id)) {
        byRarity[def.rarity].unlocked++;
      }
    });
    
    return {
      total,
      unlocked,
      locked: total - unlocked,
      percentage: total > 0 ? ((unlocked / total) * 100).toFixed(1) : 0,
      byCategory,
      byRarity
    };
  }

  /**
   * Get completion percentage (0-100)
   * 
   * @returns {number} Percentage of achievements unlocked
   */
  getCompletionPercentage() {
    const stats = this.getStats();
    return parseFloat(stats.percentage);
  }

  /**
   * Show an achievement unlock notification popup
   * 
   * @param {Object} achievement - The achievement object to display
   * @param {number} [duration=4000] - Display duration in milliseconds
   */
  showUnlockNotification(achievement, duration = 4000) {
    if (!this._popupContainer) {
      this._createPopupContainer();
    }
    
    const rarityClass = `rarity-${achievement.rarity}`;
    const isLegendary = achievement.rarity === ACHIEVEMENT_RARITY.LEGENDARY ||
                         achievement.rarity === ACHIEVEMENT_RARITY.EPIC;
    
    const popup = document.createElement('div');
    popup.className = `achievement-popup ${rarityClass} ${isLegendary ? 'celebration' : ''}`;
    popup.innerHTML = `
      <div class="achievement-popup-content">
        <div class="achievement-popup-icon">${achievement.icon}</div>
        <div class="achievement-popup-text">
          <div class="achievement-popup-label">Achievement Unlocked!</div>
          <div class="achievement-popup-name">${achievement.name}</div>
          <div class="achievement-popup-desc">${achievement.description}</div>
          ${achievement.target > 1 ? `<div class="achievement-popup-rarity">${this._capitalizeFirst(achievement.rarity)}</div>` : ''}
        </div>
      </div>
      ${isLegendary ? '<div class="confetti-container"></div>' : ''}
    `;
    
    // Clear existing popup timeout
    if (this._popupTimeout) {
      clearTimeout(this._popupTimeout);
      // Remove existing popup
      const existing = this._popupContainer.querySelector('.achievement-popup');
      if (existing) existing.remove();
    }
    
    this._popupContainer.appendChild(popup);
    
    // Trigger animation
    requestAnimationFrame(() => {
      popup.classList.add('visible');
    });
    
    // Auto-remove after duration
    this._popupTimeout = setTimeout(() => {
      popup.classList.remove('visible');
      setTimeout(() => popup.remove(), 500);
    }, duration);
  }

  /**
   * Play unlock sound based on rarity
   * @private
   */
  _playUnlockSound(rarity) {
    if (!this._audioEffects) return;
    
    let soundId = 'ui.success';
    
    switch (rarity) {
      case ACHIEVEMENT_RARITY.LEGENDARY:
        soundId = 'ui.success'; // Would be special legendary sound
        break;
      case ACHIEVEMENT_RARITY.EPIC:
        soundId = 'ui.success';
        break;
      default:
        soundId = 'ui.success';
    }
    
    try {
      this._audioEffects.play(soundId);
    } catch (e) {
      // Silent fail
    }
  }

  /**
   * Generate and return the achievements panel HTML
   * Can be injected into any container
   * 
   * @param {HTMLElement|string} container - Container element or selector
   * @param {Object} [options] - Panel options
   * @returns {HTMLElement} The created panel element
   */
  createPanel(container, options = {}) {
    const target = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    if (!target) {
      console.error('[AchievementSystem] Invalid panel container');
      return null;
    }
    
    // Create panel structure
    const panel = document.createElement('div');
    panel.className = 'achievements-panel';
    panel.id = options.panelId || 'achievements-main-panel';
    
    panel.innerHTML = `
      <div class="achievements-header">
        <h2 class="achievements-title">Achievements</h2>
        <div class="achievements-stats">
          <span class="stat-unlocked">${this.getStats().unlocked}</span>
          <span class="stat-separator">/</span>
          <span class="stat-total">${this.getStats().total}</span>
          <span class="stat-percentage">${this.getStats().percentage}%</span>
        </div>
      </div>
      
      <div class="achievements-controls">
        <div class="search-box">
          <input type="text" class="search-input" placeholder="Search achievements..." />
        </div>
        <div class="filter-tabs">
          <button class="filter-tab active" data-filter="all">All</button>
          <button class="filter-tab" data-filter="${ACHIEVEMENT_CATEGORY.RACING}">Racing</button>
          <button class="filter-tab" data-filter="${ACHIEVEMENT_CATEGORY.DRIFT}">Drift</button>
          <button class="filter-tab" data-filter="${ACHIEVEMENT_CATEGORY.ITEMS}">Items</button>
          <button class="filter-tab" data-filter="${ACHIEVEMENT_CATEGORY.COLLECTION}">Collection</button>
          <button class="filter-tab" data-filter="${ACHIEVEMENT_CATEGORY.CHALLENGE}">Challenge</button>
          <button class="filter-tab" data-filter="${ACHIEVEMENT_CATEGORY.SPECIAL}">Special</button>
        </div>
        <div class="sort-controls">
          <select class="sort-select">
            <option value="recent">Recently Unlocked</option>
            <option value="rarity">Rarity</option>
            <option value="progress">Progress</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>
      
      <div class="achievements-grid"></div>
    `;
    
    target.appendChild(panel);
    this._panelElement = panel;
    
    // Populate grid
    this._refreshGrid(panel);
    
    // Setup interactions
    this._setupPanelInteractions(panel);
    
    return panel;
  }

  /**
   * Refresh the achievements grid in the panel
   * @private
   */
  _refreshGrid(panel) {
    const grid = panel.querySelector('.achievements-grid');
    if (!grid) return;
    
    const activeFilter = panel.querySelector('.filter-tab.active')?.dataset.filter || 'all';
    const searchTerm = panel.querySelector('.search-input')?.value || '';
    const sortBy = panel.querySelector('.sort-select')?.value || 'recent';
    
    const achievements = this.getList({
      category: activeFilter !== 'all' ? activeFilter : undefined,
      search: searchTerm || undefined,
      sortBy
    });
    
    grid.innerHTML = achievements.map(ach => {
      const state = ach.state;
      const isLocked = !state.isUnlocked;
      const progressPercent = state.percentage || 0;
      const needsProgress = ach.target > 1 && isLocked;
      
      return `
        <div class="achievement-card ${isLocked ? 'locked' : 'unlocked'} rarity-${ach.rarity}" data-id="${ach.id}">
          <div class="card-icon-wrapper">
            <span class="card-icon">${isLocked && ach.hidden ? '❓' : ach.icon}</span>
            ${isLocked ? '<div class="lock-overlay">🔒</div>' : ''}
            <div class="card-rarity-indicator" style="background: ${ach.color}"></div>
          </div>
          <div class="card-content">
            <div class="card-name">${isLocked && ach.hidden ? '???' : ach.name}</div>
            <div class="card-description">${isLocked && ach.hidden ? 'Keep playing to discover!' : ach.description}</div>
            ${needsProgress ? `
              <div class="card-progress">
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${progressPercent}%"></div>
                </div>
                <span class="progress-text">${Math.floor(state.current || 0)}/${ach.target}</span>
              </div>
            ` : ''}
            ${state.isUnlocked ? `
              <div class="card-unlocked-date">
                Unlocked ${this._formatDate(state.unlockedAt)}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
    
    // Update header stats
    const stats = this.getStats();
    const statUnlocked = panel.querySelector('.stat-unlocked');
    const statPercentage = panel.querySelector('.stat-percentage');
    if (statUnlocked) statUnlocked.textContent = stats.unlocked;
    if (statPercentage) statPercentage.textContent = `${stats.percentage}%`;
  }

  /**
   * Setup panel interaction handlers
   * @private
   */
  _setupPanelInteractions(panel) {
    // Tab switching
    panel.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        panel.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this._refreshGrid(panel);
      });
    });
    
    // Search input
    const searchInput = panel.querySelector('.search-input');
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => this._refreshGrid(panel), 200);
      });
    }
    
    // Sort select
    const sortSelect = panel.querySelector('.sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => this._refreshGrid(panel));
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Capitalize first letter of string
   * @private
   */
  _capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Format date relative to now
   * @private
   */
  _formatDate(timestamp) {
    if (!timestamp) return '';
    
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    
    return new Date(timestamp).toLocaleDateString();
  }

  // ==================== EVENT SYSTEM ====================

  /**
   * Internal event listeners map
   * @private
   */
  _listeners = new Map();

  /**
   * Subscribe to achievement system events
   * 
   * @param {string} event - Event name ('unlocked', 'initialized', etc.)
   * @param {Function} callback - Handler function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe from an event
   * 
   * @param {string} event - Event name
   * @param {Function} callback - Handler to remove
   */
  off(event, callback) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Emit an event to subscribers
   * @private
   */
  emit(event, data) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[AchievementSystem] Error in handler for "${event}":`, err);
        }
      });
    }
  }

  // ==================== CLEANUP ====================

  /**
   * Clean up event listeners and resources
   */
  destroy() {
    // Remove event bus listeners
    this._eventListeners.forEach(unsub => {
      if (typeof unsub === 'function') unsub();
    });
    this._eventListeners = [];
    
    // Remove popup container
    if (this._popupContainer && this._popupContainer.parentNode) {
      this._popupContainer.parentNode.removeChild(this._popupContainer);
    }
    
    // Remove panel
    if (this._panelElement && this._panelElement.parentNode) {
      this._panelElement.parentNode.removeChild(this._panelElement);
    }
    
    // Clear listeners
    this._listeners.clear();
    
    this._isInitialized = false;
    
    console.log('[AchievementSystem] Destroyed');
  }
}

// Singleton instance
const achievementSystem = new AchievementSystem();

// Export for ES modules
export { AchievementSystem, achievementSystem };
export default achievementSystem;

// Expose globally for non-module access
window.__achievements = achievementSystem;
