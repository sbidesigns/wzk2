// ui/mode-select.js — Comprehensive Race Mode Selection System
//
// Features:
// - Race Mode Selection (Quick Race, Time Trial, Circuit, Tournament, Elimination)
// - Track Selection with visual cards, stats, and difficulty indicators
// - Vehicle Pre-race Selection Panel with stats comparison
// - Difficulty/Lap Settings Selector
// - Weather and Time-of-Day Options
// - AI Opponent Configuration
// - Animated transitions between selection steps
// - Full integration with ui-router, save-system, and other modules
// CSS: loaded via ui/styles/mode-select.css in index.html

/**
 * @enum {string}
 * Race mode identifiers
 */
export const RACE_MODE = {
  QUICK_RACE: 'quick-race',
  TIME_TRIAL: 'time-trial',
  CIRCUIT: 'circuit',
  TOURNAMENT: 'tournament',
  ELIMINATION: 'elimination',
  GHOST_BATTLE: 'ghost-battle'
};

/**
 * @enum {string}
 * Difficulty levels with modifiers
 */
export const DIFFICULTY = {
  EASY: { id: 'easy', name: 'Easy', color: '#4ade80', aiSkill: 0.5, rewardMult: 0.5 },
  NORMAL: { id: 'normal', name: 'Normal', color: '#fbbf24', aiSkill: 0.75, rewardMult: 1.0 },
  HARD: { id: 'hard', name: 'Hard', color: '#f97316', aiSkill: 0.9, rewardMult: 1.5 },
  EXTREME: { id: 'extreme', name: 'Extreme', color: '#ef4444', aiSkill: 1.0, rewardMult: 2.0 },
  NIGHTMARE: { id: 'nightmare', name: 'Nightmare', color: '#dc2626', aiSkill: 1.2, rewardMult: 3.0 }
};

/**
 * Track definitions with visual properties
 */
const TRACKS = [
  {
    id: 'neon-dragway',
    name: 'Neon Dragway',
    subtitle: 'Urban Sprint',
    description: 'A high-speed straightaway through the neon-lit downtown district',
    difficulty: 2,
    length: '2.4 km',
    laps: 3,
    estimatedTime: '2:30',
    bestTime: null,
    image: null,
    gradient: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 50%, #ffcc02 100%)',
    features: ['Straightaways', 'Boost Pads', 'Narrow Sections'],
    weather: ['clear', 'rain'],
    unlocked: true,
    stars: 0,
    completions: 0
  },
  {
    id: 'cyber-spiral',
    name: 'Cyber Spiral',
    subtitle: 'Technical Challenge',
    description: 'Tight corners and elevation changes test your drifting skills',
    difficulty: 3,
    length: '3.8 km',
    laps: 3,
    estimatedTime: '3:45',
    bestTime: null,
    image: null,
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)',
    features: ['Hairpin Turns', 'Elevation', 'Drift Zones'],
    weather: ['clear', 'rain', 'fog'],
    unlocked: true,
    stars: 0,
    completions: 0
  },
  {
    id: 'sky-harbor',
    name: 'Sky Harbor',
    subtitle: 'Rooftop Rush',
    description: 'Race across floating platforms high above the cityscape',
    difficulty: 4,
    length: '4.2 km',
    laps: 3,
    estimatedTime: '4:15',
    bestTime: null,
    image: null,
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 50%, #ec4899 100%)',
    features: ['Jumps', 'No Guardrails', 'Wind Gusts'],
    weather: ['clear', 'storm'],
    unlocked: true,
    stars: 0,
    completions: 0
  },
  {
    id: 'underground-vault',
    name: 'Underground Vault',
    subtitle: 'Deep Descent',
    description: 'Descend into the ancient underground racing facility',
    difficulty: 3,
    length: '5.1 km',
    laps: 4,
    estimatedTime: '5:30',
    bestTime: null,
    image: null,
    gradient: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)',
    features: ['Dark Sections', 'Secret Paths', 'Crystals'],
    weather: ['clear', 'fog', 'underground'],
    unlocked: true,
    stars: 0,
    completions: 0
  },
  {
    id: 'volcanic-rift',
    name: 'Volcanic Rift',
    subtitle: 'Extreme Heat',
    description: 'Race through an active volcanic zone with lava hazards',
    difficulty: 5,
    length: '6.3 km',
    laps: 3,
    estimatedTime: '6:00',
    bestTime: null,
    image: null,
    gradient: 'linear-gradient(135deg, #dc2626 0%, #f97316 50%, #fbbf24 100%)',
    features: ['Lava Hazards', 'Eruptions', 'Heat Damage'],
    weather: ['clear', 'ash'],
    unlocked: false,
    unlockRequirement: 'Complete all 3-star on Cyber Spiral',
    stars: 0,
    completions: 0
  },
  {
    id: 'quantum-loop',
    name: 'Quantum Loop',
    subtitle: 'Reality Bend',
    description: 'A mind-bending track through distorted space-time anomalies',
    difficulty: 5,
    length: '7.8 km',
    laps: 5,
    estimatedTime: '8:45',
    bestTime: null,
    image: null,
    gradient: 'linear-gradient(135deg, #a855f7 0%, #6366f1 50%, #06b6d4 100%)',
    features: ['Portals', 'Gravity Shifts', 'Time Warps'],
    weather: ['void'],
    unlocked: false,
    unlockRequirement: 'Win Tournament Championship',
    stars: 0,
    completions: 0
  },
  {
    id: 'arctic-blast',
    name: 'Arctic Blast',
    subtitle: 'Frozen Wastes',
    description: 'Ice-covered industrial complex with slippery surfaces',
    difficulty: 4,
    length: '4.7 km',
    laps: 3,
    estimatedTime: '4:45',
    bestTime: null,
    image: null,
    gradient: 'linear-gradient(135deg, #67e8f9 0%, #22d3ee 50%, #06b6d4 100%)',
    features: ['Ice Surfaces', 'Blizzards', 'Frozen Lakes'],
    weather: ['clear', 'snow', 'blizzard'],
    unlocked: true,
    stars: 0,
    completions: 0
  },
  {
    id: 'toxic-swamp',
    name: 'Toxic Swamp',
    subtitle: 'Chemical Zone',
    description: 'Navigate through hazardous chemical waste facilities',
    difficulty: 4,
    length: '5.5 km',
    laps: 4,
    estimatedTime: '5:50',
    bestTime: null,
    image: null,
    gradient: "linear-gradient(135deg, #84cc16 0%, #22c55e 50%, #14b8a6 100%)",
    features: ['Acid Pools', 'Gas Clouds', 'Mutated Obstacles'],
    weather: ['fog', 'acid-rain'],
    unlocked: false,
    unlockRequirement: 'Complete 50 races total',
    stars: 0,
    completions: 0
  }
];

/**
 * Weather options with effects
 */
const WEATHER_OPTIONS = [
  { id: 'clear', name: 'Clear', icon: '☀️', effect: 'Normal conditions', gripMod: 1.0, visibilityMod: 1.0 },
  { id: 'rain', name: 'Rain', icon: '🌧️', effect: '-15% grip, reduced visibility', gripMod: 0.85, visibilityMod: 0.85 },
  { id: 'snow', name: 'Snow', icon: '❄️', effect: '-25% grip, snow accumulation', gripMod: 0.75, visibilityMod: 0.8 },
  { id: 'storm', name: 'Storm', icon: '⛈️', effect: '-20% grip, lightning hazards', gripMod: 0.8, visibilityMod: 0.7 },
  { id: 'fog', name: 'Fog', icon: '🌫️', effect: 'Heavily reduced visibility', gripMod: 0.95, visibilityMod: 0.5 },
  { id: 'night', name: 'Night Race', icon: '🌙', effect: 'Darkness, neon highlights visible', gripMod: 1.0, visibilityMod: 0.6 }
];

/**
 * Time of day options
 */
const TIME_OPTIONS = [
  { id: 'dawn', name: 'Dawn', icon: '🌅', hours: '5-7 AM' },
  { id: 'day', name: 'Day', icon: '☀️', hours: '8 AM - 5 PM' },
  { id: 'sunset', name: 'Sunset', icon: '🌇', hours: '5-7 PM' },
  { id: 'night', name: 'Night', icon: '🌃', hours: '7 PM - 5 AM' }
];

/**
 * Mode definitions with descriptions and rules
 */
const RACE_MODES = [
  {
    id: RACE_MODE.QUICK_RACE,
    name: 'Quick Race',
    icon: '⚡',
    description: 'Jump into instant action against AI opponents',
    rules: ['First to finish wins', 'Power-ups enabled', 'Any track available', 'Customizable settings'],
    defaults: { laps: 3, opponents: 7, difficulty: DIFFICULTY.NORMAL.id },
    gradient: 'linear-gradient(135deg, #ff6b35 0%, #ff8c00 100%)',
    recommendedFor: 'New players, casual races'
  },
  {
    id: RACE_MODE.TIME_TRIAL,
    name: 'Time Trial',
    icon: '⏱️',
    description: 'Race against the clock to set the fastest time',
    rules: ['Solo time attack', 'Ghost replays of best times', 'No power-ups', 'Clean runs rewarded'],
    defaults: { laps: 1, opponents: 0, difficulty: null },
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
    recommendedFor: 'Perfectionists, leaderboard climbers'
  },
  {
    id: RACE_MODE.CIRCUIT,
    name: 'Circuit',
    icon: '🏁',
    description: 'Multi-race championship with cumulative scoring',
    rules: ['3-5 races per circuit', 'Points awarded per position', 'Most points wins overall', 'Vehicle damage carries over'],
    defaults: { laps: 3, opponents: 7, difficulty: DIFFICULTY.HARD.id },
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
    recommendedFor: 'Competitive players, long sessions'
  },
  {
    id: RACE_MODE.TOURNAMENT,
    name: 'Tournament',
    icon: '🏆',
    description: 'Compete in ranked events for exclusive rewards',
    rules: ['Season-based rankings', 'Tiered progression', 'Special rewards at each tier', 'Qualification required'],
    defaults: { laps: 3, opponents: 7, difficulty: DIFFICULTY.HARD.id },
    gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    recommendedFor: 'Competitive players seeking glory'
  },
  {
    id: RACE_MODE.ELIMINATION,
    name: 'Elimination',
    icon: '💥',
    description: 'Last place is eliminated every 30 seconds',
    rules: ['Timed eliminations', 'Survive to win', 'Aggressive tactics encouraged', 'High stakes action'],
    defaults: { laps: 5, opponents: 7, difficulty: DIFFICULTY.HARD.id },
    gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    recommendedFor: 'Adrenaline seekers'
  },
  {
    id: RACE_MODE.GHOST_BATTLE,
    name: 'Ghost Battle',
    icon: '👻',
    description: 'Race against recorded ghost data from other players',
    rules: ['Download ghost data', 'Race against shadows', 'No collision with ghosts', 'Global leaderboards'],
    defaults: { laps: 3, opponents: 0, ghosts: 5, difficulty: null },
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    recommendedFor: 'Asynchronous competition'
  }
];

/**
 * Vehicle summary for selection panel
 */
const VEHICLES = [
  { id: 'starter', name: 'Rust Bucket', class: 'D', speed: 2, accel: 3, handling: 4, shield: 3, color: '#8b8b8b' },
  { id: 'speedster', name: 'Neon Flash', class: 'C', speed: 4, accel: 4, handling: 3, shield: 2, color: '#00e5ff' },
  { id: 'tank', name: 'Ironclad', class: 'C', speed: 2, accel: 2, handling: 2, shield: 5, color: '#ff6b35' },
  { id: 'balanced', name: 'Phantom X', class: 'B', speed: 4, accel: 3, handling: 4, shield: 3, color: '#a855f7' },
  { id: 'drifter', name: 'Sidewinder', class: 'B', speed: 3, accel: 4, handling: 5, shield: 2, color: '#22c55e' },
  { id: 'elite', name: 'Apex Predator', class: 'S', speed: 5, accel: 4, handling: 4, shield: 4, color: '#fbbf24' }
];

/**
 * Main ModeSelectSystem class - Singleton pattern
 */
class ModeSelectSystem {
  constructor() {
    this._container = null;
    this._currentStep = 0; // 0=mode select, 1=track select, 2=vehicle select, 3=settings
    this._selectedMode = null;
    this._selectedTrack = null;
    this._selectedVehicle = null;
    this._selectedDifficulty = DIFFICULTY.NORMAL.id;
    this._selectedWeather = 'clear';
    this._selectedTime = 'day';
    this._lapCount = 3;
    this._opponentCount = 7;
    this._eventListeners = new Map();
    this._animationFrame = null;
    this._particles = [];
  }

  /**
   * Mount the mode-select screen into container
   * @param {HTMLElement} container - Mount point element
   * @param {object} payload - Initial payload data
   * @param {object} context - Router context
   */
  async mount(container, payload = {}, context = {}) {
    this._container = container;
    this._context = context;
    
    // Initialize selections from payload or defaults
    this._selectedMode = payload.mode || RACE_MODES[0].id;
    this._selectedTrack = payload.track || TRACKS.find(t => t.unlocked)?.id || TRACKS[0].id;
    this._selectedVehicle = payload.vehicle || VEHICLES[0].id;
    
    // Build UI
    container.innerHTML = this._buildUI();
    
    // Setup interactions
    this._setupInteractions();
    
    // Start background animation
    this._startBackgroundAnimation();
    
    // Emit event for other systems
    this._emit('modeselect:mounted', { mode: this._selectedMode });
    
    // Entrance animation
    requestAnimationFrame(() => {
      container.querySelector('.mode-select-container')?.classList.add('visible');
    });
  }

  /**
   * Unmount and cleanup
   */
  async unmount(container, payload = {}) {
    this._stopBackgroundAnimation();
    this._removeAllListeners();
    this._emit('modeselect:unmounting', {});
    return true;
  }

  /**
   * Get current race configuration
   */
  getConfig() {
    return {
      mode: this._selectedMode,
      track: this._selectedTrack,
      vehicle: this._selectedVehicle,
      difficulty: this._selectedDifficulty,
      weather: this._selectedWeather,
      timeOfDay: this._selectedTime,
      laps: this._lapCount,
      opponents: this._opponentCount
    };
  }

  /**
   * Build complete UI structure
   */
  _buildUI() {
    return `
      <div class="mode-select-container" role="application" aria-label="Race Mode Selection">
        <!-- Header -->
        <header class="mode-select-header">
          <button class="ms-back-btn" aria-label="Go back" title="Back to Menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 class="ms-title">SELECT RACE MODE</h1>
          <div class="ms-header-actions">
            <span class="ms-step-indicator">Step ${this._currentStep + 1} of 4</span>
          </div>
        </header>

        <!-- Progress Steps -->
        <nav class="ms-progress-steps" aria-label="Selection progress">
          <div class="ms-step ${this._currentStep === 0 ? 'active' : ''} ${this._currentStep > 0 ? 'completed' : ''}" data-step="0">
            <div class="step-icon">🎮</div>
            <span class="step-label">Mode</span>
          </div>
          <div class="ms-step-connector ${this._currentStep > 0 ? 'active' : ''}"></div>
          <div class="ms-step ${this._currentStep === 1 ? 'active' : ''} ${this._currentStep > 1 ? 'completed' : ''}" data-step="1">
            <div class="step-icon">🗺️</div>
            <span class="step-label">Track</span>
          </div>
          <div class="ms-step-connector ${this._currentStep > 1 ? 'active' : ''}"></div>
          <div class="ms-step ${this._currentStep === 2 ? 'active' : ''} ${this._currentStep > 2 ? 'completed' : ''}" data-step="2">
            <div class="step-icon">🚗</div>
            <span class="step-label">Vehicle</span>
          </div>
          <div class="ms-step-connector ${this._currentStep > 2 ? 'active' : ''}"></div>
          <div class="ms-step ${this._currentStep === 3 ? 'active' : ''}" data-step="3">
            <div class="step-icon">⚙️</div>
            <span class="step-label">Settings</span>
          </div>
        </nav>

        <!-- Content Area -->
        <main class="ms-content-area">
          <!-- Step 0: Mode Selection -->
          <section class="ms-panel ms-mode-panel ${this._currentStep !== 0 ? 'hidden' : ''}" data-panel="mode">
            <h2 class="panel-title">Choose Your Race Type</h2>
            <div class="mode-grid">
              ${RACE_MODES.map(mode => this._renderModeCard(mode)).join('')}
            </div>
          </section>

          <!-- Step 1: Track Selection -->
          <section class="ms-panel ms-track-panel ${this._currentStep !== 1 ? 'hidden' : ''}" data-panel="track">
            <h2 class="panel-title">Select Track</h2>
            
            <!-- Track Filter Bar -->
            <div class="track-filter-bar">
              <button class="filter-btn active" data-filter="all">All</button>
              <button class="filter-btn" data-filter="unlocked">Unlocked</button>
              <button class="filter-btn" data-filter="easy">Easy</button>
              <button class="filter-btn" data-filter="medium">Medium</button>
              <button class="filter-btn" data-filter="hard">Hard</button>
            </div>

            <div class="track-grid">
              ${TRACKS.map(track => this._renderTrackCard(track)).join('')}
            </div>
          </section>

          <!-- Step 2: Vehicle Selection -->
          <section class="ms-panel ms-vehicle-panel ${this._currentStep !== 2 ? 'hidden' : ''}" data-panel="vehicle">
            <h2 class="panel-title">Choose Your Vehicle</h2>
            <div class="vehicle-grid">
              ${VEHICLES.map(v => this._renderVehicleCard(v)).join('')}
            </div>
            
            <!-- Selected Vehicle Stats -->
            <div class="vehicle-stats-panel" id="vehicle-stats-panel">
              ${this._renderVehicleStats(this._getSelectedVehicle())}
            </div>
          </section>

          <!-- Step 3: Settings -->
          <section class="ms-panel ms-settings-panel ${this._currentStep !== 3 ? 'hidden' : ''}" data-panel="settings">
            <h2 class="panel-title">Race Settings</h2>
            
            <div class="settings-grid">
              <!-- Difficulty -->
              <div class="setting-group">
                <label class="setting-label">
                  <span class="label-icon">🎯</span> Difficulty
                </label>
                <div class="difficulty-options">
                  ${Object.values(DIFFICULTY).map(d => this._renderDifficultyOption(d)).join('')}
                </div>
              </div>

              <!-- Laps -->
              <div class="setting-group">
                <label class="setting-label">
                  <span class="label-icon">🔄</span> Laps: <strong id="laps-value">${this._lapCount}</strong>
                </label>
                <input type="range" class="ms-slider" id="laps-slider" 
                       min="1" max="10" value="${this._lapCount}"
                       aria-label="Number of laps">
                <div class="slider-marks">
                  <span>1</span><span>3</span><span>5</span><span>7</span><span>10</span>
                </div>
              </div>

              <!-- Opponents -->
              <div class="setting-group">
                <label class="setting-label">
                  <span class="label-icon">🤖</span> Opponents: <strong id="opponents-value">${this._opponentCount}</strong>
                </label>
                <input type="range" class="ms-slider" id="opponents-slider"
                       min="0" max="11" value="${this._opponentCount}"
                       aria-label="Number of opponents">
                <div class="slider-marks">
                  <span>Solo</span><span>3</span><span>5</span><span>7</span><span>11</span>
                </div>
              </div>

              <!-- Weather -->
              <div class="setting-group">
                <label class="setting-label">
                  <span class="label-icon">🌦️</span> Weather
                </label>
                <div class="weather-options">
                  ${WEATHER_OPTIONS.filter(w => {
                    const track = this._getSelectedTrack();
                    return !track.weather || track.weather.includes(w.id);
                  }).map(w => this._renderWeatherOption(w)).join('')}
                </div>
              </div>

              <!-- Time of Day -->
              <div class="setting-group full-width">
                <label class="setting-label">
                  <span class="label-icon">🕐</span> Time of Day
                </label>
                <div class="time-options">
                  ${TIME_OPTIONS.map(t => this._renderTimeOption(t)).join('')}
                </div>
              </div>
            </div>

            <!-- Race Summary -->
            <div class="race-summary-card">
              <h3>Race Summary</h3>
              <div class="summary-grid">
                <div class="summary-item">
                  <span class="summary-label">Mode</span>
                  <span class="summary-value" id="summary-mode">${this._getSelectedMode()?.name || '-'}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Track</span>
                  <span class="summary-value" id="summary-track">${this._getSelectedTrack()?.name || '-'}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Vehicle</span>
                  <span class="summary-value" id="summary-vehicle">${this._getSelectedVehicle()?.name || '-'}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Est. Time</span>
                  <span class="summary-value" id="summary-time">${this._calculateEstimatedTime()}</span>
                </div>
              </div>
            </div>
          </section>
        </main>

        <!-- Footer Actions -->
        <footer class="ms-footer">
          <button class="ms-action-btn secondary" id="ms-prev-btn" ${this._currentStep === 0 ? 'disabled' : ''}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Previous
          </button>
          
          <div class="ms-footer-center">
            <button class="ms-quick-start-btn" id="ms-quick-start" title="Start with default settings">
              ⚡ Quick Start
            </button>
          </div>

          <button class="ms-action-btn primary" id="ms-next-btn">
            ${this._currentStep === 3 ? 'START RACE 🚀' : 'Next'}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </footer>

        <!-- Background Canvas -->
        <canvas class="ms-bg-canvas" id="ms-bg-canvas"></canvas>
      </div>
    `;
  }

  /**
   * Render a mode card
   */
  _renderModeCard(mode) {
    const isSelected = this._selectedMode === mode.id;
    return `
      <article class="mode-card ${isSelected ? 'selected' : ''}" data-mode="${mode.id}">
        <div class="mode-card-glow" style="--card-gradient: ${mode.gradient}"></div>
        <div class="mode-card-content">
          <div class="mode-icon">${mode.icon}</div>
          <h3 class="mode-name">${mode.name}</h3>
          <p class="mode-desc">${mode.description}</p>
          <ul class="mode-rules">
            ${mode.rules.slice(0, 2).map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>
        <div class="mode-recommendation">${mode.recommendedFor}</div>
        <div class="mode-selection-ring"></div>
      </article>
    `;
  }

  /**
   * Render a track card
   */
  _renderTrackCard(track) {
    const isSelected = this._selectedTrack === track.id;
    const diffStars = '★'.repeat(track.difficulty) + '☆'.repeat(5 - track.difficulty);
    return `
      <article class="track-card ${isSelected ? 'selected' : ''} ${!track.unlocked ? 'locked' : ''}" 
               data-track="${track.id}" ${!track.unlocked ? `aria-disabled="true"` : ''}>
        <div class="track-preview" style="background: ${track.gradient}">
          <div class="track-image-placeholder">
            <span class="track-terrain-icon">${this._getTerrainIcon(track.id)}</span>
          </div>
          ${!track.unlocked ? `<div class="lock-overlay"><span>🔒</span></div>` : ''}
          <div class="track-difficulty-badge" title="Difficulty: ${track.difficulty}/5">
            ${diffStars}
          </div>
        </div>
        <div class="track-info">
          <h3 class="track-name">${track.name}</h3>
          <span class="track-subtitle">${track.subtitle}</span>
          <div class="track-stats-row">
            <span class="stat"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/></svg> ${track.length}</span>
            <span class="stat"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg> ${track.estimatedTime}</span>
            <span class="stat">🏁 ${track.laps} laps</span>
          </div>
          <div class="track-stars">
            ${Array(3).fill(0).map((_, i) => 
              `<span class="star ${i < track.stars ? 'earned' : ''}">★</span>`
            ).join('')}
          </div>
        </div>
        ${!track.unlocked ? `
          <div class="unlock-requirement">
            <span>🔒</span> ${track.unlockRequirement}
          </div>
        ` : ''}
      </article>
    `;
  }

  /**
   * Render a vehicle card
   */
  _renderVehicleCard(vehicle) {
    const isSelected = this._selectedVehicle === vehicle.id;
    const maxStat = 5;
    return `
      <article class="vehicle-card ${isSelected ? 'selected' : ''}" data-vehicle="${vehicle.id}">
        <div class="vehicle-preview" style="--vehicle-color: ${vehicle.color}">
          <div class="vehicle-shape">
            <div class="vehicle-body"></div>
            <div class="vehicle-wheel front"></div>
            <div class="vehicle-wheel rear"></div>
          </div>
          <span class="vehicle-class-badge">${vehicle.class}</span>
        </div>
        <div class="vehicle-info">
          <h3 class="vehicle-name" style="color: ${vehicle.color}">${vehicle.name}</h3>
          <div class="vehicle-mini-stats">
            <div class="mini-stat">
              <span class="mini-stat-label">SPD</span>
              <div class="mini-bar">
                <div class="mini-fill" style="width: ${(vehicle.speed / maxStat) * 100}%"></div>
              </div>
            </div>
            <div class="mini-stat">
              <span class="mini-stat-label">ACL</span>
              <div class="mini-bar">
                <div class="mini-fill" style="width: ${(vehicle.accel / maxStat) * 100}%"></div>
              </div>
            </div>
            <div class="mini-stat">
              <span class="mini-stat-label">HND</span>
              <div class="mini-bar">
                <div class="mini-fill" style="width: ${(vehicle.handling / maxStat) * 100}%"></div>
              </div>
            </div>
            <div class="mini-stat">
              <span class="mini-stat-label">SHD</span>
              <div class="mini-bar">
                <div class="mini-fill" style="width: ${(vehicle.shield / maxStat) * 100}%"></div>
              </div>
            </div>
          </div>
        </div>
        <div class="vehicle-selection-indicator"></div>
      </article>
    `;
  }

  /**
   * Render vehicle detailed stats panel
   */
  _renderVehicleStats(vehicle) {
    if (!vehicle) return '<p class="no-vehicle">No vehicle selected</p>';
    
    const maxStat = 5;
    const stats = [
      { key: 'speed', label: 'Speed', value: vehicle.speed, icon: '🚀' },
      { key: 'accel', label: 'Acceleration', value: vehicle.accel, icon: '⚡' },
      { key: 'handling', label: 'Handling', value: vehicle.handling, icon: '🎯' },
      { key: 'shield', label: 'Shield', value: vehicle.shield, icon: '🛡️' }
    ];
    
    return `
      <div class="stats-header">
        <h4>${vehicle.name}</h4>
        <span class="class-badge" style="--badge-color: ${vehicle.color}">Class ${vehicle.class}</span>
      </div>
      <div class="stats-bars">
        ${stats.map(s => `
          <div class="stat-row">
            <div class="stat-info">
              <span class="stat-icon">${s.icon}</span>
              <span class="stat-name">${s.label}</span>
            </div>
            <div class="stat-bar-container">
              <div class="stat-bar-track">
                <div class="stat-bar-fill" style="--fill-color: ${vehicle.color}; --fill-percent: ${(s.value / maxStat) * 100}%"></div>
                <div class="stat-bar-segments">
                  ${Array(maxStat).fill(0).map((_, i) => `<div class="segment ${i < s.value ? 'filled' : ''}" style="--seg-color: ${vehicle.color}"></div>`).join('')}
                </div>
              </div>
              <span class="stat-value">${s.value}/${maxStat}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Render difficulty option
   */
  _renderDifficultyOption(diff) {
    const isSelected = this._selectedDifficulty === diff.id;
    return `
      <button class="diff-option ${isSelected ? 'selected' : ''}" data-diff="${diff.id}"
              style="--diff-color: ${diff.color}">
        <span class="diff-name">${diff.name}</span>
        <span class="diff-mult">×${diff.rewardMult} rewards</span>
      </button>
    `;
  }

  /**
   * Render weather option
   */
  _renderWeatherOption(weather) {
    const isSelected = this._selectedWeather === weather.id;
    return `
      <button class="weather-option ${isSelected ? 'selected' : ''}" data-weather="${weather.id}">
        <span class="weather-icon">${weather.icon}</span>
        <span class="weather-name">${weather.name}</span>
      </button>
    `;
  }

  /**
   * Render time option
   */
  _renderTimeOption(time) {
    const isSelected = this._selectedTime === time.id;
    return `
      <button class="time-option ${isSelected ? 'selected' : ''}" data-time="${time.id}">
        <span class="time-icon">${time.icon}</span>
        <span class="time-name">${time.name}</span>
        <span class="time-hours">${time.hours}</span>
      </button>
    `;
  }

  /**
   * Setup all interaction handlers
   */
  _setupInteractions() {
    // Back button
    this._onClick('.ms-back-btn', () => {
      if (this._context?.router) {
        this._context.router.popToRoot();
      } else {
        this._emit('modeselect:back');
      }
    });

    // Progress step navigation
    this._onClickAll('.ms-step[data-step]', (el) => {
      const step = parseInt(el.dataset.step);
      if (step <= this._currentStep) {
        this._goToStep(step);
      }
    });

    // Mode cards
    this._onClickAll('.mode-card:not(.locked)', (el) => {
      this._selectMode(el.dataset.mode);
    });

    // Track cards
    this._onClickAll('.track-card:not(.locked)', (el) => {
      this._selectTrack(el.dataset.track);
    });

    // Track filters
    this._onClickAll('.filter-btn', (el) => {
      this._filterTracks(el.dataset.filter);
    });

    // Vehicle cards
    this._onClickAll('.vehicle-card', (el) => {
      this._selectVehicle(el.dataset.vehicle);
    });

    // Difficulty options
    this._onClickAll('.diff-option', (el) => {
      this._selectDifficulty(el.dataset.diff);
    });

    // Weather options
    this._onClickAll('.weather-option', (el) => {
      this._selectWeather(el.dataset.weather);
    });

    // Time options
    this._onClickAll('.time-option', (el) => {
      this._selectTime(el.dataset.time);
    });

    // Sliders
    this._onInput('#laps-slider', (val) => {
      this._lapCount = parseInt(val);
      document.getElementById('laps-value').textContent = val;
      document.getElementById('summary-time').textContent = this._calculateEstimatedTime();
    });

    this._onInput('#opponents-slider', (val) => {
      this._opponentCount = parseInt(val);
      document.getElementById('opponents-value').textContent = val;
    });

    // Navigation buttons
    this._onClick('#ms-prev-btn', () => this._prevStep());
    this._onClick('#ms-next-btn', () => this._nextStep());
    this._onClick('#ms-quick-start', () => this._quickStart());

    // Keyboard navigation
    this._addKeyListener();
  }

  /**
   * Select a race mode
   */
  _selectMode(modeId) {
    this._selectedMode = modeId;
    
    // Update UI
    document.querySelectorAll('.mode-card').forEach(card => {
      card.classList.toggle('selected', card.dataset.mode === modeId);
    });

    // Update mode-specific defaults
    const mode = RACE_MODES.find(m => m.id === modeId);
    if (mode?.defaults) {
      this._lapCount = mode.defaults.laps;
      this._opponentCount = mode.defaults.opponents;
      if (mode.defaults.difficulty) {
        this._selectedDifficulty = mode.defaults.difficulty;
      }
    }

    this._emit('modeselect:modeChanged', { mode: modeId });
    
    // Auto advance after short delay
    setTimeout(() => this._nextStep(), 300);
  }

  /**
   * Select a track
   */
  _selectTrack(trackId) {
    const track = TRACKS.find(t => t.id === trackId);
    if (!track || !track.unlocked) return;

    this._selectedTrack = trackId;

    // Update UI
    document.querySelectorAll('.track-card').forEach(card => {
      card.classList.toggle('selected', card.dataset.track === trackId);
    });

    // Scroll selected into view
    const selectedCard = document.querySelector(`.track-card[data-track="${trackId}"]`);
    selectedCard?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    this._emit('modeselect:trackChanged', { track: trackId });

    // Update summary if visible
    this._updateSummary();
  }

  /**
   * Select a vehicle
   */
  _selectVehicle(vehicleId) {
    this._selectedVehicle = vehicleId;

    // Update UI
    document.querySelectorAll('.vehicle-card').forEach(card => {
      card.classList.toggle('selected', card.dataset.vehicle === vehicleId);
    });

    // Update stats panel
    const vehicle = this._getSelectedVehicle();
    const statsPanel = document.getElementById('vehicle-stats-panel');
    if (statsPanel) {
      statsPanel.innerHTML = this._renderVehicleStats(vehicle);
    }

    this._emit('modeselect:vehicleChanged', { vehicle: vehicleId });
    this._updateSummary();
  }

  /**
   * Select difficulty
   */
  _selectDifficulty(diffId) {
    this._selectedDifficulty = diffId;

    document.querySelectorAll('.diff-option').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.diff === diffId);
    });

    this._emit('modeselect:difficultyChanged', { difficulty: diffId });
  }

  /**
   * Select weather
   */
  _selectWeather(weatherId) {
    this._selectedWeather = weatherId;

    document.querySelectorAll('.weather-option').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.weather === weatherId);
    });

    this._emit('modeselect:weatherChanged', { weather: weatherId });
  }

  /**
   * Select time of day
   */
  _selectTime(timeId) {
    this._selectedTime = timeId;

    document.querySelectorAll('.time-option').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.time === timeId);
    });

    this._emit('modeselect:timeChanged', { time: timeId });
  }

  /**
   * Filter tracks by category
   */
  _filterTracks(filter) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    document.querySelectorAll('.track-card').forEach(card => {
      const track = TRACKS.find(t => t.id === card.dataset.track);
      if (!track) return;

      let show = true;
      switch (filter) {
        case 'all':
          show = true;
          break;
        case 'unlocked':
          show = track.unlocked;
          break;
        case 'easy':
          show = track.difficulty <= 2;
          break;
        case 'medium':
          show = track.difficulty === 3;
          break;
        case 'hard':
          show = track.difficulty >= 4;
          break;
      }
      
      card.style.display = show ? '' : 'none';
    });
  }

  /**
   * Navigation: Go to specific step
   */
  _goToStep(step) {
    if (step < 0 || step > 3 || step === this._currentStep) return;
    
    this._currentStep = step;
    this._updateStepUI();
  }

  /**
   * Navigation: Next step
   */
  _nextStep() {
    if (this._currentStep >= 3) {
      // Start the race!
      this._startRace();
      return;
    }
    
    this._currentStep++;
    this._updateStepUI();
  }

  /**
   * Navigation: Previous step
   */
  _prevStep() {
    if (this._currentStep <= 0) return;
    
    this._currentStep--;
    this._updateStepUI();
  }

  /**
   * Quick start with defaults
   */
  async _quickStart() {
    this._emit('modeselect:quickStart', this.getConfig());
    await this._startRace();
  }

  /**
   * Start the race
   */
  async _startRace() {
    const config = this.getConfig();
    
    // Show loading state
    const startBtn = document.getElementById('ms-next-btn');
    if (startBtn) {
      startBtn.innerHTML = '<span class="btn-loading">Loading...</span>';
      startBtn.disabled = true;
    }

    // Emit both custom event and engine bus event
    this._emit('modeselect:startRace', config);
    
    // Also emit on engine's EventBus for systems that listen there
    if (typeof window !== 'undefined' && window.__engine && window.__engine.bus) {
      window.__engine.bus.emit('race:start', {
        mode: 'open_world',  // Driving mode: 'track_bound' (NFS style) or 'open_world' (free roam)
        raceType: config.mode,  // Game mode: 'quick-race', 'time-trial', 'circuit', etc.
        vehicle: config.vehicle,
        track: config.track,
        difficulty: config.difficulty,
        laps: config.laps,
        opponents: config.opponents,
        weather: config.weather,
        timeOfDay: config.timeOfDay,
        raceConfig: {  // Full config for RaceScene constructor
          mode: 'open_world',
          raceType: config.mode,
          laps: config.laps,
          track: config.track,
          vehicle: config.vehicle,
          difficulty: config.difficulty,
          opponents: config.opponents
        }
      });
    }

    // Transition to race view
    try {
      // Show toast first while container is still visible
      this._showToast('🚀 Race starting! Good luck!', 'success');
      
      // Hide mode select UI
      const container = this._container;
      if (container) {
        container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        container.style.opacity = '0';
        container.style.transform = 'scale(0.95)';
      }
      
      // Show game canvas and start 3D rendering
      await new Promise(resolve => setTimeout(resolve, 350));
      
      // Hide mode-select completely
      if (container) {
        container.style.display = 'none';
      }
      
      // Show the 3D canvas
      const canvas = document.getElementById('game-canvas');
      if (canvas) {
        canvas.style.display = 'block';
        console.log('[ModeSelect] Game canvas shown');
      }
      
      // Hide UI shell if present (menus)
      const uiShell = document.getElementById('ui-shell');
      if (uiShell) {
        uiShell.style.display = 'none';
      }
      
      console.log('[ModeSelect] Starting race with config:', config);
      
      // Dispatch race:started event for other systems
      document.dispatchEvent(new CustomEvent('race:started', { detail: config }));
      
    } catch (err) {
      console.error('[ModeSelect] Error starting race:', err);
      this._showToast('❌ Failed to start race', 'error');
    }
  }

  /**
   * Update UI when changing steps
   */
  _updateStepUI() {
    // Update panels
    document.querySelectorAll('.ms-panel').forEach(panel => {
      const panelStep = parseInt(panel.dataset.panel === 'mode' ? '0' :
                               panel.dataset.panel === 'track' ? '1' :
                               panel.dataset.panel === 'vehicle' ? '2' : '3');
      panel.classList.toggle('hidden', panelStep !== this._currentStep);
    });

    // Update progress steps
    document.querySelectorAll('.ms-step').forEach(step => {
      const stepNum = parseInt(step.dataset.step);
      step.classList.toggle('active', stepNum === this._currentStep);
      step.classList.toggle('completed', stepNum < this._currentStep);
    });

    // Update connectors
    document.querySelectorAll('.ms-step-connector').forEach((conn, i) => {
      conn.classList.toggle('active', i < this._currentStep);
    });

    // Update header
    const stepTitles = ['SELECT RACE MODE', 'SELECT TRACK', 'SELECT VEHICLE', 'RACE SETTINGS'];
    document.querySelector('.ms-title').textContent = stepTitles[this._currentStep];
    document.querySelector('.ms-step-indicator').textContent = `Step ${this._currentStep + 1} of 4`;

    // Update footer buttons
    const prevBtn = document.getElementById('ms-prev-btn');
    prevBtn.disabled = this._currentStep === 0;

    const nextBtn = document.getElementById('ms-next-btn');
    nextBtn.innerHTML = this._currentStep === 3 
      ? 'START RACE 🚀 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>'
      : 'Next <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';

    // Update summary
    this._updateSummary();

    this._emit('modeselect:stepChanged', { step: this._currentStep });
  }

  /**
   * Update race summary display
   */
  _updateSummary() {
    const summaryEl = document.getElementById('summary-mode');
    const trackEl = document.getElementById('summary-track');
    const vehicleEl = document.getElementById('summary-vehicle');
    const timeEl = document.getElementById('summary-time');

    if (summaryEl) summaryEl.textContent = this._getSelectedMode()?.name || '-';
    if (trackEl) trackEl.textContent = this._getSelectedTrack()?.name || '-';
    if (vehicleEl) vehicleEl.textContent = this._getSelectedVehicle()?.name || '-';
    if (timeEl) timeEl.textContent = this._calculateEstimatedTime();
  }

  /**
   * Calculate estimated race time
   */
  _calculateEstimatedTime() {
    const track = this._getSelectedTrack();
    if (!track) return '-';
    
    const baseMinutes = parseFloat(track.estimatedTime.split(':')[0]);
    const baseSeconds = parseFloat(track.estimatedTime.split(':')[1]);
    const baseTotalSeconds = baseMinutes * 60 + baseSeconds;
    const multiplier = this._lapCount / track.laps;
    const estimatedTotal = Math.round(baseTotalSeconds * multiplier);
    const mins = Math.floor(estimatedTotal / 60);
    const secs = estimatedTotal % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Helper: Get selected objects
   */
  _getSelectedMode() {
    return RACE_MODES.find(m => m.id === this._selectedMode);
  }

  _getSelectedTrack() {
    return TRACKS.find(t => t.id === this._selectedTrack);
  }

  _getSelectedVehicle() {
    return VEHICLES.find(v => v.id === this._selectedVehicle);
  }

  /**
   * Get terrain icon for track
   */
  _getTerrainIcon(trackId) {
    const icons = {
      'neon-dragway': '🏙️',
      'cyber-spiral': '🌀',
      'sky-harbor': '☁️',
      'underground-vault': '⛏️',
      'volcanic-rift': '🌋',
      'quantum-loop': '🌀',
      'arctic-blast': '❄️',
      'toxic-swamp': '☢️'
    };
    return icons[trackId] || '🏁';
  }

  /**
   * Background particle animation
   */
  _startBackgroundAnimation() {
    const canvas = document.getElementById('ms-bg-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Create particles
    this._particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 3 + 1,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: (Math.random() - 0.5) * 0.5,
      opacity: Math.random() * 0.5 + 0.1,
      hue: Math.random() > 0.5 ? 25 : 185 // Orange or cyan
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      this._particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        
        // Wrap around
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        
        // Draw
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${p.opacity})`;
        ctx.fill();
        
        // Glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${p.opacity * 0.3})`;
        ctx.fill();
      });

      this._animationFrame = requestAnimationFrame(animate);
    };

    animate();
  }

  _stopBackgroundAnimation() {
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }
  }

  /**
   * Event helpers
   */
  _onClick(selector, handler) {
    const el = this._container?.querySelector(selector);
    if (el) el.addEventListener('click', handler);
  }

  _onClickAll(selector, handler) {
    this._container?.querySelectorAll(selector).forEach(el => {
      el.addEventListener('click', () => handler(el));
    });
  }

  _onInput(selector, handler) {
    const el = this._container?.querySelector(selector);
    if (el) el.addEventListener('input', (e) => handler(e.target.value));
  }

  _addKeyListener() {
    this._keyHandler = (e) => {
      switch (e.key) {
        case 'Escape':
          if (this._context?.router) this._context.router.popToRoot();
          break;
        case 'ArrowLeft':
          if (this._currentStep > 0) this._prevStep();
          break;
        case 'ArrowRight':
        case 'Enter':
          if (e.key === 'Enter' && e.target.tagName === 'INPUT') return;
          this._nextStep();
          break;
        case '1': case '2': case '3': case '4':
          this._goToStep(parseInt(e.key) - 1);
          break;
      }
    };
    document.addEventListener('keydown', this._keyHandler);
  }

  _removeAllListeners() {
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
    }
    this._eventListeners.clear();
  }

  _emit(event, data) {
    // Custom event emitter for module communication
    document.dispatchEvent(new CustomEvent(event, { detail: data }));
  }

  /**
   * Show toast notification
   */
  _showToast(message, type = 'info') {
    // Use container if available, otherwise use document.body
    const target = (this._container && this._container.parentNode) ? this._container : document.body;
    
    const existingToast = target.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.zIndex = '99999';
    toast.innerHTML = `
      <span class="toast-message">${message}</span>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;
    target.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('visible'));

    toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
    setTimeout(() => toast.classList.add('hiding'), 3000);
    setTimeout(() => toast.remove(), 3500);
  }
}

// Singleton instance
let _instance = null;

export function getModeSelect() {
  if (!_instance) {
    _instance = new ModeSelectSystem();
  }
  return _instance;
}

// Global exposure for debugging
if (typeof window !== 'undefined') {
  window.__modeSelect = getModeSelect();
}

export default getModeSelect();
