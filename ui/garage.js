// ui/garage.js — Vehicle Garage/Showcase System for Warzone Kart: Neon Underground
//
// Features:
// - Vehicle showroom with 3D-style preview and rotating animation
// - Stats panel with visual bars (Speed, Acceleration, Handling, Shield)
// - Vehicle list/grid with filters and search
// - Upgrade panel with level indicators and costs
// - Vehicle categories (Starter, Speed, Balanced, Heavy, Special)
// - Comparison between vehicles
// - localStorage persistence
// CSS: loaded via ui/styles/garage.css in index.html

/**
 * @enum {string}
 * Vehicle categories
 */
export const VEHICLE_CATEGORY = {
  STARTER: 'starter',
  SPEED: 'speed',
  BALANCED: 'balanced',
  HEAVY: 'heavy',
  SPECIAL: 'special'
};

/**
 * @enum {string}
 * Rarity levels for vehicles
 */
export const VEHICLE_RARITY = {
  COMMON: 'common',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary'
};

/**
 * Filter options for vehicle list
 */
export const FILTER_OPTIONS = {
  ALL: 'all',
  OWNED: 'owned',
  LOCKED: 'locked'
};

/**
 * Sort options for vehicle list
 */
export const SORT_OPTIONS = {
  NAME: 'name',
  SPEED: 'speed',
  WINS: 'wins',
  RECENTLY_USED: 'recent'
};

/**
 * Complete vehicle data definitions (mock/demo)
 */
const VEHICLE_DATA = [
  // Starter Vehicles (Free)
  {
    id: 'starter-kart',
    name: 'Starter Kart',
    icon: '🏎️',
    category: VEHICLE_CATEGORY.STARTER,
    rarity: VEHICLE_RARITY.COMMON,
    price: 0,
    stats: { speed: 45, acceleration: 50, handling: 60, shield: 40 },
    description: 'Reliable beginner kart with balanced handling.',
    maxUpgrades: { speed: 5, acceleration: 6, handling: 7, shield: 4 }
  },
  {
    id: 'city-cruiser',
    name: 'City Cruiser',
    icon: '🚗',
    category: VEHICLE_CATEGORY.STARTER,
    rarity: VEHICLE_RARITY.COMMON,
    price: 0,
    stats: { speed: 42, acceleration: 55, handling: 65, shield: 35 },
    description: 'Great handling for tight city tracks.',
    maxUpgrades: { speed: 4, acceleration: 7, handling: 8, shield: 3 }
  },
  
  // Speed Class (High Top Speed)
  {
    id: 'speed-demon',
    name: 'Speed Demon',
    icon: '🚀',
    category: VEHICLE_CATEGORY.SPEED,
    rarity: VEHICLE_RARITY.UNCOMMON,
    price: 5000,
    stats: { speed: 85, acceleration: 70, handling: 45, shield: 35 },
    description: 'Blazing fast but requires skill to control.',
    maxUpgrades: { speed: 10, acceleration: 8, handling: 5, shield: 4 }
  },
  {
    id: 'thunder-bolt',
    name: 'Thunder Bolt',
    icon: '⚡',
    category: VEHICLE_CATEGORY.SPEED,
    rarity: VEHICLE_RARITY.RARE,
    price: 12000,
    stats: { speed: 90, acceleration: 85, handling: 50, shield: 30 },
    description: 'Lightning-fast acceleration with decent top speed.',
    maxUpgrades: { speed: 10, acceleration: 9, handling: 6, shield: 3 }
  },
  {
    id: 'neon-streak',
    name: 'Neon Streak',
    icon: '💨',
    category: VEHICLE_CATEGORY.SPEED,
    rarity: VEHICLE_RARITY.EPIC,
    price: 25000,
    stats: { speed: 95, acceleration: 80, handling: 55, shield: 40 },
    description: 'Leaves a neon trail in its wake.',
    maxUpgrades: { speed: 10, acceleration: 9, handling: 7, shield: 5 }
  },
  
  // Balanced Class (All-Rounders)
  {
    id: 'shadow-racer',
    name: 'Shadow Racer',
    icon: '👻',
    category: VEHICLE_CATEGORY.BALANCED,
    rarity: VEHICLE_RARITY.UNCOMMON,
    price: 7500,
    stats: { speed: 65, acceleration: 68, handling: 70, shield: 55 },
    description: 'Well-balanced for any track type.',
    maxUpgrades: { speed: 8, acceleration: 8, handling: 8, shield: 7 }
  },
  {
    id: 'cyber-falcon',
    name: 'Cyber Falcon',
    icon: '🦅',
    category: VEHICLE_CATEGORY.BALANCED,
    rarity: VEHICLE_RARITY.RARE,
    price: 15000,
    stats: { speed: 72, acceleration: 75, handling: 75, shield: 60 },
    description: 'Advanced tech gives it an edge everywhere.',
    maxUpgrades: { speed: 9, acceleration: 9, handling: 9, shield: 8 }
  },
  {
    id: 'phoenix-riser',
    name: 'Phoenix Riser',
    icon: '🔥',
    category: VEHICLE_CATEGORY.BALANCED,
    rarity: VEHICLE_RARITY.LEGENDARY,
    price: 50000,
    stats: { speed: 80, acceleration: 82, handling: 82, shield: 78 },
    description: 'Rises from every setback stronger.',
    maxUpgrades: { speed: 10, acceleration: 10, handling: 10, shield: 10 }
  },
  
  // Heavy Class (High Shield, Slow)
  {
    id: 'iron-titan',
    name: 'Iron Titan',
    icon: '🛡️',
    category: VEHICLE_CATEGORY.HEAVY,
    rarity: VEHICLE_RARITY.RARE,
    price: 18000,
    stats: { speed: 50, acceleration: 40, handling: 55, shield: 95 },
    description: 'Takes hits like a champion.',
    maxUpgrades: { speed: 6, acceleration: 5, handling: 6, shield: 10 }
  },
  {
    id: 'fortress-9',
    name: 'Fortress 9',
    icon: '🏰',
    category: VEHICLE_CATEGORY.HEAVY,
    rarity: VEHICLE_RARITY.EPIC,
    price: 30000,
    stats: { speed: 55, acceleration: 48, handling: 58, shield: 98 },
    description: 'Nearly indestructible on the track.',
    maxUpgrades: { speed: 7, acceleration: 6, handling: 7, shield: 10 }
  },
  
  // Special Class (Unique Abilities)
  {
    id: 'neon-phantom',
    name: 'Neon Phantom',
    icon: '✨',
    category: VEHICLE_CATEGORY.SPECIAL,
    rarity: VEHICLE_RARITY.EPIC,
    price: 35000,
    stats: { speed: 75, acceleration: 78, handling: 80, shield: 50 },
    description: 'Can briefly phase through obstacles.',
    maxUpgrades: { speed: 9, acceleration: 9, handling: 9, shield: 6 }
  },
  {
    id: 'crystal-fury',
    name: 'Crystal Fury',
    icon: '💎',
    category: VEHICLE_CATEGORY.SPECIAL,
    rarity: VEHICLE_RARITY.LEGENDARY,
    price: 60000,
    stats: { speed: 85, acceleration: 88, handling: 85, shield: 70 },
    description: 'Crystalline structure reflects projectiles.',
    maxUpgrades: { speed: 10, acceleration: 10, handling: 10, shield: 8 }
  },
  {
    id: 'void-runner',
    name: 'Void Runner',
    icon: '🌌',
    category: VEHICLE_CATEGORY.SPECIAL,
    rarity: VEHICLE_RARITY.LEGENDARY,
    price: 80000,
    stats: { speed: 92, acceleration: 95, handling: 90, shield: 65 },
    description: 'Draws power from the void itself.',
    maxUpgrades: { speed: 10, acceleration: 10, handling: 10, shield: 10 }
  }
];

/**
 * Default garage state
 */
const DEFAULT_GARAGE_STATE = {
  ownedVehicles: ['starter-kart'],
  selectedVehicleId: 'starter-kart',
  upgrades: {}, // { vehicleId: { speed: X, accel: Y, ... } }
  vehicleStats: {}, // { vehicleId: { wins, racesUsed } }
  currency: 10000,
  cosmetics: {} // { vehicleId: { color, trail, horn } }
};

/**
 * Calculate upgrade cost based on current level
 */
function calculateUpgradeCost(currentLevel) {
  return Math.floor(500 * Math.pow(1.5, currentLevel));
}

/**
 * GarageSystem class - Main entry point for garage UI
 */
class GarageSystem {
  constructor() {
    /** @type {HTMLElement|null} Current container element */
    this.container = null;
    
    /** @type {Object} Garage state */
    this.state = { ...DEFAULT_GARAGE_STATE };
    
    /** @type {boolean} Whether data has been loaded */
    this.isLoaded = false;
    
    /** @type {Object|null} Currently selected vehicle data */
    this.selectedVehicle = null;
    
    /** @type {string} Current filter */
    this.currentFilter = FILTER_OPTIONS.ALL;
    
    /** @type {string} Current sort */
    this.currentSort = SORT_OPTIONS.NAME;
    
    /** @type {string|null} Current search query */
    this.searchQuery = null;
    
    /** @type {Function|null} Callback when vehicle is selected */
    this.onVehicleSelect = null;
    
    /** @type {Function|null} Callback on purchase/upgrade */
    this.onTransaction = null;

    // Bind methods
    this.render = this.render.bind(this);
    this.selectVehicle = this.selectVehicle.bind(this);
    this.purchaseVehicle = this.purchaseVehicle.bind(this);
    this.upgradeStat = this.upgradeStat.bind(this);
  }

  /**
   * Initialize and render the garage system into a container
   * @param {HTMLElement|string} container - DOM element or selector
   */
  async renderGarage(container) {
    if (typeof container === 'string') {
      this.container = document.querySelector(container);
    } else {
      this.container = container;
    }
    
    if (!this.container) {
      console.error('[GarageSystem] Invalid container provided');
      return false;
    }

    try {
      await this._loadState();
      this.isLoaded = true;
      
      // Select default vehicle if not set or not owned
      if (!this.state.selectedVehicleId || !this.state.ownedVehicles.includes(this.state.selectedVehicleId)) {
        this.state.selectedVehicleId = this.state.ownedVehicles[0] || 'starter-kart';
      }
      
      this._render();
      return true;
    } catch (error) {
      console.error('[GarageSystem] Error loading garage:', error);
      this._renderError(error.message);
      return false;
    }
  }

  /**
   * Load garage state from storage
   * @private
   */
  async _loadState() {
    try {
      const stored = localStorage.getItem('wz_garage_state');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.state = { ...DEFAULT_GARAGE_STATE, ...parsed };
      }
    } catch (e) {
      console.warn('[GarageSystem] Failed to load state:', e);
    }

    // Ensure starter vehicles are always owned
    VEHICLE_DATA.forEach(v => {
      if (v.category === VEHICLE_CATEGORY.STARTER && !this.state.ownedVehicles.includes(v.id)) {
        this.state.ownedVehicles.push(v.id);
      }
    });

    // Set initial selected vehicle
    this._updateSelectedVehicle();
  }

  /**
   * Save current garage state
   * @private
   */
  _saveState() {
    try {
      localStorage.setItem('wz_garage_state', JSON.stringify(this.state));
    } catch (e) {
      console.warn('[GarageSystem] Failed to save state:', e);
    }
  }

  /**
   * Update selected vehicle reference
   * @private
   */
  _updateSelectedVehicle() {
    this.selectedVehicle = VEHICLE_DATA.find(v => v.id === this.state.selectedVehicleId);
  }

  /**
   * Main render method
   * @private
   */
  _render() {
    this.container.innerHTML = '';
    this.container.className = 'garage-system';
    
    const mainContainer = document.createElement('div');
    mainContainer.className = 'garage-container';
    
    // Showroom + Stats Panel
    mainContainer.appendChild(this._renderShowroom());
    
    // Vehicle List Section
    mainContainer.appendChild(this._renderVehicleList());
    
    // Upgrade Panel
    mainContainer.appendChild(this._renderUpgradePanel());
    
    this.container.appendChild(mainContainer);
  }

  /**
   * Render error state
   * @param {string} message 
   * @private
   */
  _renderError(message) {
    this.container.innerHTML = `
      <div class="garage-error" style="
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
          <div style="font-size: 48px; margin-bottom: 16px;">🏎️</div>
          <h3 style="margin: 0 0 8px; color: var(--text-primary);">Failed to Load Garage</h3>
          <p style="margin: 0; opacity: 0.7;">${message}</p>
        </div>
      </div>
    `;
  }

  /**
   * Render vehicle showroom with preview and stats
   * @returns {HTMLElement}
   * @private
   */
  _renderShowroom() {
    const section = document.createElement('section');
    section.className = 'vehicle-showroom';
    
    const vehicle = this.selectedVehicle;
    const upgrades = this.state.upgrades[vehicle?.id] || {};
    const effectiveStats = vehicle ? this._getEffectiveStats(vehicle.id) : null;
    
    section.innerHTML = `
      <div class="showroom-header">
        <h2 class="showroom-title">Showroom</h2>
        ${vehicle ? `<span class="showroom-vehicle-name">${vehicle.name}</span>` : ''}
      </div>
      
      <!-- Preview Area -->
      <div class="showroom-preview">
        ${vehicle ? `
          <div class="showroom-vehicle-display rotating" id="showroom-vehicle">${vehicle.icon}</div>
        ` : '<span style="color: var(--text-secondary)">Select a vehicle</span>'}
      </div>
      
      <!-- Stats Panel -->
      ${effectiveStats ? `
        <div class="showroom-stats-panel">
          ${this._renderStatBar('Speed', 'speed', effectiveStats.speed)}
          ${this._renderStatBar('Acceleration', 'acceleration', effectiveStats.acceleration)}
          ${this._renderStatBar('Handling', 'handling', effectiveStats.handling)}
          ${this._renderStatBar('Shield', 'shield', effectiveStats.shield)}
        </div>
      ` : ''}
      
      ${vehicle ? `<p style="color: var(--text-secondary); font-size: 13px; margin-top: 16px; text-align: center;">${vehicle.description}</p>` : ''}
    `;
    
    return section;
  }

  /**
   * Render single stat bar component
   * @param {string} label 
   * @param {string} statKey 
   * @param {number} value 
   * @returns {string}
   * @private
   */
  _renderStatBar(label, statKey, value) {
    return `
      <div class="stat-bar-item">
        <div class="stat-bar-header">
          <span class="stat-bar-label">${label}</span>
          <span class="stat-bar-value">${value}</span>
        </div>
        <div class="stat-bar-track">
          <div class="stat-bar-fill ${statKey}" style="width: ${value}%"></div>
        </div>
      </div>
    `;
  }

  /**
   * Render vehicle list with filters and search
   * @returns {HTMLElement}
   * @private
   */
  _renderVehicleList() {
    const section = document.createElement('section');
    section.className = 'vehicle-list-section';
    
    const filteredVehicles = this._getFilteredVehicles();
    
    section.innerHTML = `
      <!-- Search & Controls -->
      <div class="garage-controls">
        <div class="garage-search-box">
          <input 
            type="text" 
            class="garage-search-input" 
            placeholder="Search vehicles..." 
            value="${this.searchQuery || ''}"
            oninput="window.__garageSystem?.handleSearch(this.value)"
          />
        </div>
        
        <div class="filter-row">
          <div class="category-tabs">
            ${Object.values(VEHICLE_CATEGORY).map(cat => `
              <button 
                class="category-tab" 
                data-category="${cat}"
                onclick="window.__garageSystem?.handleCategoryFilter('${cat}')"
              >${cat.charAt(0).toUpperCase() + cat.slice(1)}</button>
            `).join('')}
          </div>
          
          <select class="sort-select" onchange="window.__garageSystem?.handleSortChange(this.value)">
            <option value="${SORT_OPTIONS.NAME}" ${this.currentSort === SORT_OPTIONS.NAME ? 'selected' : ''}>Name</option>
            <option value="${SORT_OPTIONS.SPEED}" ${this.currentSort === SORT_OPTIONS.SPEED ? 'selected' : ''}>Speed</option>
            <option value="${SORT_OPTIONS.WINS}" ${this.currentSort === SORT_OPTIONS.WINS ? 'selected' : ''}>Wins</option>
            <option value="${SORT_OPTIONS.RECENTLY_USED}" ${this.currentSort === SORT_OPTIONS.RECENTLY_USED ? 'selected' : ''}>Recent</option>
          </select>
        </div>
      </div>
      
      <!-- Vehicle Grid -->
      <div class="vehicle-list-grid">
        ${filteredVehicles.map(v => this._renderVehicleCard(v)).join('')}
      </div>
      
      ${filteredVehicles.length === 0 ? `
        <p style="color: var(--text-secondary); text-align: center; padding: 32px;">
          No vehicles match your criteria.
        </p>
      ` : ''}
    `;
    
    // Highlight active category tab
    setTimeout(() => {
      const tabs = section.querySelectorAll('.category-tab');
      tabs.forEach(tab => {
        if (tab.dataset.category === this.currentCategory) {
          tab.classList.add('active');
        }
      });
    }, 0);
    
    return section;
  }

  /**
   * Get filtered and sorted vehicle list
   * @returns {Array}
   * @private
   */
  _getFilteredVehicles() {
    let vehicles = [...VEHICLE_DATA];
    
    // Apply search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      vehicles = vehicles.filter(v => 
        v.name.toLowerCase().includes(query) ||
        v.description.toLowerCase().includes(query) ||
        v.category.toLowerCase().includes(query)
      );
    }
    
    // Apply ownership filter
    switch (this.currentFilter) {
      case FILTER_OPTIONS.OWNED:
        vehicles = vehicles.filter(v => this.state.ownedVehicles.includes(v.id));
        break;
      case FILTER_OPTIONS.LOCKED:
        vehicles = vehicles.filter(v => !this.state.ownedVehicles.includes(v.id));
        break;
    }
    
    // Apply category filter
    if (this.currentCategory && this.currentCategory !== 'all') {
      vehicles = vehicles.filter(v => v.category === this.currentCategory);
    }
    
    // Apply sort
    switch (this.currentSort) {
      case SORT_OPTIONS.NAME:
        vehicles.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case SORT_OPTIONS.SPEED:
        vehicles.sort((a, b) => {
          const aStats = this._getEffectiveStats(a.id);
          const bStats = this._getEffectiveStats(b.id);
          return bStats.speed - aStats.speed;
        });
        break;
      case SORT_OPTIONS.WINS:
        vehicles.sort((a, b) => {
          const aWins = this.state.vehicleStats[a.id]?.wins || 0;
          const bWins = this.state.vehicleStats[b.id]?.wins || 0;
          return bWins - aWins;
        });
        break;
      case SORT_OPTIONS.RECENTLY_USED:
        // Would need timestamp data, using wins as proxy
        break;
    }
    
    return vehicles;
  }

  /**
   * Render single vehicle card
   * @param {Object} vehicle 
   * @returns {string}
   * @private
   */
  _renderVehicleCard(vehicle) {
    const isOwned = this.state.ownedVehicles.includes(vehicle.id);
    const isSelected = this.state.selectedVehicleId === vehicle.id;
    const stats = this._getEffectiveStats(vehicle.id);
    const vehicleData = this.state.vehicleStats[vehicle.id] || {};
    const stars = Math.min(5, Math.floor((vehicleData.wins || 0) / 10)) + (isOwned ? 1 : 0);
    
    return `
      <div 
        class="vehicle-card ${isSelected ? 'selected' : ''}"
        data-vehicle-id="${vehicle.id}"
        onclick="window.__garageSystem?.selectVehicle('${vehicle.id}')"
      >
        <div class="vehicle-card-header">
          <div class="vehicle-card-icon rarity-${vehicle.rarity}">${vehicle.icon}</div>
          <div class="vehicle-card-info">
            <div class="vehicle-card-name">
              ${vehicle.name}
              <span class="vehicle-rarity-badge ${vehicle.rarity}">${vehicle.rarity}</span>
            </div>
            <div class="vehicle-card-category">${vehicle.category}</div>
          </div>
        </div>
        
        <div class="vehicle-mini-stats">
          ${this._renderMiniStat('speed', stats.speed)}
          ${this._renderMiniStat('acceleration', stats.acceleration)}
          ${this._renderMiniStat('handling', stats.handling)}
          ${this._renderMiniStat('shield', stats.shield)}
        </div>
        
        <div class="vehicle-card-footer">
          <div class="vehicle-stars">
            ${Array.from({ length: 5 }, (_, i) => 
              `<span class="star-icon ${i < stars ? 'filled' : ''}">★</span>`
            ).join('')}
          </div>
          ${isOwned ? `
            <button class="vehicle-action-btn select-btn" onclick="event.stopPropagation(); window.__garageSystem?.selectVehicle('${vehicle.id}')">
              ${isSelected ? 'SELECTED' : 'SELECT'}
            </button>
          ` : `
            <button class="vehicle-action-btn price-btn" onclick="event.stopPropagation(); window.__garageSystem?.purchaseVehicle('${vehicle.id}')">
              $${vehicle.price.toLocaleString()}
            </button>
          `}
        </div>
        
        ${!isOwned ? `
          <div class="vehicle-lock-overlay">
            <span class="lock-icon">🔒</span>
            <span class="lock-text">Not Owned</span>
            <span class="lock-price">$${vehicle.price.toLocaleString()}</span>
          </div>
        `}
      </div>
    `;
  }

  /**
   * Render mini stat bar (for card display)
   * @param {string} type 
   * @param {number} value 
   * @returns {string}
   * @private
   */
  _renderMiniStat(type, value) {
    return `<div class="mini-stat-bar"><div class="mini-stat-bar-fill ${type}" style="width: ${value}%"></div></div>`;
  }

  /**
   * Render upgrade panel for selected vehicle
   * @returns {HTMLElement}
   * @private
   */
  _renderUpgradePanel() {
    const section = document.createElement('section');
    section.className = 'upgrade-panel';
    
    const vehicle = this.selectedVehicle;
    if (!vehicle) {
      section.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">Select a vehicle to view upgrades.</p>';
      return section;
    }
    
    const isOwned = this.state.ownedVehicles.includes(vehicle.id);
    const upgrades = this.state.upgrades[vehicle.id] || { speed: 1, acceleration: 1, handling: 1, shield: 1 };
    
    section.innerHTML = `
      <div class="upgrade-panel-header">
        <h2 class="upgrade-panel-title">Upgrades — ${vehicle.name}</h2>
        <div class="upgrade-currency-display">
          <span class="upgrade-currency-icon">💰</span>
          <span>$${this.state.currency.toLocaleString()}</span>
        </div>
      </div>
      
      ${isOwned ? `
        <div class="upgrade-grid">
          ${this._renderUpgradeItem('speed', '⚡ Speed', 'speed', vehicle.maxUpgrades.speed, upgrades.speed || 1)}
          ${this._renderUpgradeItem('acceleration', '🚀 Acceleration', 'acceleration', vehicle.maxUpgrades.acceleration, upgrades.acceleration || 1)}
          ${this._renderUpgradeItem('handling', '🔄 Handling', 'handling', vehicle.maxUpgrades.handling, upgrades.handling || 1)}
          ${this._renderUpgradeItem('shield', '🛡️ Shield', 'shield', vehicle.maxUpgrades.shield, upgrades.shield || 1)}
        </div>
        
        <!-- Cosmetic Slots -->
        <div class="cosmetic-slots">
          <div class="cosmetic-slot" onclick="alert('Color picker coming soon!')">
            <span class="cosmetic-slot-icon">🎨</span>
            <span class="cosmetic-slot-name">Paint Color</span>
          </div>
          <div class="cosmetic-slot" onclick="alert('Trail effects coming soon!')">
            <span class="cosmetic-slot-icon">✨</span>
            <span class="cosmetic-slot-name">Trail Effect</span>
          </div>
          <div class="cosmetic-slot" onclick="alert('Custom horns coming soon!')">
            <span class="cosmetic-slot-icon">📯</span>
            <span class="cosmetic-slot-name">Horn Sound</span>
          </div>
          <div class="cosmetic-slot" onclick="alert('Decals coming soon!')">
            <span class="cosmetic-slot-icon">🖼️</span>
            <span class="cosmetic-slot-name">Decals</span>
          </div>
        </div>
      ` : `
        <p style="color: var(--text-secondary); text-align: center; padding: 24px;">
          Purchase this vehicle first to unlock upgrades.
          <br><br>
          <button class="vehicle-action-btn price-btn" onclick="window.__garageSystem?.purchaseVehicle('${vehicle.id}')">
            Buy for $${vehicle.price.toLocaleString()}
          </button>
        </p>
      `}
    `;
    
    return section;
  }

  /**
   * Render single upgrade item
   * @param {string} key 
   * @param {string} label 
   * @param {string} iconClass 
   * @param {number} maxLevel 
   * @param {number} currentLevel 
   * @returns {string}
   * @private
   */
  _renderUpgradeItem(key, label, iconClass, maxLevel, currentLevel) {
    const cost = calculateUpgradeCost(currentLevel);
    const isMaxed = currentLevel >= maxLevel;
    const canAfford = this.state.currency >= cost;
    const progress = ((currentLevel - 1) / (maxLevel - 1)) * 100;
    
    return `
      <div class="upgrade-item" data-upgrade-key="${key}">
        <div class="upgrade-item-header">
          <span class="upgrade-item-name">
            <span class="upgrade-item-icon ${iconClass}"></span>
            ${label}
          </span>
          <div class="upgrade-level-indicator">
            <span class="upgrade-level-text">Lv.${currentLevel}/${maxLevel}</span>
          </div>
        </div>
        
        <div class="level-dots" style="display: flex; gap: 4px;">
          ${Array.from({ length: maxLevel }, (_, i) => `
            <span class="level-dot filled ${i < currentLevel ? 'filled' : ''}" 
                  style="${i < currentLevel ? `background: var(--stat-${key})` : ''}"></span>
          `).join('')}
        </div>
        
        <div class="upgrade-progress-container">
          <div class="upgrade-progress-bar">
            <div class="upgrade-progress-fill ${key}" style="width: ${progress}%"></div>
          </div>
        </div>
        
        <div class="upgrade-cost-row">
          <span class="upgrade-cost">
            Next: <span class="upgrade-cost-value">$${cost.toLocaleString()}</span>
          </span>
          <button 
            class="upgrade-btn ${isMaxed ? 'maxed' : ''}"
            ${isMaxed || !canAfford ? 'disabled' : ''}
            onclick="window.__garageSystem?.upgradeStat('${key}')"
          >
            ${isMaxed ? 'MAXED' : canAfford ? 'UPGRADE' : 'NEED $'+cost.toLocaleString()}
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Get effective stats considering base + upgrades
   * @param {string} vehicleId 
   * @returns {Object}
   * @private
   */
  _getEffectiveStats(vehicleId) {
    const vehicle = VEHICLE_DATA.find(v => v.id === vehicleId);
    if (!vehicle) return { speed: 0, acceleration: 0, handling: 0, shield: 0 };
    
    const upgrades = this.state.upgrades[vehicleId] || { speed: 1, acceleration: 1, handling: 1, shield: 1 };
    
    return {
      speed: Math.min(100, vehicle.stats.speed + (upgrades.speed - 1) * 5),
      acceleration: Math.min(100, vehicle.stats.acceleration + (upgrades.acceleration - 1) * 5),
      handling: Math.min(100, vehicle.stats.handling + (upgrades.handling - 1) * 5),
      shield: Math.min(100, vehicle.stats.shield + (upgrades.shield - 1) * 5)
    };
  }

  // ==================== EVENT HANDLERS ====================

  /**
   * Handle vehicle selection
   * @param {string} vehicleId 
   */
  selectVehicle(vehicleId) {
    const vehicle = VEHICLE_DATA.find(v => v.id === vehicleId);
    if (!vehicle) return;
    
    this.state.selectedVehicleId = vehicleId;
    this._updateSelectedVehicle();
    this._saveState();
    this._render();
    
    if (typeof this.onVehicleSelect === 'function') {
      this.onVehicleSelect(vehicle);
    }
  }

  /**
   * Handle vehicle purchase
   * @param {string} vehicleId 
   */
  purchaseVehicle(vehicleId) {
    const vehicle = VEHICLE_DATA.find(v => v.id === vehicleId);
    if (!vehicle) return;
    
    if (this.state.ownedVehicles.includes(vehicleId)) {
      this.selectVehicle(vehicleId);
      return;
    }
    
    if (this.state.currency < vehicle.price) {
      alert(`Insufficient funds! You need $${vehicle.price.toLocaleString()} but have $${this.state.currency.toLocaleString()}`);
      return;
    }
    
    // Deduct currency and add vehicle
    this.state.currency -= vehicle.price;
    this.state.ownedVehicles.push(vehicleId);
    
    // Initialize upgrades
    if (!this.state.upgrades[vehicleId]) {
      this.state.upgrades[vehicleId] = { speed: 1, acceleration: 1, handling: 1, shield: 1 };
    }
    
    this._updateSelectedVehicle();
    this._saveState();
    this._render();
    
    // Trigger upgrade animation
    setTimeout(() => {
      const card = this.container.querySelector(`[data-vehicle-id="${vehicleId}"]`);
      if (card) card.classList.add('upgrading');
    }, 100);
    
    if (typeof this.onTransaction === 'function') {
      this.onTransaction('purchase', vehicle, vehicle.price);
    }
  }

  /**
   * Handle stat upgrade
   * @param {string} statKey 
   */
  upgradeStat(statKey) {
    if (!this.selectedVehicle) return;
    
    const vehicleId = this.selectedVehicle.id;
    const upgrades = this.state.upgrades[vehicleId] || { speed: 1, acceleration: 1, handling: 1, shield: 1 };
    const currentLevel = upgrades[statKey] || 1;
    const maxLevel = this.selectedVehicle.maxUpgrades[statKey];
    const cost = calculateUpgradeCost(currentLevel);
    
    if (currentLevel >= maxLevel) return;
    if (this.state.currency < cost) return;
    
    // Deduct and upgrade
    this.state.currency -= cost;
    if (!this.state.upgrades[vehicleId]) {
      this.state.upgrades[vehicleId] = { speed: 1, acceleration: 1, handling: 1, shield: 1 };
    }
    this.state.upgrades[vehicleId][statKey] = currentLevel + 1;
    
    this._saveState();
    this._render();
    
    // Trigger animation
    setTimeout(() => {
      const item = this.container.querySelector(`[data-upgrade-key="${statKey}"]`);
      if (item) item.classList.add('upgrading');
    }, 100);
    
    if (typeof this.onTransaction === 'function') {
      this.onTransaction('upgrade', statKey, cost);
    }
  }

  /**
   * Handle search input
   * @param {string} query 
   */
  handleSearch(query) {
    this.searchQuery = query || null;
    this._rerenderListSection();
  }

  /**
   * Handle category filter change
   * @param {string} category 
   */
  handleCategoryFilter(category) {
    this.currentCategory = this.currentCategory === category ? null : category;
    this._rerenderListSection();
  }

  /**
   * Handle sort change
   * @param {string} sortValue 
   */
  handleSortChange(sortValue) {
    this.currentSort = sortValue;
    this._rerenderListSection();
  }

  /**
   * Re-render just the list section (for performance)
   * @private
   */
  _rerenderListSection() {
    const listSection = this.container.querySelector('.vehicle-list-section');
    if (listSection) {
      const newList = this._renderVehicleList();
      listSection.replaceWith(newList);
    }
  }

  /**
   * Add currency to player's balance
   * @param {number} amount 
   */
  addCurrency(amount) {
    this.state.currency += amount;
    this._saveState();
    
    if (this.isLoaded && this.container) {
      this._render();
    }
  }

  /**
   * Record race result for selected vehicle
   * @param {Object} result { position, time, xpEarned }
   */
  recordRaceResult(result) {
    const vehicleId = this.state.selectedVehicleId;
    if (!vehicleId) return;
    
    if (!this.state.vehicleStats[vehicleId]) {
      this.state.vehicleStats[vehicleId] = { wins: 0, racesUsed: 0 };
    }
    
    this.state.vehicleStats[vehicleId].racesUsed++;
    if (result.position === 1) {
      this.state.vehicleStats[vehicleId].wins++;
    }
    
    this.state.currency += result.xpEarned || 100;
    this._saveState();
    
    if (this.isLoaded && this.container) {
      this._render();
    }
  }

  /**
   * Clean up and destroy instance
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
      this.container.className = '';
    }
    this.container = null;
    this.isLoaded = false;
  }
}

// Export singleton instance
const garageSystemInstance = new GarageSystem();

if (typeof window !== 'undefined') {
  window.__garageSystem = garageSystemInstance;
}

export default GarageSystem;
export { garageSystemInstance, VEHICLE_DATA };
