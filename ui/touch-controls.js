// ui/touch-controls.js
// Production-quality virtual touch controls overlay for Warzone Kart
// Features: Analog joystick, action buttons, neon/cyberpunk styling, haptic feedback

/**
 * TouchControls - Virtual touch controls system for mobile racing games
 * @module TouchControls
 * @version 1.0.0
 */

const TouchControls = (() => {
  'use strict';

  // =========================================================================
  // CONSTANTS & CONFIGURATION
  // =========================================================================
  
  const VERSION = '1.0.0';
  
  const DEFAULT_CONFIG = {
    // Layout positioning (null = use CSS variables)
    leftPosition: null,
    rightPosition: null,
    bottomPosition: null,
    
    // Joystick settings
    joystickSize: null,
    knobSize: null,
    deadzoneRadius: 12,
    maxDistance: Infinity,
    returnSpeed: 0.18,
    
    // Button settings
    buttonSize: null,
    buttonGap: null,
    
    // Input sensitivity
    steerSensitivity: 1.0,
    smoothingFactor: 0.25,
    
    // Haptic feedback
    hapticsEnabled: true,
    hapticLightDuration: 10,
    hapticMediumDuration: 20,
    hapticHeavyDuration: 30,
    
    // Visual behavior
    autoShowOnTouch: true,
    hideOnDesktop: true,
    debugMode: false,
    
    // Callbacks
    onStateChange: null,
    onJoystickMove: null,
    onButtonPress: null,
  };
  
  // Action definitions matching game input.config.json
  const ACTIONS = {
    throttle: { label: 'Gas', icon: 'accelerate', side: 'right', variant: 'accelerate', size: 'lg' },
    brake: { label: 'Brake', icon: 'brake', side: 'right', variant: 'brake' },
    drift: { label: 'Drift', icon: 'drift', side: 'right', variant: 'drift' },
    useItem: { label: 'Item', icon: 'item', side: 'right', variant: 'item' },
    pause: { label: 'Pause', icon: 'pause', side: 'top', variant: 'pause', size: 'sm' },
  };
  
  // SVG Icons for buttons (inline for zero dependencies)
  const ICONS = {
    accelerate: '<svg viewBox="0 0 24 24"><path d="M12 2L4 14h6v8l8-12h-6V2z"/></svg>',
    brake: '<svg viewBox="0 0 24 24"><rect x="5" y="4" width="4" height="16" rx="1"/><rect x="15" y="4" width="4" height="16" rx="1"/></svg>',
    drift: '<svg viewBox="0 0 24 24"><path d="M6 3l12 9-12 9V3z"/><path d="M10 7l6 5-6 5" stroke-width="2.5"/></svg>',
    item: '<svg viewBox="0 0 24 24"><path d="M21 8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><circle cx="12" cy="12" r="3"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>',
    settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
  };

  // =========================================================================
  // UTILITY FUNCTIONS
  // =========================================================================

  function isTouchDevice() {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    );
  }

  function isHapticAvailable() {
    try {
      return Boolean(
        typeof navigator !== 'undefined' &&
        'vibrate' in navigator &&
        typeof navigator.vibrate === 'function'
      );
    } catch (e) {
      return false;
    }
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function lerp(start, end, factor) {
    return start + (end - start) * factor;
  }

  function getDistance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  function getAngle(cx, cy, px, py) {
    return Math.atan2(py - cy, px - cx) * (180 / Math.PI);
  }

  function createRipple(element, clientX, clientY) {
    const ripple = document.createElement('span');
    ripple.className = 'tc-ripple';
    
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${clientX - rect.left - size / 2}px`;
    ripple.style.top = `${clientY - rect.top - size / 2}px`;
    
    element.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  }

  // =========================================================================
  // STATE MANAGEMENT
  // =========================================================================

  function createInitialState() {
    return {
      joystick: {
        active: false,
        x: 0,
        y: 0,
        rawX: 0,
        rawY: 0,
        angle: 0,
        magnitude: 0,
        pointerId: null,
      },
      buttons: {
        throttle: { pressed: false, value: 0 },
        brake: { pressed: false, value: 0 },
        drift: { pressed: false, value: 0 },
        useItem: { pressed: false, value: 0 },
        pause: { pressed: false, value: 0 },
      },
    };
  }

  // =========================================================================
  // TOUCH CONTROLS CLASS
  // =========================================================================

  class TouchControlsClass {
    #config;
    #state;
    #container;
    #joystickZone;
    #joystickKnob;
    #joystickBase;
    #buttons;
    #isVisible;
    #isInitialized;
    #detectHandler;

    constructor(options = {}) {
      this.#config = { ...DEFAULT_CONFIG, ...options };
      this.#state = createInitialState();
      this.#container = null;
      this.#joystickZone = null;
      this.#joystickKnob = null;
      this.#joystickBase = null;
      this.#buttons = {};
      this.#isVisible = false;
      this.#isInitialized = false;
      this.#detectHandler = null;
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    get version() { return VERSION; }
    get isVisible() { return this.#isVisible; }
    get isInitialized() { return this.#isInitialized; }

    /**
     * Initialize the touch controls system
     */
    init(options = {}) {
      if (this.#isInitialized) {
        console.warn('[TouchControls] Already initialized. Call destroy() first.');
        return this;
      }

      Object.assign(this.#config, options);

      if (this.#config.hideOnDesktop && !isTouchDevice()) {
        if (this.#config.debugMode) {
          console.log('[TouchControls] Desktop detected, hiding by default.');
        }
      }

      this.#injectStyles();
      this.#buildUI();
      this.#setupJoystickHandlers();
      this.#setupButtonHandlers();
      this.#setupGesturePrevention();

      this.#isInitialized = true;

      if (this.#config.autoShowOnTouch && isTouchDevice()) {
        this.show();
      }

      if (this.#config.autoShowOnTouch && !isTouchDevice()) {
        const detectAndShow = () => {
          if (!this.#isVisible) {
            this.show();
          }
        };
        document.addEventListener('touchstart', detectAndShow, { once: true });
        this.#detectHandler = detectAndShow;
      }

      this.#emit('initialized', { version: VERSION });

      if (this.#config.debugMode) {
        console.log(
          `[TouchControls] Initialized v${VERSION}`,
          `\n  Touch Device: ${isTouchDevice()}`,
          `\n  Haptics: ${isHapticAvailable()}`
        );
      }

      return this;
    }

    /**
     * Show the touch controls overlay
     */
    show(animate = true) {
      if (!this.#isInitialized) {
        console.warn('[TouchControls] Not initialized. Call init() first.');
        return this;
      }

      this.#isVisible = true;
      
      if (this.#container) {
        this.#container.classList.remove('hidden');
        
        if (animate) {
          this.#container.classList.remove('tc-fade-out');
          this.#container.classList.add('visible', 'tc-fade-in');
          
          setTimeout(() => {
            this.#container?.classList.remove('tc-fade-in');
          }, 300);
        } else {
          this.#container.classList.add('visible');
        }
      }

      this.#emit('shown');
      
      if (this.#config.debugMode) {
        console.log('[TouchControls] Visible');
      }

      return this;
    }

    /**
     * Hide the touch controls overlay
     */
    hide(animate = true) {
      if (!this.#isInitialized) return this;

      this.#isVisible = false;
      
      if (this.#container) {
        if (animate) {
          this.#container.classList.remove('tc-fade-in');
          this.#container.classList.add('tc-fade-out');
          
          setTimeout(() => {
            if (this.#container && !this.#isVisible) {
              this.#container.classList.remove('visible', 'tc-fade-out');
              this.#container.classList.add('hidden');
            }
          }, 250);
        } else {
          this.#container.classList.remove('visible', 'tc-fade-in');
          this.#container.classList.add('hidden');
        }
      }

      this.resetState();
      this.#emit('hidden');
      
      if (this.#config.debugMode) {
        console.log('[TouchControls] Hidden');
      }

      return this;
    }

    /**
     * Toggle visibility of touch controls
     */
    toggleVisibility() {
      return this.#isVisible ? this.hide() : this.show();
    }

    /**
     * Reset all input state to defaults
     */
    resetState() {
      if (this.#joystickKnob) {
        this.#joystickKnob.style.transform = 'translate(-50%, -50%)';
        this.#joystickKnob.classList.remove('active');
      }

      Object.entries(this.#buttons).forEach(([actionId, btn]) => {
        if (btn) {
          btn.classList.remove('pressed');
          btn.setAttribute('aria-pressed', 'false');
        }
        if (this.#state.buttons[actionId]) {
          this.#state.buttons[actionId].pressed = false;
          this.#state.buttons[actionId].value = 0;
        }
      });

      Object.assign(this.#state.joystick, {
        active: false,
        x: 0, y: 0, rawX: 0, rawY: 0,
        angle: 0, magnitude: 0, pointerId: null,
      });

      this.#emit('reset');

      return this;
    }

    /**
     * Get current input state
     */
    getState() {
      return JSON.parse(JSON.stringify({
        ...this.#state,
        visible: this.#isVisible,
        initialized: this.#isInitialized,
      }));
    }

    /**
     * Get normalized steering value (-1 to 1)
     */
    getSteering() {
      return this.#state.joystick.x;
    }

    /**
     * Get combined throttle/brake value (-1 to 1)
     */
    getThrottleBrake() {
      const throttle = this.#state.buttons.throttle.value;
      const brake = this.#state.buttons.brake.value;
      return throttle - brake;
    }

    /**
     * Check if specific action is active
     */
    isActionActive(action) {
      return this.#state.buttons[action]?.pressed ?? false;
    }

    /**
     * Update configuration at runtime
     */
    setOptions(options) {
      Object.assign(this.#config, options);
      this.#emit('optionschanged', { config: this.#config });
      return this;
    }

    /**
     * Trigger haptic feedback manually
     */
    vibrate(intensity = 'medium') {
      this.#triggerHaptic(intensity);
      return this;
    }

    /**
     * Clean up and remove from DOM
     */
    destroy() {
      if (!this.#isInitialized) return;

      if (this.#detectHandler) {
        document.removeEventListener('touchstart', this.#detectHandler);
        this.#detectHandler = null;
      }

      if (this.#container) {
        this.#container.remove();
        this.#container = null;
      }

      const styleEl = document.getElementById('touch-controls-styles');
      if (styleEl) {
        styleEl.remove();
      }

      this.#joystickZone = null;
      this.#joystickKnob = null;
      this.#joystickBase = null;
      this.#buttons = {};
      this.#state = createInitialState();
      this.#isVisible = false;
      this.#isInitialized = false;

      this.#emit('destroyed');
      
      if (this.#config.debugMode) {
        console.log('[TouchControls] Destroyed');
      }
    }

    /**
     * Subscribe to events
     */
    on(eventName, callback) {
      document.addEventListener(`touchcontrols:${eventName}`, (e) => callback(e.detail));
      return this;
    }

    // =========================================================================
    // PRIVATE METHODS
    // =========================================================================

    #triggerHaptic(intensity) {
      if (!this.#config.hapticsEnabled || !isHapticAvailable()) return;
      
      const durations = {
        light: this.#config.hapticLightDuration,
        medium: this.#config.hapticMediumDuration,
        heavy: this.#config.hapticHeavyDuration,
      };

      try {
        navigator.vibrate(durations[intensity] || durations.light);
      } catch (e) {
        if (this.#config.debugMode) {
          console.warn('[TouchControls] Haptic failed:', e.message);
        }
      }
    }

    #emit(eventName, detail = {}) {
      const event = new CustomEvent(`touch:${eventName}`, {
        bubbles: true,
        cancelable: true,
        detail,
      });
      
      if (this.#container) {
        this.#container.dispatchEvent(event);
      }
      
      document.dispatchEvent(new CustomEvent(`touchcontrols:${eventName}`, { detail }));
      
      if (this.#config.debugMode) {
        console.log(`[TouchControls] Event: touch:${eventName}`, detail);
      }
    }

    #updateState() {
      const state = this.getState();
      
      if (typeof this.#config.onStateChange === 'function') {
        this.#config.onStateChange(state);
      }
      
      this.#emit('statechange', state);
    }

    // =========================================================================
    // DOM CREATION
    // =========================================================================

    #injectStyles() {
      if (document.getElementById('touch-controls-styles')) return;
      
      const link = document.createElement('link');
      link.id = 'touch-controls-styles';
      link.rel = 'stylesheet';
      link.href = './ui/styles/touch-controls.css';
      
      link.onerror = () => {
        console.warn(
          '[TouchControls] External CSS failed to load. Some styles may be missing.'
        );
      };
      
      document.head.appendChild(link);
    }

    #createContainer() {
      const container = document.createElement('div');
      container.className = 'touch-controls-overlay';
      container.setAttribute('role', 'application');
      container.setAttribute('aria-label', 'Virtual game controls');
      
      const srText = document.createElement('span');
      srText.className = 'tc-sr-only';
      srText.textContent =
        'Touch controls interface. Left zone contains steering joystick. Right zone has acceleration, braking, drifting, and item use buttons.';
      container.appendChild(srText);
      
      return container;
    }

    #createJoystick() {
      const zone = document.createElement('div');
      zone.className = 'tc-joystick-zone initializing';
      zone.setAttribute('role', 'slider');
      zone.setAttribute('aria-label', 'Steering control');
      zone.setAttribute('aria-valuemin', '-1');
      zone.setAttribute('aria-valuemax', '1');
      zone.setAttribute('aria-valuenow', '0');
      zone.setAttribute('aria-valuetext', 'Centered');

      const base = document.createElement('div');
      base.className = 'tc-joystick-base';
      zone.appendChild(base);

      const hints = document.createElement('div');
      hints.className = 'tc-joystick-hints';
      hints.innerHTML = `
        <span class="hint-arrow up"></span>
        <span class="hint-arrow down"></span>
        <span class="hint-arrow left"></span>
        <span class="hint-arrow right"></span>
      `;
      zone.appendChild(hints);

      const knob = document.createElement('div');
      knob.className = 'tc-joystick-knob';
      knob.setAttribute('aria-hidden', 'true');
      zone.appendChild(knob);

      setTimeout(() => zone.classList.remove('initializing'), 600);

      return { zone, knob, base };
    }

    #createButton(actionId) {
      const action = ACTIONS[actionId];
      if (!action) {
        console.warn(`[TouchControls] Unknown action: ${actionId}`);
        return null;
      }

      const btn = document.createElement('button');
      btn.className = `tc-btn tc-btn--${action.variant}`;
      if (action.size === 'lg') btn.classList.add('tc-btn--lg');
      if (action.size === 'sm') btn.classList.add('tc-btn--sm');
      
      btn.dataset.action = actionId;
      btn.type = 'button';
      btn.setAttribute('aria-label', `${action.label} button`);
      btn.setAttribute('aria-pressed', 'false');

      const inner = document.createElement('span');
      inner.className = 'tc-btn-inner';

      if (ICONS[action.icon]) {
        const iconContainer = document.createElement('span');
        iconContainer.className = 'tc-btn-icon';
        iconContainer.innerHTML = ICONS[action.icon];
        inner.appendChild(iconContainer);
      }

      const label = document.createElement('span');
      label.className = 'tc-btn-label';
      label.textContent = action.label;
      inner.appendChild(label);

      btn.appendChild(inner);

      return btn;
    }

    #createSettingsToggle() {
      const wrapper = document.createElement('div');
      wrapper.className = 'tc-settings-toggle';

      const btn = document.createElement('button');
      btn.className = 'toggle-btn';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Toggle touch controls visibility');
      btn.innerHTML = ICONS.settings;

      btn.addEventListener('click', () => {
        this.toggleVisibility();
      });

      wrapper.appendChild(btn);
      return wrapper;
    }

    #buildUI() {
      this.#container = this.#createContainer();

      // Left side: Joystick
      const joystick = this.#createJoystick();
      this.#joystickZone = joystick.zone;
      this.#joystickKnob = joystick.knob;
      this.#joystickBase = joystick.base;
      this.#container.appendChild(joystick.zone);

      // Right side: Action buttons
      const rightZone = document.createElement('div');
      rightZone.className = 'tc-buttons-zone';

      const row1 = document.createElement('div');
      row1.className = 'tc-buttons-row';
      const accelBtn = this.#createButton('throttle');
      if (accelBtn) row1.appendChild(accelBtn);
      rightZone.appendChild(row1);

      const row2 = document.createElement('div');
      row2.className = 'tc-buttons-row';
      
      ['brake', 'drift', 'useItem'].forEach(actionId => {
        const btn = this.#createButton(actionId);
        if (btn) row2.appendChild(btn);
      });
      
      rightZone.appendChild(row2);
      this.#container.appendChild(rightZone);

      this.#buttons = {
        throttle: accelBtn,
        brake: row2.querySelector('[data-action="brake"]'),
        drift: row2.querySelector('[data-action="drift"]'),
        useItem: row2.querySelector('[data-action="useItem"]'),
      };

      // Top zone: Pause button
      const topZone = document.createElement('div');
      topZone.className = 'tc-top-zone';
      const pauseBtn = this.#createButton('pause');
      if (pauseBtn) topZone.appendChild(pauseBtn);
      this.#container.appendChild(topZone);
      this.#buttons.pause = pauseBtn;

      // Settings toggle
      const settingsToggle = this.#createSettingsToggle();
      this.#container.appendChild(settingsToggle);

      document.body.appendChild(this.#container);
    }

    // =========================================================================
    // EVENT HANDLERS
    // =========================================================================

    #setupJoystickHandlers() {
      const zone = this.#joystickZone;
      const knob = this.#joystickKnob;
      const config = this.#config;
      const state = this.#state;

      let centerX = 0;
      let centerY = 0;
      let animationFrameId = null;

      const self = this;

      const getEventPos = (e) => {
        if (e.touches && e.touches.length > 0) {
          return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
      };

      const updateKnobPosition = (rawX, rawY) => {
        const zoneRect = zone.getBoundingClientRect();
        const maxDist = Math.min(zoneRect.width, zoneRect.height) / 2 - knob.offsetWidth / 2;
        
        const dist = Math.sqrt(rawX * rawX + rawY * rawY);
        
        if (dist < config.deadzoneRadius) {
          rawX = 0;
          rawY = 0;
        } else {
          const scale = (dist - config.deadzoneRadius) / (maxDist - config.deadzoneRadius);
          const angleRad = Math.atan2(rawY, rawX);
          rawX = Math.cos(angleRad) * scale * maxDist;
          rawY = Math.sin(angleRad) * scale * maxDist;
        }
        
        const actualDist = Math.sqrt(rawX * rawX + rawY * rawY);
        if (actualDist > maxDist) {
          rawX = (rawX / actualDist) * maxDist;
          rawY = (rawY / actualDist) * maxDist;
        }
        
        knob.style.transform = `translate(calc(-50% + ${rawX}px), calc(-50% + ${rawY}px))`;

        const normalizedX = clamp((rawX / maxDist) * config.steerSensitivity, -1, 1);
        const normalizedY = clamp((rawY / maxDist) * config.steerSensitivity, -1, 1);
        
        state.joystick.x = lerp(state.joystick.x, normalizedX, 1 - config.smoothingFactor);
        state.joystick.y = lerp(state.joystick.y, normalizedY, 1 - config.smoothingFactor);
        state.joystick.rawX = rawX;
        state.joystick.rawY = rawY;
        state.joystick.angle = getAngle(0, 0, rawX, rawY);
        state.joystick.magnitude = Math.min(actualDist / maxDist, 1);

        zone.setAttribute('aria-valuenow', state.joystick.x.toFixed(2));
        zone.setAttribute('aria-valuetext', 
          `Steering: ${state.joystick.x > 0 ? 'Right' : state.joystick.x < 0 ? 'Left' : 'Center'} ${Math.abs(state.joystick.x * 100).toFixed(0)}%`
        );

        self.#emit('steer', {
          x: state.joystick.x,
          y: state.joystick.y,
          angle: state.joystick.angle,
          magnitude: state.joystick.magnitude,
        });

        if (typeof config.onJoystickMove === 'function') {
          config.onJoystickMove({
            x: state.joystick.x,
            y: state.joystick.y,
            angle: state.joystick.angle,
            magnitude: state.joystick.magnitude,
          });
        }
      };

      const resetKnob = () => {
        knob.classList.remove('active');
        knob.style.transform = 'translate(-50%, -50%)';
        
        state.joystick.active = false;
        state.joystick.x = 0;
        state.joystick.y = 0;
        state.joystick.rawX = 0;
        state.joystick.rawY = 0;
        state.joystick.angle = 0;
        state.joystick.magnitude = 0;
        state.joystick.pointerId = null;

        zone.setAttribute('aria-valuenow', '0');
        zone.setAttribute('aria-valuetext', 'Centered');

        self.#emit('steer', { x: 0, y: 0, angle: 0, magnitude: 0 });
        self.#updateState();
      };

      const handleStart = (e) => {
        if (state.joystick.active) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const pos = getEventPos(e);
        const zoneRect = zone.getBoundingClientRect();
        centerX = zoneRect.left + zoneRect.width / 2;
        centerY = zoneRect.top + zoneRect.height / 2;

        state.joystick.active = true;
        state.joystick.pointerId = e.pointerId ?? e.touches?.[0]?.identifier ?? Date.now();
        
        knob.classList.add('active');
        self.#triggerHaptic('light');
        
        updateKnobPosition(pos.x - centerX, pos.y - centerY);
        self.#updateState();
      };

      const handleMove = (e) => {
        if (!state.joystick.active) return;
        if (e.pointerId !== undefined && e.pointerId !== state.joystick.pointerId) return;
        
        e.preventDefault();
        e.stopPropagation();

        const pos = getEventPos(e);
        
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
        
        animationFrameId = requestAnimationFrame(() => {
          updateKnobPosition(pos.x - centerX, pos.y - centerY);
          self.#updateState();
          animationFrameId = null;
        });
      };

      const handleEnd = (e) => {
        if (!state.joystick.active) return;
        if (e.pointerId !== undefined && e.pointerId !== state.joystick.pointerId) return;
        
        e.preventDefault();
        resetKnob();
        self.#triggerHaptic('light');
      };

      // Touch events
      zone.addEventListener('touchstart', handleStart, { passive: false });
      zone.addEventListener('touchmove', handleMove, { passive: false });
      zone.addEventListener('touchend', handleEnd, { passive: false });
      zone.addEventListener('touchcancel', handleEnd, { passive: false });

      // Pointer events (multi-touch support)
      zone.addEventListener('pointerdown', handleStart, { passive: false });
      zone.addEventListener('pointermove', handleMove, { passive: false });
      zone.addEventListener('pointerup', handleEnd, { passive: false });
      zone.addEventListener('pointercancel', handleEnd, { passive: false });

      // Mouse fallback for testing
      let mouseJoystickActive = false;
      
      zone.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const zoneRect = zone.getBoundingClientRect();
        centerX = zoneRect.left + zoneRect.width / 2;
        centerY = zoneRect.top + zoneRect.height / 2;

        state.joystick.active = true;
        mouseJoystickActive = true;
        knob.classList.add('active');

        updateKnobPosition(e.clientX - centerX, e.clientY - centerY);
        self.#updateState();
      });

      window.addEventListener('mousemove', (e) => {
        if (!mouseJoystickActive || !state.joystick.active) return;
        updateKnobPosition(e.clientX - centerX, e.clientY - centerY);
        self.#updateState();
      });

      window.addEventListener('mouseup', () => {
        if (mouseJoystickActive && state.joystick.active) {
          mouseJoystickActive = false;
          resetKnob();
        }
      });
    }

    #setupButtonHandlers() {
      const self = this;
      
      Object.entries(this.#buttons).forEach(([actionId, btn]) => {
        if (!btn) return;

        const handlePressStart = (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          const wasPressed = self.#state.buttons[actionId].pressed;
          
          self.#state.buttons[actionId].pressed = true;
          self.#state.buttons[actionId].value = 1;
          
          btn.classList.add('pressed');
          btn.setAttribute('aria-pressed', 'true');
          
          if (e.touches) {
            createRipple(btn, e.touches[0].clientX, e.touches[0].clientY);
          } else if (e.clientX !== undefined) {
            createRipple(btn, e.clientX, e.clientY);
          }
          
          if (!wasPressed) {
            self.#triggerHaptic('medium');
          }
          
          const eventName = actionId.toLowerCase();
          self.#emit(eventName, { action: actionId, pressed: true, value: 1 });
          self.#emit('buttonpress', { action: actionId, pressed: true });
          
          if (actionId === 'throttle') {
            self.#emit('accelerate', { action: actionId, pressed: true, value: 1 });
          }
          
          if (typeof self.#config.onButtonPress === 'function') {
            self.#config.onButtonPress({ action: actionId, pressed: true });
          }
          
          self.#updateState();
        };

        const handlePressEnd = (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          self.#state.buttons[actionId].pressed = false;
          self.#state.buttons[actionId].value = 0;
          
          btn.classList.remove('pressed');
          btn.setAttribute('aria-pressed', 'false');
          
          self.#triggerHaptic('light');
          
          const eventName = actionId.toLowerCase();
          self.#emit(eventName, { action: actionId, pressed: false, value: 0 });
          self.#emit('buttonrelease', { action: actionId, pressed: false });
          
          if (actionId === 'throttle') {
            self.#emit('accelerate', { action: actionId, pressed: false, value: 0 });
          }
          
          self.#updateState();
        };

        // Touch events
        btn.addEventListener('touchstart', handlePressStart, { passive: false });
        btn.addEventListener('touchend', handlePressEnd, { passive: false });
        btn.addEventListener('touchcancel', handlePressEnd, { passive: false });

        // Pointer events
        btn.addEventListener('pointerdown', handlePressStart, { passive: false });
        btn.addEventListener('pointerup', handlePressEnd, { passive: false });
        btn.addEventListener('pointercancel', handlePressEnd, { passive: false });
        btn.addEventListener('pointerleave', (e) => {
          if (self.#state.buttons[actionId].pressed) {
            handlePressEnd(e);
          }
        }, { passive: false });

        // Mouse fallback
        btn.addEventListener('mousedown', handlePressStart);
        btn.addEventListener('mouseup', handlePressEnd);
        btn.addEventListener('mouseleave', (e) => {
          if (self.#state.buttons[actionId].pressed) {
            handlePressEnd(e);
          }
        });
      });
    }

    #setupGesturePrevention() {
      if (this.#container) {
        this.#container.addEventListener('touchmove', (e) => {
          e.preventDefault();
        }, { passive: false });
      }
    }
  }

  // =========================================================================
  // SINGLETON & EXPORTS
  // =========================================================================

  let instance = null;

  function getInstance(options = {}) {
    if (!instance) {
      instance = new TouchControlsClass(options);
    } else if (Object.keys(options).length > 0) {
      instance.setOptions(options);
    }
    return instance;
  }

  return {
    VERSION,
    TouchControls: TouchControlsClass,
    getInstance,
    isTouchDevice,
    isHapticAvailable,
    DEFAULT_CONFIG: { ...DEFAULT_CONFIG },
    ACTIONS: { ...ACTIONS },
  };
})();

// Export for module environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TouchControls;
}

// Auto-initialize when loaded as script tag with data-auto-init attribute
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const el = document.querySelector('script[data-touch-controls]');
    if (el && el.getAttribute('data-auto-init') !== 'false') {
      const opts = {};
      if (el.hasAttribute('data-debug')) opts.debugMode = true;
      if (el.hasAttribute('data-no-haptics')) opts.hapticsEnabled = false;
      TouchControls.getInstance(opts).init();
    }
  });
}
