// ui/main-menu.js — Comprehensive Main Menu System for Warzone Kart: Neon Underground
//
// Features:
// - Hero Section with animated player avatar, tier ring, level badge, quick stats
// - Primary Navigation Grid with 6 main menu cards (Race, Tournament, Profile, Garage, Achievements, Challenges)
// - Secondary Navigation Row (Leaderboard, Settings, Save Data)
// - Daily Bonus Banner with streak counter and claim reward
// - News/Events Ticker with scrolling announcements
// - Quick Actions Bar with continue/last played options
// - Settings Panel (Audio, Graphics, Controls, Display options)
// - Animated background particles and card hover effects
// - Smooth page transitions and loading states
// - Notification badges for new/unviewed items
// - Full integration with ui-router, save-system, and other UI modules
// - Mobile-responsive design with 44px min touch targets
// CSS: loaded via ui/styles/main-menu.css in index.html

/**
 * @enum {string}
 * Main menu navigation screen identifiers
 */
export const MENU_SCREEN = {
  RACE: 'race',
  TOURNAMENT: 'tournament',
  PROFILE: 'profile',
  GARAGE: 'garage',
  ACHIEVEMENTS: 'achievements',
  CHALLENGES: 'challenges',
  LEADERBOARD: 'leaderboard',
  SETTINGS: 'settings',
  SAVE_DATA: 'save-data'
};

/**
 * @enum {string}
 * Player rank tiers for display styling
 */
const PLAYER_TIERS = {
  BRONZE: { id: 'bronze', name: 'Bronze', color: '#cd7f32', glowColor: 'rgba(205, 127, 50, 0.4)' },
  SILVER: { id: 'silver', name: 'Silver', color: '#c0c0c0', glowColor: 'rgba(192, 192, 192, 0.4)' },
  GOLD: { id: 'gold', name: 'Gold', color: '#ffd700', glowColor: 'rgba(255, 215, 0, 0.4)' },
  PLATINUM: { id: 'platinum', name: 'Platinum', color: '#e5e4e2', glowColor: 'rgba(229, 228, 226, 0.4)' },
  DIAMOND: { id: 'diamond', name: 'Diamond', color: '#b9f2ff', glowColor: 'rgba(185, 242, 255, 0.4)' },
  CHAMPION: { id: 'champion', name: 'Champion', color: '#ff4d2e', glowColor: 'rgba(255, 77, 46, 0.5)' }
};

/**
 * Navigation card definitions with icons, labels, and routing info
 */
const NAVIGATION_CARDS = [
  {
    id: MENU_SCREEN.RACE,
    icon: '🏁',
    label: 'RACE NOW',
    subtitle: 'Quick race & modes',
    color: 'var(--accent-primary)',
    gradient: 'linear-gradient(135deg, #ff4d2e 0%, #ff8c00 100%)',
    description: 'Jump into a race or select your game mode',
    badge: null,
    priority: 'primary'
  },
  {
    id: MENU_SCREEN.TOURNAMENT,
    icon: '🏆',
    label: 'TOURNAMENTS',
    subtitle: 'Ranked play & events',
    color: 'var(--accent-tertiary)',
    gradient: 'linear-gradient(135deg, #ffd23f 0%, #ff8c00 100%)',
    description: 'Compete in daily, weekly, and special events',
    badge: 'LIVE',
    priority: 'primary'
  },
  {
    id: MENU_SCREEN.PROFILE,
    icon: '👤',
    label: 'PROFILE',
    subtitle: 'View & customize',
    color: 'var(--accent-secondary)',
    gradient: 'linear-gradient(135deg, #00e5ff 0%, #00ffa8 100%)',
    description: 'Check stats, achievements, and customize appearance',
    badge: null,
    priority: 'primary'
  },
  {
    id: MENU_SCREEN.GARAGE,
    icon: '🚗',
    label: 'GARAGE',
    subtitle: 'Vehicles & upgrades',
    color: '#3ddc84',
    gradient: 'linear-gradient(135deg, #3ddc84 0%, #00e5ff 100%)',
    description: 'Browse, upgrade, and customize your vehicles',
    badge: null,
    priority: 'primary'
  },
  {
    id: MENU_SCREEN.ACHIEVEMENTS,
    icon: '🏅',
    label: 'ACHIEVEMENTS',
    subtitle: 'Trophy collection',
    color: '#aa00ff',
    gradient: 'linear-gradient(135deg, #aa00ff 0%, #ff4d8a 100%)',
    description: 'View your unlocked trophies and progress',
    badge: '3 NEW',
    priority: 'primary'
  },
  {
    id: MENU_SCREEN.CHALLENGES,
    icon: '📋',
    label: 'CHALLENGES',
    subtitle: 'Daily & weekly',
    color: '#ffb13d',
    gradient: 'linear-gradient(135deg, #ffb13d 0%, #ff6b35 100%)',
    description: 'Complete challenges for bonus rewards',
    badge: null,
    priority: 'primary'
  }
];

/**
 * Secondary navigation items
 */
const SECONDARY_NAV = [
  {
    id: MENU_SCREEN.LEADERBOARD,
    icon: '📊',
    label: 'LEADERBOARDS',
    description: 'Global rankings'
  },
  {
    id: MENU_SCREEN.SETTINGS,
    icon: '⚙️',
    label: 'SETTINGS',
    description: 'Game options'
  },
  {
    id: MENU_SCREEN.SAVE_DATA,
    icon: '💾',
    label: 'SAVE DATA',
    description: 'Manage saves'
  }
];

/**
 * Mock news/events data for the ticker
 */
const NEWS_EVENTS = [
  { id: 1, type: 'event', text: '🔥 DOUBLE XP Weekend is LIVE! Earn 2x rewards until Monday!', highlighted: true },
  { id: 2, type: 'update', text: '🎮 New vehicle "Phantom X" available in the Garage!', highlighted: false },
  { id: 3, type: 'tournament', text: '🏆 Weekly Grand Prix Finals start in 3 hours!', highlighted: true },
  { id: 4, type: 'community', text: '💬 Community: Share your best drift clips!', highlighted: false },
  { id: 5, type: 'update', text: '⚡ Patch v0.7.1: Balance updates and bug fixes', highlighted: false }
];

/**
 * Default player data when no save exists
 */
const DEFAULT_PLAYER_DATA = {
  playerId: 'player_' + Date.now(),
  playerName: 'Neon Racer',
  title: 'Rookie',
  avatar: null,
  level: 1,
  xp: 0,
  xpToNext: 100,
  totalXP: 0,
  tier: PLAYER_TIERS.BRONZE.id,
  
  // Stats
  racesPlayed: 0,
  racesWon: 0,
  winRate: 0,
  totalPlayTime: 0,
  
  // Currency
  credits: 5000,
  gold: 100,
  
  // Daily login
  lastLoginDate: null,
  loginStreak: 0,
  dailyBonusClaimed: false,
  
  // Last played
  lastTrack: 'Downtown Underground',
  lastMode: 'Quick Race',
  lastPlayedAt: null,
  
  // Notifications
  unreadAchievements: 3,
  newTournamentAvailable: true,
  hasPendingReward: true
};

/**
 * @class MainMenuSystem
 * Comprehensive main menu system that serves as the central hub for game navigation.
 * Implements singleton pattern for consistent access across modules.
 */
export class MainMenuSystem {
  /**
   * Creates a new MainMenuSystem instance.
   * Private constructor - use getInstance() instead.
   */
  constructor() {
    /** @type {HTMLElement|null} Root container element */
    this._container = null;
    
    /** @type {HTMLElement|null} Current mounted element */
    this._element = null;
    
    /** @type {Object} Current player data */
    this._playerData = { ...DEFAULT_PLAYER_DATA };
    
    /** @type {boolean} Initialization state flag */
    this._isInitialized = false;
    
    /** @type {boolean} Whether settings panel is open */
    this._settingsOpen = false;
    
    /** @type {Object|null} Reference to save system */
    this._saveSystem = null;
    
    /** @type {Object|null} Reference to UI router */
    this._router = null;
    
    /** @type {number|null} Animation frame ID for particles */
    this._particleAnimationId = null;
    
    /** @type {number|null} Interval ID for ticker */
    this._tickerIntervalId = null;
    
    /** @type {number|null} Timeout for stagger animation */
    this._staggerTimeout = null;
    
    /** @type {Array<Function>} Cleanup functions array */
    this._cleanupFunctions = [];
    
    /** @type {boolean} Reduced motion preference */
    this._reducedMotion = false;

    // Bind methods to preserve context
    this._handleNavigation = this._handleNavigation.bind(this);
    this._handleSettingsToggle = this._handleSettingsToggle.bind(this);
    this._claimDailyBonus = this._claimDailyBonus.bind(this);
    this._handleSaveAction = this._handleSaveAction.bind(this);
    this._handleSettingsChange = this._handleSettingsChange.bind(this);
  }

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  /**
   * Initialize the main menu system.
   * Loads player data from save system or creates defaults.
   * 
   * @param {Object} [options] - Configuration options
   * @param {HTMLElement} [options.container] - Container element to render into
   * @param {Object} [options.saveSystem] - Save system instance for data persistence
   * @param {Object} [options.router] - UI router instance for navigation
   * @returns {Promise<MainMenuSystem>} This instance for chaining
   */
  async init(options = {}) {
    if (this._isInitialized) return this;
    
    console.log('[MainMenuSystem] Initializing...');
    
    // Check reduced motion preference
    this._reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Store references
    this._container = options.container || document.getElementById('main-menu-container') || document.body;
    this._saveSystem = options.saveSystem || window.__saveSystem || null;
    this._router = options.router || window.__uiRouter || null;
    
    // Load player data
    await this._loadPlayerData();
    
    // Check daily login bonus
    this._checkDailyLogin();
    
    this._isInitialized = true;
    console.log('[MainMenuSystem] Initialized successfully');
    
    // Emit ready event
    this._emitEvent('ready', { playerData: this._playerData });
    
    return this;
  }

  /**
   * Load player data from save system or localStorage
   * @private
   */
  async _loadPlayerData() {
    try {
      // Try save system first
      if (this._saveSystem && this._saveSystem.isInitialized) {
        const savedData = this._saveSystem.getData();
        if (savedData && savedData.player) {
          this._playerData = {
            ...DEFAULT_PLAYER_DATA,
            ...savedData.player,
            level: savedData.player.level || DEFAULT_PLAYER_DATA.level,
            xp: savedData.player.xp || DEFAULT_PLAYER_DATA.xp,
            xpToNext: savedData.player.xpToNext || DEFAULT_PLAYER_DATA.xpToNext,
            title: savedData.player.title || DEFAULT_PLAYER_DATA.title,
            playerName: savedData.player.name || DEFAULT_PLAYER_DATA.playerName
          };
          
          // Calculate derived stats
          this._calculateStats(savedData.stats || {});
          
          console.log('[MainMenuSystem] Loaded player data from save system');
          return;
        }
      }
      
      // Fallback to localStorage
      const localData = localStorage.getItem('wzk_mainmenu_player');
      if (localData) {
        const parsed = JSON.parse(localData);
        this._playerData = { ...DEFAULT_PLAYER_DATA, ...parsed };
        console.log('[MainMenuSystem] Loaded player data from localStorage');
        return;
      }
      
      // Generate mock/demo data
      this._generateDemoData();
      
    } catch (err) {
      console.warn('[MainMenuSystem] Failed to load player data:', err);
      this._generateDemoData();
    }
  }

  /**
   * Calculate derived statistics
   * @private
   * @param {Object} stats - Raw stats object
   */
  _calculateStats(stats) {
    this._playerData.racesPlayed = stats.racesFinished || stats.racesStarted || 0;
    this._playerData.racesWon = stats.racesWon || 0;
    this._playerData.winRate = this._playerData.racesPlayed > 0
      ? Math.round((this._playerData.racesWon / this._playerData.racesPlayed) * 100)
      : 0;
    
    // Determine tier based on level/wins
    if (this._playerData.wins >= 500) this._playerData.tier = PLAYER_TIERS.CHAMPION.id;
    else if (this._playerData.wins >= 200) this._playerData.tier = PLAYER_TIERS.DIAMOND.id;
    else if (this._playerData.wins >= 100) this._playerData.tier = PLAYER_TIERS.PLATINUM.id;
    else if (this._playerData.wins >= 50) this._playerData.tier = PLAYER_TIERS.GOLD.id;
    else if (this._playerData.wins >= 20) this._playerData.tier = PLAYER_TIERS.SILVER.id;
    else this._playerData.tier = PLAYER_TIERS.BRONZE.id;
  }

  /**
   * Generate demo/mock data for first-time users
   * @private
   */
  _generateDemoData() {
    this._playerData = {
      ...DEFAULT_PLAYER_DATA,
      playerName: 'Neon Racer',
      level: Math.floor(Math.random() * 25) + 1,
      xp: Math.floor(Math.random() * 500),
      xpToNext: 100,
      racesPlayed: Math.floor(Math.random() * 150),
      racesWon: Math.floor(Math.random() * 80),
      winRate: 0,
      totalPlayTime: Math.floor(Math.random() * 36000000), // up to 10 hours
      credits: Math.floor(Math.random() * 50000) + 5000,
      gold: Math.floor(Math.random() * 500),
      loginStreak: Math.floor(Math.random() * 14) + 1,
      dailyBonusClaimed: false,
      unreadAchievements: Math.floor(Math.random() * 5)
    };
    
    // Recalculate dependent values
    this._playerData.xpToNext = Math.floor(100 * Math.pow(1.5, this._playerData.level - 1));
    this._playerData.winRate = this._playerData.racesPlayed > 0
      ? Math.round((this._playerData.racesWon / this._playerData.racesPlayed) * 100)
      : 0;
    
    // Update tier based on wins
    this._calculateStats({ 
      racesFinished: this._playerData.racesPlayed, 
      racesWon: this._playerData.racesWon 
    });
    
    console.log('[MainMenuSystem] Generated demo data');
  }

  /**
   * Check and update daily login status
   * @private
   */
  _checkDailyLogin() {
    const today = new Date().toDateString();
    const lastLogin = this._playerData.lastLoginDate;
    
    if (lastLogin !== today) {
      // New day - check streak
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastLogin === yesterday.toDateString()) {
        // Consecutive day - increment streak
        this._playerData.loginStreak++;
      } else if (lastLogin !== null) {
        // Streak broken
        this._playerData.loginStreak = 1;
      } else {
        // First time
        this._playerData.loginStreak = 1;
      }
      
      this._playerData.lastLoginDate = today;
      this._playerData.dailyBonusClaimed = false;
      
      // Save updated data
      this._savePlayerData();
    }
  }

  // ========================================================================
  // RENDERING
  // ========================================================================

  /**
   * Render the complete main menu interface.
   * 
   * @param {HTMLElement} container - Container element to render into
   * @returns {HTMLElement} The rendered root element
   */
  render(container = null) {
    const targetContainer = container || this._container;
    if (!targetContainer) {
      console.error('[MainMenuSystem] No container available for rendering');
      return null;
    }

    // Clean up previous render
    this.unmount();

    // Create root element
    this._element = document.createElement('div');
    this._element.className = `main-menu-system ${this._reducedMotion ? 'reduced-motion' : ''}`;
    this._element.setAttribute('role', 'main');
    this._element.setAttribute('aria-label', 'Main Menu');

    // Build complete HTML structure
    this._element.innerHTML = this._buildHTML();

    // Append to container
    targetContainer.appendChild(this._element);

    // Initialize components
    this._initializeParticles();
    this._initializeTicker();
    this._bindEvents();
    this._playEntranceAnimation();

    return this._element;
  }

  /**
   * Build the complete HTML structure for the main menu
   * @private
   * @returns {string} Complete HTML string
   */
  _buildHTML() {
    const tierInfo = PLAYER_TIERS[this._playerData.tier.toUpperCase()] || PLAYER_TIERS.BRONZE;
    const xpPercent = Math.min((this._playerData.xp / this._playerData.xpToNext) * 100, 100);

    return `
      <!-- Background Effects Layer -->
      <div class="mm-bg-layer" aria-hidden="true">
        <canvas class="mm-particles-canvas" aria-hidden="true"></canvas>
        <div class="mm-bg-grid"></div>
        <div class="mm-bg-glow mm-glow-1"></div>
        <div class="mm-bg-glow mm-glow-2"></div>
      </div>

      <!-- Main Content -->
      <div class="mm-content">
        <!-- Hero / Player Header -->
        <header class="mm-hero-section">
          <div class="mm-player-card">
            <!-- Avatar with Tier Ring -->
            <div class="mm-avatar-wrapper">
              <div class="mm-tier-ring" style="--tier-color: ${tierInfo.color}; --tier-glow: ${tierInfo.glowColor}">
                <div class="mm-avatar">
                  ${this._playerData.avatar 
                    ? `<img src="${this._playerData.avatar}" alt="${this._playerData.playerName}" />` 
                    : `<span class="mm-avatar-fallback">${this._playerData.playerName.charAt(0).toUpperCase()}</span>`
                  }
                </div>
              </div>
              <span class="mm-level-badge">Lv.${this._playerData.level}</span>
            </div>

            <!-- Player Info -->
            <div class="mm-player-info">
              <h1 class="mm-player-name">
                <span class="mm-title-prefix">${this._playerData.title}</span>
                ${this._playerData.playerName}
              </h1>
              
              <!-- XP Progress Bar -->
              <div class="mm-xp-bar" role="progressbar" aria-valuenow="${this._playerData.xp}" aria-valuemin="0" aria-valuemax="${this._playerData.xpToNext}">
                <div class="mm-xp-fill" style="--xp-percent: ${xpPercent}%"></div>
                <span class="mm-xp-text">${this._playerData.xp.toLocaleString()} / ${this._playerData.xpToNext.toLocaleString()} XP</span>
              </div>

              <!-- Quick Stats -->
              <div class="mm-quick-stats">
                <div class="mm-stat-item">
                  <span class="mm-stat-icon">🏁</span>
                  <span class="mm-stat-value">${this._playerData.racesPlayed}</span>
                  <span class="mm-stat-label">Races</span>
                </div>
                <div class="mm-stat-divider"></div>
                <div class="mm-stat-item">
                  <span class="mm-stat-icon">🏆</span>
                  <span class="mm-stat-value">${this._playerData.racesWon}</span>
                  <span class="mm-stat-label">Wins</span>
                </div>
                <div class="mm-stat-divider"></div>
                <div class="mm-stat-item">
                  <span class="mm-stat-icon">📈</span>
                  <span class="mm-stat-value">${this._playerData.winRate}%</span>
                  <span class="mm-stat-label">Win Rate</span>
                </div>
                <div class="mm-stat-divider"></div>
                <div class="mm-stat-item">
                  <span class="mm-stat-icon">${tierInfo.icon || '🥉'}</span>
                  <span class="mm-stat-value mm-stat-tier" style="color: ${tierInfo.color}">${tierInfo.name}</span>
                  <span class="mm-stat-label">Rank</span>
                </div>
              </div>
            </div>

            <!-- Currency Display -->
            <div class="mm-currency-bar">
              <div class="mm-currency-item">
                <span class="mm-currency-icon">💰</span>
                <span class="mm-currency-value">${this._playerData.credits.toLocaleString()}</span>
              </div>
              <div class="mm-currency-item mm-currency-gold">
                <span class="mm-currency-icon">🪙</span>
                <span class="mm-currency-value">${this._playerData.gold.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </header>

        <!-- Daily Bonus Banner -->
        ${this._renderDailyBonusBanner()}

        <!-- News Ticker -->
        <div class="mm-news-ticker" role="marquee" aria-label="News and events">
          <div class="mm-ticker-content">
            <span class="mm-ticker-icon">📢</span>
            <div class="mm-ticker-track">
              ${NEWS_EVENTS.map(event => `
                <span class="mm-ticker-item ${event.highlighted ? 'highlighted' : ''}">${event.text}</span>
                <span class="mm-ticker-separator">•</span>
              `).join('')}
              <!-- Duplicate for seamless loop -->
              ${NEWS_EVENTS.map(event => `
                <span class="mm-ticker-item ${event.highlighted ? 'highlighted' : ''}">${event.text}</span>
                <span class="mm-ticker-separator">•</span>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Primary Navigation Grid -->
        <nav class="mm-nav-primary" aria-label="Main navigation">
          <h2 class="sr-only">Main Menu Options</h2>
          <div class="mm-nav-grid">
            ${NAVIGATION_CARDS.map(card => this._renderNavCard(card)).join('')}
          </div>
        </nav>

        <!-- Secondary Navigation -->
        <nav class="mm-nav-secondary" aria-label="Secondary navigation">
          <div class="mm-secondary-list">
            ${SECONDARY_NAV.map(item => this._renderSecondaryNavItem(item)).join('')}
          </div>
        </nav>

        <!-- Quick Actions Bar -->
        <section class="mm-quick-actions" aria-label="Quick actions">
          <button class="mm-quick-btn mm-continue-btn" data-action="continue" aria-label="Continue where you left off">
            <span class="mm-quick-icon">▶️</span>
            <div class="mm-quick-info">
              <span class="mm-quick-label">Continue Racing</span>
              <span class="mm-quick-detail">${this._playerData.lastMode} • ${this._playerData.lastTrack}</span>
            </div>
          </button>
        </section>

        <!-- Footer -->
        <footer class="mm-footer">
          <div class="mm-version-info">
            <span>v0.7.0</span>
            <span class="mm-footer-separator">•</span>
            <span>Neon Underground</span>
            <span class="mm-footer-separator">•</span>
            <span>${new Date().toISOString().slice(0, 10)}</span>
          </div>
        </footer>
      </div>

      <!-- Settings Panel (Overlay) -->
      <aside class="mm-settings-panel ${this._settingsOpen ? 'open' : ''}" aria-label="Settings" hidden={!this._settingsOpen}>
        ${this._renderSettingsPanel()}
      </aside>

      <!-- Confirmation Dialog Template -->
      <dialog class="mm-dialog" id="mm-confirm-dialog" aria-labelledby="mm-dialog-title">
        <form method="dialog">
          <h3 id="mm-dialog-title" class="mm-dialog-title"></h3>
          <p id="mm-dialog-message" class="mm-dialog-message"></p>
          <div class="mm-dialog-actions">
            <button type="submit" value="cancel" class="mm-dialog-btn mm-dialog-cancel">Cancel</button>
            <button type="submit" value="confirm" class="mm-dialog-btn mm-dialog-confirm">Confirm</button>
          </div>
        </form>
      </dialog>
    `;
  }

  /**
   * Render a single navigation card
   * @private
   * @param {Object} card - Card configuration
   * @returns {string} Card HTML string
   */
  _renderNavCard(card) {
    const hasBadge = card.badge !== null && card.badge !== undefined;
    
    return `
      <button class="mm-nav-card" 
              data-navigate="${card.id}"
              aria-label="${card.label}: ${card.description}"
              style="--card-gradient: ${card.gradient}; --card-accent: ${card.color}">
        <div class="mm-card-content">
          <span class="mm-card-icon" aria-hidden="true">${card.icon}</span>
          <div class="mm-card-text">
            <span class="mm-card-label">${card.label}</span>
            <span class="mm-card-subtitle">${card.subtitle}</span>
          </div>
          ${hasBadge ? `<span class="mm-card-badge">${card.badge}</span>` : ''}
          <span class="mm-card-arrow" aria-hidden="true">›</span>
        </div>
        <div class="mm-card-hover-effect" aria-hidden="true"></div>
      </button>
    `;
  }

  /**
   * Render secondary navigation item
   * @private
   * @param {Object} item - Item configuration
   * @returns {string} Item HTML string
   */
  _renderSecondaryNavItem(item) {
    return `
      <button class="mm-secondary-btn" data-navigate="${item.id}" aria-label="${item.label}: ${item.description}">
        <span class="mm-secondary-icon" aria-hidden="true">${item.icon}</span>
        <span class="mm-secondary-text">${item.label}</span>
        <span class="mm-secondary-arrow" aria-hidden="true">→</span>
      </button>
    `;
  }

  /**
   * Render the daily bonus banner
   * @private
   * @returns {string} Banner HTML string or empty string if claimed
   */
  _renderDailyBonusBanner() {
    if (this._playerData.dailyBonusClaimed) {
      return '';
    }

    const streakBonus = this._calculateStreakBonus();
    
    return `
      <div class="mm-daily-banner" role="alert" aria-live="polite">
        <div class="mm-banner-content">
          <div class="mm-banner-icon-wrap">
            <span class="mm-banner-icon">🎁</span>
            <span class="mm-banner-streak">Day ${this._playerData.loginStreak} 🔥</span>
          </div>
          <div class="mm-banner-info">
            <span class="mm-banner-title">Daily Login Bonus!</span>
            <span class="mm-banner-rewards">
              +${streakBonus.credits.toLocaleString()} Credits
              • +${streakBonus.xp} XP
              ${streakBonus.gold > 0 ? `• +${streakBonus.gold} Gold` : ''}
            </span>
          </div>
          <button class="mm-banner-claim" data-action="claim-bonus" aria-label="Claim daily bonus">
            CLAIM
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Calculate streak bonus amounts
   * @private
   * @returns {Object} Bonus values
   */
  _calculateStreakBonus() {
    const streak = this._playerData.loginStreak;
    
    let creditsBase = 500;
    let xpBase = 50;
    let goldBonus = 0;
    
    // Streak milestones
    if (streak >= 30) {
      creditsBase = 5000;
      xpBase = 500;
      goldBonus = 10;
    } else if (streak >= 14) {
      creditsBase = 2500;
      xpBase = 250;
      goldBonus = 5;
    } else if (streak >= 7) {
      creditsBase = 1000;
      xpBase = 100;
      goldBonus = 2;
    } else {
      creditsBase = 500 + (streak * 100);
      xpBase = 50 + (streak * 10);
    }
    
    return { credits: creditsBase, xp: xpBase, gold: goldBonus };
  }

  /**
   * Render the full settings panel
   * @private
   * @returns {string} Settings panel HTML string
   */
  _renderSettingsPanel() {
    const settings = this._getSettingsValues();
    
    return `
      <div class="mm-settings-content">
        <header class="mm-settings-header">
          <h2 class="mm-settings-title">Settings</h2>
          <button class="mm-settings-close" data-action="close-settings" aria-label="Close settings">✕</button>
        </header>

        <div class="mm-settings-body">
          <!-- Audio Settings -->
          <fieldset class="mm-settings-group">
            <legend class="mm-group-title">🔊 Audio</legend>
            
            <div class="mm-setting-row">
              <label class="mm-setting-label" for="setting-master-vol">Master Volume</label>
              <input type="range" id="setting-master-vol" 
                     class="mm-slider" 
                     min="0" max="100" value="${settings.audio.masterVolume * 100}"
                     data-setting="audio.masterVolume"
                     aria-describedby="master-vol-value">
              <span id="master-vol-value" class="mm-setting-value">${Math.round(settings.audio.masterVolume * 100)}%</span>
            </div>

            <div class="mm-setting-row">
              <label class="mm-setting-label" for="setting-sfx-vol">Sound Effects</label>
              <input type="range" id="setting-sfx-vol"
                     class="mm-slider"
                     min="0" max="100" value="${settings.audio.sfxVolume * 100}"
                     data-setting="audio.sfxVolume"
                     aria-describedby="sfx-vol-value">
              <span id="sfx-vol-value" class="mm-setting-value">${Math.round(settings.audio.sfxVolume * 100)}%</span>
            </div>

            <div class="mm-setting-row">
              <label class="mm-setting-label" for="setting-music-vol">Music</label>
              <input type="range" id="setting-music-vol"
                     class="mm-slider"
                     min="0" max="100" value="${settings.audio.musicVolume * 100}"
                     data-setting="audio.musicVolume"
                     aria-describedby="music-vol-value">
              <span id="music-vol-value" class="mm-setting-value">${Math.round(settings.audio.musicVolume * 100)}%</span>
            </div>

            <div class="mm-setting-row">
              <label class="mm-setting-label" for="setting-ui-vol">UI/Voice</label>
              <input type="range" id="setting-ui-vol"
                     class="mm-slider"
                     min="0" max="100" value="${settings.audio.uiVolume * 100}"
                     data-setting="audio.uiVolume"
                     aria-describedby="ui-vol-value">
              <span id="ui-vol-value" class="mm-setting-value">${Math.round(settings.audio.uiVolume * 100)}%</span>
            </div>
          </fieldset>

          <!-- Video Settings -->
          <fieldset class="mm-settings-group">
            <legend class="mm-group-title">🖥️ Display</legend>
            
            <div class="mm-setting-row">
              <label class="mm-setting-label" for="setting-quality">Quality Preset</label>
              <select id="setting-quality" 
                      class="mm-select"
                      data-setting="video.quality"
                      aria-label="Graphics quality preset">
                <option value="low" ${settings.video.quality === 'low' ? 'selected' : ''}>Low</option>
                <option value="medium" ${settings.video.quality === 'medium' ? 'selected' : ''}>Medium</option>
                <option value="high" ${settings.video.quality === 'high' ? 'selected' : ''}>High</option>
                <option value="ultra" ${settings.video.quality === 'ultra' ? 'selected' : ''}>Ultra</option>
              </select>
            </div>

            <div class="mm-setting-row mm-setting-toggle">
              <label class="mm-setting-label" for="setting-fps">Show FPS Counter</label>
              <input type="checkbox" id="setting-fps"
                     class="mm-toggle"
                     ${settings.video.showFPS ? 'checked' : ''}
                     data-setting="video.showFPS"
                     role="switch"
                     aria-checked="${settings.video.showFPS}">
            </div>

            <div class="mm-setting-row mm-setting-toggle">
              <label class="mm-setting-label" for="setting-minimap">Minimap Always On</label>
              <input type="checkbox" id="setting-minimap"
                     class="mm-toggle"
                     ${settings.controls.showTouchControls === 'always' ? 'checked' : ''}
                     data-setting="controls.showTouchControls"
                     role="switch"
                     aria-checked="${settings.controls.showTouchControls === 'always'}">
            </div>
          </fieldset>

          <!-- Control Settings -->
          <fieldset class="mm-settings-group">
            <legend class="mm-group-title">🎮 Controls</legend>
            
            <div class="mm-setting-row">
              <label class="mm-setting-label" for="setting-sensitivity">Steering Sensitivity</label>
              <input type="range" id="setting-sensitivity"
                     class="mm-slider"
                     min="0" max="200" value="${settings.controls.steeringSensitivity * 100}"
                     data-setting="controls.steeringSensitivity"
                     aria-describedby="sens-value">
              <span id="sens-value" class="mm-setting-value">${Math.round(settings.controls.steeringSensitivity * 100)}%</span>
            </div>

            <div class="mm-setting-row mm-setting-toggle">
              <label class="mm-setting-label" for="setting-invert-y">Invert Y-Axis</label>
              <input type="checkbox" id="setting-invert-y"
                     class="mm-toggle"
                     ${settings.controls.invertY ? 'checked' : ''}
                     data-setting="controls.invertY"
                     role="switch"
                     aria-checked="${settings.controls.invertY}">
            </div>

            <div class="mm-setting-row mm-setting-toggle">
              <label class="mm-setting-label" for="setting-autoaccel">Auto-Acceleration</label>
              <input type="checkbox" id="setting-autoaccel"
                     class="mm-toggle"
                     ${settings.controls.autoAcceleration ? 'checked' : ''}
                     data-setting="controls.autoAcceleration"
                     role="switch"
                     aria-checked="${settings.controls.autoAcceleration}">
            </div>
          </fieldset>

          <!-- Language Placeholder -->
          <fieldset class="mm-settings-group">
            <legend class="mm-group-title">🌐 Language</legend>
            <div class="mm-setting-row">
              <label class="mm-setting-label" for="setting-language">Language</label>
              <select id="setting-language"
                      class="mm-select"
                      disabled
                      aria-label="Language selection">
                <option>English (Coming Soon)</option>
              </select>
            </div>
          </fieldset>

          <!-- Danger Zone -->
          <fieldset class="mm-settings-group mm-danger-zone">
            <legend class="mm-group-title">⚠️ Danger Zone</legend>
            
            <button class="mm-danger-btn" data-action="reset-progress" aria-label="Reset all progress">
              🗑️ Reset All Progress
            </button>
          </fieldset>

          <!-- Credits -->
          <div class="mm-credits-section">
            <details class="mm-credits-details">
              <summary class="mm-credits-summary">Credits & Attribution</summary>
              <div class="mm-credits-content">
                <p><strong>WARZONE KART: Neon Underground</strong></p>
                <p>v0.7.0 — Cycle 8 Development Build</p>
                <hr />
                <p><strong>Core Engine:</strong></p>
                <ul>
                  <li>Three.js r160 (3D Rendering)</li>
                  <li>Cannon-es 0.20 (Physics)</li>
                  <li>Howler.js 2.2.4 (Audio)</li>
                  <li>GSAP 3.12.5 (Animations)</li>
                </ul>
                <hr />
                <p><strong>UI Framework:</strong></p>
                <ul>
                  <li>Custom ES Module Architecture</li>
                  <li>CSS Design Tokens System</li>
                  <li>Responsive Touch-First Design</li>
                </ul>
              </div>
            </details>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Get current settings values from save system
   * @private
   * @returns {Object} Settings values
   */
  _getSettingsValues() {
    if (this._saveSystem?.data?.settings) {
      return this._saveSystem.data.settings;
    }
    
    // Return defaults
    return {
      audio: {
        masterVolume: 1.0,
        musicVolume: 0.7,
        sfxVolume: 0.9,
        uiVolume: 0.6
      },
      video: {
        quality: 'medium',
        showFPS: false,
        shadows: true,
        bloom: true,
        motionBlur: false
      },
      controls: {
        steeringSensitivity: 1.0,
        deadzone: 0.1,
        invertY: false,
        autoAcceleration: false,
        showTouchControls: 'auto'
      },
      accessibility: {
        colorBlindMode: 'none',
        screenShake: true,
        flashEffects: true,
        highContrastUI: false,
        largeText: false
      }
    };
  }

  // ========================================================================
  // EVENT HANDLING
  // ========================================================================

  /**
   * Bind all event listeners
   * @private
   */
  _bindEvents() {
    if (!this._element) return;

    // Navigation cards
    this._element.querySelectorAll('[data-navigate]').forEach(btn => {
      btn.addEventListener('click', this._handleNavigation);
      this._cleanupFunctions.push(() => btn.removeEventListener('click', this._handleNavigation));
    });

    // Action buttons
    this._element.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', this._handleAction.bind(this));
    });

    // Settings controls
    this._element.querySelectorAll('.mm-slider').forEach(slider => {
      slider.addEventListener('input', this._handleSettingsChange);
      this._cleanupFunctions.push(() => slider.removeEventListener('input', this._handleSettingsChange));
    });

    this._element.querySelectorAll('.mm-select').forEach(select => {
      select.addEventListener('change', this._handleSettingsChange);
      this._cleanupFunctions.push(() => select.removeEventListener('change', this._handleSettingsChange));
    });

    this._element.querySelectorAll('.mm-toggle').forEach(toggle => {
      toggle.addEventListener('change', this._handleSettingsChange);
      this._cleanupFunctions.push(() => toggle.removeEventListener('change', this._handleSettingsChange));
    });

    // Keyboard navigation
    this._element.addEventListener('keydown', this._handleKeyboard.bind(this));

    // Visibility change for pause/resume animations
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this._pauseParticles();
      } else {
        this._resumeParticles();
      }
    });

    // Reduced motion preference change
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionQuery.addEventListener('change', (e) => {
      this._reducedMotion = e.matches;
      if (this._element) {
        this._element.classList.toggle('reduced-motion', this._reducedMotion);
      }
    });
  }

  /**
   * Handle generic action button clicks
   * @private
   * @param {Event} e - Click event
   */
  _handleAction(e) {
    const action = e.currentTarget.dataset.action;
    
    switch (action) {
      case 'claim-bonus':
        this._claimDailyBonus(e);
        break;
      case 'continue':
        this.navigate(MENU_SCREEN.RACE);
        break;
      case 'close-settings':
        this.closeSettings();
        break;
      case 'reset-progress':
        this._showConfirmDialog(
          'Reset All Progress?',
          'This will permanently delete all your save data including currency, vehicles, and achievements. This action cannot be undone.',
          () => this._resetProgress()
        );
        break;
    }
  }

  /**
   * Handle navigation button click
   * @private
   * @param {Event} e - Click event
   */
  _handleNavigation(e) {
    const targetScreen = e.currentTarget.dataset.navigate;
    
    if (!targetScreen) return;
    
    // Play sound effect if available
    this._playSound('navigate');

    this.navigate(targetScreen);
  }

  /**
   * Handle keyboard navigation
   * @private
   * @param {KeyboardEvent} e - Keyboard event
   */
  _handleKeyboard(e) {
    // ESC to close settings
    if (e.key === 'Escape') {
      if (this._settingsOpen) {
        this.closeSettings();
        return;
      }
    }
    
    // Number keys for quick navigation
    const numKeys = ['1', '2', '3', '4', '5', '6'];
    if (numKeys.includes(e.key)) {
      const index = parseInt(e.key) - 1;
      if (NAVIGATION_CARDS[index]) {
        this.navigate(NAVIGATION_CARDS[index].id);
      }
    }
  }

  /**
   * Handle settings control changes
   * @private
   * @param {Event} e - Change/Input event
   */
  _handleSettingsChange(e) {
    const settingPath = e.target.dataset.setting;
    if (!settingPath) return;

    let value;
    
    if (e.target.type === 'range') {
      value = parseInt(e.target.value) / 100;
      // Update displayed value
      const valueDisplay = e.target.parentElement.querySelector('.mm-setting-value');
      if (valueDisplay) {
        valueDisplay.textContent = `${parseInt(e.target.value)}%`;
      }
    } else if (e.target.type === 'checkbox') {
      // Special handling for touch controls (it's not a simple boolean here)
      if (settingPath === 'controls.showTouchControls') {
        value = e.target.checked ? 'always' : 'auto';
      } else {
        value = e.target.checked;
      }
      // Update aria attribute
      e.target.setAttribute('aria-checked', e.target.checked);
    } else {
      value = e.target.value;
    }

    // Save to save system
    if (this._saveSystem) {
      this._saveSystem.updateSetting(...settingPath.split('.'), value);
    }

    this._emitEvent('settingsChanged', { path: settingPath, value });
  }

  // ========================================================================
  // NAVIGATION
  // ========================================================================

  /**
   * Navigate to a specific screen.
   * Integrates with UIRouter if available, otherwise emits custom event.
   * 
   * @param {string} screenId - Target screen identifier
   * @param {Object} [data] - Optional data to pass to the screen
   */
  navigate(screenId, data = {}) {
    console.log(`[MainMenuSystem] Navigating to: ${screenId}`);

    // Play transition sound
    this._playSound('navigate');

    // Try using UIRouter first
    if (this._router) {
      const routerMap = {
        [MENU_SCREEN.RACE]: 'mode-select',
        [MENU_SCREEN.TOURNAMENT]: 'tournament',
        [MENU_SCREEN.PROFILE]: 'profile',
        [MENU_SCREEN.GARAGE]: 'garage',
        [MENU_SCREEN.ACHIEVEMENTS]: 'achievements',
        [MENU_SCREEN.CHALLENGES]: 'challenges',
        [MENU_SCREEN.LEADERBOARD]: 'leaderboard',
        [MENU_SCREEN.SETTINGS]: 'settings.root',
        [MENU_SCREEN.SAVE_DATA]: 'store'
      };

      const routerScreen = routerMap[screenId];
      if (routerScreen) {
        this._router.push(routerScreen, data).catch(err => {
          console.warn(`[MainMenuSystem] Router navigation failed:`, err);
          this._emitFallbackNavigation(screenId, data);
        });
        return;
      }
    }

    // Fallback: emit custom event
    this._emitFallbackNavigation(screenId, data);
  }

  /**
   * Emit fallback navigation event when router unavailable
   * @private
   * @param {string} screenId - Screen identifier
   * @param {Object} data - Optional data
   */
  _emitFallbackNavigation(screenId, data) {
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('mainmenu:navigate', {
      detail: { screenId, data }
    }));

    this._emitEvent('navigated', { to: screenId, data });
  }

  // ========================================================================
  // DAILY BONUS
  // ========================================================================

  /**
   * Claim the daily login bonus
   * @private
   * @param {Event} e - Click event
   */
  _claimDailyBonus(e) {
    if (this._playerData.dailyBonusClaimed) return;

    const bonus = this._calculateStreakBonus();
    
    // Award bonuses
    if (this._saveSystem) {
      this._saveSystem.addCurrency('credits', bonus.credits, 'daily_bonus');
      if (bonus.gold > 0) {
        this._saveSystem.addCurrency('gold', bonus.gold, 'daily_bonus_streak');
      }
      this._saveSystem.addXP(bonus.xp, 'daily_bonus');
    }

    // Update local data
    this._playerData.credits += bonus.credits;
    this._playerData.gold += bonus.gold || 0;
    this._playerData.dailyBonusClaimed = true;

    // Save
    this._savePlayerData();

    // Show success feedback
    this._showNotification(`Daily bonus claimed!\n+${bonus.credits.toLocaleString()} Credits\n+${bonus.xp} XP${bonus.gold ? `\n+${bonus.gold} Gold` : ''}`, 'success');

    // Remove banner
    const banner = this._element?.querySelector('.mm-daily-banner');
    if (banner) {
      banner.classList.add('claimed');
      setTimeout(() => banner.remove(), 400);
    }

    // Play sound
    this._playSound('reward');

    // Emit event
    this._emitEvent('dailyBonusClaimed', { bonus, streak: this._playerData.loginStreak });
  }

  // ========================================================================
  // SETTINGS
  // ========================================================================

  /**
   * Open the settings panel
   */
  openSettings() {
    this._settingsOpen = true;
    const panel = this._element?.querySelector('.mm-settings-panel');
    if (panel) {
      panel.hidden = false;
      requestAnimationFrame(() => panel.classList.add('open'));
    }
    this._playSound('ui_open');
  }

  /**
   * Close the settings panel
   */
  closeSettings() {
    this._settingsOpen = false;
    const panel = this._element?.querySelector('.mm-settings-panel');
    if (panel) {
      panel.classList.remove('open');
      setTimeout(() => panel.hidden = true, 300);
    }
    this._playSound('ui_close');
  }

  /**
   * Toggle settings panel visibility
   */
  toggleSettings() {
    if (this._settingsOpen) {
      this.closeSettings();
    } else {
      this.openSettings();
    }
  }

  // ========================================================================
  // SAVE DATA MANAGEMENT
  // ========================================================================

  /**
   * Handle save-related actions
   * @private
   * @param {string} action - Action type ('save', 'load', 'export', 'import', 'delete')
   */
  _handleSaveAction(action) {
    switch (action) {
      case 'save':
        if (this._saveSystem) {
          this._saveSystem.saveNow();
          this._showNotification('Game saved successfully!', 'success');
        }
        break;
        
      case 'export':
        if (this._saveSystem) {
          const exportData = this._saveSystem.exportSave();
          if (exportData) {
            // Create download
            const blob = new Blob([exportData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `wzk_save_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            this._showNotification('Save exported!', 'success');
          }
        }
        break;

      case 'reset':
        this._showConfirmDialog(
          'Reset All Progress?',
          'This will permanently delete ALL your progress. Are you absolutely sure?',
          () => this._resetProgress()
        );
        break;
    }
  }

  /**
   * Reset all player progress
   * @private
   */
  _resetProgress() {
    if (this._saveSystem) {
      this._saveSystem.resetSave();
    }
    
    // Reset local data
    localStorage.removeItem('wzk_mainmenu_player');
    
    // Regenerate fresh data
    this._generateDemoData();
    
    // Re-render
    this.render();
    
    this._showNotification('All progress has been reset.', 'info');
    this._emitEvent('progressReset');
  }

  /**
   * Save current player data to storage
   * @private
   */
  _savePlayerData() {
    try {
      localStorage.setItem('wzk_mainmenu_player', JSON.stringify(this._playerData));
      
      // Also update save system if available
      if (this._saveSystem?.data?.player) {
        Object.assign(this._saveSystem.data.player, {
          name: this._playerData.playerName,
          title: this._playerData.title,
          level: this._playerData.level,
          xp: this._playerData.xp,
          xpToNext: this._playerData.xpToNext
        });
        this._saveSystem.update('player', this._saveSystem.data.player);
      }
    } catch (err) {
      console.error('[MainMenuSystem] Failed to save player data:', err);
    }
  }

  // ========================================================================
  // VISUAL EFFECTS
  // ========================================================================

  /**
   * Initialize background particle animation
   * @private
   */
  _initializeParticles() {
    if (this._reducedMotion) return;
    
    const canvas = this._element?.querySelector('.mm-particles-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size
    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    // Particle pool
    const particles = [];
    const PARTICLE_COUNT = 40;

    class Particle {
      constructor() {
        this.reset();
      }

      reset() {
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.speedY = (Math.random() - 0.5) * 0.3;
        this.opacity = Math.random() * 0.5 + 0.1;
        this.hue = Math.random() > 0.7 ? 15 : 180; // Orange or cyan tint
        this.pulse = Math.random() * Math.PI * 2;
        this.pulseSpeed = Math.random() * 0.02 + 0.01;
      }

      update(w, h) {
        this.x += this.speedX;
        this.y += this.speedY;
        this.pulse += this.pulseSpeed;

        // Wrap around edges
        if (this.x < 0) this.x = w;
        if (this.x > w) this.x = 0;
        if (this.y < 0) this.y = h;
        if (this.y > h) this.y = 0;
      }

      draw(ctx) {
        const pulseOpacity = this.opacity + Math.sin(this.pulse) * 0.2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue}, 80%, 60%, ${pulseOpacity})`;
        ctx.fill();
      }
    }

    // Create particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(new Particle());
    }

    // Animation loop
    const animate = () => {
      if (!canvas.isConnected) {
        cancelAnimationFrame(this._particleAnimationId);
        return;
      }

      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      ctx.clearRect(0, 0, w, h);

      particles.forEach(p => {
        p.update(w, h);
        p.draw(ctx);
      });

      this._particleAnimationId = requestAnimationFrame(animate);
    };

    animate();
  }

  /**
   * Pause particle animation
   * @private
   */
  _pauseParticles() {
    if (this._particleAnimationId) {
      cancelAnimationFrame(this._particleAnimationId);
      this._particleAnimationId = null;
    }
  }

  /**
   * Resume particle animation
   * @private
   */
  _resumeParticles() {
    if (!this._particleAnimationId && !this._reducedMotion) {
      this._initializeParticles();
    }
  }

  /**
   * Initialize news ticker scroll animation
   * @private
   */
  _initializeTicker() {
    if (this._reducedMotion) return;

    const track = this._element?.querySelector('.mm-ticker-track');
    if (!track) return;

    let position = 0;
    const speed = 0.5; // pixels per frame

    const animate = () => {
      if (!track.isConnected) {
        clearInterval(this._tickerIntervalId);
        return;
      }

      position -= speed;
      
      // Get track width and reset when scrolled halfway (for seamless loop)
      const halfWidth = track.scrollWidth / 2;
      if (position <= -halfWidth) {
        position = 0;
      }

      track.style.transform = `translateX(${position}px)`;
    };

    this._tickerIntervalId = setInterval(animate, 16); // ~60fps
  }

  /**
   * Play entrance/stagger animation for cards
   * @private
   */
  _playEntranceAnimation() {
    const cards = this._element?.querySelectorAll('.mm-nav-card');
    if (!cards || cards.length === 0) return;

    if (this._reducedMotion) {
      // Just show everything immediately
      cards.forEach(card => card.style.opacity = '1');
      return;
    }

    cards.forEach((card, index) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      
      this._staggerTimeout = setTimeout(() => {
        card.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, 100 + (index * 70)); // Stagger delay
    });
  }

  // ========================================================================
  // DIALOG SYSTEM
  // ========================================================================

  /**
   * Show confirmation dialog
   * @private
   * @param {string} title - Dialog title
   * @param {string} message - Dialog message
   * @param {Function} onConfirm - Callback on confirm
   */
  _showConfirmDialog(title, message, onConfirm) {
    const dialog = this._element?.querySelector('#mm-confirm-dialog');
    if (!dialog) return;

    const titleEl = dialog.querySelector('#mm-dialog-title');
    const msgEl = dialog.querySelector('#mm-dialog-message');

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;

    dialog.showModal();

    dialog.addEventListener('close', () => {
      if (dialog.returnValue === 'confirm' && typeof onConfirm === 'function') {
        onConfirm();
      }
    }, { once: true });
  }

  /**
   * Show notification toast
   * @private
   * @param {string} message - Notification message
   * @param {string} type - Notification type ('success', 'error', 'info')
   */
  _showNotification(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `mm-toast mm-toast-${type}`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    
    const icons = {
      success: '✅',
      error: '❌',
      info: 'ℹ️',
      warning: '⚠️'
    };

    toast.innerHTML = `
      <span class="mm-toast-icon">${icons[type] || icons.info}</span>
      <span class="mm-toast-message">${message.replace('\n', '<br>')}</span>
    `;

    // Add to DOM
    document.body.appendChild(toast);

    // Trigger entrance
    requestAnimationFrame(() => toast.classList.add('visible'));

    // Auto remove after delay
    setTimeout(() => {
      toast.classList.remove('visible');
      toast.addEventListener('transitionend', () => toast.remove());
    }, 3000);
  }

  // ========================================================================
  // AUDIO
  // ========================================================================

  /**
   * Play UI sound effect
   * @private
   * @param {string} soundId - Sound identifier
   */
  _playSound(soundId) {
    // Try to use audio effects system
    if (window.__audioEffects && typeof window.__audioEffects.playUISound === 'function') {
      window.__audioEffects.playUISound(soundId);
      return;
    }

    // Fallback: try EventBus
    if (window.__engine?.bus) {
      window.__engine.bus.emit('audio:playUI', { sound: soundId });
    }
  }

  // ========================================================================
  // DATA UPDATES
  // ========================================================================

  /**
   * Update player data and refresh UI
   * @param {Object} updates - Data fields to update
   */
  updatePlayerData(updates) {
    Object.assign(this._playerData, updates);
    
    // Recalculate derived stats if needed
    if (updates.racesPlayed || updates.racesWon) {
      this._playerData.winRate = this._playerData.racesPlayed > 0
        ? Math.round((this._playerData.racesWon / this._playerData.racesPlayed) * 100)
        : 0;
    }

    // Save changes
    this._savePlayerData();

    // Refresh visible parts of UI
    this._refreshDynamicContent();

    this._emitEvent('playerDataUpdated', { updates });
  }

  /**
   * Refresh dynamic content without full re-render
   * @private
   */
  _refreshDynamicContent() {
    if (!this._element) return;

    // Update player name
    const nameEl = this._element.querySelector('.mm-player-name');
    if (nameEl) {
      nameEl.innerHTML = `<span class="mm-title-prefix">${this._playerData.title}</span>${this._playerData.playerName}`;
    }

    // Update level badge
    const levelEl = this._element.querySelector('.mm-level-badge');
    if (levelEl) {
      levelEl.textContent = `Lv.${this._playerData.level}`;
    }

    // Update XP bar
    const xpPercent = Math.min((this._playerData.xp / this._playerData.xpToNext) * 100, 100);
    const xpFill = this._element.querySelector('.mm-xp-fill');
    if (xpFill) {
      xpFill.style.setProperty('--xp-percent', `${xpPercent}%`);
    }

    const xpText = this._element.querySelector('.mm-xp-text');
    if (xpText) {
      xpText.textContent = `${this._playerData.xp.toLocaleString()} / ${this._playerData.xpToNext.toLocaleString()} XP`;
    }

    // Update stats
    const statItems = this._element.querySelectorAll('.mm-stat-value');
    if (statItems.length >= 4) {
      statItems[0].textContent = this._playerData.racesPlayed.toString();
      statItems[1].textContent = this._playerData.racesWon.toString();
      statItems[2].textContent = `${this._playerData.winRate}%`;
    }

    // Update currency
    const currencyValues = this._element.querySelectorAll('.mm-currency-value');
    if (currencyValues.length >= 2) {
      currencyValues[0].textContent = this._playerData.credits.toLocaleString();
      currencyValues[1].textContent = this._playerData.gold.toLocaleString();
    }
  }

  // ========================================================================
  // LIFECYCLE
  // ========================================================================

  /**
   * Unmount and clean up the main menu
   */
  unmount() {
    // Stop animations
    this._pauseParticles();
    
    if (this._tickerIntervalId) {
      clearInterval(this._tickerIntervalId);
      this._tickerIntervalId = null;
    }

    if (this._staggerTimeout) {
      clearTimeout(this._staggerTimeout);
      this._staggerTimeout = null;
    }

    // Run cleanup functions
    this._cleanupFunctions.forEach(fn => fn());
    this._cleanupFunctions = [];

    // Remove element
    if (this._element) {
      this._element.remove();
      this._element = null;
    }
  }

  /**
   * Destroy the main menu system completely
   */
  destroy() {
    this.unmount();
    this._container = null;
    this._saveSystem = null;
    this._router = null;
    this._isInitialized = false;
    console.log('[MainMenuSystem] Destroyed');
  }

  // ========================================================================
  // EVENT EMITTER
  // ========================================================================

  /**
   * Emit a custom event
   * @private
   * @param {string} eventName - Event name
   * @param {*} data - Event data
   */
  _emitEvent(eventName, data) {
    // Custom DOM event
    window.dispatchEvent(new CustomEvent(`mainmenu:${eventName}`, { detail: data }));
    
    // Console debug
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log(`[MainMenuSystem] Event: ${eventName}`, data);
    }
  }

  /**
   * Subscribe to main menu events
   * @param {string} eventName - Event name (without prefix)
   * @param {Function} callback - Event handler
   * @returns {Function} Unsubscribe function
   */
  on(eventName, callback) {
    const handler = (e) => callback(e.detail);
    window.addEventListener(`mainmenu:${eventName}`, handler);
    
    return () => window.removeEventListener(`mainmenu:${eventName}`, handler);
  }

  // ========================================================================
  // GETTERS
  // ========================================================================

  /** @returns {boolean} Whether system is initialized */
  get isInitialized() { return this._isInitialized; }

  /** @returns {Object} Current player data (read-only copy) */
  get playerData() { return { ...this._playerData }; }

  /** @returns {boolean} Whether settings panel is open */
  get isSettingsOpen() { return this._settingsOpen; }

  /** @returns {HTMLElement|null} Current root element */
  get element() { return this._element; }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/**
 * Singleton instance of MainMenuSystem
 * @type {MainMenuSystem}
 */
let _mainMenuInstance = null;

/**
 * Get or create the singleton MainMenuSystem instance
 * @param {Object} [options] - Options to pass to init() if creating new
 * @returns {Promise<MainMenuSystem>} The singleton instance
 */
export async function getMainMenu(options = {}) {
  if (!_mainMenuInstance) {
    _mainMenuInstance = new MainMenuSystem();
    await _mainMenuInstance.init(options);
  }
  return _mainMenuInstance;
}

/**
 * Get existing instance without initializing (may be null)
 * @returns {MainMenuSystem|null}
 */
export function getMenuInstance() {
  return _mainMenuInstance;
}

// Export default singleton getter
export default getMainMenu;

// ============================================================================
// GLOBAL EXPOSURE (for debugging)
// ============================================================================

/**
 * Global reference to main menu system for console debugging
 * Usage: window.__mainMenu.navigate('race'), etc.
 */
if (typeof window !== 'undefined') {
  window.__getMainMenu = getMainMenu;
  window.__mainMenu = null; // Will be set when initialized
  
  // Convenience: auto-expose when initialized
  getMainMenu().then(instance => {
    window.__mainMenu = instance;
  }).catch(console.error);
}
