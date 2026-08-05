// ui/profile.js — Comprehensive Player Profile System for Warzone Kart: Neon Underground
//
// Features:
// - Player profile card with avatar, level, XP bar, status
// - Statistics dashboard (races, wins, time played, etc.)
// - Recent activity feed with race results and achievements
// - Achievement showcase with rarity breakdown
// - Vehicle collection grid with ownership status
// - Profile customization (titles, banners, frames)
// - localStorage persistence for player data
// CSS: loaded via ui/styles/profile.css in index.html

/**
 * @enum {string}
 * Player rank tiers for avatar frame display
 */
export const PLAYER_TIER = {
  BRONZE: 'tier-bronze',
  SILVER: 'tier-silver',
  GOLD: 'tier-gold',
  PLATINUM: 'tier-platinum',
  DIAMOND: 'tier-diamond',
  CHAMPION: 'tier-champion'
};

/**
 * @enum {string}
 * Player online status states
 */
export const PLAYER_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  IN_RACE: 'in-race'
};

/**
 * Achievement rarity levels for display
 */
const ACHIEVEMENT_RARITY = {
  COMMON: { id: 'common', color: '#8a8a8a', label: 'Common' },
  UNCOMMON: { id: 'uncommon', color: '#00ffa8', label: 'Uncommon' },
  RARE: { id: 'rare', color: '#00e5ff', label: 'Rare' },
  EPIC: { id: 'epic', color: '#aa00ff', label: 'Epic' },
  LEGENDARY: { id: 'legendary', color: '#ffd23f', label: 'Legendary' }
};

/**
 * Default player data structure
 */
const DEFAULT_PLAYER_DATA = {
  // Identity
  playerId: null,
  playerName: 'Neon Racer',
  title: 'Rookie',
  avatar: null,
  
  // Level & Progression
  level: 1,
  xp: 0,
  xpToNextLevel: 100,
  joinDate: new Date().toISOString(),
  
  // Tier/Rank
  tier: PLAYER_TIER.BRONZE,
  
  // Status
  status: PLAYER_STATUS.OFFLINE,
  
  // Statistics
  stats: {
    totalRaces: 0,
    wins: 0,
    totalPlayTime: 0, // in seconds
    topSpeedEver: 0,
    averagePosition: 0,
    favoriteVehicle: null,
    favoriteTrack: null,
    currentStreak: { type: 'wins', count: 0 },
    globalRank: null,
    rankChange: null // 'up', 'down', or null
  },
  
  // Customization choices
  customization: {
    selectedTitle: 'Rookie',
    bannerId: 'default',
    frameId: 'bronze'
  },
  
  // Activity history
  recentActivity: [],
  
  // Owned vehicles
  ownedVehicleIds: ['starter-kart'],
  
  // Unlocked titles
  unlockedTitles: ['Rookie'],
  
  // Achievements unlocked
  achievementIds: []
};

/**
 * Mock data generators for demo mode
 */
const MOCK_TRACKS = [
  'Downtown Dash', 'Neon Speedway', 'Cyber Circuit',
  'Skyline Summit', 'Underground Tunnel', 'Harbor Rush',
  'Tech District', 'Crystal Caves', 'Volcano Run'
];

const MOCK_VEHICLES = [
  { id: 'starter-kart', name: 'Starter Kart', icon: '🏎️', category: 'starter' },
  { id: 'speed-demon', name: 'Speed Demon', icon: '🚀', category: 'speed' },
  { id: 'shadow-racer', name: 'Shadow Racer', icon: '👻', category: 'balanced' },
  { id: 'iron-titan', name: 'Iron Titan', icon: '🛡️', category: 'heavy' },
  { id: 'neon-phantom', name: 'Neon Phantom', icon: '✨', category: 'special' },
  { id: 'thunder-bolt', name: 'Thunder Bolt', icon: '⚡', category: 'speed' },
  { id: 'crystal-fury', name: 'Crystal Fury', icon: '💎', category: 'special' }
];

const MOCK_ACHIEVEMENTS = [
  { id: 'first-win', name: 'First Victory', description: 'Win your first race', rarity: ACHIEVEMENT_RARITY.COMMON.id, icon: '🏆' },
  { id: 'speed-10', name: 'Speed Demon', description: 'Reach 200 km/h', rarity: ACHIEVEMENT_RARITY.UNCOMMON.id, icon: '⚡' },
  { id: 'win-streak-5', name: 'Hot Streak', description: 'Win 5 races in a row', rarity: ACHIEVEMENT_RARITY.RARE.id, icon: '🔥' },
  { id: 'perfect-run', name: 'Perfect Run', description: 'Complete a race without hitting anything', rarity: ACHIEVEMENT_RARITY.EPIC.id, icon: '⭐' },
  { id: 'champion-tier', name: 'Champion Racer', description: 'Reach Champion tier', rarity: ACHIEVEMENT_RARITY.LEGENDARY.id, icon: '👑' },
  { id: 'races-100', name: 'Centurion', description: 'Complete 100 races', rarity: ACHIEVEMENT_RARITY.COMMON.id, icon: '💯' },
  { id: 'drift-master', name: 'Drift Master', description: 'Drift for a total of 10 minutes', rarity: ACHIEVEMENT_RARITY.UNCOMMON.id, icon: '🌀' },
  { id: 'collector', name: 'Collector', description: 'Own 5 different vehicles', rarity: ACHIEVEMENT_RARITY.RARE.id, icon: '🎁' }
];

const MOCK_TITLE_OPTIONS = [
  { id: 'rookie', name: 'Rookie', requirement: 'Default' },
  { id: 'speedster', name: 'Speedster', requirement: 'Win 10 races' },
  { id: 'veteran', name: 'Veteran', requirement: 'Complete 50 races' },
  { id: 'legend', name: 'Neon Legend', requirement: 'Reach Diamond tier' },
  { id: 'ace', name: 'Ace', requirement: 'Get 25 wins' },
  { id: 'champion', name: 'Champion', requirement: 'Reach Champion tier' },
  { id: 'drift-king', name: 'Drift King', requirement: 'Drift 100 times' },
  { id: 'item-master', name: 'Item Master', requirement: 'Use 500 items' }
];

const MOCK_BANNER_OPTIONS = [
  { id: 'default', gradient: 'linear-gradient(135deg, #1a1c2e 0%, #0d0f1a 100%)', name: 'Classic' },
  { id: 'neon-red', gradient: 'linear-gradient(135deg, #2d1017 0%, #1a0a0e 50%, #3d1119 100%)', name: 'Neon Red' },
  { id: 'cyber-blue', gradient: 'linear-gradient(135deg, #0a1a2d 0%, #05101a 50%, #0d2840 100%)', name: 'Cyber Blue' },
  { id: 'golden-hour', gradient: 'linear-gradient(135deg, #2d2010 0%, #1a1208 50%, #403010 100%)', name: 'Golden Hour' },
  { id: 'purple-haze', gradient: 'linear-gradient(135deg, #1a0a2d 0%, #10051a 50%, #280d40 100%)', name: 'Purple Haze' },
  { id: 'matrix-green', gradient: 'linear-gradient(135deg, #0a2d15 0%, #051a0d 50%, #104020 100%)', name: 'Matrix Green' }
];

/**
 * Generate mock recent activity data
 */
function generateMockActivity(count = 10) {
  const activity = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const isRace = Math.random() > 0.15;
    const dateOffset = Math.floor(Math.random() * 30); // days ago
    
    if (isRace) {
      const position = Math.floor(Math.random() * 6) + 1;
      const track = MOCK_TRACKS[Math.floor(Math.random() * MOCK_TRACKS.length)];
      const vehicle = MOCK_VEHICLES[Math.floor(Math.random() * MOCK_VEHICLES.length)];
      const minutes = Math.floor(Math.random() * 4) + 1;
      const seconds = Math.floor(Math.random() * 60);
      
      activity.push({
        type: 'race-result',
        trackName: track,
        position: position,
        time: `${minutes}:${seconds.toString().padStart(2, '0')}.${Math.floor(Math.random() * 999).toString().padStart(3, '0')}`,
        vehicleIcon: vehicle.icon,
        vehicleName: vehicle.name,
        date: new Date(now - dateOffset * 24 * 60 * 60 * 1000)
      });
    } else {
      const achievement = MOCK_ACHIEVEMENTS[Math.floor(Math.random() * MOCK_ACHIEVEMENTS.length)];
      
      activity.push({
        type: 'achievement-unlock',
        achievementName: achievement.name,
        achievementIcon: achievement.icon,
        achievementRarity: achievement.rarity,
        date: new Date(now - dateOffset * 24 * 60 * 60 * 1000)
      });
    }
  }
  
  return activity.sort((a, b) => b.date - a.date);
}

/**
 * Format play time from seconds to human-readable string
 */
function formatPlayTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

/**
 * Format date to relative time string
 */
function formatDateRelative(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Get tier from level
 */
function getTierFromLevel(level) {
  if (level >= 50) return PLAYER_TIER.CHAMPION;
  if (level >= 40) return PLAYER_TIER.DIAMOND;
  if (level >= 30) return PLAYER_TIER.PLATINUM;
  if (level >= 20) return PLAYER_TIER.GOLD;
  if (level >= 10) return PLAYER_TIER.SILVER;
  return PLAYER_TIER.BRONZE;
}

/**
 * ProfileSystem class - Main entry point for player profile UI
 */
class ProfileSystem {
  constructor() {
    /** @type {HTMLElement|null} Current container element */
    this.container = null;
    
    /** @type {Object} Player data */
    this.playerData = { ...DEFAULT_PLAYER_DATA };
    
    /** @type {boolean} Whether data has been loaded */
    this.isLoaded = false;
    
    /** @type {Function|null} Optional callback on customization change */
    this.onCustomizationChange = null;
    
    // Bind methods
    this.render = this.render.bind(this);
    this.loadPlayerData = this.loadPlayerData.bind(this);
    this.savePlayerData = this.savePlayerData.bind(this);
  }

  /**
   * Initialize and render the profile system into a container
   * @param {HTMLElement|string} container - DOM element or selector
   * @param {string|null} playerId - Optional player ID to load
   */
  async renderProfile(container, playerId = null) {
    if (typeof container === 'string') {
      this.container = document.querySelector(container);
    } else {
      this.container = container;
    }
    
    if (!this.container) {
      console.error('[ProfileSystem] Invalid container provided');
      return false;
    }

    try {
      await this.loadPlayerData(playerId);
      this.isLoaded = true;
      this._render();
      return true;
    } catch (error) {
      console.error('[ProfileSystem] Error loading profile:', error);
      this._renderError(error.message);
      return false;
    }
  }

  /**
   * Load player data from storage or generate mock data
   * @param {string|null} playerId 
   */
  async loadPlayerData(playerId) {
    // Try loading from localStorage first
    const storageKey = `wz_profile_${playerId || 'default'}`;
    let storedData = null;
    
    try {
      storedData = localStorage.getItem(storageKey);
    } catch (e) {
      // localStorage may not be available
    }

    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        this.playerData = { ...DEFAULT_PLAYER_DATA, ...parsed };
      } catch (e) {
        console.warn('[ProfileSystem] Failed to parse stored data, using defaults');
      }
    }

    // If no stored data or first time, generate mock/demo data
    if (!this.playerData.playerId && !storedData) {
      this._generateDemoData(playerId);
    }
  }

  /**
   * Save current player data to storage
   */
  savePlayerData() {
    const storageKey = `wz_profile_${this.playerData.playerId || 'default'}`;
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(this.playerData));
    } catch (e) {
      console.warn('[ProfileSystem] Failed to save data:', e);
    }
  }

  /**
   * Generate demo/mock data for testing
   * @private
   */
  _generateDemoData(playerId) {
    const level = Math.floor(Math.random() * 45) + 5;
    const xpProgress = Math.random();
    
    this.playerData = {
      ...DEFAULT_PLAYER_DATA,
      playerId: playerId || `player_${Date.now()}`,
      playerName: ['NeonAce99', 'SpeedDemonX', 'ShadowRacer', 'TurboKing', 'CyberBlaze'][Math.floor(Math.random() * 5)],
      title: 'Neon Legend',
      level: level,
      xp: Math.floor(xpProgress * this.playerData.xpToNextLevel),
      joinDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      tier: getTierFromLevel(level),
      status: Math.random() > 0.3 ? PLAYER_STATUS.ONLINE : PLAYER_STATUS.OFFLINE,
      stats: {
        totalRaces: Math.floor(Math.random() * 500) + 20,
        wins: Math.floor(Math.random() * 200) + 5,
        totalPlayTime: Math.floor(Math.random() * 172800), // up to 48 hours
        topSpeedEver: Math.floor(Math.random() * 80) + 180, // 180-260 km/h
        averagePosition: (Math.random() * 3 + 1.5).toFixed(1),
        favoriteVehicle: MOCK_VEHICLES[Math.floor(Math.random() * MOCK_VEHICLES.length)],
        favoriteTrack: MOCK_TRACKS[Math.floor(Math.random() * MOCK_TRACKS.length)],
        currentStreak: {
          type: Math.random() > 0.3 ? 'wins' : 'losses',
          count: Math.floor(Math.random() * 10)
        },
        globalRank: Math.floor(Math.random() * 10000) + 1,
        rankChange: ['up', 'down', null][Math.floor(Math.random() * 3)]
      },
      customization: {
        selectedTitle: 'Neon Legend',
        bannerId: 'cyber-blue',
        frameId: 'bronze'
      },
      recentActivity: generateMockActivity(12),
      ownedVehicleIds: ['starter-kart', 'speed-demon'].concat(
        Math.random() > 0.5 ? ['shadow-racer'] : [],
        Math.random() > 0.7 ? ['iron-titan'] : [],
        Math.random() > 0.85 ? ['neon-phantom'] : []
      ),
      unlockedTitles: ['Rookie', 'Speedster', 'Veteran', 'Ace'],
      achievementIds: MOCK_ACHIEVEMENTS.slice(0, Math.floor(Math.random() * MOCK_ACHIEVEMENTS.length)).map(a => a.id)
    };
  }

  /**
   * Main render method - builds entire profile UI
   * @private
   */
  _render() {
    this.container.innerHTML = '';
    this.container.className = 'profile-system';
    
    const mainContainer = document.createElement('div');
    mainContainer.className = 'profile-container';
    
    // Build sections
    mainContainer.appendChild(this._renderProfileHeader());
    mainContainer.appendChild(this._renderStatsDashboard());
    mainContainer.appendChild(this._renderRecentActivity());
    mainContainer.appendChild(this._renderAchievementShowcase());
    mainContainer.appendChild(this._renderVehicleCollection());
    mainContainer.appendChild(this._renderCustomization());
    
    this.container.appendChild(mainContainer);
  }

  /**
   * Render error state
   * @param {string} message 
   * @private
   */
  _renderError(message) {
    this.container.innerHTML = `
      <div class="profile-error" style="
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
          <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
          <h3 style="margin: 0 0 8px; color: var(--text-primary);">Failed to Load Profile</h3>
          <p style="margin: 0; opacity: 0.7;">${message}</p>
        </div>
      </div>
    `;
  }

  /**
   * Render profile header card section
   * @returns {HTMLElement}
   * @private
   */
  _renderProfileHeader() {
    const header = document.createElement('section');
    header.className = 'profile-header';
    
    const data = this.playerData;
    const winRate = data.stats.totalRaces > 0 
      ? ((data.stats.wins / data.stats.totalRaces) * 100).toFixed(1) 
      : 0;
    const xpPercent = data.xpToNextLevel > 0 
      ? ((data.xp / data.xpToNextLevel) * 100).toFixed(0) 
      : 0;
    const joinDateFormatted = new Date(data.joinDate).toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric' 
    });
    
    header.innerHTML = `
      <!-- Avatar Section -->
      <div class="profile-avatar-section">
        <div class="profile-avatar-wrapper">
          <div class="profile-avatar-ring ${data.tier}"></div>
          <div class="profile-avatar" style="${data.avatar ? `background-image: url(${data.avatar})` : ''}">
            ${data.avatar ? '' : '<span style="font-size: 48px;">🏎️</span>'}
          </div>
          <div class="profile-status ${data.status}" title="${data.status.replace('-', ' ').toUpperCase()}"></div>
        </div>
      </div>
      
      <!-- Info Section -->
      <div class="profile-info-section">
        <div class="profile-name-row">
          ${data.customization.selectedTitle ? `<span class="profile-title-prefix">${data.customization.selectedTitle}</span>` : ''}
          <h1 class="profile-name">${data.playerName}</h1>
        </div>
        
        <div class="profile-level-row">
          <span class="profile-level-badge">LVL ${data.level}</span>
          <div class="profile-xp-container">
            <div class="profile-xp-label">
              <span>XP Progress</span>
              <span>${data.xp.toLocaleString()} / ${data.xpToNextLevel.toLocaleString()} (${xpPercent}%)</span>
            </div>
            <div class="profile-xp-bar">
              <div class="profile-xp-fill" style="width: ${xpPercent}%"></div>
            </div>
          </div>
        </div>
        
        <div class="profile-meta-row">
          <div class="profile-meta-item">
            <span class="profile-meta-icon">📅</span>
            Racing since ${joinDateFormatted}
          </div>
          <div class="profile-meta-item">
            <span class="profile-meta-icon">🌍</span>
            Global Rank #${data.stats.globalRank?.toLocaleString() || '—'}
          </div>
          ${data.stats.favoriteTrack ? `
          <div class="profile-meta-item">
            <span class="profile-meta-icon">🏁</span>
            Favorite: ${data.stats.favoriteTrack?.name || data.stats.favoriteTrack}
          </div>
          ` : ''}
        </div>
      </div>
    `;
    
    return header;
  }

  /**
   * Render statistics dashboard grid
   * @returns {HTMLElement}
   * @private
   */
  _renderStatsDashboard() {
    const section = document.createElement('section');
    section.className = 'stats-dashboard';
    
    const stats = this.playerData.stats;
    const winRate = stats.totalRaces > 0 
      ? ((stats.wins / stats.totalRaces) * 100).toFixed(1) 
      : '0.0';
    
    const statCards = [
      {
        icon: '🏁',
        label: 'Total Races',
        value: stats.totalRaces.toLocaleString()
      },
      {
        icon: '🏆',
        label: 'Wins',
        value: stats.wins.toLocaleString()
      },
      {
        icon: '📊',
        label: 'Win Rate',
        value: `${winRate}%`
      },
      {
        icon: '⏱️',
        label: 'Time Played',
        value: formatPlayTime(stats.totalPlayTime)
      },
      {
        icon: '💨',
        label: 'Top Speed Ever',
        value: `${stats.topSpeedEver} km/h`
      },
      {
        icon: '📍',
        label: 'Average Position',
        value: `#${stats.averagePosition}`
      },
      {
        icon: stats.currentStreak.type === 'wins' ? '🔥' : '❄️',
        label: 'Current Streak',
        value: '',
        customContent: `<span class="streak-badge ${stats.currentStreak.type}-streak">
          ${stats.currentStreak.count} ${stats.currentStreak.type === 'wins' ? 'W' : 'L'} streak
        </span>`
      },
      {
        icon: stats.rankChange === 'up' ? '📈' : stats.rankChange === 'down' ? '📉' : '📊',
        label: 'Global Rank',
        value: `#${stats.globalRank?.toLocaleString() || '—'}`,
        extra: stats.rankChange ? `<span class="stat-change ${stats.rankChange}">
          ${stats.rankChange === 'up' ? '↑' : '↓'}
        </span>` : ''
      }
    ];
    
    statCards.forEach(stat => {
      const card = document.createElement('div');
      card.className = 'stat-card';
      card.innerHTML = `
        <div class="stat-icon">${stat.icon}</div>
        <div class="stat-label">${stat.label}</div>
        ${stat.customContent || `<div class="stat-value">${stat.value}${stat.extra || ''}</div>`}
      `;
      section.appendChild(card);
    });
    
    return section;
  }

  /**
   * Render recent activity feed
   * @returns {HTMLElement}
   * @private
   */
  _renderRecentActivity() {
    const section = document.createElement('section');
    section.className = 'activity-section';
    
    const activity = this.playerData.recentActivity.slice(0, 10);
    
    section.innerHTML = `
      <div class="section-header">
        <h2 class="section-title">Recent Activity</h2>
        <button class="section-action-btn" onclick="this.closest('.activity-section').querySelector('.activity-feed').classList.toggle('expanded')">
          View All →
        </button>
      </div>
      <div class="activity-feed">
        ${activity.map(entry => this._renderActivityEntry(entry)).join('')}
      </div>
    `;
    
    return section;
  }

  /**
   * Render single activity entry
   * @param {Object} entry 
   * @returns {string} HTML string
   * @private
   */
  _renderActivityEntry(entry) {
    if (entry.type === 'race-result') {
      return `
        <div class="activity-entry race-result">
          <div class="activity-position position-${entry.position}">${entry.position}</div>
          <div class="activity-details">
            <div class="activity-track-name">${entry.trackName}</div>
            <div class="activity-meta">
              <span>${entry.vehicleName || 'Unknown Vehicle'}</span>
            </div>
          </div>
          <div class="activity-time">${entry.time}</div>
          <div class="activity-date">${formatDateRelative(new Date(entry.date))}</div>
          <div class="vehicle-vehicle-icon">${entry.vehicleIcon || '🏎️'}</div>
        </div>
      `;
    } else if (entry.type === 'achievement-unlock') {
      return `
        <div class="activity-entry achievement-unlock">
          <div class="activity-position" style="color: var(--accent-tertiary)">🏅</div>
          <div class="activity-details">
            <div class="activity-track-name">Unlocked: ${entry.achievementName}</div>
            <div class="activity-meta">
              <span style="text-transform: uppercase; font-size: 11px;">${entry.achievementRarity}</span>
            </div>
          </div>
          <div class="activity-date">${formatDateRelative(new Date(entry.date))}</div>
          <div class="vehicle-vehicle-icon">${entry.achievementIcon || '⭐'}</div>
        </div>
      `;
    }
    return '';
  }

  /**
   * Render achievement showcase section
   * @returns {HTMLElement}
   * @private
   */
  _renderAchievementShowcase() {
    const section = document.createElement('section');
    section.className = 'achievements-showcase';
    
    const unlockedIds = this.playerData.achievementIds || [];
    const unlockedAchievements = MOCK_ACHIEVEMENTS.filter(a => unlockedIds.includes(a.id));
    const recentUnlocked = unlockedAchievements.slice(-5).reverse();
    
    // Calculate rarity breakdown
    const rarityBreakdown = Object.values(ACHIEVEMENT_RARITY).map(rarity => ({
      ...rarity,
      count: unlockedAchievements.filter(a => a.rarity === rarity.id).length
    }));
    
    section.innerHTML = `
      <div class="section-header">
        <h2 class="section-title">Achievements</h2>
      </div>
      
      <div class="achievement-progress-header">
        <span class="achievement-count">${unlockedAchievements.length}</span>
        <span class="achievement-count-total">/ ${MOCK_ACHIEVEMENTS.length}</span>
        <span class="achievement-percentage">
          (${((unlockedAchievements.length / MOCK_ACHIEVEMENTS.length) * 100).toFixed(0)}%)
        </span>
      </div>
      
      <div class="recent-achievements-grid">
        ${recentUnlocked.length > 0 ? recentUnlocked.map(ach => `
          <div class="achievement-mini-card rarity-${ach.rarity}">
            <div class="achievement-mini-icon">${ach.icon}</div>
            <div class="achievement-mini-info">
              <div class="achievement-mini-name">${ach.name}</div>
              <div class="achievement-mini-rarity">${ach.rarity}</div>
            </div>
          </div>
        ``).join('') : '<p style="color: var(--text-secondary); grid-column: 1/-1;">No achievements unlocked yet.</p>'}
      </div>
      
      <div class="rarity-breakdown">
        ${rarityBreakdown.map(r => `
          <div class="rarity-item">
            <span class="rarity-dot ${r.id}"></span>
            <span>${r.label}: ${r.count}</span>
          </div>
        `).join('')}
      </div>
    `;
    
    return section;
  }

  /**
   * Render vehicle collection grid
   * @returns {HTMLElement}
   * @private
   */
  _renderVehicleCollection() {
    const section = document.createElement('section');
    section.className = 'vehicle-collection';
    
    const ownedIds = this.playerData.ownedVehicleIds || [];
    
    section.innerHTML = `
      <div class="section-header">
        <h2 class="section-title">Vehicle Collection</h2>
        <span class="section-action-btn" style="cursor: default;">
          ${ownedIds.length}/${MOCK_VEHICLES.length} Owned
        </span>
      </div>
      
      <div class="vehicle-grid">
        ${MOCK_VEHICLES.map(vehicle => {
          const owned = ownedIds.includes(vehicle.id);
          const price = Math.floor(Math.random() * 9000) + 1000;
          
          return `
            <div class="vehicle-mini-card ${owned ? 'selected' : ''}">
              <div class="vehicle-mini-icon">${vehicle.icon}</div>
              <div class="vehicle-mini-name">${vehicle.name}</div>
              ${owned ? `
                <div class="vehicle-mini-wins">
                  🏆 ${Math.floor(Math.random() * 50)} Wins
                </div>
                <div class="vehicle-mini-level">★ Lv.${Math.floor(Math.random() * 10) + 1}</div>
              : ''}
              ${!owned ? `
                <div class="vehicle-lock-overlay">
                  <span class="lock-icon">🔒</span>
                  <span class="lock-text">Locked</span>
                  <span class="lock-price">$${price.toLocaleString()}</span>
                </div>
              `}
            </div>
          `;
        }).join('')}
      </div>
    `;
    
    return section;
  }

  /**
   * Render profile customization panel
   * @returns {HTMLElement}
   * @private
   */
  _renderCustomization() {
    const section = document.createElement('section');
    section.className = 'profile-customization';
    
    const currentTitle = this.playerData.customization?.selectedTitle || 'Rookie';
    const unlockedTitles = this.playerData.unlockedTitles || [];
    const currentBanner = this.playerData.customization?.bannerId || 'default';
    const currentFrame = this.playerData.customization?.frameId || 'bronze';
    
    section.innerHTML = `
      <div class="section-header">
        <h2 class="section-title">Profile Customization</h2>
      </div>
      
      <div class="customization-options">
        <!-- Title Selection -->
        <div class="customization-group">
          <label class="customization-label">Display Title</label>
          <div class="title-selector">
            ${MOCK_TITLE_OPTIONS.map(title => {
              const isUnlocked = unlockedTitles.includes(title.id.toLowerCase());
              return `
                <button 
                  class="title-option ${currentTitle.toLowerCase() === title.id.toLowerCase() ? 'selected' : ''} ${!isUnlocked ? 'locked' : ''}"
                  data-title-id="${title.id}"
                  ${!isUnlocked ? 'disabled title="' + title.requirement + '"' : ''}
                  onclick="window.__profileSystem?.handleTitleSelect('${title.id}')"
                >
                  ${title.name}
                  ${!isUnlocked ? '🔒' : ''}
                </button>
              `;
            }).join('')}
          </div>
        </div>
        
        <!-- Banner Selection -->
        <div class="customization-group">
          <label class="customization-label">Profile Banner</label>
          <div class="banner-selector">
            ${MOCK_BANNER_OPTIONS.map(banner => `
              <div 
                class="banner-option ${currentBanner === banner.id ? 'selected' : ''}"
                data-banner-id="${banner.id}"
                style="background: ${banner.gradient};"
                title="${banner.name}"
                onclick="window.__profileSystem?.handleBannerSelect('${banner.id}')"
              ></div>
            `).join('')}
          </div>
        </div>
        
        <!-- Frame Selection -->
        <div class="customization-group">
          <label class="customization-label">Avatar Frame</label>
          <div class="frame-selector">
            ${[
              { id: 'bronze', tier: 'tier-bronze' },
              { id: 'silver', tier: 'tier-silver' },
              { id: 'gold', tier: 'tier-gold' },
              { id: 'platinum', tier: 'tier-platinum' },
              { id: 'diamond', tier: 'tier-diamond' }
            ].map(frame => `
              <div 
                class="frame-option ${frame.tier} ${currentFrame === frame.id ? 'selected' : ''}"
                data-frame-id="${frame.id}"
                title="${frame.id.charAt(0).toUpperCase() + frame.id.slice(1)}"
                onclick="window.__profileSystem?.handleFrameSelect('${frame.id}')"
              ></div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    
    return section;
  }

  /**
   * Handle title selection
   * @param {string} titleId 
   */
  handleTitleSelect(titleId) {
    if (!this.playerData.unlockedTitles.includes(titleId.toLowerCase())) return;
    
    this.playerData.customization.selectedTitle = MOCK_TITLE_OPTIONS.find(t => t.id === titleId)?.name || titleId;
    this.savePlayerData();
    this._render();
    
    if (typeof this.onCustomizationChange === 'function') {
      this.onCustomizationChange('title', titleId);
    }
  }

  /**
   * Handle banner selection
   * @param {string} bannerId 
   */
  handleBannerSelect(bannerId) {
    this.playerData.customization.bannerId = bannerId;
    this.savePlayerData();
    this._render();
    
    if (typeof this.onCustomizationChange === 'function') {
      this.onCustomizationChange('banner', bannerId);
    }
  }

  /**
   * Handle frame selection
   * @param {string} frameId 
   */
  handleFrameSelect(frameId) {
    this.playerData.customization.frameId = frameId;
    this.playerData.tier = `tier-${frameId}`;
    this.savePlayerData();
    this._render();
    
    if (typeof this.onCustomizationChange === 'function') {
      this.onCustomizationChange('frame', frameId);
    }
  }

  /**
   * Update specific stat value
   * @param {string} statKey - Key path like 'stats.wins'
   * @param {*} value - New value
   */
  updateStat(statKey, value) {
    const keys = statKey.split('.');
    let obj = this.playerData;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in obj)) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    
    obj[keys[keys.length - 1]] = value;
    this.savePlayerData();
    
    if (this.isLoaded && this.container) {
      this._render();
    }
  }

  /**
   * Add activity entry
   * @param {Object} entry - Activity entry object
   */
  addActivity(entry) {
    this.playerData.recentActivity.unshift({
      ...entry,
      date: new Date()
    });
    
    // Keep only last 50 entries
    if (this.playerData.recentActivity.length > 50) {
      this.playerData.recentActivity = this.playerData.recentActivity.slice(0, 50);
    }
    
    this.savePlayerData();
    
    if (this.isLoaded && this.container) {
      this._render();
    }
  }

  /**
   * Unlock an achievement
   * @param {string} achievementId 
   */
  unlockAchievement(achievementId) {
    if (!this.playerData.achievementIds.includes(achievementId)) {
      this.playerData.achievementIds.push(achievementId);
      
      const achievement = MOCK_ACHIEVEMENTS.find(a => a.id === achievementId);
      if (achievement) {
        this.addActivity({
          type: 'achievement-unlock',
          achievementName: achievement.name,
          achievementIcon: achievement.icon,
          achievementRarity: achievement.rarity
        });
      }
      
      this.savePlayerData();
    }
  }

  /**
   * Set player online status
   * @param {string} status - One of PLAYER_STATUS values
   */
  setStatus(status) {
    this.playerData.status = status;
    this.savePlayerData();
    
    if (this.isLoaded && this.container) {
      const statusEl = this.container.querySelector('.profile-status');
      if (statusEl) {
        statusEl.className = `profile-status ${status}`;
      }
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

// Export singleton instance for external access
const profileSystemInstance = new ProfileSystem();

if (typeof window !== 'undefined') {
  window.__profileSystem = profileSystemInstance;
}

export default ProfileSystem;
export { profileSystemInstance };
