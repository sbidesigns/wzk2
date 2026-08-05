// barrel/controllers/controller.keyboard.js
// Keyboard is handled natively by core/InputManager (it always reads window keydown/keyup).
// This module exists to satisfy the controller schema (registration + activation lifecycle)
// and to provide UI affordances (e.g. showing "Press SPACE to drift" hints).

export function activate(inputManager) {
  // Keyboard is always listening; nothing extra to do.
  inputManager.ctx?.engine?.bus?.emit('controller:activated', { id: 'keyboard' });
}
export function deactivate(inputManager) {
  inputManager.ctx?.engine?.bus?.emit('controller:deactivated', { id: 'keyboard' });
}
export function poll(inputManager, dt) {
  // Keyboard state is updated via window event listeners; no polling needed.
}
export default { activate, deactivate, poll };
