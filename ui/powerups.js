// ui/powerups.js — Enhanced Power-Up/Item System for Warzone Kart: Neon Underground
// 
// Features:
// - 17 power-up types across 5 categories (Speed, Defensive, Offensive, Tactical, Utility)
// - Position-based item generation (catch-up mechanics)
// - Rarity weighting system (Common 60%, Uncommon 25%, Rare 12%, Legendary 3%)
// - Visual feedback with particle effects configuration
// - Event-based system via engine.bus
// - HUD integration for item slot display
// - Active power-up tracking with timers
// CSS: loaded via ui/styles/powerups.css in index.html

/**
 * Power-up categories for organization and behavior grouping
 * @enum {string}
 */
export const POWERUP_CATEGORY = {
  SPEED: 'speed',
  DEFENSIVE: 'defensive',
  OFFENSIVE: 'offensive',
  TACTICAL: 'tactical',
  UTILITY: 'utility'
};

/**
 * Power-up rarity levels with spawn weights
 * @enum {Object}
 */
export const POWERUP_RARITY = {
  COMMON: { name: 'common', weight: 60, color: '#8a8a8a' },
  UNCOMMON: { name: 'uncommon', weight: 25, color: '#00ffa8' },
  RARE: { name: 'rare', weight: 12, color: '#00e5ff' },
  LEGENDARY: { name: 'legendary', weight: 3, color: '#ffd23f' }
};

/**
 * Complete power-up definitions for Warzone Kart
 * Each power-up includes behavior config, visual settings, and effects
 */
const POWERUP_DEFINITIONS = [
  // ==================== SPEED BOOSTS ====================
  {
    id: 'nitro',
    name: 'Nitro Boost',
    description: '3 second 2x speed boost',
    category: POWERUP_CATEGORY.SPEED,
    rarity: POWERUP_RARITY.COMMON,
    icon: '🔥',
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
    
    // Behavior configuration
    duration: 3000,
    speedMultiplier: 2.0,
    stackable: false,
    canUseWhileMoving: true,
    maxStacks: 1,
    
    // Visual effects
    effects: {
      trail: {
        type: 'flame',
        color: '#ff6b35',
        opacity: 0.8,
        lifetime: 500,
        count: 20
      },
      screen: {
        vignette: { color: '#ff4400', intensity: 0.2 }
      },
      vehicle: {
        glow: { color: '#ff6b35', intensity: 0.5 }
      }
    },
    
    // Sound effect key
    soundId: 'game.boost'
  },
  {
    id: 'superNitro',
    name: 'Super Nitro',
    description: '5 second 3x speed boost (rare)',
    category: POWERUP_CATEGORY.SPEED,
    rarity: POWERUP_RARITY.RARE,
    icon: '💥',
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/><circle cx="12" cy="12" r="10"/></svg>`,
    
    duration: 5000,
    speedMultiplier: 3.0,
    stackable: false,
    canUseWhileMoving: true,
    maxStacks: 1,
    
    effects: {
      trail: {
        type: 'superFlame',
        color: '#ff0044',
        secondaryColor: '#ffff00',
        opacity: 1.0,
        lifetime: 800,
        count: 35
      },
      screen: {
        vignette: { color: '#ff0000', intensity: 0.35 },
        shake: { intensity: 0.1, duration: 100 }
      },
      vehicle: {
        glow: { color: '#ff0044', intensity: 0.8 },
        particles: true
      }
    },
    
    soundId: 'game.boost'
  },
  {
    id: 'boostPad',
    name: 'Boost Pad',
    description: 'Track-placed boost zone',
    category: POWERUP_CATEGORY.SPEED,
    rarity: null, // Not obtainable from item boxes
    icon: '⚡',
    isTrackItem: true,
    
    duration: 1500,
    speedMultiplier: 1.5,
    stackable: true,
    maxStacks: 3,
    
    effects: {
      trail: {
        type: 'sparkle',
        color: '#00e5ff',
        opacity: 0.6,
        lifetime: 300,
        count: 15
      }
    }
  },

  // ==================== DEFENSIVE ITEMS ====================
  {
    id: 'shield',
    name: 'Shield',
    description: 'Absorb one hit or attack',
    category: POWERUP_CATEGORY.DEFENSIVE,
    rarity: POWERUP_RARITY.COMMON,
    icon: '🛡️',
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    
    duration: 0, // Passive until used/hit
    hitsToAbsorb: 1,
    reflectsProjectiles: false,
    visualIndicator: true,
    
    effects: {
      vehicle: {
        shieldBubble: {
          color: '#00e5ff',
          opacity: 0.4,
          pulseSpeed: 2000
        }
      }
    },
    
    soundId: 'ui.confirm'
  },
  {
    id: 'superShield',
    name: 'Super Shield',
    description: 'Absorb 3 hits + reflects projectiles',
    category: POWERUP_CATEGORY.DEFENSIVE,
    rarity: POWERUP_RARITY.RARE,
    icon: '🔰',
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4M12 16h.01"/></svg>`,
    
    duration: 10000, // 10 seconds of active shielding
    hitsToAbsorb: 3,
    reflectsProjectiles: true,
    reflectDamage: 0.5, // 50% damage reflected
    visualIndicator: true,
    
    effects: {
      vehicle: {
        shieldBubble: {
          color: '#aa00ff',
          opacity: 0.6,
          pulseSpeed: 1500,
          layers: 3
        },
        reflectEffect: {
          type: 'spark',
          color: '#aa00ff'
        }
      },
      onReflect: {
        sound: 'ui.success',
        visual: 'shield_reflect'
      }
    },
    
    soundId: 'ui.confirm'
  },
  {
    id: 'ghost',
    name: 'Ghost Mode',
    description: '3 seconds invincibility + pass through opponents',
    category: POWERUP_CATEGORY.DEFENSIVE,
    rarity: POWERUP_RARITY.UNCOMMON,
    icon: '👻',
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a5 5 0 015 5v3a5 5 0 01-10 0V7a5 5 0 015-5z"/><path d="M8 14v7M12 14v7M16 14v7"/></svg>`,
    
    duration: 3000,
    isInvincible: true,
    canPassThroughOpponents: true,
    invisibleToHoming: true,
    
    effects: {
      vehicle: {
        transparency: 0.5,
        ghostTrail: {
          color: '#ffffff',
          opacity: 0.3,
          interval: 100
        },
        glow: { color: '#ffffff', intensity: 0.3 }
      }
    },
    
    soundId: 'ui.navigate'
  },
  {
    id: 'magnet',
    name: 'Item Magnet',
    description: 'Attract nearby items for 5 seconds',
    category: POWERUP_CATEGORY.DEFENSIVE,
    rarity: POWERUP_RARITY.UNCOMMON,
    icon: '🧲',
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 15V9a6 6 0 0112 0v6M6 15H4a2 2 0 01-2-2v-2c0-1.1.9-2 2-2h2m12 0h2a2 2 0 012 2v2a2 2 0 01-2 2h-2"/><line x1="6" y1="15" x2="18" y2="15"/></svg>`,
    
    duration: 5000,
    attractRadius: 30, // meters
    attractForce: 15,
    attractItems: true,
    attractCoins: true,
    
    effects: {
      vehicle: {
        magneticField: {
          color: '#00ffa8',
          radius: 30,
          pulseSpeed: 1000,
          showField: true
        }
      }
    },
    
    soundId: 'item.pickup'
  },

  // ==================== OFFENSIVE ITEMS ====================
  {
    id: 'missile',
    name: 'Homing Missile',
    description: 'Homing missile targets nearest opponent ahead',
    category: POWERUP_CATEGORY.OFFENSIVE,
    rarity: POWERUP_RARITY.UNCOMMON,
    icon: '🚀',
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09zM12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>`,
    
    targetMode: 'nearest_ahead',
    speed: 80,
    turnRate: 3,
    damage: 40,
    homingStrength: 0.95,
    lifetime: 4000,
    
    effects: {
      projectile: {
        trail: { color: '#ff4444', length: 20 },
        smoke: true
      },
      onHit: {
        explosion: { radius: 5, color: '#ff6600' },
        knockback: 25,
        stunDuration: 500
      }
    },
    
    soundId: 'game.crash'
  },
  {
    id: 'tripleMissile',
    name: 'Triple Missile',
    description: '3 missiles at once in a spread pattern',
    category: POWERUP_CATEGORY.OFFENSIVE,
    rarity: POWERUP_RARITY.RARE,
    icon: '🎯',
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09zM12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/><circle cx="19" cy="5" r="3"/><circle cx="20" cy="10" r="2"/><circle cx="18" cy="14" r="2"/></svg>`,
    
    targetMode: 'spread',
    missileCount: 3,
    spreadAngle: 15, // degrees each side
    speed: 75,
    damage: 30,
    lifetime: 3500,
    
    effects: {
      projectile: {
        trail: { color: '#ff8844', length: 15 },
        smoke: true
      },
      launchEffect: {
        type: 'triple_launch',
        flash: true
      }
    },
    
    soundId: 'game.crash'
  },
  {
    id: 'mine',
    name: 'Mine',
    description: 'Drop behind, explodes when opponents drive over it',
    category: POWERUP_CATEGORY.OFFENSIVE,
    rarity: POWERUP_RARITY.UNCOMMON,
    icon: '💣',
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="14" r="8"/><circle cx="12" cy="14" r="2"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="2" x2="8" y2="4"/><line x1="12" y1="2" x2="16" y2="4"/></svg>`,
    
    placement: 'behind',
    armTime: 1000, // Time before mine becomes active
    lifetime: 30000, // Mine disappears after 30 seconds
    explosionRadius: 8,
    damage: 50,
    maxActive: 3,
    
    effects: {
      placement: {
        animation: 'drop_bounce'
      },
      active: {
        indicator: { color: '#ff0000', blinkSpeed: 500 }
      },
      explosion: {
        radius: 8,
        color: '#ff4400',
        debris: true,
        shockwave: true
      }
    },
    
    soundId: 'game.item'
  },
  {
    id: 'shockwave',
    name: 'Shockwave',
    description: 'Stun all nearby opponents briefly',
    category: POWERUP_CATEGORY.OFFENSIVE,
    rarity: POWERUP_RARITY.RARE,
    icon: '💫',
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
    
    radius: 25,
    stunDuration: 2000,
    damage: 15,
    affectsAllNearby: true,
    
    effects: {
      activation: {
        expandRing: {
          color: '#aa00ff',
          speed: 50,
          fadeDistance: 25
        }
      },
      onHit: {
        stunVisual: { icon: '💫', duration: 2000 },
        slowEffect: { multiplier: 0.2, duration: 2000 }
      }
    },
    
    soundId: 'ui.error'
  },

  // ==================== TACTICAL ITEMS ====================
  {
    id: 'swap',
    name: 'Position Swap',
    description: 'Swap positions with random opponent',
    category: POWERUP_CATEGORY.TACTICAL,
    rarity: POWERUP_RARITY.RARE,
    icon: '🔄',
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>`,
    
    targetType: 'random',
    range: 'any_position',
    warningTime: 500, // Brief warning to target
    
    effects: {
      self: {
        flash: { color: '#00ffa8', duration: 300 }
      },
      target: {
        flash: { color: '#ff4466', duration: 300 },
        swapAnimation: true
      },
      teleportEffect: {
        type: 'swap_flash',
        bothPlayers: true
      }
    },
    
    soundId: 'ui.navigate'
  },
  {
    id: 'freeze',
    name: 'Freeze Ray',
    description: 'Freeze nearest opponent for 2 seconds',
    category: POWERUP_CATEGORY.TACTICAL,
    rarity: POWERUP_RARITY.UNCOMMON,
    icon: '❄️',
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/><line x1="19.07" y1="4.93" x2="4.93" y2="19.07"/></svg>`,
    
    targetMode: 'nearest',
    freezeDuration: 2000,
    range: 40,
    projectile: true,
    projectileSpeed: 120,
    
    effects: {
      projectile: {
        trail: { color: '#00e5ff', type: 'beam' }
      },
      onHit: {
        freezeVisual: {
          iceOverlay: true,
          frostParticles: true,
          color: '#aaddff'
        },
        slowMultiplier: 0
      }
    },
    
    soundId: 'game.drift'
  },
  {
    id: 'steal',
    name: 'Item Stealer',
    description: 'Steal item from nearest opponent',
    category: POWERUP_CATEGORY.TACTICAL,
    rarity: POWERUP_RARITY.RARE,
    icon: '🎭',
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.24 12.24a6 6 0 00-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/></svg>`,
    
    targetMode: 'nearest_with_item',
    range: 20,
    stealChance: 1.0, // 100% if in range
    
    effects: {
      beam: {
        color: '#ffd23f',
        duration: 300
      },
      stolen: {
        notification: true,
        transferAnimation: true
      }
    },
    
    soundId: 'ui.confirm'
  },

  // ==================== UTILITY ITEMS ====================
  {
    id: 'teleport',
    name: 'Teleport',
    description: 'Forward teleport 200m along track',
    category: POWERUP_CATEGORY.UTILITY,
    rarity: POWERUP_RARITY.RARE,
    icon: '✨',
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><path d="M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`,
    
    distance: 200, // meters forward
    teleportType: 'forward_along_track',
    castTime: 500,
    
    effects: {
      preTeleport: {
        chargeUp: {
          color: '#aa00ff',
          duration: 500
        }
      },
      teleport: {
        flash: { color: '#ffffff', duration: 200 },
        trail: { color: '#aa00ff', persist: 500 }
      },
      arrival: {
        ripple: { color: '#aa00ff', radius: 10 }
      }
    },
    
    soundId: 'ui.success'
  },
  {
    id: 'timeSlow',
    name: 'Time Slow',
    description: 'Slow all other racers for 3 seconds',
    category: POWERUP_CATEGORY.UTILITY,
    rarity: POWERUP_RARITY.LEGENDARY,
    icon: '⏰',
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    
    duration: 3000,
    slowMultiplier: 0.4, // Others move at 40% speed
    affectsSelf: false,
    affectsOthers: true,
    
    effects: {
      global: {
        tint: { color: '#6644cc', opacity: 0.2 },
        timeRipple: true
      },
      self: {
        highlight: { color: '#ffffff', glow: true }
      },
      others: {
        motionBlur: true,
        desaturate: 0.5
      }
    },
    
    soundId: 'menu.ambient'
  },
  {
    id: 'compass',
    name: 'Guidance Compass',
    description: 'Shows shortest route to next checkpoint',
    category: POWERUP_CATEGORY.UTILITY,
    rarity: POWERUP_RARITY.COMMON,
    icon: '🧭',
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
    
    duration: 10000,
    showOptimalPath: true,
    highlightCheckpoint: true,
    showArrowsOnTrack: true,
    
    effects: {
      hud: {
        pathLine: {
          color: '#ffd23f',
          style: 'dashed',
          animate: true
        },
        checkpointHighlight: {
          color: '#ffd23f',
          pulse: true
        },
        directionArrow: {
          color: '#ffffff',
          size: 'large'
        }
      }
    },
    
    soundId: 'ui.click'
  }
];

/**
 * Position-based drop tables for catch-up mechanics
 * Better items given to players further behind
 */
const POSITION_DROP_TABLES = {
  // Last place (position 8/8) - Best offensive items
  last: {
    weights: {
      missile: 25,
      tripleMissile: 15,
      shockwave: 10,
      swap: 15,
      nitro: 20,
      superNitro: 10,
      freeze: 5
    }
  },
  
  // Near last (positions 6-7)
  near_last: {
    weights: {
      missile: 20,
      tripleMissile: 10,
      nitro: 25,
      superNitro: 8,
      swap: 12,
      freeze: 10,
      shockwave: 5,
      teleport: 10
    }
  },
  
  // Middle positions (4-5)
  middle: {
    weights: {
      nitro: 25,
      shield: 20,
      ghost: 15,
      missile: 15,
      magnet: 10,
      compass: 8,
      freeze: 7
    }
  },
  
  // Near front (positions 2-3)
  near_front: {
    weights: {
      shield: 25,
      ghost: 20,
      mine: 18,
      superShield: 10,
      nitro: 15,
      magnet: 7,
      steal: 5
    }
  },
  
  // First place - Defensive items only
  first: {
    weights: {
      shield: 28,
      superShield: 15,
      ghost: 22,
      mine: 20,
      magnet: 10,
      timeSlow: 5
    }
  }
};

/**
 * @class PowerUpSystem
 * Main power-up management class
 * 
 * @example
 * // Initialize
 * const powerUps = new PowerUpSystem();
 * await powerUps.init();
 * 
 * // Get item based on position
 * const item = powerUps.generateItem(3, 8); // 3rd place out of 8
 * 
 * // Use current item
 * powerUps.useCurrentItem();
 */
class PowerUpSystem {
  constructor() {
    /** @type {Map<string, Object>} Power-up definitions map */
    this.definitions = new Map();
    
    /** @type {Array} Currently held items (max 2 by default) */
    this._inventory = [];
    
    /** @type {number} Maximum inventory size */
    this._maxInventorySize = 2;
    
    /** @type {Object|null} Currently active power-up with timer */
    this._activePowerUp = null;
    
    /** @type {number} Active power-up end timestamp */
    this._activePowerUpEndTime = 0;
    
    /** @type {boolean} Initialization state flag */
    this._isInitialized = false;
    
    /** @type {Object|null} Reference to EventBus */
    this._eventBus = null;
    
    /** @type {Object|null} Reference to AchievementSystem */
    this._achievementSystem = null;
    
    /** @type {Object|null} Reference to AudioEffects */
    this._audioEffects = null;
    
    /** @type {HTMLElement|null} Item slot UI element */
    this._itemSlotElement = null;
    
    /** @type {HTMLElement|null} Active power-up display element */
    this._activeDisplayElement = null;
    
    /** @type {Array} Animation frame handles for cleanup */
    this._animationFrames = [];
    
    /** @type {Array} Timer handles for cleanup */
    this._timers = [];
    
    /** @type {Object} Usage statistics for achievements */
    this._stats = {
      itemsCollected: 0,
      itemsUsed: 0,
      byType: {}
    };

    // Initialize definitions
    this._loadDefinitions();
  }

  /**
   * Load power-up definitions into internal map
   * @private
   */
  _loadDefinitions() {
    POWERUP_DEFINITIONS.forEach(def => {
      this.definitions.set(def.id, def);
      
      // Initialize type stats
      if (!this._stats.byType[def.id]) {
        this._stats.byType[def.id] = { collected: 0, used: 0 };
      }
    });
  }

  /**
   * Initialize the power-up system
   * 
   * @param {Object} [options] - Initialization options
   * @param {Object} [options.eventBus] - EventBus instance
   * @param {Object} [options.achievementSystem] - AchievementSystem instance
   * @param {Object} [options.audioEffects] - AudioEffects instance
   * @param {number} [options.maxInventorySize=2] - Max items player can hold
   * @returns {Promise<PowerUpSystem>} This instance for chaining
   */
  async init(options = {}) {
    if (this._isInitialized) return this;

    this._eventBus = options.eventBus || window.__engine?.bus || null;
    this._achievementSystem = options.achievementSystem || window.__achievements || null;
    this._audioEffects = options.audioEffects || window.__audioEffects || null;
    
    if (options.maxInventorySize) {
      this._maxInventorySize = options.maxInventorySize;
    }

    try {
      // Create UI elements
      this._createUIElements();
      
      // Setup event listeners
      this._setupEventListeners();
      
      this._isInitialized = true;
      console.log(`[PowerUpSystem] Initialized with ${this.definitions.size} power-ups`);
      console.log('[PowerUpSystem] Inventory size:', this._maxInventorySize);
      
      this.emit('initialized', {
        totalPowerUps: this.definitions.size,
        maxInventory: this._maxInventorySize
      });
      
      return this;
    } catch (err) {
      console.error('[PowerUpSystem] Init failed:', err);
      throw err;
    }
  }

  /**
   * Create UI elements for item slot and active power-up display
   * @private
   */
  _createUIElements() {
    // Create item slot container if not exists
    this._itemSlotElement = document.getElementById('powerup-item-slot');
    
    if (!this._itemSlotElement) {
      this._itemSlotElement = document.createElement('div');
      this._itemSlotElement.id = 'powerup-item-slot';
      this._itemSlotElement.className = 'powerup-item-slot';
      document.body.appendChild(this._itemSlotElement);
    }
    
    // Create active power-up display
    this._activeDisplayElement = document.getElementById('powerup-active-display');
    
    if (!this._activeDisplayElement) {
      this._activeDisplayElement = document.createElement('div');
      this._activeDisplayElement.id = 'powerup-active-display';
      this._activeDisplayElement.className = 'powerup-active-display';
      document.body.appendChild(this._activeDisplayElement);
    }
    
    this._updateItemSlotDisplay();
  }

  /**
   * Setup event listeners for game events
   * @private
   */
  _setupEventListeners() {
    if (!this._eventBus) {
      console.warn('[PowerUpSystem] No EventBus available - events disabled');
      return;
    }

    // Listen for item box hits
    const unsubItemBox = this._eventBus.on('itembox:hit', () => {
      this.onItemBoxHit();
    });
    this._eventListeners.push(unsubItemBox);

    // Listen for position changes (for potential auto-use or UI updates)
    const unsubPositionChange = this._eventBus.on('player:positionChanged', ({ position }) => {
      this._currentPosition = position;
    });
    this._eventListeners.push(unsubPositionChange);

    // Listen for item use requests (from input/HUD)
    const unsubUseRequest = this._eventBus.on('player:useItem', () => {
      this.useCurrentItem();
    });
    this._eventListeners.push(unsubUseRequest);

    console.log('[PowerUpSystem] Event listeners configured');
  }

  // ==================== PUBLIC API ====================

  /**
   * Generate a random power-up based on player position
   * Uses position-weighted drop tables for catch-up mechanics
   * 
   * @param {number} playerPosition - Current race position (1st = 1)
   * @param {number} totalRacers - Total number of racers
   * @returns {Object|null} The generated power-up definition or null if inventory full
   * 
   * @example
   * // Player in last place gets better items
   * const item = powerUps.generateItem(8, 8); // Likely offensive item
   * 
   * // Player in first gets defensive items
   * const item = powerUps.generateItem(1, 8); // Likely shield/ghost
   */
  generateItem(playerPosition, totalRacers) {
    if (this._inventory.length >= this._maxInventorySize) {
      console.warn('[PowerUpSystem] Inventory full - cannot collect item');
      return null;
    }

    // Determine which drop table to use
    const positionRatio = playerPosition / totalRacers;
    let dropTable;
    
    if (positionRatio >= 0.875) { // Last place
      dropTable = POSITION_DROP_TABLES.last;
    } else if (positionRatio >= 0.625) { // Near last
      dropTable = POSITION_DROP_TABLES.near_last;
    } else if (positionRatio >= 0.375) { // Middle
      dropTable = POSITION_DROP_TABLES.middle;
    } else if (positionRatio > 0.125) { // Near front
      dropTable = POSITION_DROP_TABLES.near_front;
    } else { // First place
      dropTable = POSITION_DROP_TABLES.first;
    }

    // Weighted random selection from drop table
    const itemId = this._weightedRandom(dropTable.weights);
    
    if (!itemId) {
      console.warn('[PowerUpSystem] Failed to generate item from drop table');
      return null;
    }

    const itemDef = this.definitions.get(itemId);
    if (!itemDef) {
      console.warn(`[PowerUpSystem] Unknown item ID: ${itemId}`);
      return null;
    }

    // Add to inventory
    this.addToInventory(itemDef);
    
    return itemDef;
  }

  /**
   * Generate a completely random power-up (ignoring position)
   * Used for testing or special item boxes
   * 
   * @returns {Object|null} Random power-up definition or null
   */
  generateRandomItem() {
    if (this._inventory.length >= this._maxInventorySize) {
      return null;
    }

    // Filter out track-only items
    const availableItems = [...this.definitions.values()].filter(item => !item.isTrackItem);
    
    if (availableItems.length === 0) return null;
    
    // Apply rarity weighting
    const weightedItems = [];
    availableItems.forEach(item => {
      const weight = item.rarity ? item.rarity.weight : 50;
      for (let i = 0; i < weight; i++) {
        weightedItems.push(item);
      }
    });

    const selectedItem = weightedItems[Math.floor(Math.random() * weightedItems.length)];
    this.addToInventory(selectedItem);
    
    return selectedItem;
  }

  /**
   * Add a specific item to inventory
   * 
   * @param {Object|string} itemDefOrId - Item definition object or ID string
   * @returns {boolean} Success status
   */
  addToInventory(itemDefOrId) {
    if (this._inventory.length >= this._maxInventorySize) {
      return false;
    }

    const itemDef = typeof itemDefOrId === 'string' 
      ? this.definitions.get(itemDefOrId)
      : itemDefOrId;

    if (!itemDef) {
      console.warn('[PowerUpSystem] Invalid item');
      return false;
    }

    this._inventory.push({
      ...itemDef,
      collectedAt: Date.now()
    });

    // Update stats
    this._stats.itemsCollected++;
    if (this._stats.byType[itemDef.id]) {
      this._stats.byType[itemDef.id].collected++;
    }

    // Update UI
    this._updateItemSlotDisplay();

    // Emit event
    this.emit('collected', {
      item: itemDef,
      inventoryCount: this._inventory.length,
      inventoryMax: this._maxInventorySize
    });

    if (this._eventBus) {
      this._eventBus.emit('powerup:collected', { type: itemDef.id, item: itemDef });
    }

    // Track for achievements
    if (this._achievementSystem) {
      this._achievementSystem.check('item_master', this._stats.itemsUsed + this._stats.itemsCollected);
    }

    console.log(`[PowerUpSystem] Collected: ${itemDef.name}`);
    return true;
  }

  /**
   * Use the first item in inventory (FIFO)
   * 
   * @returns {Object|null} The used item definition or null if no item
   */
  useCurrentItem() {
    if (this._inventory.length === 0) {
      console.log('[PowerUpSystem] No item to use');
      return null;
    }

    const item = this._inventory.shift();
    
    // Update stats
    this._stats.itemsUsed++;
    if (this._stats.byType[item.id]) {
      this._stats.byType[item.id].used++;
    }

    // Handle timed/duration power-ups
    if (item.duration && item.duration > 0) {
      this._activateTimedPowerUp(item);
    } else {
      // Instant use items
      this._executeInstantItem(item);
    }

    // Update UI
    this._updateItemSlotDisplay();

    // Emit events
    this.emit('used', {
      item: item,
      remainingInInventory: this._inventory.length
    });

    if (this._eventBus) {
      this._eventBus.emit('powerup:used', { type: item.id, item: item });
    }

    // Play sound
    this._playSound(item.soundId);

    // Track for achievements
    if (this._achievementSystem) {
      this._achievementSystem._onPowerupUsed(item.id);
    }

    console.log(`[PowerUpSystem] Used: ${item.name}`);
    return item;
  }

  /**
   * Activate a timed power-up (with duration)
   * @private
   */
  _activateTimedPowerUp(item) {
    this._activePowerUp = item;
    this._activePowerUpEndTime = Date.now() + item.duration;

    // Show active power-up display
    this._showActivePowerUpDisplay(item);

    // Start timer loop
    this._startActiveTimerLoop(item);

    // Emit activation event
    if (this._eventBus) {
      this._eventBus.emit('powerup:activated', { 
        type: item.id, 
        item: item,
        endTime: this._activePowerUpEndTime 
      });
    }

    // Auto-expire after duration
    const expireTimer = setTimeout(() => {
      this._expireActivePowerUp();
    }, item.duration);

    this._timers.push(expireTimer);
  }

  /**
   * Execute an instant-use item's effects
   * @private
   */
  _executeInstantItem(item) {
    switch (item.id) {
      case 'shield':
      case 'superShield':
        // Shield is passive - handled by game logic
        break;
        
      case 'mine':
        // Drop mine behind player
        if (this._eventBus) {
          this._eventBus.emit('powerup:mineDrop', { item: item });
        }
        break;
        
      case 'missile':
      case 'tripleMissile':
        // Fire missile(s)
        if (this._eventBus) {
          this._eventBus.emit('powerup:fireMissile', { 
            item: item,
            count: item.missileCount || 1
          });
        }
        break;
        
      case 'shockwave':
        // Emit shockwave
        if (this._eventBus) {
          this._eventBus.emit('powerup:shockwave', { item: item });
        }
        break;
        
      case 'swap':
        // Request position swap
        if (this._eventBus) {
          this._eventBus.emit('powerup:swap', { item: item });
        }
        break;
        
      case 'freeze':
        // Fire freeze ray
        if (this._eventBus) {
          this._eventBus.emit('powerup:freezeRay', { item: item });
        }
        break;
        
      case 'steal':
        // Attempt theft
        if (this._eventBus) {
          this._eventBus.emit('powerup:steal', { item: item });
        }
        break;
        
      case 'teleport':
        // Execute teleport
        if (this._eventBus) {
          this._eventBus.emit('powerup:teleport', { item: item });
        }
        break;
        
      default:
        console.log(`[PowerUpSystem] Executing instant item: ${item.id}`);
    }
  }

  /**
   * Start the timer display update loop for active power-ups
   * @private
   */
  _startActiveTimerLoop(item) {
    const updateLoop = () => {
      if (!this._activePowerUp || this._activePowerUp.id !== item.id) {
        return;
      }

      const remaining = Math.max(0, this._activePowerUpEndTime - Date.now());
      this._updateActiveDisplay(remaining, item.duration);

      if (remaining > 0) {
        const frameId = requestAnimationFrame(updateLoop);
        this._animationFrames.push(frameId);
      }
    };

    const frameId = requestAnimationFrame(updateLoop);
    this._animationFrames.push(frameId);
  }

  /**
   * Expire the currently active power-up
   * @private
   */
  _expireActivePowerUp() {
    if (!this._activePowerUp) return;

    const expiredItem = this._activePowerUp;
    
    this.emit('expired', {
      item: expiredItem
    });

    if (this._eventBus) {
      this._eventBus.emit('powerup:expired', { type: expiredItem.id, item: expiredItem });
    }

    this._activePowerUp = null;
    this._activePowerUpEndTime = 0;

    this._hideActivePowerUpDisplay();
    console.log(`[PowerUpSystem] Expired: ${expiredItem.name}`);
  }

  /**
   * Handle item box collision
   * Called automatically when itembox:hit event fires
   */
  onItemBoxHit() {
    // Get current position from state (would be set by positionChanged events)
    const position = this._currentPosition || 1;
    const totalRacers = this._totalRacers || 8;
    
    const item = this.generateItem(position, totalRacers);
    
    if (item) {
      console.log(`[PowerUpSystem] Item box gave: ${item.name}`);
    } else {
      console.log('[PowerUpSystem] Item box hit but inventory full');
    }
  }

  /**
   * Clear inventory (e.g., on race end)
   */
  clearInventory() {
    // Expire any active power-up
    if (this._activePowerUp) {
      this._expireActivePowerUp();
    }
    
    this._inventory = [];
    this._updateItemSlotDisplay();
    
    this.emit('inventoryCleared');
  }

  /**
   * Get current inventory contents
   * 
   * @returns {Array} Array of current items (ordered FIFO)
   */
  getInventory() {
    return [...this._inventory];
  }

  /**
   * Check if player has any items
   * 
   * @returns {boolean}
   */
  hasItem() {
    return this._inventory.length > 0;
  }

  /**
   * Check if there's an active power-up
   * 
   * @returns {boolean}
   */
  hasActivePowerUp() {
    return this._activePowerUp !== null && Date.now() < this._activePowerUpEndTime;
  }

  /**
   * Get currently active power-up info
   * 
   * @returns {Object|null} Active power-up data with remaining time
   */
  getActivePowerUp() {
    if (!this._activePowerUp) return null;
    
    const remaining = Math.max(0, this._activePowerUpEndTime - Date.now());
    if (remaining <= 0) return null;
    
    return {
      ...this._activePowerUp,
      remainingMs: remaining,
      percentage: (remaining / this._activePowerUp.duration) * 100
    };
  }

  /**
   * Get usage statistics
   * 
   * @returns {Object} Stats object with collection/usage counts
   */
  getStats() {
    return {
      ...this._stats,
      currentInventory: this._inventory.length,
      hasActive: this.hasActivePowerUp(),
      activePowerUp: this.getActivePowerUp()?.id || null
    };
  }

  /**
   * Get all power-up definitions (for UI display)
   * 
   * @param {Object} [options] - Filter options
   * @returns {Array} Array of power-up definitions
   */
  getList(options = {}) {
    let items = [...this.definitions.values()];
    
    if (options.category) {
      items = items.filter(i => i.category === options.category);
    }
    
    if (options.rarity) {
      const rarityName = typeof options.rarity === 'string' 
        ? options.rarity 
        : options.rarity.name;
      items = items.filter(i => i.rarity && i.rarity.name === rarityName);
    }
    
    return items.map(item => ({
      ...item,
      color: item.rarity?.color || '#8a8a8a'
    }));
  }

  // ==================== UI METHODS ====================

  /**
   * Update the item slot display
   * @private
   */
  _updateItemSlotDisplay() {
    if (!this._itemSlotElement) return;

    const currentItem = this._inventory[0];
    
    if (currentItem) {
      const rarityClass = currentItem.rarity ? `rarity-${currentItem.rarity.name}` : '';
      const color = currentItem.rarity?.color || '#8a8a8a';
      
      this._itemSlotElement.innerHTML = `
        <div class="item-slot-inner has-item ${rarityClass}" style="--item-color: ${color}">
          <div class="item-icon">${currentItem.icon}</div>
          <div class="item-name">${currentItem.name}</div>
          ${this._inventory.length > 1 ? `<div class="item-count">+${this._inventory.length - 1}</div>` : ''}
          <div class="use-prompt">Press to Use</div>
        </div>
      `;
      this._itemSlotElement.classList.add('has-item');
    } else {
      this._itemSlotElement.innerHTML = `
        <div class="item-slot-inner empty">
          <div class="item-icon">?</div>
          <div class="item-name">No Item</div>
        </div>
      `;
      this._itemSlotElement.classList.remove('has-item');
    }
  }

  /**
   * Show active power-up timer display
   * @private
   */
  _showActivePowerUpDisplay(item) {
    if (!this._activeDisplayElement) return;

    const color = item.effects?.vehicle?.glow?.color || item.rarity?.color || '#ffffff';
    const rarityClass = item.rarity ? `rarity-${item.rarity.name}` : '';
    
    this._activeDisplayElement.innerHTML = `
      <div class="active-powerup ${rarityClass}" style="--active-color: ${color}">
        <div class="active-icon">${item.icon}</div>
        <div class="active-name">${item.name}</div>
        <div class="timer-ring">
          <svg viewBox="0 0 36 36" class="circular-chart">
            <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
            <path class="circle" stroke-dasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
          </svg>
        </div>
      </div>
    `;
    
    this._activeDisplayElement.classList.add('visible');
  }

  /**
   * Update active power-up timer display
   * @private
   */
  _updateActiveDisplay(remaining, total) {
    const circle = this._activeDisplayElement?.querySelector('.circle');
    if (circle) {
      const percentage = (remaining / total) * 100;
      circle.style.strokeDasharray = `${percentage}, 100`;
    }
  }

  /**
   * Hide active power-up display
   * @private
   */
  _hideActivePowerUpDisplay() {
    if (this._activeDisplayElement) {
      this._activeDisplayElement.classList.remove('visible');
      this._activeDisplayElement.innerHTML = '';
    }
  }

  /**
   * Create a power-up info panel for UI screens
   * 
   * @param {HTMLElement|string} container - Container element or selector
   * @returns {HTMLElement} Created panel element
   */
  createInfoPanel(container) {
    const target = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    if (!target) return null;

    const panel = document.createElement('div');
    panel.className = 'powerups-info-panel';
    
    const categories = [...new Set([...this.definitions.values()].map(p => p.category))];
    
    panel.innerHTML = `
      <div class="powerups-info-header">
        <h3>Power-Ups</h3>
        <p class="subtitle">Collect item boxes during races to gain power-ups</p>
      </div>
      <div class="powerups-categories">
        ${categories.map(cat => `
          <div class="powerup-category" data-category="${cat}">
            <h4 class="category-title">${this._getCategoryName(cat)}</h4>
            <div class="powerup-items">
              ${[...this.definitions.values()]
                .filter(p => p.category === cat && !p.isTrackItem)
                .map(item => `
                  <div class="powerup-info-card rarity-${item.rarity?.name || 'common'}" data-id="${item.id}">
                    <div class="info-card-icon">${item.icon}</div>
                    <div class="info-card-details">
                      <div class="info-card-name">${item.name}</div>
                      <div class="info-card-desc">${item.description}</div>
                      ${item.rarity ? `<span class="info-card-rarity">${this._capitalizeFirst(item.rarity.name)}</span>` : ''}
                    </div>
                  </div>
                `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
    
    target.appendChild(panel);
    return panel;
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Weighted random selection from an object of weights
   * @private
   */
  _weightedRandom(weights) {
    const entries = Object.entries(weights);
    const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
    let random = Math.random() * totalWeight;
    
    for (const [key, weight] of entries) {
      random -= weight;
      if (random <= 0) return key;
    }
    
    return entries[entries.length - 1][0]; // Fallback to last item
  }

  /**
   * Get display name for a category
   * @private
   */
  _getCategoryName(category) {
    const names = {
      [POWERUP_CATEGORY.SPEED]: '⚡ Speed Boosts',
      [POWERUP_CATEGORY.DEFENSIVE]: '🛡️ Defensive',
      [POWERUP_CATEGORY.OFFENSIVE]: '💥 Offensive',
      [POWERUP_CATEGORY.TACTICAL]: '🔄 Tactical',
      [POWERUP_CATEGORY.UTILITY]: '✨ Utility'
    };
    return names[category] || category;
  }

  /**
   * Capitalize first letter
   * @private
   */
  _capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Play a sound effect
   * @private
   */
  _playSound(soundId) {
    if (!this._audioEffects || !soundId) return;
    
    try {
      this._audioEffects.play(soundId);
    } catch (e) {
      // Silent fail
    }
  }

  // ==================== EVENT SYSTEM ====================

  /** @private */
  _listeners = new Map();
  _eventListeners = [];

  /**
   * Subscribe to power-up events
   * 
   * @param {string} event - Event name ('collected', 'used', 'expired', etc.)
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
   * Unsubscribe from event
   */
  off(event, callback) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Emit event to subscribers
   * @private
   */
  emit(event, data) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[PowerUpSystem] Error in handler for "${event}":`, err);
        }
      });
    }
  }

  // ==================== CLEANUP ====================

  /**
   * Clean up resources and event listeners
   */
  destroy() {
    // Cancel animation frames
    this._animationFrames.forEach(id => cancelAnimationFrame(id));
    this._animationFrames = [];
    
    // Clear timers
    this._timers.forEach(id => clearTimeout(id));
    this._timers = [];
    
    // Remove event bus listeners
    if (this._eventListeners) {
      this._eventListeners.forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
      this._eventListeners = [];
    }
    
    // Remove UI elements
    if (this._itemSlotElement?.parentNode) {
      this._itemSlotElement.remove();
    }
    if (this._activeDisplayElement?.parentNode) {
      this._activeDisplayElement.remove();
    }
    
    // Clear state
    this._inventory = [];
    this._activePowerUp = null;
    this._listeners.clear();
    
    this._isInitialized = false;
    
    console.log('[PowerUpSystem] Destroyed');
  }
}

// Singleton instance
const powerUpSystem = new PowerUpSystem();

// Export for ES modules
export { PowerUpSystem, powerUpSystem };
export default powerUpSystem;

// Expose globally for non-module access
window.__powerups = powerUpSystem;
