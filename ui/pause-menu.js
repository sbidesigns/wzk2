// ui/pause-menu.js — In-Game Pause Menu System
//
// Features:
// - Full-featured pause overlay with multiple sections
// - Resume, Restart, Settings, Quit options
// - Race information display (position, lap, time)
// - Quick settings toggles (music volume, SFX, minimap)
// - Confirmation dialogs for destructive actions
// - Animated entrance/exit transitions
// - Keyboard navigation support (ESC to toggle)
// - Mobile-responsive design
// CSS: loaded via ui/styles/pause-menu.css in index.html

/**
 * @enum {string}
 * Pause menu tabs/sections
 */
export const PAUSE_TAB = {
  MAIN: 'main',
  SETTINGS: 'settings',
  HELP: 'help',
  CONFIRM: 'confirm'
};

/**
 * Main PauseMenuSystem class
 */
class PauseMenuSystem {
  constructor() {
    this._container = null;
    this._isVisible = false;
    this._currentTab = PAUSE_TAB.MAIN;
    this._raceData = {};
    this._confirmAction = null;
    this._eventListeners = new Map();
    this._animationFrame = null;
    
    // Quick settings state
    this._quickSettings = {
      musicVolume: 80,
      sfxVolume: 100,
      showMinimap: true,
      showFPS: false,
      masterVolume: 100
    };
  }

  /**
   * Show the pause menu
   * @param {object} raceData - Current race state data
   */
  show(raceData = {}) {
    if (this._isVisible) return;
    
    this._raceData = {
      position: raceData.position || 1,
      totalRacers: raceData.totalRacers || 8,
      currentLap: raceData.currentLap || 1,
      totalLaps: raceData.totalLaps || 3,
      raceTime: raceData.raceTime || '00:00.000',
      bestLapTime: raceData.bestLapTime || '--:--.---',
      speed: raceData.speed || '0 km/h',
      trackName: raceData.trackName || 'NEON DRAGWAY',
      modeName: raceData.modeName || 'QUICK RACE'
    };
    
    this._isVisible = true;
    this._currentTab = PAUSE_TAB.MAIN;
    
    // Find or create container
    if (!this._container) {
      this._container = document.createElement('div');
      this._container.id = 'pause-menu-container';
      document.body.appendChild(this._container);
    }
    
    this._buildUI();
    this._setupInteractions();
    this._startBackgroundEffect();
    
    this._emit('pausemenu:opened', { raceData: this._raceData });
    
    requestAnimationFrame(() => {
      const overlay = this._container.querySelector('.pause-overlay');
      if (overlay) overlay.classList.add('visible');
    });

    return this;
  }

  /**
   * Hide the pause menu
   */
  hide() {
    if (!this._isVisible) return;
    
    const overlay = this._container?.querySelector('.pause-overlay');
    if (overlay) {
      overlay.classList.remove('visible');
      overlay.classList.add('hiding');
      
      setTimeout(() => {
        this._cleanup();
        this._isVisible = false;
        this._emit('pausemenu:closed', {});
      }, 300);
    } else {
      this._cleanup();
      this._isVisible = false;
    }
  }

  /**
   * Toggle pause menu visibility
   */
  toggle(raceData = {}) {
    if (this._isVisible) {
      this.hide();
    } else {
      this.show(raceData);
    }
    return this._isVisible;
  }

  /**
   * Check if currently visible
   */
  get isVisible() {
    return this._isVisible;
  }

  /**
   * Get current quick settings
   */
  getQuickSettings() {
    return { ...this._quickSettings };
  }

  /**
   * Build complete UI
   */
  _buildUI() {
    const d = this._raceData;
    
    this._container.innerHTML = `
      <div class="pause-overlay" id="pause-overlay">
        <!-- Background blur effect -->
        <div class="pause-backdrop"></div>
        
        <!-- Main Content -->
        <div class="pause-content">
          <!-- Header -->
          <header class="pause-header">
            <h1 class="pause-title">PAUSED</h1>
            <p class="pause-subtitle">${d.trackName} · ${d.modeName}</p>
          </header>

          <!-- Race Info Panel -->
          <section class="race-info-panel">
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">POSITION</span>
                <span class="info-value position-value">${this._getPositionText(d.position)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">LAP</span>
                <span class="info-value">${d.currentLap}/${d.totalLaps}</span>
              </div>
              <div class="info-item">
                <span class="info-label">TIME</span>
                <span class="info-value mono">${d.raceTime}</span>
              </div>
              <div class="info-item">
                <span class="info-label">BEST LAP</span>
                <span class="info-value mono">${d.bestLapTime}</span>
              </div>
              <div class="info-item">
                <span class="info-label">SPEED</span>
                <span class="info-value">${d.speed}</span>
              </div>
            </div>
            
            <!-- Position Change Indicator -->
            <div class="position-indicator ${this._getPositionClass(d.position)}">
              ${this._getPositionChangeIcon(d.position)}
            </div>
          </section>

          <!-- Tab Content Area -->
          <div class="tab-content-area" id="tab-content">
            
            <!-- MAIN TAB -->
            <div class="tab-panel main-tab active" data-tab="${PAUSE_TAB.MAIN}">
              <nav class="pause-menu-nav">
                <button class="pause-menu-btn primary" data-action="resume">
                  <span class="btn-icon">▶</span>
                  <span class="btn-text">RESUME RACE</span>
                  <span class="btn-hint">ESC</span>
                </button>
                
                <button class="pause-menu-btn" data-action="restart">
                  <span class="btn-icon">↻</span>
                  <span class="btn-text">RESTART</span>
                  <span class="btn-hint"></span>
                </button>
                
                <button class="pause-menu-btn" data-action="settings">
                  <span class="btn-icon">⚙</span>
                  <span class="btn-text">SETTINGS</span>
                  <span class="btn-arrow">→</span>
                </button>
                
                <button class="pause-menu-btn" data-action="help">
                  <span class="btn-icon">?</span>
                  <span class="btn-text">CONTROLS</span>
                  <span class="btn-arrow">→</span>
                </button>
                
                <div class="menu-divider"></div>
                
                <button class="pause-menu-btn danger" data-action="quit">
                  <span class="btn-icon">✕</span>
                  <span class="btn-text">QUIT TO MENU</span>
                  <span class="btn-hint"></span>
                </button>
              </nav>
              
              <!-- Quick Toggles -->
              <div class="quick-toggles">
                <div class="toggle-item">
                  <label>🎵 Music</label>
                  <input type="range" class="mini-slider" id="pm-music-vol" 
                         min="0" max="100" value="${this._quickSettings.musicVolume}"
                         aria-label="Music volume">
                </div>
                <div class="toggle-item">
                  <label>🔊 SFX</label>
                  <input type="range" class="mini-slider" id="pm-sfx-vol"
                         min="0" max="100" value="${this._quickSettings.sfxVolume}"
                         aria-label="SFX volume">
                </div>
                <div class="toggle-item">
                  <label>🗺️ Minimap</label>
                  <button class="mini-toggle ${this._quickSettings.showMinimap ? 'active' : ''}" 
                          id="pm-minimap-toggle" aria-label="Toggle minimap">
                    ${this._quickSettings.showMinimap ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            </div>

            <!-- SETTINGS TAB -->
            <div class="panel-settings tab-panel" data-tab="${PAUSE_TAB.SETTINGS}">
              <div class="panel-header">
                <button class="back-btn" data-action="back">← Back</button>
                <h2>Settings</h2>
              </div>
              
              <div class="settings-list">
                <div class="setting-row">
                  <span class="setting-name">Master Volume</span>
                  <input type="range" class="setting-slider" id="pm-master-vol"
                         min="0" max="100" value="${this._quickSettings.masterVolume}">
                  <span class="setting-val" id="pm-master-val">${this._quickSettings.masterVolume}%</span>
                </div>
                
                <div class="setting-row">
                  <span class="setting-name">Music Volume</span>
                  <input type="range" class="setting-slider" id="pm-setting-music"
                         min="0" max="100" value="${this._quickSettings.musicVolume}">
                  <span class="setting-val" id="pm-music-val">${this._quickSettings.musicVolume}%</span>
                </div>
                
                <div class="setting-row">
                  <span class="setting-name">SFX Volume</span>
                  <input type="range" class="setting-slider" id="pm-setting-sfx"
                         min="0" max="100" value="${this._quickSettings.sfxVolume}">
                  <span class="setting-val" id="pm-sfx-val">${this._quickSettings.sfxVolume}%</span>
                </div>
                
                <div class="setting-divider"></div>
                
                <div class="setting-row">
                  <span class="setting-name">Show Minimap</span>
                  <button class="toggle-switch ${this._quickSettings.showMinimap ? 'on' : ''}" 
                          id="pm-set-minimap">
                    <span class="toggle-knob"></span>
                  </button>
                </div>
                
                <div class="setting-row">
                  <span class="setting-name">Show FPS Counter</span>
                  <button class="toggle-switch ${this._quickSettings.showFPS ? 'on' : ''}"
                          id="pm-set-fps">
                    <span class="toggle-knob"></span>
                  </button>
                </div>
              </div>
            </div>

            <!-- HELP/CONTROLS TAB -->
            <div class="panel-help tab-panel" data-tab="${PAUSE_TAB.HELP}">
              <div class="panel-header">
                <button class="back-btn" data-action="back">← Back</button>
                <h2>Controls</h2>
              </div>
              
              <div class="controls-grid">
                <div class="control-category">
                  <h3>Racing</h3>
                  <div class="control-items">
                    <div class="control-item"><kbd>W</kbd><kbd>↑</kbd> Accelerate</div>
                    <div class="control-item"><kbd>S</kbd><kbd>↓</kbd> Brake/Reverse</div>
                    <div class="control-item"><kbd>A</kbd><kbd>←</kbd> Steer Left</div>
                    <div class="control-item"><kbd>D</kbd><kbd>→</kbd> Steer Right</div>
                    <div class="control-item"><kbd>Space</kbd> Drift/Hold</div>
                    <div class="control-item"><kbd>Shift</kbd> Boost</div>
                  </div>
                </div>
                
                <div class="control-category">
                  <h3>Items & Actions</h3>
                  <div class="control-items">
                    <div class="control-item"><kbd>X</kbd> Use Item</div>
                    <div class="control-item"><kbd>C</kbd> Change View</div>
                    <div class="control-item"><kbd>M</kbd> Toggle Map</div>
                    <div class="control-item"><kbd>Tab</kbd> Positions</div>
                  </div>
                </div>
                
                <div class="control-category">
                  <h3>System</h3>
                  <div class="control-items">
                    <div class="control-item"><kbd>Esc</kbd> Pause Menu</div>
                    <div class="control-item"><kbd>R</kbd> Restart (when paused)</div>
                    <div class="control-item"><kbd>F11</kbd> Fullscreen</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- CONFIRMATION DIALOG -->
            <div class="confirm-dialog tab-panel" data-tab="${PAUSE_TAB.CONFIRM}">
              <div class="dialog-box">
                <h3 class="dialog-title" id="confirm-title">Are you sure?</h3>
                <p class="dialog-message" id="confirm-message">This action cannot be undone.</p>
                
                <div class="dialog-actions">
                  <button class="dialog-btn secondary" data-action="cancel-confirm">Cancel</button>
                  <button class="dialog-btn danger" id="confirm-yes-btn" data-action="confirm-yes">Confirm</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Footer hint -->
        <footer class="pause-footer">
          <span>Press <kbd>ESC</kbd> to resume</span>
        </footer>
      </div>
    `;
  }

  /**
   * Setup all interaction handlers
   */
  _setupInteractions() {
    const container = this._container;

    // Menu button actions
    container.querySelectorAll('.pause-menu-btn[data-action]').forEach(btn => {
      btn.addEventListener('click', () => this._handleAction(btn.dataset.action));
    });

    // Back buttons
    container.querySelectorAll('[data-action="back"]').forEach(btn => {
      btn.addEventListener('click', () => this._showTab(PAUSE_TAB.MAIN));
    });

    // Confirm dialog actions
    container.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action === 'cancel-confirm') this._showTab(PAUSE_TAB.MAIN);
      if (action === 'confirm-yes') this._executeConfirmAction();
    });

    // Volume sliders
    this._setupSlider('pm-master-vol', 'pm-master-val', 'masterVolume');
    this._setupSlider('pm-setting-music', 'pm-music-val', 'musicVolume');
    this._setupSlider('pm-sfx-vol', null, 'sfxVolume');
    this._setupSlider('pm-setting-sfx', 'pm-sfx-val', 'sfxVolume');

    // Mini sliders in main panel update both
    container.querySelector('#pm-music-vol')?.addEventListener('input', (e) => {
      this._quickSettings.musicVolume = parseInt(e.target.value);
      const settingSlider = container.querySelector('#pm-setting-music');
      const settingVal = container.querySelector('#pm-music-val');
      if (settingSlider) settingSlider.value = e.target.value;
      if (settingVal) settingVal.textContent = `${e.target.value}%`;
      this._emit('pausemenu:volumeChange', { type: 'music', value: e.target.value });
    });

    container.querySelector('#pm-sfx-vol')?.addEventListener('input', (e) => {
      this._quickSettings.sfxVolume = parseInt(e.target.value);
      const settingSlider = container.querySelector('#pm-setting-sfx');
      const settingVal = container.querySelector('#pm-sfx-val');
      if (settingSlider) settingSlider.value = e.target.value;
      if (settingVal) settingVal.textContent = `${e.target.value}%`;
      this._emit('pausemenu:volumeChange', { type: 'sfx', value: e.target.value });
    });

    // Toggle switches
    this._setupToggle('pm-minimap-toggle', 'showMinimap', true);
    this._setupToggle('pm-set-minimap', 'showMinimap', false);
    this._setupToggle('pm-set-fps', 'showFPS', false);

    // Keyboard handler
    this._keyHandler = (e) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        
        if (this._currentTab === PAUSE_TAB.CONFIRM) {
          this._showTab(PAUSE_TAB.MAIN);
        } else if (this._currentTab !== PAUSE_TAB.MAIN) {
          this._showTab(PAUSE_TAB.MAIN);
        } else {
          this.hide();
        }
      }
    };

    document.addEventListener('keydown', this._keyHandler);
  }

  /**
   * Handle menu button actions
   */
  _handleAction(action) {
    switch (action) {
      case 'resume':
        this.hide();
        this._emit('pausemenu:resume', {});
        break;
        
      case 'restart':
        this._showConfirmation(
          'Restart Race?',
          'All progress in this race will be lost.',
          () => {
            this._emit('pausemenu:restart', {});
            this.hide();
          }
        );
        break;
        
      case 'settings':
        this._showTab(PAUSE_TAB.SETTINGS);
        break;
        
      case 'help':
        this._showTab(PAUSE_TAB.HELP);
        break;
        
      case 'quit':
        this._showConfirmation(
          'Quit to Menu?',
          'Race progress will not be saved. Are you sure?',
          () => {
            this._emit('pausemenu:quit', {});
            this.hide();
          }
        );
        break;
    }
  }

  /**
   * Show specific tab
   */
  _showTab(tabId) {
    this._currentTab = tabId;
    
    // Update panels
    this._container.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.dataset.tab === tabId);
    });
  }

  /**
   * Show confirmation dialog
   */
  _showConfirmation(title, message, onConfirm) {
    this._confirmAction = onConfirm;
    
    const titleEl = this._container.querySelector('#confirm-title');
    const msgEl = this._container.querySelector('#confirm-message');
    
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    
    this._showTab(PAUSE_TAB.CONFIRM);
  }

  /**
   * Execute confirmed action
   */
  _executeConfirmAction() {
    if (typeof this._confirmAction === 'function') {
      this._confirmAction();
    }
    this._confirmAction = null;
  }

  /**
   * Setup slider with label sync
   */
  _setupSlider(sliderId, labelId, settingKey) {
    const slider = this._container.querySelector(`#${sliderId}`);
    const label = labelId ? this._container.querySelector(`#${labelId}`) : null;
    
    if (slider) {
      slider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        this._quickSettings[settingKey] = val;
        if (label) label.textContent = `${val}%`;
        this._emit('pausemenu:volumeChange', { type: settingKey, value: val });
      });
    }
  }

  /**
   * Setup toggle button
   */
  _setupToggle(toggleId, settingKey, isMiniToggle) {
    const toggle = this._container.querySelector(`#${toggleId}`);
    
    if (toggle) {
      toggle.addEventListener('click', () => {
        this._quickSettings[settingKey] = !this._quickSettings[settingKey];
        
        // Update visual
        if (isMiniToggle) {
          toggle.classList.toggle('active', this._quickSettings[settingKey]);
          toggle.textContent = this._quickSettings[settingKey] ? 'ON' : 'OFF';
        } else {
          toggle.classList.toggle('on', this._quickSettings[settingKey]);
        }
        
        this._emit('pausemenu:settingChange', { key: settingKey, value: this._quickSettings[settingKey] });
      });
    }
  }

  /**
   * Get position text with ordinal suffix
   */
  _getPositionText(pos) {
    const suffixes = ['st', 'nd', 'rd'];
    const suffix = pos <= 3 ? suffixes[pos - 1] : 'th';
    return `${pos}${suffix}`;
  }

  /**
   * Get position CSS class based on performance
   */
  _getPositionClass(pos) {
    if (pos === 1) return 'first-place';
    if (pos <= 3) return 'podium';
    if (pos <= Math.ceil(this._raceData.totalRacers / 2)) return 'upper-half';
    return 'lower-half';
  }

  /**
   * Get position change icon
   */
  _getPositionChangeIcon(pos) {
    // This would compare to previous position; placeholder for now
    if (pos === 1) return '🏆 Leading!';
    if (pos <= 3) return '⭐ Podium Position';
    return '';
  }

  /**
   * Start background particle effect
   */
  _startBackgroundEffect() {
    const canvas = this._container.querySelector('.pause-bg-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Simple static noise pattern
    const draw = () => {
      if (!this._isVisible) return;
      
      ctx.fillStyle = 'rgba(5, 6, 10, 0.03)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      for (let i = 0; i < 20; i++) {
        ctx.fillStyle = `rgba(255, 107, 53, ${Math.random() * 0.02})`;
        ctx.fillRect(
          Math.random() * canvas.width,
          Math.random() * canvas.height,
          2, 2
        );
      }
      
      this._animationFrame = requestAnimationFrame(draw);
    };
    
    draw();
  }

  /**
   * Cleanup and remove event listeners
   */
  _cleanup() {
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }
  }

  /**
   * Event emitter
   */
  _emit(event, data) {
    document.dispatchEvent(new CustomEvent(event, { detail: data }));
  }

  /**
   * Register event listener
   */
  on(event, callback) {
    document.addEventListener(event, callback);
  }

  off(event, callback) {
    document.removeEventListener(event, callback);
  }
}

// Singleton instance
let _instance = null;

export function getPauseMenu() {
  if (!_instance) {
    _instance = new PauseMenuSystem();
  }
  return _instance;
}

if (typeof window !== 'undefined') {
  window.__pauseMenu = getPauseMenu();
}

export default getPauseMenu();
