// ui/track-loading.js — Track Loading Transition Screen
//
// Features:
// - Beautiful track preview while loading race assets
// - Loading progress bar with percentage
// - Track information display (name, weather, difficulty)
// - Racing tips that cycle during load
// - Opponent avatars display
// - Vehicle preview card
// - Cancel option for long loads
// - Smooth entrance/exit animations
// CSS: loaded via ui/styles/track-loading.css in index.html

/**
 * @enum {string}
 * Loading phases
 */
export const LOADING_PHASE = {
  INITIALIZING: 'initializing',
  LOADING_ASSETS: 'loading-assets',
  PREPARING_TRACK: 'preparing-track',
  SPAWNING_OPPONENTS: 'spawning-opponents',
  FINALIZING: 'finalizing',
  READY: 'ready'
};

/**
 * Loading tips to show during load
 */
const LOADING_TIPS = [
  "Draft behind opponents to build speed, then slingshot past!",
  "Save your boost pads for straightaways, not corners.",
  "The grappling hook isn't just for swinging—try it for shortcuts!",
  "Different vehicles have different drift characteristics.",
  "Watch the minimap to anticipate upcoming turns.",
  "Power-ups spawn at fixed positions on every lap—memorize them!",
  "Shield power-ups absorb one hit from any source.",
  "The Ghost item makes you temporarily invisible to opponents."
];

/**
 * Main TrackLoadingSystem class
 */
class TrackLoadingSystem {
  constructor() {
    this._container = null;
    this._isVisible = false;
    this._progress = 0;
    this._phase = LOADING_PHASE.INITIALIZING;
    this._tipInterval = null;
    this._currentTipIndex = 0;
    this._animationFrame = null;
    this._options = {};
    
    // Default data
    this._trackData = {
      name: 'NEON DRAGWAY',
      image: null,
      gradient: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 50%, #ffcc02 100%)',
      length: '2.4 km',
      laps: 3,
      weather: 'clear',
      difficulty: 'normal'
    };
    
    this._opponents = [];
    this._vehicleData = {
      name: 'Neon Flash',
      class: 'C'
    };
  }

  /**
   * Show the loading screen
   */
  async start(options = {}) {
    if (this._isVisible) return;

    this._options = {
      showCancel: true,
      estimatedTime: 8000,
      autoReady: true,
      ...options
    };

    // Merge data overrides
    if (options.track) this._trackData = { ...this._trackData, ...options.track };
    if (options.opponents) this._opponents = options.opponents;
    if (options.vehicle) this._vehicleData = { ...this._vehicleData, ...options.vehicle };

    this._progress = 0;
    this._phase = LOADING_PHASE.INITIALIZING;

    // Create container
    if (!this._container || !document.contains(this._container)) {
      this._container = document.createElement('div');
      this._container.id = 'track-loading-container';
      document.body.appendChild(this._container);
    }

    this._buildUI();
    this._setupInteractions();
    this._startAnimations();
    this._startTipCycler();

    this._isVisible = true;

    this._emit('loading:start', { track: this._trackData });

    return new Promise((resolve) => {
      this._resolvePromise = resolve;

      // Auto-complete after estimated time (if enabled)
      if (this._options.autoReady) {
        setTimeout(() => this._simulateProgress(this._options.estimatedTime), 500);
      }
    });
  }

  /**
   * Update progress
   */
  updateProgress(percent, phase) {
    if (!this._isVisible) return;

    this._progress = Math.min(100, Math.max(0, percent));
    
    if (phase) this._phase = phase;

    const progressBar = this._container?.querySelector('.tl-progress-fill');
    const progressText = this._container?.querySelector('.tl-progress-text');
    const phaseText = this._container?.querySelector('.tl-phase-text');

    if (progressBar) progressBar.style.width = `${this._progress}%`;
    if (progressText) progressText.textContent = `${Math.round(this._progress)}%`;
    if (phaseText) phaseText.textContent = this._getPhaseDisplay(phase);

    this._emit('loading:progress', { progress: this._progress, phase });
  }

  /**
   * Simulate progress over time
   */
  _simulateProgress(totalDuration) {
    const startTime = Date.now();
    const steps = [
      { progress: 15, phase: LOADING_PHASE.LOADING_ASSETS, delay: totalDuration * 0.2 },
      { progress: 40, phase: LOADING_PHASE.PREPARING_TRACK, delay: totalDuration * 0.4 },
      { progress: 65, phase: LOADING_PHASE.SPAWNING_OPPONENTS, delay: totalDuration * 0.6 },
      { progress: 85, phase: LOADING_PHASE.FINALIZING, delay: totalDuration * 0.8 },
      { progress: 100, phase: LOADING_PHASE.READY, delay: totalDuration * 1.0 }
    ];

    let stepIndex = 0;
    const checkProgress = () => {
      if (!this._isVisible || stepIndex >= steps.length) return;

      const elapsed = Date.now() - startTime;
      
      // Find current step based on elapsed time
      while (stepIndex < steps.length && elapsed >= steps[stepIndex].delay) {
        const step = steps[stepIndex];
        this.updateProgress(step.progress, step.phase);
        stepIndex++;
      }

      if (stepIndex < steps.length) {
        requestAnimationFrame(checkProgress);
      } else {
        // Complete
        setTimeout(() => this._complete(), 300);
      }
    };

    requestAnimationFrame(checkProgress);
  }

  /**
   * Complete loading successfully
   */
  _complete() {
    if (!this._isVisible) return;

    this._progress = 100;
    this._phase = LOADING_PHASE.READY;

    const readyScreen = this._container.querySelector('.tl-ready-screen');
    const mainContent = this._container.querySelector('.tl-main-content');

    if (mainContent) mainContent.classList.add('hidden');
    if (readyScreen) readyScreen.classList.add('visible');

    // Emit event
    this._emit('loading:complete', {});

    // Auto-resolve after delay
    setTimeout(() => {
      if (this._resolvePromise) {
        this._resolvePromise({ success: true, cancelled: false });
      }
    }, 1500);
  }

  /**
   * Cancel loading
   */
  cancel(reason = 'User cancelled') {
    if (!this._isVisible) return;

    this._cleanup();

    this._emit('loading:cancelled', { reason });

    if (this._resolvePromise) {
      this._resolvePromise({ success: false, cancelled: true, reason });
    }
  }

  /**
   * Get loading state
   */
  getState() {
    return {
      isVisible: this._isVisible,
      progress: this._progress,
      phase: this._phase,
      track: this._trackData
    };
  }

  /**
   * Build UI
   */
  _buildUI() {
    const t = this._trackData;
    const v = this._vehicleData;
    const opps = this._opponents.slice(0, 7);

    this._container.innerHTML = `
      <div class="track-loading-overlay" id="track-loading-overlay">
        <!-- Background -->
        <canvas class="tl-bg-canvas" id="tl-canvas"></canvas>
        <div class="tl-vignette"></div>

        <!-- Main Content -->
        <main class="tl-main-content">
          <!-- Header -->
          <header class="tl-header">
            <div class="tl-track-preview">
              <div class="tl-track-image" style="background: ${t.gradient}">
                <span class="tl-terrain-icon">${this._getTerrainIcon(t.name)}</span>
              </div>
              <div class="tl-track-info">
                <h2 class="tl-track-name">${t.name}</h2>
                <div class="tl-track-meta">
                  <span class="meta-item">📏 ${t.length}</span>
                  <span class="meta-item">🏁 ${t.laps} Laps</span>
                  <span class="meta-item">${this._getWeatherIcon(t.weather)}</span>
                  <span class="meta-item diff-${t.difficulty}">${t.difficulty.toUpperCase()}</span>
                </div>
              </div>
            </div>

            <!-- Progress Section -->
            <div class="tl-progress-section">
              <div class="tl-phase-row">
                <span class="tl-status-dot"></span>
                <span class="tl-phase-text" id="tl-phase-text">Initializing...</span>
              </div>
              <div class="tl-progress-bar">
                <div class="tl-progress-track">
                  <div class="tl-progress-fill" style="width: 0%"></div>
                  <div class="tl-progress-glow"></div>
                </div>
                <span class="tl-progress-text" id="tl-progress-text">0%</span>
              </div>
            </div>
          </header>

          <!-- Body Grid -->
          <section class="tl-body-grid">
            <!-- Left: Vehicle + Tips -->
            <div class="tl-left-col">
              <!-- Vehicle Card -->
              <div class="tl-vehicle-card">
                <h3 class="tl-section-title">Your Vehicle</h3>
                <div class="tl-vehicle-display">
                  <div class="tl-vehicle-shape" style="--v-color: ${this._getVehicleColor(v.class)}">
                    <div class="tl-vehicle-body"></div>
                    <div class="tl-wheel tl-front"></div>
                    <div class="tl-wheel tl-rear"></div>
                  </div>
                  <div class="tl-vehicle-info">
                    <span class="tl-vehicle-name">${v.name}</span>
                    <span class="tl-vehicle-class">Class ${v.class}</span>
                  </div>
                </div>
              </div>

              <!-- Tip Display -->
              <div class="tl-tip-card">
                <h3 class="tl-section-title tip-title">
                  <span class="tip-icon">💡</span> Racing Tip
                </h3>
                <p class="tl-tip-text" id="tl-tip-text">${LOADING_TIPS[0]}</p>
                <div class="tl-tip-dots" id="tl-tip-dots">
                  ${LOADING_TIPS.map((_, i) => `<span class="${i === 0 ? 'active' : ''}" data-tip="${i}"></span>`).join('')}
                </div>
              </div>
            </div>

            <!-- Right: Opponents -->
            <div class="tl-right-col">
              <h3 class="tl-section-title">Opponents</h3>
              <div class="tl-opponent-list">
                ${opps.map((opp, i) => `
                  <div class="tl-opponent-row" style="--opp-delay: ${i * 80}ms}">
                    <span class="opp-position">#${i + 2}</span>
                    <span class="opp-avatar" style="--opp-color: ${opp.color || '#888'}">${opp.icon || '🏎️'}</span>
                    <span class="opp-name">${opp.name}</span>
                    <span class="opp-vehicle">${opp.vehicle}</span>
                  </div>
                `).join('')}
                
                ${opps.length > 7 ? `<div class="tl-more-opponents">+${opps.length - 7} more</div>` : ''}
              </div>
            </div>
          </section>
        </main>

        <!-- Ready Screen (hidden initially) -->
        <div class="tl-ready-screen hidden" id="tl-ready-screen">
          <div class="ready-content">
            <div class="ready-icon">🏁</div>
            <h2 class="ready-title">READY TO RACE!</h2>
            <p class="ready-subtitle">Good luck, racer!</p>
            <div class="ready-countdown">
              <span>Starting in...</span>
              <span class="ready-dots">
                <span></span><span></span><span></span>
              </span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        ${this._options.showCancel ? `
        <footer class="tl-footer">
          <button class="tl-cancel-btn" id="tl-cancel">
            ✕ Cancel
          </button>
        </footer>
        ` : ''}
      </div>
    `;
  }

  /**
   * Setup interactions
   */
  _setupInteractions() {
    const cancelBtn = this._container.querySelector('#tl-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.cancel());
    }

    // Keyboard handler
    this._keyHandler = (e) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        this.cancel();
      }
    };
    document.addEventListener('keydown', this._keyHandler);

    // Tip dots navigation
    this._container.querySelectorAll('[data-tip]').forEach(dot => {
      dot.addEventListener('click', () => {
        const idx = parseInt(dot.dataset.tip);
        this._showTip(idx);
      });
    });
  }

  /**
   * Start background animation
   */
  _startAnimations() {
    const canvas = this._container?.querySelector('#tl-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Particles
    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 3 + 1,
      speedX: (Math.random() - 0.5) * 1.5,
      speedY: (Math.random() - 0.5) * 1.5,
      hue: [25, 185, 280][Math.floor(Math.random() * 3)]
    }));

    let frameCount = 0;

    const animate = () => {
      if (!this._isVisible) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw particles
      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${0.4 + Math.sin(frameCount * 0.02 + p.x * 0.01) * 0.3})`;
        ctx.fill();
      });

      // Draw subtle grid lines
      ctx.strokeStyle = `rgba(255, 107, 53, ${0.03 + Math.sin(frameCount * 0.01) * 0.02})`;
      ctx.lineWidth = 1;
      const gridSize = 60;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      frameCount++;
      this._animationFrame = requestAnimationFrame(animate);
    };

    animate();
  }

  /**
   * Start tip cycling
   */
  _startTipCycler() {
    this._currentTipIndex = 0;
    
    this._tipInterval = setInterval(() => {
      if (!this._isVisible) return;
      this._currentTipIndex = (this._currentTipIndex + 1) % LOADING_TIPS.length;
      this._showTip(this._currentTipIndex);
    }, 4000); // Change tip every 4 seconds
  }

  /**
   * Show specific tip
   */
  _showTip(index) {
    const textEl = this._container?.querySelector('#tl-tip-text');
    const dots = this._container?.querySelectorAll('[data-tip]');
    
    if (textEl) {
      textEl.style.opacity = '0';
      setTimeout(() => {
        textEl.textContent = LOADING_TIPS[index];
        textEl.style.opacity = '1';
      }, 200);
    }

    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
  }

  /**
   * Get phase display text
   */
  _getPhaseDisplay(phase) {
    const displays = {
      [LOADING_PHASE.INITIALIZING]: 'Initializing...',
      [LOADING_PHASE.LOADING_ASSETS]: 'Loading assets...',
      [LOADING_PHASE.PREPARING_TRACK]: 'Preparing track...',
      [LOADING_PHASE.SPAWNING_OPPONENTS]: 'Spawning opponents...',
      [LOADING_PHASE.FINALIZING]: 'Finalizing...',
      [LOADING_PHASE.READY]: 'Ready!'
    };
    return displays[phase] || phase;
  }

  /**
   * Helpers
   */
  _getTerrainIcon(name) {
    const icons = {
      'NEON DRAGWAY': '🏙️', 'CYBER SPIRAL': '🌀', 'SKY HARBOR': '☁️',
      'UNDERGROUND VAULT': '⛏️', 'VOLCANIC RIFT': '🌋', 'QUANTUM LOOP': '🔮',
      'ARCTIC BLAST': '❄️', 'TOXIC SWAMP': '☢️'
    };
    return icons[name.toUpperCase()] || '🏁';
  }

  _getWeatherIcon(weather) {
    const icons = { clear: '☀️', rain: '🌧️', snow: '❄️', storm: '⛈️', fog: '🌫️' };
    return icons[weather] || '☀️';
  }

  _getVehicleClassColor(cls) {
    return { D: '#8b8b8b', C: '#00e5ff', B: '#a855f7', S: '#fbbf24' }[cls] || '#fff';
  }

  /**
   * Cleanup
   */
  _cleanup() {
    this._isVisible = false;

    if (this._tipInterval) {
      clearInterval(this._tipInterval);
      this._tipInterval = null;
    }

    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }

    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }

    // Animate out
    const overlay = this._container?.querySelector('#track-loading-overlay');
    if (overlay) {
      overlay.classList.add('removing');
      setTimeout(() => {
        if (this._container) this._container.innerHTML = '';
      }, 350);
    }
  }

  /**
   * Event emitter
   */
  _emit(event, detail) {
    document.dispatchEvent(new CustomEvent(event, { detail }));
  }

  on(event, cb) { document.addEventListener(event, cb); }
  off(event, cb) { document.removeEventListener(event, cb); }
}

let _instance = null;

export function getTrackLoading() {
  if (!_instance) _instance = new TrackLoadingSystem();
  return _instance;
}

if (typeof window !== 'undefined') {
  window.__trackLoading = getTrackLoading();
}

export default getTrackLoading();
