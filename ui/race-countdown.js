// ui/race-countdown.js — Race Countdown System
//
// Features:
// - Animated countdown sequence (3-2-1-GO!)
// - Multiple countdown styles: Classic, Neon, Minimal, Cinematic
// - Audio cues with visual synchronization
// - Player position preview during countdown
// - Track preview overlay
// - Customizable duration and timing
// - Integration with race state machine
// - Responsive design with mobile support
// CSS: loaded via ui/styles/race-countdown.css in index.html

/**
 * @enum {string}
 * Countdown style presets
 */
export const COUNTDOWN_STYLE = {
  CLASSIC: 'classic',       // Large numbers, simple fade
  NEON: 'neon',            // Glowing neon numbers
  MINIMAL: 'minimal',      // Clean, modern design
  CINEMATIC: 'cinematic'   // Full-screen cinematic experience
};

/**
 * @enum {string}
 * Countdown phases for animation control
 */
export const COUNTDOWN_PHASE = {
  IDLE: 'idle',
  PREVIEW: 'preview',
  COUNTDOWN: 'countdown',
  GO: 'go',
  COMPLETE: 'complete',
  CANCELLED: 'cancelled'
};

/**
 * Main RaceCountdownSystem class - Singleton pattern
 */
class RaceCountdownSystem {
  constructor() {
    this._container = null;
    this._currentPhase = COUNTDOWN_PHASE.IDLE;
    this._currentStyle = COUNTDOWN_STYLE.NEON;
    this._count = 3;
    this._totalCount = 3;
    this._isRunning = false;
    this._isPaused = false;
    this._callbacks = new Map();
    this._animationFrame = null;
    this._startTime = null;
    this._countDuration = 1000; // ms per number
    this._goDuration = 800;     // ms for GO display
    this._options = {
      showTrackPreview: true,
      showPositionPreview: true,
      playAudioCues: true,
      showPlayerList: false,
      enableSkip: true
    };
    
    // Particle system for effects
    this._particles = [];
    this._canvasCtx = null;
  }

  /**
   * Initialize the countdown system with container
   */
  init(container) {
    if (!container) {
      console.warn('[RaceCountdown] No container provided');
      return;
    }
    this._container = container;
    return this;
  }

  /**
   * Start the countdown sequence
   * @param {object} options - Configuration options
   * @returns {Promise} Resolves when countdown completes
   */
  start(options = {}) {
    if (this._isRunning) {
      console.warn('[RaceCountdown] Already running');
      return Promise.resolve();
    }

    // Merge options
    this._options = { ...this._options, ...options };
    this._currentStyle = options.style || COUNTDOWN_STYLE.NEON;
    this._totalCount = options.count || 3;
    this._count = this._totalCount;
    this._isRunning = true;
    this._isPaused = false;
    this._currentPhase = COUNTDOWN_PHASE.PREVIEW;

    return new Promise((resolve) => {
      this._resolvePromise = resolve;

      // Build UI
      this._buildUI();
      
      // Start preview phase then countdown
      this._emit('countdown:start', { style: this._currentStyle });
      
      if (this._options.showTrackPreview) {
        setTimeout(() => this._startCountdownSequence(), 1200);
      } else {
        this._startCountdownSequence();
      }
    });
  }

  /**
   * Cancel/abort the countdown
   */
  cancel() {
    if (!this._isRunning) return;
    
    this._isRunning = false;
    this._currentPhase = COUNTDOWN_PHASE.CANCELLED;
    
    this._stopAnimations();
    this._removeUI();
    
    this._emit('countdown:cancelled', {});
    
    if (this._resolvePromise) {
      this._resolvePromise(false);
      this._resolvePromise = null;
    }
  }

  /**
   * Skip to GO immediately
   */
  skip() {
    if (!this._isRunning || !this._options.enableSkip) return;
    
    this._emit('countdown:skipped', { remaining: this._count });
    this._showGo(true);
  }

  /**
   * Pause the countdown (for pause menu)
   */
  pause() {
    if (!this._isRunning) return;
    this._isPaused = true;
    this._currentPhase = 'paused';
    this._pauseTime = Date.now();
    this._emit('countdown:paused', {});
  }

  /**
   * Resume after pause
   */
  resume() {
    if (!this._isPaused) return;
    this._isPaused = false;
    this._resumeFromPhase();
    }

  /**
   * Get current countdown state
   */
  getState() {
    return {
      phase: this._currentPhase,
      count: this._count,
      totalCount: this._totalCount,
      isRunning: this._isRunning,
      isPaused: this._isPaused,
      style: this._currentStyle,
      elapsed: this._startTime ? Date.now() - this._startTime : 0
    };
  }

  /**
   * Build the complete countdown UI
   */
  _buildUI() {
    if (!this._container) return;

    const playerData = this._options.playerData || {};
    const opponents = this._options.opponents || [];

    this._container.innerHTML = `
      <div class="race-countdown-overlay ${this._currentStyle}" id="countdown-overlay">
        <!-- Background Effects -->
        <canvas class="countdown-bg-canvas" id="countdown-canvas"></canvas>
        <div class="countdown-vignette"></div>
        
        ${this._options.showTrackPreview ? `
        <!-- Track Preview Section -->
        <section class="track-preview-section" id="track-preview">
          <div class="preview-header">
            <span class="preview-track-name">${playerData.trackName || 'NEON DRAGWAY'}</span>
            <span class="preview-lap-info">Lap ${playerData.currentLap || 1}/${playerData.totalLaps || 3}</span>
          </div>
          <div class="preview-layout">
            <div class="preview-left">
              <!-- Position Preview -->
              <div class="position-preview">
                <div class="position-number">${playerData.startingPosition || 1}</div>
                <div class="position-label">STARTING POSITION</div>
              </div>
              
              <!-- Mini Track Map -->
              <div class="mini-track-map">
                <svg viewBox="0 0 100 60" class="track-svg">
                  <path class="track-path" d="M10,50 Q30,5 50,30 T90,10" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
                  <circle class="player-marker" cx="15" cy="42" r="4" fill="#ff6b35"/>
                  ${opponents.slice(0, 7).map((o, i) => 
                    `<circle class="opponent-marker" cx="${20 + i * 10}" cy="${35 + (i % 3) * 8}" r="2" fill="${o.color || '#888'}"/>`
                  ).join('')}
                </svg>
              </div>
            </div>
            
            <div class="preview-right">
              <!-- Player List -->
              ${this._options.showPlayerList ? `
              <div class="racer-list">
                <div class="racer-item player-row">
                  <span class="racer-pos">${playerData.startingPosition || 1}.</span>
                  <span class="racer-name">${playerData.playerName || 'YOU'}</span>
                  <span class="racer-vehicle">${playerData.vehicleName || 'Neon Flash'}</span>
                </div>
                ${opponents.map((o, i) => `
                  <div class="racer-item">
                    <span class="racer-pos">${(playerData.startingPosition || 1) + i + 1}.</span>
                    <span class="racer-name">${o.name || `Racer ${i+1}`}</span>
                    <span class="racer-vehicle">${o.vehicle || '?'}</span>
                  </div>
                `).join('')}
              </div>
              ` : ''}
            </div>
          </div>
          
          ${this._options.enableSkip ? `
          <button class="skip-btn" id="countdown-skip">
            PRESS SPACE TO SKIP →
          </button>
          ` : ''}
        </section>
        ` : ''}

        <!-- Main Countdown Display -->
        <main class="countdown-display" id="countdown-display">
          <div class="countdown-number-container" id="countdown-number">
            <span class="countdown-number"></span>
          </div>
          <div class="countdown-label" id="countdown-label"></div>
        </main>

        <!-- GO Flash Effect -->
        <div class="go-flash" id="go-flash">
          <span class="go-text">GO!</span>
          <div class="go-particles"></div>
        </div>

        <!-- Bottom Info Bar -->
        <footer class="countdown-info-bar" id="countdown-info">
          <div class="info-left">
            <span class="mode-badge">${playerData.modeName || 'QUICK RACE'}</span>
          </div>
          <div class="info-center">
            <span class="difficulty-indicator ${playerData.difficulty || 'normal'}">${(playerData.difficulty || 'NORMAL').toUpperCase()}</span>
          </div>
          <div class="info-right">
            <span class="weather-icon">${this._getWeatherIcon(playerData.weather)}</span>
          </div>
        </footer>
      </div>
    `;

    // Setup interactions
    this._setupInteractions();
    
    // Start background effects
    this._startBackgroundEffects();

    // Entrance animation
    requestAnimationFrame(() => {
      const overlay = document.getElementById('countdown-overlay');
      if (overlay) overlay.classList.add('visible');
    });
  }

  /**
   * Start the actual countdown sequence
   */
  _startCountdownSequence() {
    // Hide preview, show countdown
    const preview = document.getElementById('track-preview');
    const display = document.getElementById('countdown-display');
    
    if (preview) preview.classList.add('hidden');
    if (display) display.classList.add('visible');
    
    this._currentPhase = COUNTDOWN_PHASE.COUNTDOWN;
    this._startTime = Date.now();
    
    // Begin counting
    this._nextCount();
  }

  /**
   * Show next number in sequence
   */
  _nextCount() {
    if (!this._isRunning || this._isPaused) return;
    
    if (this._count <= 0) {
      this._showGo();
      return;
    }

    this._updateNumberDisplay(this._count);
    this._emit('countdown:tick', { count: this._count, total: this._totalCount });

    // Schedule next
    this._timeoutId = setTimeout(() => {
      this._count--;
      this._nextCount();
    }, this._countDuration);
  }

  /**
   * Update the number display with animation
   */
  _updateNumberDisplay(num) {
    const container = document.getElementById('countdown-number');
    const label = document.getElementById('countdown-label');
    
    if (!container) return;

    // Remove old animation classes
    container.classList.remove('animate-in');
    
    // Force reflow
    void container.offsetWidth;
    
    // Update content and animate
    const numberEl = container.querySelector('.countdown-number');
    if (numberEl) {
      numberEl.textContent = num;
    }
    
    container.classList.add('animate-in');
    
    // Update label text based on count
    if (label) {
      label.textContent = num === 3 ? 'GET READY' : num === 2 ? 'SET' : '';
    }

    // Play audio cue
    if (this._options.playAudioCues) {
      this._playTickSound(num);
    }
  }

  /**
   * Show GO! signal
   */
  _showGo(immediate = false) {
    this._currentPhase = COUNTDOWN_PHASE.GO;
    
    const display = document.getElementById('countdown-display');
    const goFlash = document.getElementById('go-flash');
    const infoBar = document.getElementById('countdown-info');
    
    // Hide number display
    if (display) {
      display.classList.remove('visible');
      display.classList.add('hidden');
    }
    
    // Show GO flash
    if (goFlash) {
      goFlash.classList.add('visible');
    }
    
    // Hide info bar
    if (infoBar) infoBar.classList.add('fade-out');

    this._emit('countdown:go', {});
    
    // Create burst effect
    this._createGoBurst();

    // Complete after GO duration
    const duration = immediate ? 200 : this._goDuration;
    
    this._timeoutId = setTimeout(() => {
      this._complete();
    }, duration);
  }

  /**
   * Complete the countdown
   */
  _complete() {
    this._currentPhase = COUNTDOWN_PHASE.COMPLETE;
    this._isRunning = false;
    
    this._emit('countdown:complete', {});
    
    // Remove UI after short delay
    this._timeoutId = setTimeout(() => {
      this._stopAnimations();
      this._removeUI();
      
      if (this._resolvePromise) {
        this._resolvePromise(true);
        this._resolvePromise = null;
      }
    }, 300);
  }

  /**
   * Resume from pause at appropriate point
   */
  _resumeFromPhase() {
    switch (this._currentPhase) {
      case 'paused':
        // Recalculate timing
        const elapsed = this._pauseTime - this._startTime;
        const expectedElapsed = (this._totalCount - this._count) * this._countDuration;
        
        if (elapsed >= expectedElapsed) {
          this._count--;
        }
        
        this._currentPhase = COUNTDOWN_PHASE.COUNTDOWN;
        this._nextCount();
        break;
    }
    
    this._emit('countdown:resumed', {});
  }

  /**
   * Setup interaction handlers
   */
  _setupInteractions() {
    // Skip button / Space key
    const skipBtn = document.getElementById('countdown-skip');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => this.skip());
    }

    // Keyboard handler
    this._keyHandler = (e) => {
      if (e.code === 'Space' && this._options.enableSkip) {
        e.preventDefault();
        this.skip();
      }
      if (e.code === 'Escape') {
        e.preventDefault();
        this.cancel();
      }
    };

    document.addEventListener('keydown', this._keyHandler);
  }

  /**
   * Start canvas background effects
   */
  _startBackgroundEffects() {
    const canvas = document.getElementById('countdown-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    this._canvasCtx = ctx;

    const resize = () => {
      canvas.width = canvas.offsetWidth || window.innerWidth;
      canvas.height = canvas.offsetHeight || window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Create particles
    this._particles = Array.from({ length: 50 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 4 + 1,
      speedX: (Math.random() - 0.5) * 2,
      speedY: (Math.random() - 0.5) * 2,
      opacity: Math.random() * 0.6 + 0.1,
      hue: [25, 185, 280][Math.floor(Math.random() * 3)] // Orange, Cyan, Purple
    }));

    // Animation loop
    const animate = () => {
      if (!this._isRunning) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw and update particles
      this._particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        
        // Wrap edges
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        
        // Draw particle with glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 65%, ${p.opacity})`;
        ctx.fill();
        
        // Glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 65%, ${p.opacity * 0.15})`;
        ctx.fill();
      });

      // Draw radial pulse based on countdown
      if (this._count > 0 && this._count <= this._totalCount) {
        const progress = 1 - (this._count / this._totalCount);
        const pulseRadius = Math.max(canvas.width, canvas.height) * 0.3 * (1 - progress * 0.5);
        
        const gradient = ctx.createRadialGradient(
          canvas.width / 2, canvas.height / 2, 0,
          canvas.width / 2, canvas.height / 2, pulseRadius
        );
        gradient.addColorStop(0, 'rgba(255, 107, 53, 0)');
        gradient.addColorStop(0.7, 'rgba(255, 107, 53, 0)');
        gradient.addColorStop(1, `rgba(255, 107, 53, ${0.05 + progress * 0.1})`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      this._animationFrame = requestAnimationFrame(animate);
    };

    animate();
  }

  /**
   * Create GO! burst effect
   */
  _createGoBurst() {
    const particlesContainer = document.querySelector('.go-particles');
    if (!particlesContainer) return;

    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('div');
      particle.className = 'go-particle';
      
      const angle = (i / 30) * Math.PI * 2;
      const distance = 150 + Math.random() * 200;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      
      particle.style.setProperty('--burst-x', `${x}px`);
      particle.style.setProperty('--burst-y', `${y}px`);
      particle.style.setProperty('--delay', `${Math.random() * 0.1}s`);
      particle.style.setProperty('--size', `${4 + Math.random() * 8}px`);
      particle.style.setProperty('--hue', `${[25, 45, 180][Math.floor(Math.random() * 3)]}`);
      
      particlesContainer.appendChild(particle);
    }
  }

  /**
   * Stop all animations
   */
  _stopAnimations() {
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    this._particles = [];
    this._canvasCtx = null;
  }

  /**
   * Remove the UI completely
   */
  _removeUI() {
    if (this._container) {
      const overlay = document.getElementById('countdown-overlay');
      if (overlay) {
        overlay.classList.remove('visible');
        overlay.classList.add('hiding');
        setTimeout(() => {
          if (this._container) this._container.innerHTML = '';
        }, 400);
      }
    }
  }

  /**
   * Play tick sound effect (placeholder)
   */
  _playTickSound(count) {
    // Emit event for audio system to handle
    this._emit('countdown:sound', { type: 'tick', count });
  }

  /**
   * Get weather icon character
   */
  _getWeatherIcon(weather) {
    const icons = {
      clear: '☀️', rain: '🌧️', snow: '❄️',
      storm: '⛈️', fog: '🌫️', night: '🌙'
    };
    return icons[weather] || icons.clear;
  }

  /**
   * Event emitter
   */
  _emit(event, data) {
    document.dispatchEvent(new CustomEvent(event, { detail: data }));
  }

  /**
   * Register callback for events
   */
  on(event, callback) {
    if (!this._callbacks.has(event)) {
      this._callbacks.set(event, []);
    }
    this._callbacks.get(event).push(callback);
    document.addEventListener(event, callback);
  }

  /**
   * Unregister callback
   */
  off(event, callback) {
    const callbacks = this._callbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
        document.removeEventListener(event, callback);
      }
    }
  }
}

// Singleton instance
let _instance = null;

export function getRaceCountdown() {
  if (!_instance) {
    _instance = new RaceCountdownSystem();
  }
  return _instance;
}

// Global exposure for debugging
if (typeof window !== 'undefined') {
  window.__raceCountdown = getRaceCountdown();
}

export default getRaceCountdown();
