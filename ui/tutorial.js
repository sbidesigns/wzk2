// ui/tutorial.js — Tutorial/Onboarding System
//
// Features:
// - Interactive tutorial steps for first-time players
// - Multiple tutorial modes: Quick Tour, Full Guide, Controls Practice
// - Step-by-step UI element highlighting
// - Progress tracking with localStorage persistence
// - Skip and resume functionality
// - Touch/mouse gesture demonstrations
// - Completion rewards (XP bonus)
// - Responsive design with mobile support
// CSS: loaded via ui/styles/tutorial.css in index.html

/**
 * @enum {string}
 * Tutorial types
 */
export const TUTORIAL_MODE = {
  QUICK: 'quick',           // 5-step quick overview
  FULL: 'full',             // Comprehensive 12-step guide
  CONTROLS: 'controls'      // Keyboard/controller practice mode
};

/**
 * @enum {string}
 * Tutorial step states
 */
export const STEP_STATE = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  SKIPPED: 'skipped'
};

/**
 * Tutorial step definitions
 */
const TUTORIAL_STEPS = {
  // Quick Tour Steps (5)
  quick: [
    {
      id: 'welcome',
      title: 'Welcome to Warzone Kart!',
      content: 'Neon Underground is a high-octane racing game with grappling hooks, power-ups, and intense competition.',
      icon: '🏎️',
      highlight: null,
      action: null,
      position: 'center'
    },
    {
      id: 'objective',
      title: 'Your Objective',
      content: 'Race against opponents to cross the finish line first. Use power-ups strategically and master drifting for tight corners.',
      icon: '🏁',
      highlight: null,
      action: null,
      position: 'center'
    },
    {
      id: 'controls-basic',
      title: 'Basic Controls',
      content: 'Use WASD or Arrow Keys to steer. SPACE for drift/hold. SHIFT for boost. X to use items.',
      icon: '🎮',
      highlight: null,
      action: 'showControlsOverlay',
      position: 'center'
    },
    {
      id: 'powerups-intro',
      title: 'Power-Ups',
      content: 'Drive through item boxes to collect power-ups. Each gives you a random advantage!',
      icon: '⚡',
      highlight: '.hud-item-box',
      action: null,
      position: 'bottom-right'
    },
    {
      id: 'ready-to-race',
      title: "You're Ready!",
      content: 'Select RACE NOW from the main menu to start your first race. Good luck, racer! 🚗💨',
      icon: '🎉',
      highlight: null,
      action: null,
      position: 'center'
    }
  ],

  // Full Guide Steps (12)
  full: [
    {
      id: 'welcome-full',
      title: 'Welcome to Neon Underground',
      content: 'This comprehensive tutorial will teach you everything you need to become a champion racer.',
      icon: '🌟',
      position: 'center'
    },
    {
      id: 'main-menu-tour',
      title: 'Main Menu Navigation',
      content: 'From here you can access all game modes, your garage, achievements, and settings.',
      icon: '📱',
      highlight: '.main-menu-container',
      position: 'fullscreen'
    },
    {
      id: 'mode-select-tour',
      title: 'Race Modes',
      content: 'Choose from Quick Race, Time Trial, Circuit, Tournament, Elimination, or Ghost Battle.',
      icon: '🏁',
      highlight: '.mode-select-container',
      position: 'fullscreen'
    },
    {
      id: 'track-selection',
      title: 'Track Selection',
      content: 'Each track has unique characteristics. Check difficulty, length, and weather conditions.',
      icon: '🗺️',
      highlight: '.track-grid',
      position: 'fullscreen'
    },
    {
      id: 'vehicle-selection',
      title: 'Choosing Your Vehicle',
      content: 'Balance speed, acceleration, handling, and shield stats to match your racing style.',
      icon: '🚗',
      highlight: '.vehicle-grid',
      position: 'fullscreen'
    },
    {
      id: 'racing-controls',
      title: 'Racing Controls',
      content: 'WASD/Arrows = Steer | Space = Drift | Shift = Boost | X = Use Item | C = Camera',
      icon: '⌨️',
      highlight: null,
      position: 'center',
      showKeybinds: true
    },
    {
      id: 'drifting-guide',
      title: 'Mastering Drifts',
      content: 'Hold Space while turning to initiate a drift. Release at the right angle for a speed boost!',
      icon: '🌀',
      highlight: null,
      position: 'center',
      tip: 'Drift around corners to maintain speed!'
    },
    {
      id: 'powerups-detail',
      title: 'Power-Up System',
      content: 'Collect item boxes on the track. Items range from boosts and shields to missiles and more!',
      icon: '📦',
      highlight: '.powerup-indicator',
      position: 'bottom-center'
    },
    {
      id: 'hud-overview',
      title: 'Heads-Up Display',
      content: 'The HUD shows your position, speed, lap count, race time, collected items, and shield status.',
      icon: '📊',
      highlight: '.hud-container',
      position: 'top-overlay'
    },
    {
      id: 'minimap-usage',
      title: 'Minimap & Positioning',
      content: 'The minimap shows track layout, opponent positions, and your current placement.',
      icon: '🗺️',
      highlight: '.minimap-container',
      position: 'top-left'
    },
    {
      id: 'achievements-system',
      title: 'Achievements & Progress',
      content: 'Complete challenges to unlock trophies. Track your progress in the Achievements screen.',
      icon: '🏆',
      highlight: null,
      position: 'center'
    },
    {
      id: 'tutorial-complete',
      title: 'Tutorial Complete!',
      content: "You're now ready to race! You've earned 500 XP for completing the tutorial. Good luck!",
      icon: '🎓',
      position: 'center',
      reward: { xp: 500 }
    }
  ]
};

/**
 * Main TutorialSystem class - Singleton pattern
 */
class TutorialSystem {
  constructor() {
    this._container = null;
    this._currentMode = TUTORIAL_MODE.QUICK;
    this._currentStepIndex = 0;
    this._steps = [];
    this._stepStates = new Map();
    this._isActive = false;
    this._isCompleted = false;
    this._highlightElement = null;
    this._overlay = null;
    this._callbacks = new Map();
    
    // Storage key
    this._storageKey = 'wzk_tutorial_state';
  }

  /**
   * Check if tutorial should be shown
   */
  shouldShowTutorial() {
    const state = this._loadState();
    return !state.completed && !state.skipped;
  }

  /**
   * Get tutorial completion state
   */
  getState() {
    return this._loadState();
  }

  /**
   * Start the tutorial
   * @param {string} mode - Tutorial mode (quick/full/controls)
   * @param {HTMLElement} container - Container element
   */
  async start(mode = TUTORIAL_MODE.QUICK, container = document.body) {
    if (this._isActive) return;

    this._currentMode = mode;
    this._steps = TUTORIAL_STEPS[mode] || TUTORIAL_STEPS.quick;
    this._currentStepIndex = 0;
    this._stepStates.clear();
    
    // Initialize all steps as pending
    this._steps.forEach((step, i) => {
      this._stepStates.set(step.id, STEP_STATE.PENDING);
    });

    // Create container if needed
    if (!this._container || this._container !== container) {
      this._container = container;
    }

    this._isActive = true;
    this._buildUI();
    this._setupInteractions();
    this._showStep(0);

    this._emit('tutorial:start', { mode, totalSteps: this._steps.length });

    return new Promise((resolve) => {
      this._resolvePromise = resolve;
    });
  }

  /**
   * Show specific step
   */
  _showStep(index) {
    if (index < 0 || index >= this._steps.length) return;

    this._currentStepIndex = index;
    const step = this._steps[index];

    // Update state
    this._stepStates.set(step.id, STEP_STATE.ACTIVE);

    // Update UI
    this._updateStepDisplay(step, index);
    
    // Handle highlighting
    if (step.highlight) {
      this._showHighlight(step.highlight);
    } else {
      this._hideHighlight();
    }

    // Execute step action if any
    if (step.action) {
      this._executeStepAction(step.action);
    }

    this._emit('tutorial:stepChanged', { 
      stepId: step.id, 
      index, 
      total: this._steps.length 
    });
  }

  /**
   * Go to next step
   */
  next() {
    // Mark current as completed
    const currentStep = this._steps[this._currentStepIndex];
    if (currentStep) {
      this._stepStates.set(currentStep.id, STEP_STATE.COMPLETED);
    }

    if (this._currentStepIndex < this._steps.length - 1) {
      this._showStep(this._currentStepIndex + 1);
    } else {
      this._complete();
    }
  }

  /**
   * Go to previous step
   */
  previous() {
    if (this._currentStepIndex > 0) {
      // Mark current as backtracked
      const currentStep = this._steps[this._currentStepIndex];
      if (currentStep) {
        this._stepStates.set(currentStep.id, STEP_STATE.PENDING);
      }
      
      this._showStep(this._currentStepIndex - 1);
    }
  }

  /**
   * Skip the tutorial
   */
  skip() {
    this._steps.forEach(step => {
      this._stepStates.set(step.id, STEP_STATE.SKIPPED);
    });

    this._saveState({ skipped: true, skippedAt: Date.now() });
    
    this._emit('tutorial:skipped', {});
    this._cleanup();

    if (this._resolvePromise) {
      this._resolvePromise({ completed: false, skipped: true });
    }
  }

  /**
   * Complete the tutorial successfully
   */
  _complete() {
    this._isCompleted = true;
    this._isActive = false;

    // Calculate reward
    const lastStep = this._steps[this._steps.length - 1];
    const reward = lastStep?.reward || { xp: 250 };

    this._saveState({
      completed: true,
      completedAt: Date.now(),
      mode: this._currentMode,
      reward
    });

    this._showCompletionScreen(reward);
    this._emit('tutorial:complete', { reward });
  }

  /**
   * Build the tutorial UI
   */
  _buildUI() {
    if (!this._container) return;

    const step = this._steps[0];

    this._container.innerHTML = `
      <div class="tutorial-overlay" id="tutorial-overlay">
        <!-- Backdrop -->
        <div class="tutorial-backdrop" id="tutorial-backdrop"></div>
        
        <!-- Highlight overlay -->
        <div class="tutorial-highlight-layer" id="tutorial-highlight"></div>
        
        <!-- Main Content -->
        <div class="tutorial-content" id="tutorial-content">
          <!-- Progress Indicator -->
          <nav class="tutorial-progress" id="tutorial-progress">
            <div class="progress-dots" id="progress-dots">
              ${this._steps.map((_, i) => `
                <div class="progress-dot ${i === 0 ? 'active' : ''}" data-step="${i}"></div>
              `).join('')}
            </div>
            <span class="progress-text" id="progress-text">
              Step ${1} of ${this._steps.length}
            </span>
          </nav>

          <!-- Step Content Card -->
          <main class="tutorial-step-card" id="tutorial-card">
            <div class="step-icon-wrapper">
              <span class="step-icon" id="step-icon">${step.icon}</span>
            </div>
            
            <h2 class="step-title" id="step-title">${step.title}</h2>
            
            <p class="step-content" id="step-content">${step.content}</p>
            
            ${step.tip ? `
            <div class="step-tip">
              <span class="tip-icon">💡</span>
              <span class="tip-text">${step.tip}</span>
            </div>
            ` : ''}
            
            ${step.showKeybinds ? `
            <div class="keybinds-display">
              <div class="keybind-row">
                <kbd>W</kbd><kbd>↑</kbd> Accelerate
                <kbd>S</kbd><kbd>↓</kbd> Brake
              </div>
              <div class="keybind-row">
                <kbd>A</kbd><kbd>←</kbd> Steer Left
                <kbd>D</kbd><kbd>→</kbd> Steer Right
              </div>
              <div class="keybind-row">
                <kbd>Space</kbd> Drift/Hold
                <kbd>Shift</kbd> Boost
              </div>
              <div class="keybind-row">
                <kbd>X</kbd> Use Item
                <kbd>C</kbd> Change View
              </div>
            </div>
            ` : ''}
          </main>

          <!-- Navigation Footer -->
          <footer class="tutorial-nav" id="tutorial-nav">
            <button class="tutorial-btn secondary" id="tut-prev" ${this._currentStep === 0 ? 'disabled' : ''}>
              ← Back
            </button>
            
            <div class="tutorial-center-actions">
              <button class="tutorial-btn text" id="tut-skip">Skip Tutorial</button>
            </div>

            <button class="tutorial-btn primary" id="tut-next">
              ${this._steps.length > 1 ? 'Next →' : 'Got it! →'}
            </button>
          </footer>
        </div>

        <!-- Completion Screen (hidden initially) -->
        <div class="tutorial-completion hidden" id="tutorial-completion">
          <div class="completion-content">
            <div class="completion-icon">🎓</div>
            <h2 class="completion-title">Tutorial Complete!</h2>
            <p class="completion-message">You've earned rewards and are ready to race!</p>
            <div class="reward-display" id="completion-reward"></div>
            <button class="tutorial-btn primary large" id="tut-finish">
              Start Racing! 🏁
            </button>
          </div>
        </div>
      </div>
    `;

    // Add entrance animation
    requestAnimationFrame(() => {
      const overlay = document.getElementById('tutorial-overlay');
      if (overlay) overlay.classList.add('visible');
    });
  }

  /**
   * Update step display content
   */
  _updateStepDisplay(step, index) {
    const iconEl = document.getElementById('step-icon');
    const titleEl = document.getElementById('step-title');
    const contentEl = document.getElementById('step-content');
    const prevBtn = document.getElementById('tut-prev');
    const nextBtn = document.getElementById('tut-next');
    const progressText = document.getElementById('progress-text');

    // Update content with animation
    [iconEl, titleEl, contentEl].forEach(el => {
      if (el) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(10px)';
      }
    });

    setTimeout(() => {
      if (iconEl) {
        iconEl.textContent = step.icon;
        iconEl.style.opacity = '1';
        iconEl.style.transform = 'translateY(0)';
      }
      if (titleEl) {
        titleEl.textContent = step.title;
        titleEl.style.opacity = '1';
        titleEl.style.transform = 'translateY(0)';
      }
      if (contentEl) {
        contentEl.textContent = step.content;
        contentEl.style.opacity = '1';
        contentEl.style.transform = 'translateY(0)';
      }
    }, 150);

    // Update progress dots
    document.querySelectorAll('.progress-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
      dot.classList.toggle('completed', i < index);
    });

    // Update progress text
    if (progressText) {
      progressText.textContent = `Step ${index + 1} of ${this._steps.length}`;
    }

    // Update buttons
    if (prevBtn) prevBtn.disabled = index === 0;
    if (nextBtn) {
      const isLast = index === this._steps.length - 1;
      nextBtn.innerHTML = isLast ? 'Finish! 🎉' : 'Next →';
    }
  }

  /**
   * Show highlight overlay on element
   */
  _showHighlight(selector) {
    this._hideHighlight();
    
    const target = document.querySelector(selector);
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const highlight = document.getElementById('tutorial-highlight');
    
    if (highlight) {
      highlight.style.setProperty('--rect-top', `${rect.top}px`);
      highlight.style.setProperty('--rect-left', `${rect.left}px`);
      highlight.style.setProperty('--rect-width', `${rect.width}px`);
      highlight.style.setProperty('--rect-height', `${rect.height}px`);
      highlight.classList.add('visible');
    }

    // Scroll target into view smoothly
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Pulse effect on target
    target.classList.add('tutorial-pulse');
    this._highlightElement = target;
  }

  /**
   * Hide highlight overlay
   */
  _hideHighlight() {
    const highlight = document.getElementById('tutorial-highlight');
    if (highlight) highlight.classList.remove('visible');

    if (this._highlightElement) {
      this._highlightElement.classList.remove('tutorial-pulse');
      this._highlightElement = null;
    }
  }

  /**
   * Execute special step actions
   */
  _executeStepAction(action) {
    switch (action) {
      case 'showControlsOverlay':
        this._emit('tutorial:showControls', {});
        break;
      default:
        console.log(`[Tutorial] Action: ${action}`);
    }
  }

  /**
   * Show completion screen
   */
  _showCompletionScreen(reward) {
    const mainContent = document.getElementById('tutorial-content');
    const completionScreen = document.getElementById('tutorial-completion');
    const rewardDisplay = document.getElementById('completion-reward');

    if (mainContent) mainContent.classList.add('hidden');
    if (completionScreen) completionScreen.classList.remove('hidden');
    
    if (rewardDisplay) {
      rewardDisplay.innerHTML = `
        <div class="reward-item xp-reward">
          <span class="reward-icon">⭐</span>
          <span class="reward-value">+${reward.xp} XP</span>
        </div>
      `;
    }
  }

  /**
   * Setup interaction handlers
   */
  _setupInteractions() {
    const container = this._container;

    // Next button
    container.querySelector('#tut-next')?.addEventListener('click', () => this.next());

    // Previous button
    container.querySelector('#tut-prev')?.addEventListener('click', () => this.previous());

    // Skip button
    container.querySelector('#tut-skip')?.addEventListener('click', () => {
      if (confirm('Skip the tutorial? You can always view it later from Settings.')) {
        this.skip();
      }
    });

    // Finish button
    container.querySelector('#tut-finish')?.addEventListener('click', () => {
      this._cleanup();
      this._emit('tutorial:finish', {});
      if (this._resolvePromise) {
        this._resolvePromise({ completed: true, skipped: false });
      }
    });

    // Progress dot navigation
    container.querySelectorAll('.progress-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        const step = parseInt(dot.dataset.step);
        if (step <= this._currentStepIndex) {
          // Mark intermediate steps as completed
          for (let i = this._currentStepIndex; i < step; i++) {
            this._stepStates.set(this._steps[i]?.id, STEP_STATE.COMPLETED);
          }
          this._showStep(step);
        }
      });
    });

    // Keyboard navigation
    this._keyHandler = (e) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'Enter':
        case ' ':
          e.preventDefault();
          this.next();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.previous();
          break;
        case 'Escape':
          e.preventDefault();
          this.skip();
          break;
      }
    };

    document.addEventListener('keydown', this._keyHandler);
  }

  /**
   * Cleanup and remove UI
   */
  _cleanup() {
    // Remove keyboard handler
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }

    // Remove highlight
    this._hideHighlight();

    // Animate out
    const overlay = document.getElementById('tutorial-overlay');
    if (overlay) {
      overlay.classList.remove('visible');
      overlay.classList.add('hiding');
      
      setTimeout(() => {
        if (this._container) {
          const overlay = this._container.querySelector('#tutorial-overlay');
          if (overlay) overlay.remove();
        }
        this._isActive = false;
      }, 350);
    } else {
      this._isActive = false;
    }
  }

  /**
   * Load saved state from localStorage
   */
  _loadState() {
    try {
      const data = localStorage.getItem(this._storageKey);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  /**
   * Save state to localStorage
   */
  _saveState(state) {
    try {
      const currentState = this._loadState();
      localStorage.setItem(this._storageKey, JSON.stringify({
        ...currentState,
        ...state,
        updatedAt: Date.now()
      }));
    } catch (e) {
      console.warn('[Tutorial] Failed to save state:', e);
    }
  }

  /**
   * Reset tutorial (allow replay)
   */
  reset() {
    localStorage.removeItem(this._storageKey);
    this._isCompleted = false;
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

  /**
   * Unregister event listener
   */
  off(event, callback) {
    document.removeEventListener(event, callback);
  }

  get isActive() { return this._isActive; }
  get isCompleted() { return this._isCompleted; }
  get currentStep() { return this._currentStepIndex; }
  get totalSteps() { return this._steps.length; }
}

// Singleton instance
let _instance = null;

export function getTutorial() {
  if (!_instance) {
    _instance = new TutorialSystem();
  }
  return _instance;
}

if (typeof window !== 'undefined') {
  window.__tutorial = getTutorial();
}

export default getTutorial();
