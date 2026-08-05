// ui/leaderboard.js — Global Leaderboard and Statistics Tracking System for Warzone Kart: Neon Underground
//
// Features:
// - Multiple leaderboard categories (Global, Weekly, Friends, Personal)
// - Comprehensive statistics tracking
// - Mock data generator for demo mode
// - localStorage persistence with save-system integration
// - Full UI rendering (tables, stats cards, personal bests)
// - Import/export functionality
// CSS: loaded via ui/styles/leaderboard.css in index.html

/**
 * @enum {string}
 * Leaderboard categories for filtering and display
 */
export const LEADERBOARD_CATEGORY = {
  GLOBAL: 'global',
  WEEKLY: 'weekly',
  FRIENDS: 'friends',
  PERSONAL: 'personal'
};

/**
 * Vehicle class identifiers
 */
export const VEHICLE_CLASSES = {
  ALL: null,
  LIGHT: 'light',
  MEDIUM: 'medium',
  HEAVY: 'heavy'
};

/**
 * Difficulty-based time ranges for mock data generation (in ms per lap)
 */
const MOCK_TIME_RANGES = {
  easy: { min: 45000, max: 60000 },    // 45-60 seconds
  medium: { min: 35000, max: 48000 },   // 35-48 seconds
  hard: { min: 28000, max: 38000 }      // 28-38 seconds
};

/**
 * Pool of realistic racer names for mock data generation
 */
const MOCK_NAMES = [
  'NeonRacer99', 'SpeedDemon', 'DriftKing', 'TurboAce', 'NightHawk',
  'VortexX', 'PlasmaDriver', 'CyberPunk', 'NeonBlaze', 'ShadowRacer',
  'QuantumDash', 'HyperBoost', 'ApexHunter', 'VelocityX', 'StormChaser',
  'ThunderBolt', 'FrostByte', 'IronWill', 'ChromeHeart', 'PixelPilot',
  'GlitchRunner', 'DataStream', 'BinaryBoss', 'CodeBreaker', 'NetRunner',
  'SynthWave', 'RetroRocket', 'FutureFlash', 'TimeWarp', 'SpaceCadet'
];

/**
 * Available track IDs for filtering
 */
const AVAILABLE_TRACKS = ['downtown', 'neon-strip', 'industrial-zone', 'skyline', 'underground'];

/**
 * Available vehicle IDs
 */
const AVAILABLE_VEHICLES = [
  { id: 'vehicle.base', name: 'Base Racer', icon: '🏎️', class: 'medium' },
  { id: 'vehicle.spectre', name: 'Spectre', icon: '👻', class: 'light' },
  { id: 'vehicle.titan', name: 'Titan', icon: '🔶', class: 'heavy' },
  { id: 'vehicle.vixen', name: 'Vixen', icon: '🦊', class: 'light' }
];

/**
 * @class LeaderboardSystem
 * Comprehensive leaderboard management system with statistics tracking,
 * multiple categories, persistence, and full UI rendering capabilities.
 */
class LeaderboardSystem {
  constructor() {
    /** @type {Object|null} Reference to save system */
    this._saveSystem = null;
    
    /** @type {boolean} Initialization state flag */
    this._isInitialized = false;
    
    /** @type {string} Current player name */
    this._playerName = 'Player';
    
    /** @type {string} Player's vehicle ID */
    this._playerVehicleId = 'vehicle.base';
    
    /** @type {Map} Event listeners storage */
    this._listeners = new Map();
    
    /** @type {Object} Current filter state */
    this._currentFilters = {
      category: LEADERBOARD_CATEGORY.GLOBAL,
      trackFilter: null,
      vehicleClassFilter: null
    };
    
    /** @type {string} Sort field ('timeMs' | 'date' | 'playerName') */
    this._sortField = 'timeMs';
    
    /** @type {'asc' | 'desc'} Sort direction */
    this._sortDirection = 'asc';
    
    // Storage keys
    this._storageKey = 'wzk_leaderboard_v1';
    this._statsStorageKey = 'wzk_leaderboard_stats_v1';
    
    // In-memory data stores
    this._entries = [];
    this._stats = this._getDefaultStats();
    
    // Bind methods
    this._onRaceEnd = this._onRaceEnd.bind(this);
  }

  /**
   * Initialize the leaderboard system
   * @param {Object} options - Configuration options
   * @param {Object} [options.saveSystem] - SaveSystem instance for integration
   * @param {string} [options.playerName='Player'] - Display name for current player
   * @param {string} [options.playerVehicleId='vehicle.base'] - Default vehicle ID
   * @returns {Promise<LeaderboardSystem>} This instance for chaining
   */
  async init(options = {}) {
    if (this._isInitialized) return this;

    // Store references
    this._saveSystem = options.saveSystem || null;
    this._playerName = options.playerName || 'Player';
    this._playerVehicleId = options.playerVehicleId || 'vehicle.base';

    try {
      // Load persisted data
      this._loadFromStorage();

      // If save system available, sync stats
      if (this._saveSystem && this._saveSystem.isInitialized) {
        this._syncWithSaveSystem();
        this._saveSystem.on('raceRecorded', this._onRaceEnd);
      }

      this._isInitialized = true;
      console.log('[Leaderboard] System initialized');
      this.emit('initialized', { entriesCount: this._entries.length });
      
      return this;
    } catch (err) {
      console.error('[Leaderboard] Init failed:', err);
      this._isInitialized = true; // Still mark as initialized to prevent retry loops
      return this;
    }
  }

  /**
   * Get default statistics structure
   * @returns {Object} Default stats object
   * @private
   */
  _getDefaultStats() {
    return {
      totalRacesCompleted: 0,
      totalWins: 0,
      totalLosses: 0,
      totalDNFs: 0,
      totalDistanceTraveled: 0,       // meters
      topSpeedEver: 0,                 // km/h
      averageFinishPosition: 0,
      favoriteTrack: null,             // trackId with most races
      trackCounts: {},                 // trackId -> count
      bestVehicle: null,               // vehicleId with most wins
      vehicleWins: {},                 // vehicleId -> win count
      longestDrift: 0,                 // seconds (single continuous)
      mostItemsInOneRace: 0,
      perfectRaces: 0,
      totalPlayTime: 0,                // seconds
      lastPlayed: null,
      careerStartedAt: Date.now()
    };
  }

  /**
   * Load persisted data from localStorage
   * @private
   */
  _loadFromStorage() {
    try {
      const entriesRaw = localStorage.getItem(this._storageKey);
      if (entriesRaw) {
        this._entries = JSON.parse(entriesRaw);
      }

      const statsRaw = localStorage.getItem(this._statsStorageKey);
      if (statsRaw) {
        this._stats = { ...this._getDefaultStats(), ...JSON.parse(statsRaw) };
      }
    } catch (err) {
      console.warn('[Leaderboard] Failed to load from storage:', err.message);
    }
  }

  /**
   * Save current data to localStorage
   * @private
   */
  _saveToStorage() {
    try {
      localStorage.setItem(this._storageKey, JSON.stringify(this._entries));
      localStorage.setItem(this._statsStorageKey, JSON.stringify(this._stats));
    } catch (err) {
      console.error('[Leaderboard] Failed to save:', err.message);
    }
  }

  /**
   * Sync statistics with save system data
   * @private
   */
  _syncWithSaveSystem() {
    if (!this._saveSystem?.data?.stats) return;

    const saveStats = this._saveSystem.data.stats;
    
    // Update from save system
    if (saveStats.racesFinished) {
      this._stats.totalRacesCompleted = saveStats.racesFinished;
    }
    if (saveStats.racesWon) {
      this._stats.totalWins = saveStats.racesWon;
    }
    if (saveStats.distanceTraveled) {
      this._stats.totalDistanceTraveled += saveStats.distanceTraveled;
    }
    if (saveStats.itemsUsed) {
      this._stats.mostItemsInOneRace = Math.max(
        this._stats.mostItemsInOneRace,
        saveStats.itemsUsed
      );
    }
    if (saveStats.perfectRaces) {
      this._stats.perfectRaces = saveStats.perfectRaces;
    }

    this._saveToStorage();
  }

  /**
   * Handle race end event - record result to leaderboard
   * @param {Object} data - Race result data
   * @private
   */
  _onRaceEnd(data) {
    if (!data?.result) return;
    
    const result = data.result;
    
    // Record entry if race was finished (not DNF)
    if (result.position && result.timeMs && result.trackId) {
      this.addEntry({
        playerName: this._playerName,
        vehicleId: result.vehicleId || this._playerVehicleId,
        trackId: result.trackId,
        timeMs: result.timeMs,
        laps: result.laps || 3,
        position: result.position,
        isPlayer: true
      });
    }

    // Update statistics
    this.updateStats({
      racesCompleted: 1,
      wins: result.position === 1 ? 1 : 0,
      losses: result.position && result.position > 1 ? 1 : 0,
      dnfs: !result.position ? 1 : 0,
      distance: result.distance || 0,
      itemsUsed: result.itemsUsed || 0,
      perfect: result.perfectRace || false
    });

    this.emit('raceRecorded', { result, stats: this._stats });
  }

  /**
   * Add a new entry to the leaderboard
   * @param {Object} entryData - Entry data
   * @param {string} entryData.playerName - Player/racer name
   * @param {string} entryData.vehicleId - Vehicle used
   * @param {string} entryData.trackId - Track raced on
   * @param {number} entryData.timeMs - Race/lap time in milliseconds
   * @param {number} [entryData.laps=3] - Number of laps
   * @param {number} [entryData.position] - Finishing position
   * @param {boolean} [entryData.isPlayer=false] - Is this the local player?
   * @param {boolean} [entryData.isGhost=false] - Ghost data for replay?
   * @returns {Object} The created entry
   */
  addEntry(entryData) {
    const entry = {
      rank: 0, // Will be calculated on retrieval
      playerName: entryData.playerName || 'Anonymous',
      vehicleId: entryData.vehicleId || 'vehicle.base',
      trackId: entryData.trackId || 'downtown',
      timeMs: entryData.timeMs || 60000,
      date: new Date().toISOString(),
      laps: entryData.laps || 3,
      isPlayer: entryData.isPlayer || false,
      isGhost: entryData.isGhost || false,
      position: entryData.position || null
    };

    this._entries.push(entry);
    this._saveToStorage();
    
    this.emit('entryAdded', entry);
    return entry;
  }

  /**
   * Update player statistics
   * @param {Object} updates - Statistics updates to apply
   * @param {number} [updates.racesCompleted] - Add to total races
   * @param {number} [updates.wins] - Add to wins count
   * @param {number} [updates.losses] - Add to losses count
   * @param {number} [updates.dnfs] - Add to DNFs
   * @param {number} [updates.distance] - Add distance in meters
   * @param {number} [updates.topSpeed] - Check against top speed (km/h)
   * @param {string} [updates.trackId] - Track for favorite tracking
   * @param {string} [updates.vehicleId] - Vehicle for best vehicle tracking
   * @param {number} [updates.driftTime] - Check against longest drift
   * @param {number} [updates.itemsUsed] - Check against most items
   * @param {boolean} [updates.perfect] - Was this a perfect race?
   * @param {number} [updates.playTime] - Add play time in seconds
   */
  updateStats(updates) {
    if (!updates) return;

    if (updates.racesCompleted) {
      this._stats.totalRacesCompleted += updates.racesCompleted;
    }
    if (updates.wins) {
      this._stats.totalWins += updates.wins;
    }
    if (updates.losses) {
      this._stats.totalLosses += updates.losses;
    }
    if (updates.dnfs) {
      this._stats.totalDNFs += updates.dnfs;
    }
    if (updates.distance) {
      this._stats.totalDistanceTraveled += updates.distance;
    }
    if (updates.topSpeed && updates.topSpeed > this._stats.topSpeedEver) {
      this._stats.topSpeedEver = updates.topSpeed;
    }
    if (updates.trackId) {
      this._stats.trackCounts[updates.trackId] = 
        (this._stats.trackCounts[updates.trackId] || 0) + 1;
      
      // Update favorite track
      const maxCount = Math.max(...Object.values(this._stats.trackCounts), 0);
      if (this._stats.trackCounts[updates.trackId] >= maxCount) {
        this._stats.favoriteTrack = updates.trackId;
      }
    }
    if (updates.vehicleId && updates.wins > 0) {
      this._stats.vehicleWins[updates.vehicleId] = 
        (this._stats.vehicleWins[updates.vehicleId] || 0) + updates.wins;
      
      // Update best vehicle
      const maxWins = Math.max(...Object.values(this._stats.vehicleWins), 0);
      if (this._stats.vehicleWins[updates.vehicleId] >= maxWins) {
        this._stats.bestVehicle = updates.vehicleId;
      }
    }
    if (updates.driftTime && updates.driftTime > this._stats.longestDrift) {
      this._stats.longestDrift = updates.driftTime;
    }
    if (updates.itemsUsed && updates.itemsUsed > this._stats.mostItemsInOneRace) {
      this._stats.mostItemsInOneRace = updates.itemsUsed;
    }
    if (updates.perfect) {
      this._stats.perfectRaces += 1;
    }
    if (updates.playTime) {
      this._stats.totalPlayTime += updates.playTime;
    }

    // Recalculate average finish position
    const totalFinishes = this._stats.totalWins + this._stats.totalLosses;
    if (totalFinishes > 0) {
      // Approximate average based on win ratio (would need more precise tracking)
      this._stats.averageFinishPosition = Math.round(
        (totalFinishes - this._stats.totalWins) / totalFinishes * 4 + 1
      );
    }

    this._stats.lastPlayed = new Date().toISOString();
    this._saveToStorage();
    
    this.emit('statsUpdated', this._stats);
  }

  /**
   * Get filtered and sorted leaderboard entries
   * @param {Object} [options] - Filter/sort options
   * @param {string} [options.category='global'] - Category filter
   * @param {string} [options.trackFilter=null] - Track ID filter
   * @param {string} [options.vehicleClassFilter=null] - Vehicle class filter
   * @param {string} [options.sortField='timeMs'] - Field to sort by
   * @param {string} [options.sortDirection='asc'] - Sort direction
   * @param {number} [options.limit=100] - Max entries to return
   * @returns {Object} Leaderboard data with entries array
   */
  getEntries(options = {}) {
    const category = options.category || LEADERBOARD_CATEGORY.GLOBAL;
    const trackFilter = options.trackFilter !== undefined ? options.trackFilter : this._currentFilters.trackFilter;
    const vehicleClassFilter = options.vehicleClassFilter !== undefined ? options.vehicleClassFilter : this._currentFilters.vehicleClassFilter;
    const sortField = options.sortField || this._sortField;
    const sortDirection = options.sortDirection || this._sortDirection;
    const limit = options.limit || 100;

    let entries = [...this._entries];

    // Apply category filter
    switch (category) {
      case LEADERBOARD_CATEGORY.WEEKLY:
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        entries = entries.filter(e => new Date(e.date).getTime() > weekAgo);
        break;
      case LEADERBOARD_CATEGORY.FRIENDS:
        // For now, include mock friends + player
        const friendNames = this._getFriendNames();
        entries = entries.filter(e => e.isPlayer || friendNames.includes(e.playerName));
        break;
      case LEADERBOARD_CATEGORY.PERSONAL:
        entries = entries.filter(e => e.isPlayer);
        break;
      case LEADERBOARD_CATEGORY.GLOBAL:
      default:
        // No additional filtering
        break;
    }

    // Apply track filter
    if (trackFilter) {
      entries = entries.filter(e => e.trackId === trackFilter);
    }

    // Apply vehicle class filter
    if (vehicleClassFilter) {
      entries = entries.filter(e => {
        const vehicle = AVAILABLE_VEHICLES.find(v => v.id === e.vehicleId);
        return vehicle && vehicle.class === vehicleClassFilter;
      });
    }

    // Apply sorting
    entries.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'timeMs':
          comparison = a.timeMs - b.timeMs;
          break;
        case 'date':
          comparison = new Date(b.date).getTime() - new Date(a.date).getTime();
          break;
        case 'playerName':
          comparison = a.playerName.localeCompare(b.playerName);
          break;
        default:
          comparison = a.timeMs - b.timeMs;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    // Apply limit
    entries = entries.slice(0, limit);

    // Assign ranks
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return {
      entries,
      category,
      trackFilter,
      vehicleClassFilter,
      totalEntries: this._entries.length,
      filteredCount: entries.length
    };
  }

  /**
   * Get current player statistics
   * @returns {Object} Copy of current stats
   */
  getStats() {
    return JSON.parse(JSON.stringify(this._stats));
  }

  /**
   * Get player's personal best times per track
   * @returns {Array} Personal best entries grouped by track
   */
  getPersonalBests() {
    const personalEntries = this._entries.filter(e => e.isPlayer);
    const bests = {};

    personalEntries.forEach(entry => {
      const key = `${entry.trackId}_${entry.vehicleId}`;
      if (!bests[key] || entry.timeMs < bests[key].timeMs) {
        bests[key] = { ...entry };
      }
    });

    return Object.values(bests).sort((a, b) => a.timeMs - b.timeMs);
  }

  /**
   * Generate mock leaderboard data for demo/testing
   * @param {Object} [options] - Generation options
   * @param {number} [options.count=50] - Number of entries to generate
   * @param {string} [options.trackId='downtown'] - Track for entries
   * @param {boolean} [options.includePlayer=true] - Include player entry
   * @returns {Array} Generated entries
   */
  generateMockData(options = {}) {
    const count = options.count || 50;
    const trackId = options.trackId || 'downtown';
    const includePlayer = options.includePlayer !== false;

    const generated = [];

    // Use seeded random for consistency
    const seed = Date.now();
    const seededRandom = this._createSeededRandom(seed);

    for (let i = 0; i < count; i++) {
      const difficulty = i < 5 ? 'hard' : i < 15 ? 'medium' : 'easy';
      const range = MOCK_TIME_RANGES[difficulty];
      const baseTime = range.min + seededRandom() * (range.max - range.min);
      
      // Add some variance
      const timeMs = Math.floor(baseTime + (seededRandom() - 0.5) * 5000);
      const vehicleIndex = Math.floor(seededRandom() * AVAILABLE_VEHICLES.length);
      const vehicle = AVAILABLE_VEHICLES[vehicleIndex];

      generated.push({
        rank: i + 1,
        playerName: MOCK_NAMES[i % MOCK_NAMES.length] + (Math.floor(i / MOCK_NAMES.length) || ''),
        vehicleId: vehicle.id,
        trackId,
        timeMs: Math.max(25000, timeMs),
        date: new Date(Date.now() - seededRandom() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        laps: 3,
        isPlayer: false,
        isGhost: false
      });
    }

    // Insert player somewhere in middle-top
    if (includePlayer) {
      const playerPos = Math.floor(count * 0.15); // Top 15%
      generated.splice(playerPos, 0, {
        rank: playerPos + 1,
        playerName: this._playerName,
        vehicleId: this._playerVehicleId,
        trackId,
        timeMs: generated[playerPos]?.timeMs 
          ? Math.floor(generated[playerPos].timeMs * 0.98)
          : 32000,
        date: new Date().toISOString(),
        laps: 3,
        isPlayer: true,
        isGhost: false
      });
    }

    // Merge with existing (avoid duplicates)
    const existingIds = new Set(this._entries.map(e => `${e.playerName}_${e.trackId}`));
    const newEntries = generated.filter(e => !existingIds.has(`${e.playerName}_${e.trackId}`));
    
    this._entries = [...newEntries, ...this._entries];
    this._saveToStorage();

    this.emit('mockDataGenerated', { count: newEntries.length, trackId });
    return generated;
  }

  /**
   * Create a seeded pseudo-random number generator
   * @param {number} seed - Seed value
   * @returns {Function} Random number generator function
   * @private
   */
  _createSeededRandom(seed) {
    let s = seed;
    return () => {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  /**
   * Get mock friend names for friends leaderboard
   * @returns {Array<string>} Friend name list
   * @private
   */
  _getFriendNames() {
    return ['NeonRacer99', 'SpeedDemon', 'DriftKing', 'TurboAce'];
  }

  /**
   * Export all leaderboard data as JSON string
   * @returns {string} JSON string of all data
   */
  exportData() {
    return JSON.stringify({
      entries: this._entries,
      stats: this._stats,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    }, null, 2);
  }

  /**
   * Import leaderboard data from JSON string
   * @param {string} jsonString - JSON data to import
   * @returns {boolean} Success status
   */
  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      
      if (!data.entries || !data.stats) {
        throw new Error('Invalid format: missing entries or stats');
      }

      // Validate basic structure
      if (!Array.isArray(data.entries)) {
        throw new Error('Invalid format: entries must be an array');
      }

      this._entries = data.entries;
      this._stats = { ...this._getDefaultStats(), ...data.stats };
      this._saveToStorage();

      this.emit('dataImported', { 
        entriesCount: this._entries.length,
        exportedAt: data.exportedAt 
      });

      return true;
    } catch (err) {
      console.error('[Leaderboard] Import failed:', err.message);
      return false;
    }
  }

  /**
   * Clear all leaderboard data (with confirmation recommended first)
   */
  clearAllData() {
    this._entries = [];
    this._stats = this._getDefaultStats();
    this._saveToStorage();
    this.emit('dataCleared');
  }

  // ==================== UI RENDERING METHODS ====================

  /**
   * Render full leaderboard table into container
   * @param {HTMLElement|string} container - DOM element or selector
   * @param {Object} [options] - Render options
   * @param {string} [options.category='global'] - Leaderboard category
   * @param {string} [options.title] - Custom title
   * @param {boolean} [options.showControls=true] - Show filter/sort controls
   * @param {boolean} [options.animate=true] - Animate row appearance
   * @returns {HTMLElement} The rendered element
   */
  renderLeaderboard(container, options = {}) {
    const el = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    if (!el) {
      console.error('[Leaderboard] Invalid container for renderLeaderboard');
      return null;
    }

    const category = options.category || LEADERBOARD_CATEGORY.GLOBAL;
    const showControls = options.showControls !== false;
    const animate = options.animate !== false;

    const data = this.getEntries({ category });

    // Build HTML
    const html = `
      <div class="lb-container ${animate ? 'lb-animate-in' : ''}">
        <div class="lb-header">
          <h2 class="lb-title">${options.title || this._getCategoryTitle(category)}</h2>
          ${showControls ? this._renderControls(category, data) : ''}
        </div>
        
        <div class="lb-table-wrapper">
          <table class="lb-table">
            <thead>
              <tr>
                <th class="lb-col-rank" data-sort="rank">#</th>
                <th class="lb-col-player" data-sort="playerName">Racer</th>
                <th class="lb-col-vehicle" data-sort="vehicleId">Vehicle</th>
                <th class="lb-col-time" data-sort="timeMs">Time</th>
                <th class="lb-col-laps">Laps</th>
                <th class="lb-col-date" data-sort="date">Date</th>
              </tr>
            </thead>
            <tbody>
              ${data.entries.length > 0 
                ? data.entries.map((entry, idx) => this._renderRow(entry, idx)).join('')
                : this._renderEmptyState()
              }
            </tbody>
          </table>
        </div>
        
        <div class="lb-footer">
          <span class="lb-entry-count">${data.filteredCount} of ${data.totalEntries} entries</span>
        </div>
      </div>
    `;

    el.innerHTML = html;

    // Attach event handlers
    if (showControls) {
      this._attachControlHandlers(el, category);
    }

    return el;
  }

  /**
   * Render statistics summary cards
   * @param {HTMLElement|string} container - DOM element or selector
   * @param {Object} [options] - Render options
   * @returns {HTMLElement} The rendered element
   */
  renderStatsSummary(container, options = {}) {
    const el = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    if (!el) {
      console.error('[Leaderboard] Invalid container for renderStatsSummary');
      return null;
    }

    const stats = this._stats;
    const cards = [
      {
        icon: '🏁',
        label: 'Races Completed',
        value: stats.totalRacesCompleted,
        color: 'var(--accent-primary)'
      },
      {
        icon: '🏆',
        label: 'Total Wins',
        value: stats.totalWins,
        subValue: `${stats.totalLosses} losses`,
        color: 'var(--accent-tertiary)'
      },
      {
        icon: '📏',
        label: 'Distance Traveled',
        value: this._formatDistance(stats.totalDistanceTraveled),
        color: 'var(--accent-secondary)'
      },
      {
        icon: '💨',
        label: 'Top Speed',
        value: `${stats.topSpeedEver} km/h`,
        color: 'var(--success)'
      },
      {
        icon: '📍',
        label: 'Avg. Position',
        value: stats.averageFinishPosition 
          ? `#${stats.averageFinishPosition}`
          : '-',
        color: 'var(--warning)'
      },
      {
        icon: '🛤️',
        label: 'Favorite Track',
        value: this._formatTrackName(stats.favoriteTrack),
        color: 'var(--text-secondary)'
      },
      {
        icon: '🏎️',
        label: 'Best Vehicle',
        value: this._formatVehicleName(stats.bestVehicle),
        color: '#ff6b9d'
      },
      {
        icon: '🌪️',
        label: 'Longest Drift',
        value: `${stats.longestDrift.toFixed(1)}s`,
        color: 'var(--achievement-uncommon, #00ffa8)'
      },
      {
        icon: '📦',
        label: 'Most Items (Race)',
        value: stats.mostItemsInOneRace.toString(),
        color: 'var(--achievement-rare, #00e5ff)'
      },
      {
        icon: '✨',
        label: 'Perfect Races',
        value: stats.perfectRaces.toString(),
        color: 'var(--achievement-legendary, #ffd23f)'
      },
      {
        icon: '⏱️',
        label: 'Play Time',
        value: this._formatPlayTime(stats.totalPlayTime),
        color: 'var(--text-tertiary)'
      },
      {
        icon: '💥',
        label: 'DNFs',
        value: stats.totalDNFs.toString(),
        color: 'var(--danger)'
      }
    ];

    const html = `
      <div class="lb-stats-container ${options.animate !== false ? 'lb-animate-in' : ''}">
        <h3 class="lb-stats-title">Career Statistics</h3>
        <div class="lb-stats-grid">
          ${cards.map(card => `
            <div class="lb-stat-card" style="--stat-color: ${card.color}">
              <div class="lb-stat-icon">${card.icon}</div>
              <div class="lb-stat-content">
                <div class="lb-stat-value">${card.value}</div>
                ${card.subValue ? `<div class="lb-stat-sub">${card.subValue}</div>` : ''}
                <div class="lb-stat-label">${card.label}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    el.innerHTML = html;
    return el;
  }

  /**
   * Render personal best times list
   * @param {HTMLElement|string} container - DOM element or selector
   * @param {Object} [options] - Render options
   * @returns {HTMLElement} The rendered element
   */
  renderPersonalBests(container, options = {}) {
    const el = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    if (!el) {
      console.error('[Leaderboard] Invalid container for renderPersonalBests');
      return null;
    }

    const bests = this.getPersonalBests();

    const html = `
      <div class="lb-personal-container ${options.animate !== false ? 'lb-animate-in' : ''}">
        <h3 class="lb-personal-title">Personal Best Times</h3>
        
        ${bests.length > 0 ? `
          <div class="lb-personal-list">
            ${bests.map((entry, idx) => `
              <div class="lb-personal-item" style="--item-index: ${idx}">
                <div class="lb-personal-track">
                  ${this._formatTrackIcon(entry.trackId)}
                  <span>${this._formatTrackName(entry.trackId)}</span>
                </div>
                <div class="lb-personal-vehicle">
                  ${this._formatVehicleIcon(entry.vehicleId)}
                </div>
                <div class="lb-personal-time">${this._formatTime(entry.timeMs)}</div>
                <div class="lb-personal-date">
                  ${new Date(entry.date).toLocaleDateString()}
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="lb-empty-state lb-empty-personal">
            <div class="lb-empty-icon">🏆</div>
            <p>No personal records yet</p>
            <p class="lb-empty-hint">Complete some races to set your best times!</p>
          </div>
        `}
      </div>
    `;

    el.innerHTML = html;
    return el;
  }

  // ==================== PRIVATE RENDERING HELPERS ====================

  /**
   * Render a single table row
   * @param {Object} entry - Leaderboard entry
   * @param {number} index - Row index for animation delay
   * @returns {string} HTML string
   * @private
   */
  _renderRow(entry, index) {
    const medalClass = entry.rank <= 3 ? `lb-medal-${entry.rank}` : '';
    const playerClass = entry.isPlayer ? 'lb-row-player' : '';
    const medalIcon = this._getMedalIcon(entry.rank);
    const vehicleInfo = this._getVehicleInfo(entry.vehicleId);

    return `
      <tr class="lb-row ${medalClass} ${playerClass}" style="--row-delay: ${index * 30}ms">
        <td class="lb-cell-rank">
          ${medalIcon || `<span class="lb-rank-num">${entry.rank}</span>`}
        </td>
        <td class="lb-cell-player">
          <span class="lb-player-name">${entry.playerName}</span>
          ${entry.isPlayer ? '<span class="lb-player-flag">YOU</span>' : ''}
        </td>
        <td class="lb-cell-vehicle">
          <span class="lb-vehicle-icon" title="${vehicleInfo.name}">${vehicleInfo.icon}</span>
        </td>
        <td class="lb-cell-time">${this._formatTime(entry.timeMs)}</td>
        <td class="lb-cell-laps">${entry.laps}</td>
        <td class="lb-cell-date">${this._formatRelativeDate(entry.date)}</td>
      </tr>
    `;
  }

  /**
   * Render empty state placeholder
   * @returns {string} HTML string
   * @private
   */
  _renderEmptyState() {
    return `
      <tr>
        <td colspan="6" class="lb-empty-state-cell">
          <div class="lb-empty-state">
            <div class="lb-empty-icon">🏁</div>
            <p>No races yet</p>
            <p class="lb-empty-hint">Complete a race to appear on the leaderboard!</p>
          </div>
        </td>
      </tr>
    `;
  }

  /**
   * Render control bar with filters and sorting
   * @param {string} category - Current category
   * @param {Object} data - Leaderboard data
   * @returns {string} HTML string
   * @private
   */
  _renderControls(category, data) {
    return `
      <div class="lb-controls">
        <div class="lb-filters">
          <select class="lb-select lb-track-filter" data-filter="track">
            <option value="">All Tracks</option>
            ${AVAILABLE_TRACKS.map(t => `
              <option value="${t}" ${this._currentFilters.trackFilter === t ? 'selected' : ''}>
                ${this._formatTrackName(t)}
              </option>
            `).join('')}
          </select>
          
          <select class="lb-select lb-class-filter" data-filter="class">
            <option value="">All Classes</option>
            <option value="light" ${this._currentFilters.vehicleClassFilter === 'light' ? 'selected' : ''}>Light</option>
            <option value="medium" ${this._currentFilters.vehicleClassFilter === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="heavy" ${this._currentFilters.vehicleClassFilter === 'heavy' ? 'selected' : ''}>Heavy</option>
          </select>
        </div>
        
        <div class="lb-actions">
          <button class="lb-btn lb-btn-refresh" data-action="refresh" title="Refresh">
            ↻
          </button>
          ${category === LEADERBOARD_CATEGORY.PERSONAL ? '' : `
            <button class="lb-btn lb-btn-mock" data-action="mock" title="Generate Demo Data">
              🎲
            </button>
          `}
        </div>
      </div>
    `;
  }

  /**
   * Attach event handlers to controls
   * @param {HTMLElement} el - Container element
   * @param {string} category - Current category
   * @private
   */
  _attachControlHandlers(el, category) {
    // Filter selects
    el.querySelectorAll('.lb-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const filterType = e.target.dataset.filter;
        const value = e.target.value || null;

        if (filterType === 'track') {
          this._currentFilters.trackFilter = value;
        } else if (filterType === 'class') {
          this._currentFilters.vehicleClassFilter = value;
        }

        this.renderLeaderboard(el, { category, animate: true });
        this.emit('filterChanged', this._currentFilters);
      });
    });

    // Action buttons
    el.querySelectorAll('.lb-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;

        if (action === 'refresh') {
          this.renderLeaderboard(el, { category, animate: true });
        } else if (action === 'mock') {
          this.generateMockData({ 
            trackId: this._currentFilters.trackFilter || 'downtown' 
          });
          this.renderLeaderboard(el, { category, animate: true });
        }
      });
    });
  }

  // ==================== FORMATTING HELPERS ====================

  /**
   * Format time in MM:SS.mmm format
   * @param {number} ms - Time in milliseconds
   * @returns {string} Formatted time string
   */
  _formatTime(ms) {
    if (!ms || ms <= 0) return '--:---';
    
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = Math.floor((ms % 1000));

    return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
  }

  /**
   * Format distance with appropriate unit
   * @param {number} meters - Distance in meters
   * @returns {string} Formatted distance string
   * @private
   */
  _formatDistance(meters) {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  }

  /**
   * Format play time as human-readable string
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted play time
   * @private
   */
  _formatPlayTime(seconds) {
    if (!seconds || seconds === 0) return '0m';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Format relative date (e.g., "2 hours ago")
   * @param {string} isoDate - ISO date string
   * @returns {string} Relative date string
   * @private
   */
  _formatRelativeDate(isoDate) {
    const date = new Date(isoDate);
    const now = Date.now();
    const diff = now - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  /**
   * Format track ID to human-readable name
   * @param {string} trackId - Track identifier
   * @returns {string} Formatted track name
   * @private
   */
  _formatTrackName(trackId) {
    if (!trackId) return 'Unknown';
    return trackId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  /**
   * Format track icon
   * @param {string} trackId - Track identifier
   * @returns {string} Icon character
   * @private
   */
  _formatTrackIcon(trackId) {
    const icons = {
      'downtown': '🏙️',
      'neon-strip': '🌃',
      'industrial-zone': '🏭',
      'skyline': '🌆',
      'underground': '🕳️'
    };
    return icons[trackId] || '📍';
  }

  /**
   * Format vehicle ID to human-readable name
   * @param {string} vehicleId - Vehicle identifier
   * @returns {string} Formatted vehicle name
   * @private
   */
  _formatVehicleName(vehicleId) {
    const vehicle = AVAILABLE_VEHICLES.find(v => v.id === vehicleId);
    return vehicle ? vehicle.name : (vehicleId || 'Unknown');
  }

  /**
   * Format vehicle icon
   * @param {string} vehicleId - Vehicle identifier
   * @returns {string} Icon character
   * @private
   */
  _formatVehicleIcon(vehicleId) {
    const vehicle = AVAILABLE_VEHICLES.find(v => v.id === vehicleId);
    return vehicle ? vehicle.icon : '🏎️';
  }

  /**
   * Get medal icon for rank position
   * @param {number} rank - Rank position (1-3 for medals)
   * @returns {string} Medal emoji or empty string
   * @private
   */
  _getMedalIcon(rank) {
    const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
    return medals[rank] || '';
  }

  /**
   * Get vehicle info object
   * @param {string} vehicleId - Vehicle identifier
   * @returns {Object} Vehicle info with icon and name
   * @private
   */
  _getVehicleInfo(vehicleId) {
    return AVAILABLE_VEHICLES.find(v => v.id === vehicleId) || { 
      id: vehicleId, 
      name: vehicleId, 
      icon: '🏎️' 
    };
  }

  /**
   * Get title for category
   * @param {string} category - Category constant
   * @returns {string} Human-readable title
   * @private
   */
  _getCategoryTitle(category) {
    const titles = {
      [LEADERBOARD_CATEGORY.GLOBAL]: '🌍 Global Leaderboard',
      [LEADERBOARD_CATEGORY.WEEKLY]: '📅 Weekly Rankings',
      [LEADERBOARD_CATEGORY.FRIENDS]: '👥 Friends Rankings',
      [LEADERBOARD_CATEGORY.PERSONAL]: '📊 Personal Records'
    };
    return titles[category] || 'Leaderboard';
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
    const index = callbacks.indexOf(callback);
    if (index > -1) callbacks.splice(index, 1);
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
        console.error(`[Leaderboard] Event error (${event}):`, err);
      }
    });
  }

  /**
   * Check if system is initialized
   * @returns {boolean}
   */
  get isInitialized() {
    return this._isInitialized;
  }

  /**
   * Set the player name for leaderboard entries
   * @param {string} name - New player name
   */
  setPlayerName(name) {
    this._playerName = name;
  }

  /**
   * Set the default vehicle for player entries
   * @param {string} vehicleId - Vehicle ID
   */
  setPlayerVehicle(vehicleId) {
    this._playerVehicleId = vehicleId;
  }
}

// Singleton instance export
const leaderboardSystem = new LeaderboardSystem();

export { LeaderboardSystem, leaderboardSystem, LEADERBOARD_CATEGORY, VEHICLE_CLASSES };
export default leaderboardSystem;
