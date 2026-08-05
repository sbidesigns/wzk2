// core/InputManager.js
// IMMUTABLE CORE — normalizes keyboard / mouse / gamepad / touch into a single action stream.
// Bindings come from config/input.config.json. Controllers register through barrel/controllers/.

import { EventBus } from './EventBus.js';

export class InputManager {
  constructor() {
    this._bindings = null;          // from input.config.json
    this._controllers = new Map();  // platform -> controller module instance
    this._activeControllers = new Set();
    this._actionState = new Map();  // actionId -> { pressed, value (0..1 for axes) }
    this._actionJustPressed = new Set();
    this._actionJustReleased = new Set();
    this._pollBound = this._poll.bind(this);
    this._running = false;
    this._onScreenUI = false;
  }

  init(config) {
    this._bindings = config;
    // Built-in keyboard listener (always active)
    this._setupKeyboard();
    this._setupGamepadPolling();
    this._setupTouchDetection();
  }

  registerController(platform, controllerModule) {
    this._controllers.set(platform, controllerModule);
    if (controllerModule.activate && this._shouldAutoActivate(platform)) {
      controllerModule.activate(this);
      this._activeControllers.add(platform);
    }
  }

  _shouldAutoActivate(platform) {
    const cfg = this._bindings?.controllers?.[platform];
    return cfg?.enabled !== false;
  }

  _setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (this._onScreenUI && e.code === 'Tab') e.preventDefault();
      this._applyKeyboardEvent(e.code, true);
    });
    window.addEventListener('keyup', (e) => this._applyKeyboardEvent(e.code, false));
  }

  _applyKeyboardEvent(code, pressed) {
    const kbd = this._bindings?.controllers?.keyboard;
    if (!kbd?.enabled) return;
    for (const [action, codes] of Object.entries(kbd.defaultBindings)) {
      if (!Array.isArray(codes)) continue;
      if (codes.includes(code)) {
        this._setAction(action, pressed ? 1 : 0, pressed);
      }
    }
  }

  _setupGamepadPolling() {
    // Gamepad polling happens in main loop via _poll()
    window.addEventListener('gamepadconnected', (e) => {
      EventBus.emit('input:gamepadConnected', { index: e.gamepad.index, id: e.gamepad.id });
    });
    window.addEventListener('gamepaddisconnected', (e) => {
      EventBus.emit('input:gamepadDisconnected', { index: e.gamepad.index, id: e.gamepad.id });
    });
  }

  _setupTouchDetection() {
    let detected = false;
    const detect = () => {
      if (detected) return;
      if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        detected = true;
        EventBus.emit('input:touchDetected');
        const touch = this._controllers.get('touch');
        if (touch?.activate) {
          touch.activate(this);
          this._activeControllers.add('touch');
        }
      }
    };
    detect();
    window.addEventListener('touchstart', detect, { once: true });
  }

  startPolling() {
    if (this._running) return;
    this._running = true;
    requestAnimationFrame(this._pollBound);
  }

  stopPolling() {
    this._running = false;
  }

  _poll() {
    if (!this._running) return;
    // Just-pressed/released flags are consumed at end of frame by Engine
    requestAnimationFrame(this._pollBound);
  }

  // Called by Engine after each frame to clear just-pressed/released
  endFrame() {
    this._actionJustPressed.clear();
    this._actionJustReleased.clear();
  }

  // Public API for controllers / gameplay
  _setAction(action, value, pressed) {
    const prev = this._actionState.get(action) || { pressed: false, value: 0 };
    if (pressed && !prev.pressed) this._actionJustPressed.add(action);
    if (!pressed && prev.pressed) this._actionJustReleased.add(action);
    this._actionState.set(action, { pressed, value });
    if (pressed) EventBus.emit(`input:action:${action}`, { action, value });
  }

  // Public: set an action from any controller (gamepad, touch, AI)
  setAction(action, value) {
    const pressed = value > 0.05;
    this._setAction(action, value, pressed);
  }

  // Public: set an axis action (e.g. steer) with a continuous value
  setAxis(action, value) {
    const prev = this._actionState.get(action) || { pressed: false, value: 0 };
    this._actionState.set(action, { pressed: Math.abs(value) > 0.05, value });
    if (Math.abs(value) > 0.05 && !prev.pressed) this._actionJustPressed.add(action);
    if (Math.abs(value) <= 0.05 && prev.pressed) this._actionJustReleased.add(action);
  }

  isPressed(action) {
    return (this._actionState.get(action)?.pressed) || false;
  }

  wasJustPressed(action) {
    return this._actionJustPressed.has(action);
  }

  wasJustReleased(action) {
    return this._actionJustReleased.has(action);
  }

  getAxis(action) {
    return this._actionState.get(action)?.value || 0;
  }

  // For UI navigation: poll gamepad buttons via standard mapping
  pollGamepadForUI() {
    const pads = navigator.getGamepads?.() || [];
    for (const pad of pads) {
      if (!pad) continue;
      const btn = (i) => pad.buttons[i]?.pressed ? 1 : 0;
      const axis = (i) => pad.axes[i] || 0;

      // Standard gamepad mapping
      this.setAction('throttle', btn(7));
      this.setAction('brake', btn(6));
      this.setAxis('steerLeft', axis(0) < -0.2 ? -axis(0) : 0);
      this.setAxis('steerRight', axis(0) > 0.2 ? axis(0) : 0);
      if (btn(0)) this.setAction('confirm', 1);
      if (btn(1)) this.setAction('back', 1);
      if (btn(9)) this.setAction('pause', 1);
    }
  }

  setOnScreenUI(on) {
    this._onScreenUI = on;
  }
}

export const inputManager = new InputManager();
