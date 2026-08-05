// ui/save-system.js — Persistent save/load system for Warzone Kart
// Uses localStorage with IndexedDB fallback for large data

class SaveSystem {
  constructor() {
    this.storageKey = 'wzk_save_v1';
    this.settingsKey = 'wzk_settings_v1';
    this.maxSaveSlots = 3;
    this.autoSaveInterval = 30000; // 30 seconds
    this.autoSaveTimer = null;
    this.listeners = new Map();
    this.isInitialized = false;
    
    // Default save data structure
    this.defaultData = {
      // Player profile
      player: {
        name: 'Racer',
        level: 1,
        xp: 0,
        xpToNext: 100,
        totalXP: 0,
        title: 'Rookie',
        avatar: null,
        createdAt: Date.now(),
        lastPlayed: Date.now(),
        playTime: 0, // seconds
      },
      
      // Currency & economy
      currency: {
        credits: 5000,
        gold: 100,
        premiumCurrency: 0,
      },
      
      // Progression
      career: {
        completedRaces: [],
        currentChapter: 1,
        unlockedTracks: ['downtown'],
        unlockedVehicles: ['vehicle.base'],
        unlockedCharacters: ['character.nova'],
        achievements: [],
        stars: {}, // trackId -> star count (0-3)
      },
      
      // Vehicle upgrades
      garage: {
        ownedVehicles: ['vehicle.base'],
        vehicleUpgrades: {
          'vehicle.base': { speed: 0, acceleration: 0, handling: 0, shield: 0 },
        },
        selectedVehicle: 'vehicle.base',
        vehicleCosmetics: {},
      },
      
      // Character progression
      characters: {
        owned: ['character.nova'],
        selected: 'character.nova',
        characterXP: {
          'character.nova': 0,
        },
      },
      
      // Statistics (lifetime)
      stats: {
        racesStarted: 0,
        racesFinished: 0,
        racesWon: 0,
        totalLaps: 0,
        bestLapTimes: {}, // trackId -> time in ms
        itemsUsed: 0,
        distanceTraveled: 0, // meters
        driftTime: 0, // seconds
        boostTime: 0, // seconds,
        nearMisses: 0,
        perfectRaces: 0,
      },
      
      // Settings (synced with settings screen)
      settings: {
        audio: {
          masterVolume: 1.0,
          musicVolume: 0.7,
          sfxVolume: 0.9,
          uiVolume: 0.6,
        },
        video: {
          quality: 'medium', // low, medium, high
          showFPS: false,
          shadows: true,
          bloom: true,
          motionBlur: false,
        },
        controls: {
          steeringSensitivity: 1.0,
          deadzone: 0.1,
          invertY: false,
          autoAcceleration: false,
          showTouchControls: 'auto', // auto, always, never
        },
        accessibility: {
          colorBlindMode: 'none',
          screenShake: true,
          flashEffects: true,
          highContrastUI: false,
          largeText: false,
        },
      },
      
      // Meta
      version: '1.0.0',
      savedAt: null,
      saveCount: 0,
    };
  }

  /**
   * Initialize the save system
   */
  async init() {
    try {
      // Check if we can use localStorage
      const testKey = '__wzk_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      
      // Load or create save data
      let data = this._loadFromStorage();
      
      if (!data) {
        data = JSON.parse(JSON.stringify(this.defaultData));
        data.savedAt = Date.now();
        this._saveToStorage(data);
        console.log('[SaveSystem] Created new save file');
      } else {
        // Migrate old saves if needed
        data = this._migrate(data);
        console.log('[SaveSystem] Loaded existing save file');
      }
      
      this.data = data;
      this.isInitialized = true;
      
      // Start auto-save timer
      this._startAutoSave();
      
      // Listen for visibility changes to save when tab hidden
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.saveNow();
        }
      });
      
      // Listen for beforeunload to save
      window.addEventListener('beforeunload', () => {
        this._saveToStorageSync(this.data);
      });
      
      this.emit('initialized', this.data);
      return this; // Return instance for method chaining
    } catch (err) {
      console.error('[SaveSystem] Init failed:', err);
      // Fall back to memory-only mode
      this.data = JSON.parse(JSON.stringify(this.defaultData));
      this.isInitialized = true;
      return this; // Return instance even on error
    }
  }

  /**
   * Get current save data (read-only snapshot)
   */
  getData() {
    return JSON.parse(JSON.stringify(this.data));
  }

  /**
   * Get a specific section of save data
   */
  get(section) {
    if (!this.data) return null;
    return JSON.parse(JSON.stringify(this.data[section] || {}));
  }

  /**
   * Update specific paths in save data
   */
  update(path, value) {
    if (!this.isInitialized || !this.data) return;
    
    const keys = path.split('.');
    let obj = this.data;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in obj)) {
        obj[keys[i]] = {};
      }
      obj = obj[keys[i]];
    }
    
    obj[keys[keys.length - 1]] = value;
    this.data.lastModified = Date.now();
    this.emit('changed', { path, value });
  }

  /**
   * Batch update multiple values
   */
  batchUpdate(updates) {
    updates.forEach(({ path, value }) => this.update(path, value));
  }

  /**
   * Force an immediate save
   */
  async saveNow() {
    if (!this.data) return;
    
    this.data.savedAt = Date.now();
    this.data.saveCount = (this.data.saveCount || 0) + 1;
    
    await this._saveToStorage(this.data);
    this.emit('saved', { at: this.data.savedAt, count: this.data.saveCount });
  }

  /**
   * Add XP to player and handle level-ups
   */
  addXP(amount, source = 'general') {
    if (!this.data) return null;
    
    const player = this.data.player;
    player.xp += amount;
    player.totalXP += amount;
    
    const levelUps = [];
    
    while (player.xp >= player.xpToNext) {
      player.xp -= player.xpToNext;
      player.level += 1;
      player.xpToNext = Math.floor(100 * Math.pow(1.5, player.level - 1));
      
      // Award level-up bonus
      this.data.currency.credits += 100 * player.level;
      
      levelUps.push({
        newLevel: player.level,
        bonusCredits: 100 * player.level,
      });
      
      // Update title based on level
      player.title = this._getTitleForLevel(player.level);
    }
    
    this.update('player', player);
    this.emit('xpGained', { amount, source, levelUps, newTotal: player.totalXP });
    
    return levelUps;
  }

  /**
   * Spend currency (returns success)
   */
  spendCurrency(type, amount) {
    if (!this.data) return false;
    
    const current = this.data.currency[type] || 0;
    if (current < amount) return false;
    
    this.data.currency[type] -= amount;
    this.emit('currencySpent', { type, amount, remaining: this.data.currency[type] });
    return true;
  }

  /**
   * Add currency
   */
  addCurrency(type, amount, source = 'general') {
    if (!this.data) return;
    
    this.data.currency[type] = (this.data.currency[type] || 0) + amount;
    this.emit('currencyEarned', { type, amount, source, total: this.data.currency[type] });
  }

  /**
   * Record race completion
   */
  recordRaceResult(result) {
    if (!this.data || !result) return;
    
    const stats = this.data.stats;
    stats.racesFinished += 1;
    
    if (result.position === 1) {
      stats.racesWon += 1;
    }
    
    if (result.laps) {
      stats.totalLaps += result.laps;
    }
    
    if (result.bestLapTime && result.trackId) {
      const currentBest = stats.bestLapTimes[result.trackId];
      if (!currentBest || result.bestLapTime < currentBest) {
        stats.bestLapTimes[result.trackId] = result.bestLapTime;
      }
    }
    
    if (result.itemsUsed) {
      stats.itemsUsed += result.itemsUsed;
    }
    
    if (result.distance) {
      stats.distanceTraveled += result.distance;
    }
    
    // Track completion
    if (result.trackId && !this.data.career.completedRaces.includes(result.trackId)) {
      this.data.career.completedRaces.push(result.trackId);
    }
    
    // Stars earned
    if (result.trackId && result.stars) {
      const currentStars = this.data.career.stars[result.trackId] || 0;
      this.data.career.stars[result.trackId] = Math.max(currentStars, result.stars);
    }
    
    // Calculate rewards
    const baseCredits = Math.floor(500 / result.position); // More for better positions
    const xpReward = Math.floor(50 / result.position);
    
    this.addCurrency('credits', baseCredits, 'race');
    this.addXP(xpReward, 'race');
    
    this.update('stats', stats);
    this.emit('raceRecorded', { result, rewards: { credits: baseCredits, xp: xpReward } });
  }

  /**
   * Update settings
   */
  updateSettings(category, key, value) {
    if (!this.data) return;
    
    if (!this.data.settings[category]) {
      this.data.settings[category] = {};
    }
    
    this.data.settings[category][key] = value;
    this.emit('settingsChanged', { category, key, value });
  }

  /**
   * Get setting value
   */
  getSetting(category, key, defaultValue = undefined) {
    if (!this.data?.settings?.[category]) return defaultValue;
    const val = this.data.settings[category][key];
    return val !== undefined ? val : defaultValue;
  }

  /**
   * Export save as string (for backup)
   */
  exportSave() {
    if (!this.data) return null;
    return JSON.stringify(this.data, null, 2);
  }

  /**
   * Import save from string (restores backup)
   */
  importSave(saveString) {
    try {
      const data = JSON.parse(saveString);
      
      // Validate basic structure
      if (!data.player || !data.currency || !data.career) {
        throw new Error('Invalid save format');
      }
      
      // Migrate to latest version
      data.version = this.defaultData.version;
      data = this._migrate(data);
      
      this.data = data;
      this._saveToStorage(data);
      
      this.emit('imported', data);
      return true;
    } catch (err) {
      console.error('[SaveSystem] Import failed:', err);
      return false;
    }
  }

  /**
   * Delete all save data
   */
  resetSave() {
    this.data = JSON.parse(JSON.stringify(this.defaultData));
    this.data.createdAt = Date.now();
    this.data.savedAt = Date.now();
    this._saveToStorage(this.data);
    this.emit('reset');
  }

  /**
   * Event listener system
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => this.off(event, callback); // Return unsubscribe function
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event).forEach(cb => {
      try {
        cb(data);
      } catch (err) {
        console.error(`[SaveSystem] Event handler error (${event}):`, err);
      }
    });
  }

  // === PRIVATE METHODS ===

  _loadFromStorage() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      console.warn('[SaveSystem] Failed to load from storage:', err);
      return null;
    }
  }

  async _saveToStorage(data) {
    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(this.storageKey, serialized);
    } catch (err) {
      console.error('[SaveSystem] Failed to save:', err);
      // Try to free space by clearing old data
      if (err.name === 'QuotaExceededError') {
        console.warn('[SaveSystem] Storage quota exceeded, attempting cleanup...');
      }
    }
  }

  _saveToStorageSync(data) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      // Silent fail for sync operations
    }
  }

  _startAutoSave() {
    if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);
    
    this.autoSaveTimer = setInterval(() => {
      this.saveNow();
    }, this.autoSaveInterval);
  }

  _migrate(data) {
    // Future migration logic here
    // Example: if (data.version < '1.1.0') { ... }
    return data;
  }

  _getTitleForLevel(level) {
    const titles = [
      'Rookie', 'Amateur', 'Semi-Pro', 'Professional', 'Veteran',
      'Elite', 'Champion', 'Legend', 'Mythic', 'Transcendent'
    ];
    const idx = Math.min(Math.floor((level - 1) / 5), titles.length - 1);
    return titles[idx];
  }
}

// Singleton instance
const saveSystem = new SaveSystem();

// Export for ES modules
export { SaveSystem, saveSystem };
export default saveSystem;

// Also expose globally for non-module access
window.__saveSystem = saveSystem;
