// ui/hud.js — Heads-Up Display (HUD) System for Warzone Kart: Neon Underground
// Comprehensive racing HUD with speed, position, lap counter, items, timer, and more
// CSS: loaded via ui/styles/hud.css in index.html

/**
 * @class HUDSystem
 * Main HUD controller for active racing gameplay
 * 
 * Features:
 * - Speed display with color-coded thresholds
 * - Position/rank with animated transitions
 * - Lap counter with progress bar
 * - Item box with usage prompts
 * - Race timer with countdown
 * - Minimap integration
 * - Shield/health status
 * - Notification system
 */
export class HUDSystem {
  /**
   * Create a new HUDSystem instance
   */
  constructor() {
    this._container = null;
    this._isVisible = false;
    this._isInitialized = false;
    this._isCompact = false;
    this._minimap = null;
    
    // State tracking
    this._state = {
      speed: 0,
      maxSpeed: 300,
      position: 1,
      totalRacers: 8,
      currentLap: 1,
      totalLaps: 3,
      lapProgress: 0,
      currentItem: null,
      raceTime: 0,
      countdown: null,
      shield: 100,
      health: 100,
      gear: 1
    };
    
    // Animation state
    this._animations = {
      speed: { current: 0, target: 0 },
      position: { current: 1, target: 1, animating: false },
      shield: { current: 100, target: 100 }
    };
    
    // Event listeners storage
    this._listeners = new Map();
    this._boundHandlers = new Map();
    
    // Countdown state
    this._countdownTimer = null;
    this._raceStartTime = null;
    this._raceTimeInterval = null;
    
    // Reduced motion preference
    this._reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Notification queue
    this._notificationQueue = [];
    this._activeNotification = null;
  }

  /**
   * Initialize the HUD system
   * @param {Object} options - Configuration options
   * @returns {HUDSystem} This instance for chaining
   */
  init(options = {}) {
    if (this._isInitialized) return this;
    
    const {
      container = document.body,
      compact = false,
      showMinimap = true,
      minimapOptions = {}
    } = options;
    
    this._isCompact = compact || this._detectMobile();
    this._container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    // Build DOM structure
    this._buildHUD();
    
    // Initialize minimap if enabled
    if (showMinimap) {
      this._initMinimap(minimapOptions);
    }
    
    // Bind keyboard/gamepad handlers
    this._bindInputHandlers();
    
    // Handle resize events
    this._bindResizeHandler();
    
    this._isInitialized = true;
    console.log('[HUD] System initialized');
    
    return this;
  }

  /**
   * Show the HUD
   * @param {Object} data - Initial data to display
   */
  show(data = {}) {
    if (!this._isInitialized) {
      console.warn('[HUD] Cannot show before initialization');
      return;
    }
    
    // Ensure container exists and is properly styled
    if (this._container) {
      this._container.classList.add('hud-visible');
      this._container.style.opacity = '1';
      this._container.style.visibility = 'visible';
      this._container.style.display = 'block';
      this._container.style.pointerEvents = 'none';
      
      // Ensure all direct children have pointer-events
      Array.from(this._container.children).forEach(child => {
        child.style.pointerEvents = 'auto';
      });
    }
    
    if (data) this.update(data);
    
    this._isVisible = true;
    console.log('[HUD] Showing HUD');
    this._emit('show');
  }

  /**
   * Hide the HUD
   */
  hide() {
    if (!this._isInitialized) return;
    
    this._container.classList.remove('hud-visible');
    this._isVisible = false;
    this._emit('hide');
  }

  /**
   * Check if HUD is visible
   * @returns {boolean}
   */
  get isVisible() {
    return this._isVisible;
  }

  /**
   * Update all HUD elements with new game state
   * @param {Object} data - Game state data
   */
  update(data) {
    if (!this._isInitialized || !this._isVisible) return;
    
    // Update individual components based on provided data
    if (data.speed !== undefined) this._updateSpeed(data.speed);
    if (data.maxSpeed !== undefined) this._state.maxSpeed = data.maxSpeed;
    if (data.position !== undefined) this._updatePosition(data.position);
    if (data.totalRacers !== undefined) {
      this._state.totalRacers = data.totalRacers;
      this._updatePositionDisplay();
    }
    if (data.currentLap !== undefined) this._state.currentLap = data.currentLap;
    if (data.totalLaps !== undefined) this._state.totalLaps = data.totalLaps;
    if (data.lapProgress !== undefined) this._updateLapProgress(data.lapProgress);
    if (data.currentItem !== undefined) this._updateItem(data.currentItem);
    if (data.shield !== undefined) this._updateShield(data.shield);
    if (data.health !== undefined) this._updateHealth(data.health);
    if (data.gear !== undefined) this._updateGear(data.gear);
    
    // Lap time updates
    if (data.lapTimes) {
      this._updateLapTimes(data.lapTimes);
    }
    
    // Minimap update
    if (this._minimap && (data.playerPosition || data.opponents)) {
      this._minimap.render(
        data.playerPosition || {},
        data.opponents || []
      );
    }
    
    this._emit('update', data);
  }

  /**
   * Start race countdown sequence
   * @param {number} duration - Countdown duration in seconds (default: 3)
   * @returns {Promise} Resolves when countdown completes
   */
  startCountdown(duration = 3) {
    return new Promise((resolve) => {
      const countdownEl = document.getElementById('hud-countdown');
      if (!countdownEl) {
        console.warn('[HUD] Countdown element not found, skipping countdown');
        resolve();
        return;
      }
      
      // Reset and show countdown
      countdownEl.classList.add('active');
      countdownEl.style.display = 'flex';
      let count = duration;
      
      const updateCountdown = () => {
        const countEl = countdownEl.querySelector('.countdown-number');
        if (countEl) {
          countEl.textContent = count > 0 ? count : 'GO!';
          countEl.className = 'countdown-number' + (count === 0 ? ' go' : '');
        }
        
        if (count < 0) {
          // Clear interval
          if (this._countdownTimer) {
            clearInterval(this._countdownTimer);
            this._countdownTimer = null;
          }
          
          // Hide countdown after GO! shows briefly
          setTimeout(() => {
            countdownEl.classList.remove('active');
            countdownEl.style.display = 'none';
            console.log('[HUD] Countdown complete, race started');
            
            // Emit event so other systems know race has truly started
            if (window.__engine?.bus) {
              window.__engine.bus.emit('race:go');
            }
          }, 800);
          
          this.startRaceTimer();
          resolve();
          return;
        }
        
        count--;
      };
      
      updateCountdown();
      this._countdownTimer = setInterval(updateCountdown, 1000);
    });
  }

  /**
   * Start the race timer
   */
  startRaceTimer() {
    this._raceStartTime = performance.now();
    
    if (this._raceTimeInterval) {
      clearInterval(this._raceTimeInterval);
    }
    
    this._raceTimeInterval = setInterval(() => {
      if (!this._isVisible) return;
      
      const elapsed = performance.now() - this._raceStartTime;
      this._state.raceTime = elapsed;
      this._updateRaceTime(elapsed);
    }, 10); // Update every 10ms for smooth display
  }

  /**
   * Stop the race timer and get final time
   * @returns {number} Final race time in milliseconds
   */
  stopRaceTimer() {
    if (this._raceTimeInterval) {
      clearInterval(this._raceTimeInterval);
      this._raceTimeInterval = null;
    }
    return this._state.raceTime;
  }

  /**
   * Reset HUD to initial state
   */
  reset() {
    this.stopRaceTimer();
    
    if (this._countdownTimer) {
      clearInterval(this._countdownTimer);
      this._countdownTimer = null;
    }
    
    this._state = {
      speed: 0,
      maxSpeed: 300,
      position: 1,
      totalRacers: 8,
      currentLap: 1,
      totalLaps: 3,
      lapProgress: 0,
      currentItem: null,
      raceTime: 0,
      countdown: null,
      shield: 100,
      health: 100,
      gear: 1
    };
    
    this.clearNotifications();
    this.update({});
  }

  /**
   * Show a notification on the HUD
   * @param {string} message - Notification message
   * @param {Object} options - Notification options
   */
  showNotification(message, options = {}) {
    const {
      type = 'info', // info, success, warning, danger
      duration = 2000,
      icon = null
    } = options;
    
    const notification = {
      id: Date.now(),
      message,
      type,
      icon,
      duration
    };
    
    this._notificationQueue.push(notification);
    
    if (!this._activeNotification) {
      this._processNextNotification();
    }
  }

  /**
   * Clear all pending notifications
   */
  clearNotifications() {
    this._notificationQueue = [];
    const container = document.getElementById('hud-notifications');
    if (container) {
      container.innerHTML = '';
    }
    this._activeNotification = null;
  }

  /**
   * Set minimap track data
   * @param {Object} trackData - Track path and metadata
   */
  setTrackData(trackData) {
    if (this._minimap) {
      this._minimap.setTrack(trackData);
    }
  }

  /**
   * Toggle minimap visibility
   */
  toggleMinimap() {
    if (this._minimap) {
      this._minimap.toggle();
    }
  }

  /**
   * Destroy the HUD system and cleanup resources
   */
  destroy() {
    // Stop timers
    this.stopRaceTimer();
    if (this._countdownTimer) {
      clearInterval(this._countdownTimer);
    }
    
    // Remove event listeners
    this._unbindInputHandlers();
    this._unbindResizeHandler();
    
    // Destroy minimap
    if (this._minimap) {
      this._minimap.destroy();
      this._minimap = null;
    }
    
    // Remove DOM element
    if (this._hudElement && this._hudElement.parentNode) {
      this._hudElement.parentNode.removeChild(this._hudElement);
    }
    
    this._listeners.clear();
    this._boundHandlers.clear();
    this._isInitialized = false;
    this._isVisible = false;
    
    this._emit('destroy');
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Build the complete HUD DOM structure
   * @private
   */
  _buildHUD() {
    const hud = document.createElement('div');
    hud.id = 'game-hud';
    hud.className = `game-hud${this._isCompact ? ' compact' : ''}`;
    hud.setAttribute('role', 'application');
    hud.setAttribute('aria-label', 'Game HUD - Racing information display');
    
    // Ensure proper z-index for 3D canvas overlay
    hud.style.position = 'fixed';
    hud.style.inset = '0';
    hud.style.zIndex = '100'; // Above 3D canvas (z-index: 10)
    hud.style.pointerEvents = 'none';
    
    hud.innerHTML = `
      <!-- SPEED DISPLAY -->
      <div class="hud-panel hud-speed-panel" role="status" aria-live="polite">
        <div class="speed-container">
          <div class="speed-value" id="hud-speed">0</div>
          <div class="speed-unit">KM/H</div>
        </div>
        <div class="gear-indicator" id="hud-gear">
          <span class="gear-label">GEAR</span>
          <span class="gear-value">1</span>
        </div>
        <div class="speed-bar-container">
          <div class="speed-bar" id="hud-speed-bar"></div>
        </div>
      </div>

      <!-- POSITION & LAP PANEL -->
      <div class="hud-panel hud-position-panel" role="status" aria-live="polite">
        <div class="position-display" id="hud-position">
          <span class="position-number">1</span>
          <span class="position-suffix">ST</span>
        </div>
        <div class="position-change" id="hud-position-change"></div>
        <div class="racers-count" id="hud-racers">/ 8</div>
        
        <div class="lap-container">
          <div class="lap-counter" id="hud-lap">
            <span class="lap-current">1</span>
            <span class="lap-separator">/</span>
            <span class="lap-total">3</span>
          </div>
          <div class="lap-label">LAP</div>
          <div class="lap-progress-container">
            <div class="lap-progress-bar" id="hud-lap-progress"></div>
          </div>
        </div>
      </div>

      <!-- RACE TIMER -->
      <div class="hud-panel hud-timer-panel" role="timer" aria-live="off">
        <div class="timer-display" id="hud-timer">00:00.000</div>
        <div class="timer-label">RACE TIME</div>
      </div>

      <!-- ITEM BOX -->
      <div class="hud-panel hud-item-panel" role="status" aria-live="polite">
        <div class="item-box" id="hud-item-box">
          <div class="item-icon" id="hud-item-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
          </div>
          <div class="item-prompt" id="hud-item-prompt">[SPACE]</div>
        </div>
        <div class="item-status" id="hud-item-status">NO ITEM</div>
      </div>

      <!-- SHIELD / HEALTH -->
      <div class="hud-panel hud-status-panel" role="status" aria-live="polite">
        <div class="status-bars">
          <div class="shield-bar-container">
            <div class="status-label">
              <span class="status-icon shield-icon">🛡️</span>
              SHIELD
            </div>
            <div class="bar-track">
              <div class="bar-fill shield-fill" id="hud-shield-bar"></div>
            </div>
            <div class="bar-value" id="hud-shield-value">100%</div>
          </div>
          <div class="health-bar-container">
            <div class="status-label">
              <span class="status-icon health-icon">❤️</span>
              HEALTH
            </div>
            <div class="bar-track">
              <div class="bar-fill health-fill" id="hud-health-bar"></div>
            </div>
            <div class="bar-value" id="hud-health-value">100%</div>
          </div>
        </div>
      </div>

      <!-- COUNTDOWN OVERLAY -->
      <div class="hud-countdown" id="hud-countdown" aria-hidden="true">
        <div class="countdown-number">3</div>
      </div>

      <!-- NOTIFICATIONS AREA -->
      <div class="hud-notifications" id="hud-notifications" aria-live="assertive"></div>

      <!-- MINIMAP CONTAINER -->
      <div class="hud-minimap-container" id="hud-minimap-container"></div>

      <!-- LAP TIMES DISPLAY -->
      <div class="hud-lap-times" id="hud-lap-times" role="status" aria-live="polite">
        <div class="lap-time-row">
          <span class="lap-time-label">CURRENT:</span>
          <span class="lap-time-value" id="hud-lap-current">--:--.--</span>
        </div>
        <div class="lap-time-row">
          <span class="lap-time-label">BEST:</span>
          <span class="lap-time-value best" id="hud-lap-best">--:--.--</span>
        </div>
        <div class="lap-time-row">
          <span class="lap-time-label">LAST:</span>
          <span class="lap-time-value" id="hud-lap-last">--:--.--</span>
        </div>
      </div>
    `;
    
    this._container.appendChild(hud);
    this._hudElement = hud;
  }

  /**
   * Initialize minimap component
   * @private
   */
  async _initMinimap(options = {}) {
    try {
      const { Minimap } = await import('./minimap.js');
      
      const container = document.getElementById('hud-minimap-container');
      if (!container) return;
      
      this._minimap = new Minimap({
        container,
        width: this._isCompact ? 150 : 200,
        height: this._isCompact ? 150 : 200,
        ...options
      });
      
      this._minimap.init();
    } catch (e) {
      console.warn('[HUD] Minimap not available:', e.message);
    }
  }

  /**
   * Update speed display
   * @param {number} speed - Current speed in km/h
   * @private
   */
  _updateSpeed(speed) {
    this._state.speed = speed;
    this._animations.speed.target = speed;
    
    const speedEl = document.getElementById('hud-speed');
    const speedBar = document.getElementById('hud-speed-bar');
    
    if (!speedEl || !speedBar) return;
    
    // Smooth animation unless reduced motion preferred
    if (this._reducedMotion) {
      this._setSpeedDisplay(speed, speedEl, speedBar);
    } else {
      this._animateValue(
        this._animations.speed,
        (value) => this._setSpeedDisplay(value, speedEl, speedBar),
        100
      );
    }
  }

  /**
   * Set speed display values
   * @private
   */
  _setSpeedDisplay(speed, el, bar) {
    const displaySpeed = Math.round(speed);
    el.textContent = displaySpeed;
    
    // Color based on speed threshold
    const ratio = speed / this._state.maxSpeed;
    el.className = 'speed-value';
    
    if (ratio >= 0.9) {
      el.classList.add('critical');
    } else if (ratio >= 0.7) {
      el.classList.add('high');
    } else if (ratio >= 0.4) {
      el.classList.add('medium');
    } else {
      el.classList.add('low');
    }
    
    // Update speed bar
    const percentage = Math.min(100, (speed / this._state.maxSpeed) * 100);
    bar.style.width = `${percentage}%`;
  }

  /**
   * Update position display with animation
   * @param {number} newPosition - New position (1-based)
   * @private
   */
  _updatePosition(newPosition) {
    const oldPosition = this._state.position;
    this._state.position = newPosition;
    this._animations.position.target = newPosition;
    
    const posEl = document.getElementById('hud-position');
    const changeEl = document.getElementById('hud-position-change');
    
    if (!posEl) return;
    
    // Calculate change direction
    const diff = oldPosition - newPosition;
    
    if (diff !== 0 && changeEl) {
      // Show position change indicator
      if (diff > 0) {
        changeEl.textContent = `+${diff}`;
        changeEl.className = 'position-change gained';
        this.showNotification(`Position gained! Now ${newPosition}${this._getSuffix(newPosition)}`, {
          type: 'success',
          duration: 1500
        });
      } else {
        changeEl.textContent = `${diff}`;
        changeEl.className = 'position-change lost';
        this.showNotification(`Position lost! Now ${newPosition}${this._getSuffix(newPosition)}`, {
          type: 'warning',
          duration: 1500
        });
      }
      
      // Clear after animation
      setTimeout(() => {
        if (changeEl) {
          changeEl.textContent = '';
          changeEl.className = 'position-change';
        }
      }, 1500);
    }
    
    this._updatePositionDisplay();
  }

  /**
   * Update position display element
   * @private
   */
  _updatePositionDisplay() {
    const posEl = document.getElementById('hud-position');
    const racersEl = document.getElementById('hud-racers');
    
    if (posEl) {
      const numEl = posEl.querySelector('.position-number');
      const suffixEl = posEl.querySelector('.position-suffix');
      
      if (numEl) numEl.textContent = this._state.position;
      if (suffixEl) suffixEl.textContent = this._getSuffix(this._state.position);
      
      // Add special styling for podium positions
      posEl.className = 'position-display';
      if (this._state.position === 1) posEl.classList.add('first');
      else if (this._state.position === 2) posEl.classList.add('second');
      else if (this._state.position === 3) posEl.classList.add('third');
    }
    
    if (racersEl) {
      racersEl.textContent = `/ ${this._state.totalRacers}`;
    }
  }

  /**
   * Get ordinal suffix for position
   * @private
   */
  _getSuffix(num) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = num % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }

  /**
   * Update lap progress
   * @param {number} progress - Progress 0-1
   * @private
   */
  _updateLapProgress(progress) {
    this._state.lapProgress = progress;
    
    const progressBar = document.getElementById('hud-lap-progress');
    const lapCurrent = document.querySelector('.lap-current');
    
    if (progressBar) {
      progressBar.style.width = `${progress * 100}%`;
    }
  }

  /**
   * Update lap times display
   * @param {Object} times - Lap times object
   * @private
   */
  _updateLapTimes(times) {
    const currentEl = document.getElementById('hud-lap-current');
    const bestEl = document.getElementById('hud-lap-best');
    const lastEl = document.getElementById('hud-lap-last');
    
    if (times.current && currentEl) {
      currentEl.textContent = this._formatTime(times.current);
    }
    if (times.best && bestEl) {
      bestEl.textContent = this._formatTime(times.best);
    }
    if (times.last && lastEl) {
      lastEl.textContent = this._formatTime(times.last);
    }
  }

  /**
   * Update item display
   * @param {Object|null} item - Item data or null
   * @private
   */
  _updateItem(item) {
    this._state.currentItem = item;
    
    const iconEl = document.getElementById('hud-item-icon');
    const statusEl = document.getElementById('hud-item-status');
    const promptEl = document.getElementById('hud-item-prompt');
    const boxEl = document.getElementById('hud-item-box');
    
    if (!item) {
      if (iconEl) iconEl.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
          <line x1="7" y1="7" x2="7.01" y2="7"/>
        </svg>
      `;
      if (statusEl) statusEl.textContent = 'NO ITEM';
      if (boxEl) boxEl.classList.remove('has-item');
      return;
    }
    
    if (iconEl && item.icon) {
      iconEl.innerHTML = item.icon;
    }
    if (statusEl) {
      statusEl.textContent = item.name?.toUpperCase() || 'ITEM READY';
    }
    if (boxEl) boxEl.classList.add('has-item');
    
    this.showNotification(`Picked up ${item.name || 'item'}!`, {
      type: 'info',
      icon: item.icon,
      duration: 1200
    });
  }

  /**
   * Update shield value
   * @param {number} value - Shield percentage 0-100
   * @private
   */
  _updateShield(value) {
    this._state.shield = Math.max(0, Math.min(100, value));
    
    const bar = document.getElementById('hud-shield-bar');
    const valEl = document.getElementById('hud-shield-value');
    const panel = document.querySelector('.hud-status-panel');
    
    if (bar) bar.style.width = `${this._state.shield}%`;
    if (valEl) valEl.textContent = `${Math.round(this._state.shield)}%`;
    
    // Warning state
    if (panel) {
      panel.classList.toggle('warning-shield', this._state.shield < 30);
      panel.classList.toggle('danger-shield', this._state.shield < 15);
    }
    
    if (this._state.shield <= 25) {
      this.showNotification('Low shield!', { type: 'danger', duration: 1000 });
    }
  }

  /**
   * Update health value
   * @param {number} value - Health percentage 0-100
   * @private
   */
  _updateHealth(value) {
    this._state.health = Math.max(0, Math.min(100, value));
    
    const bar = document.getElementById('hud-health-bar');
    const valEl = document.getElementById('hud-health-value');
    const panel = document.querySelector('.hud-status-panel');
    
    if (bar) bar.style.width = `${this._state.health}%`;
    if (valEl) valEl.textContent = `${Math.round(this._state.health)}%`;
    
    // Warning states
    if (panel) {
      panel.classList.toggle('warning-health', this._state.health < 30);
      panel.classList.toggle('danger-health', this._state.health < 15);
    }
  }

  /**
   * Update gear indicator
   * @param {number} gear - Gear number 1-6
   * @private
   */
  _updateGear(gear) {
    this._state.gear = Math.max(1, Math.min(6, gear));
    
    const gearEl = document.getElementById('hud-gear');
    if (gearEl) {
      const valEl = gearEl.querySelector('.gear-value');
      if (valEl) valEl.textContent = this._state.gear;
      
      gearEl.className = 'gear-indicator';
      gearEl.classList.add(`gear-${this._state.gear}`);
    }
  }

  /**
   * Update race timer display
   * @param {number} ms - Elapsed time in milliseconds
   * @private
   */
  _updateRaceTime(ms) {
    const timerEl = document.getElementById('hud-timer');
    if (!timerEl) return;
    
    timerEl.textContent = this._formatTime(ms);
  }

  /**
   * Format time in MM:SS.mmm format
   * @param {number} ms - Time in milliseconds
   * @returns {string}
   * @private
   */
  _formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = Math.floor((ms % 1000));
    
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
  }

  /**
   * Animate numeric value smoothly
   * @param {Object} animState - Animation state object
   * @param {Function} onUpdate - Callback with current value
   * @param {number} duration - Animation duration in ms
   * @private
   */
  _animateValue(animState, onUpdate, duration = 200) {
    if (animState.animating) {
      cancelAnimationFrame(animState.frameId);
    }
    
    const startValue = animState.current;
    const endValue = animState.target;
    const startTime = performance.now();
    
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      
      animState.current = startValue + (endValue - startValue) * eased;
      onUpdate(animState.current);
      
      if (progress < 1) {
        animState.frameId = requestAnimationFrame(animate);
      } else {
        animState.current = endValue;
        animState.animating = false;
      }
    };
    
    animState.animating = true;
    animState.frameId = requestAnimationFrame(animate);
  }

  /**
   * Process next notification in queue
   * @private
   */
  _processNextNotification() {
    if (this._notificationQueue.length === 0) {
      this._activeNotification = null;
      return;
    }
    
    this._activeNotification = this._notificationQueue.shift();
    const container = document.getElementById('hud-notifications');
    if (!container) return;
    
    const notif = document.createElement('div');
    notif.className = `hud-notification ${this._activeNotification.type}`;
    notif.setAttribute('role', 'alert');
    
    let iconHTML = '';
    if (this._activeNotification.icon) {
      iconHTML = `<span class="notif-icon">${this._activeNotification.icon}</span>`;
    }
    
    notif.innerHTML = `
      ${iconHTML}
      <span class="notif-message">${this._activeNotification.message}</span>
    `;
    
    container.appendChild(notif);
    
    // Trigger animation
    requestAnimationFrame(() => notif.classList.add('visible'));
    
    // Remove after duration
    setTimeout(() => {
      notif.classList.remove('visible');
      setTimeout(() => {
        if (notif.parentNode) notif.parentNode.removeChild(notif);
        this._processNextNotification();
      }, 300);
    }, this._activeNotification.duration);
  }

  /**
   * Detect if device is mobile-sized
   * @returns {boolean}
   * @private
   */
  _detectMobile() {
    return window.innerWidth < 768 || 
           'ontouchstart' in window || 
           navigator.maxTouchPoints > 0;
  }

  /**
   * Bind input event handlers for accessibility
   * @private
   */
  _bindInputHandlers() {
    // Item use handler
    const handleItemUse = (e) => {
      if ((e.code === 'Space' || e.code === 'KeyX') && this._state.currentItem) {
        e.preventDefault();
        this._emit('itemUse', this._state.currentItem);
      }
    };
    
    // Toggle minimap handler
    const handleToggleMinimap = (e) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        this.toggleMinimap();
      }
    };
    
    document.addEventListener('keydown', handleItemUse);
    document.addEventListener('keydown', handleToggleMinimap);
    
    this._boundHandlers.set('itemUse', handleItemUse);
    this._boundHandlers.set('toggleMinimap', handleToggleMinimap);
  }

  /**
   * Unbind input handlers
   * @private
   */
  _unbindInputHandlers() {
    for (const [name, handler] of this._boundHandlers) {
      document.removeEventListener('keydown', handler);
    }
  }

  /**
   * Bind resize handler for responsive layout
   * @private
   */
  _bindResizeHandler() {
    const handleResize = () => {
      const wasCompact = this._isCompact;
      this._isCompact = this._detectMobile();
      
      if (wasCompact !== this._isCompact && this._hudElement) {
        this._hudElement.classList.toggle('compact', this._isCompact);
        
        if (this._minimap) {
          this._minimap.setSize(
            this._isCompact ? 150 : 200,
            this._isCompact ? 150 : 200
          );
        }
      }
    };
    
    window.addEventListener('resize', handleResize);
    this._boundHandlers.set('resize', handleResize);
  }

  /**
   * Unbind resize handler
   * @private
   */
  _unbindResizeHandler() {
    const handler = this._boundHandlers.get('resize');
    if (handler) {
      window.removeEventListener('resize', handler);
    }
  }

  /**
   * Emit an event to registered listeners
   * @param {string} event - Event name
   * @param {*} data - Event data
   * @private
   */
  _emit(event, data) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.forEach(fn => fn(data));
    }
  }

  // ==================== PUBLIC EVENT API ====================

  /**
   * Register event listener
   * @param {string} event - Event name(s), comma-separated
   * @param {Function} callback - Handler function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    const events = event.split(',');
    
    events.forEach(e => {
      const name = e.trim();
      if (!this._listeners.has(name)) {
        this._listeners.set(name, []);
      }
      this._listeners.get(name).push(callback);
    });
    
    // Return unsubscribe function
    return () => {
      events.forEach(e => {
        const name = e.trim();
        const listeners = this._listeners.get(name);
        if (listeners) {
          const idx = listeners.indexOf(callback);
          if (idx > -1) listeners.splice(idx, 1);
        }
      });
    };
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Handler to remove
   */
  off(event, callback) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      const idx = listeners.indexOf(callback);
      if (idx > -1) listeners.splice(idx, 1);
    }
  }

  // ==================== GETTERS ====================

  /** Get current state snapshot */
  get state() {
    return { ...this._state };
  }

  /** Get if compact mode is active */
  get isCompact() {
    return this._isCompact;
  }

  /** Get minimap instance */
  get minimap() {
    return this._minimap;
  }
}

// Export singleton factory
let _instance = null;

/**
 * Get or create the HUD system instance
 * @param {Object} options - Initialization options
 * @returns {HUDSystem}
 */
export function getHUD(options = {}) {
  if (!_instance) {
    _instance = new HUDSystem();
  }
  
  if (!_instance._isInitialized) {
    _instance.init(options);
  }
  
  return _instance;
}

/**
 * Destroy the HUD singleton
 */
export function destroyHUD() {
  if (_instance) {
    _instance.destroy();
    _instance = null;
  }
}

export default HUDSystem;
