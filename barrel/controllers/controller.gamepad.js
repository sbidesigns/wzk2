// barrel/controllers/controller.gamepad.js
// Polls navigator.getGamepads() and feeds normalized actions into InputManager.

export function activate(inputManager) {
  this._active = true;
  inputManager.ctx?.engine?.bus?.emit('controller:activated', { id: 'gamepad' });
}
export function deactivate(inputManager) {
  this._active = false;
  inputManager.ctx?.engine?.bus?.emit('controller:deactivated', { id: 'gamepad' });
}
export function poll(inputManager, dt) {
  if (!this._active) return;
  // The actual gamepad polling is handled by InputManager.pollGamepadForUI()
  // which runs every frame. This module's poll is a no-op hook for future
  // per-platform vibration / LED effects.
}
export default { activate, deactivate, poll };
