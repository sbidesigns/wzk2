// barrel/controllers/controller.touch.js
// Renders on-screen touch controls. Activated only when touch is detected.

export function activate(inputManager) {
  this._active = true;
  this._container = document.createElement('div');
  this._container.id = 'touch-controls';
  this._container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:50;display:none';
  document.body.appendChild(this._container);

  const layout = inputManager._bindings?.controllers?.touch?.layout || {
    leftSide: ['steerLeft', 'steerRight'],
    rightSide: ['throttle', 'brake', 'drift', 'useItem']
  };
  const size = inputManager._bindings?.controllers?.touch?.buttonSize || 96;
  const opacity = inputManager._bindings?.controllers?.touch?.opacity || 0.55;

  // Left side: steer
  const leftGroup = document.createElement('div');
  leftGroup.style.cssText = `position:absolute;left:24px;bottom:24px;display:flex;gap:12px;pointer-events:auto`;
  for (const action of layout.leftSide) {
    leftGroup.appendChild(this._makeButton(action, size, opacity, inputManager));
  }
  this._container.appendChild(leftGroup);

  // Right side: action buttons
  const rightGroup = document.createElement('div');
  rightGroup.style.cssText = `position:absolute;right:24px;bottom:24px;display:flex;gap:12px;pointer-events:auto`;
  for (const action of layout.rightSide) {
    rightGroup.appendChild(this._makeButton(action, size, opacity, inputManager));
  }
  this._container.appendChild(rightGroup);

  this._container.style.display = 'block';
  inputManager.ctx?.engine?.bus?.emit('controller:activated', { id: 'touch' });
}

export function deactivate(inputManager) {
  this._active = false;
  if (this._container) {
    this._container.remove();
    this._container = null;
  }
  inputManager.ctx?.engine?.bus?.emit('controller:deactivated', { id: 'touch' });
}

export function poll(inputManager, dt) { /* no-op; touch events are immediate */ }

// Internal helper exposed as export for module-internal use
function _makeButton(action, size, opacity, inputManager) {
  const btn = document.createElement('div');
  btn.dataset.action = action;
  btn.style.cssText = `
    width:${size}px;height:${size}px;border-radius:50%;
    background:rgba(255,255,255,${opacity});border:2px solid rgba(255,255,255,0.4);
    display:flex;align-items:center;justify-content:center;
    color:#fff;font:600 11px 'Inter',sans-serif;text-transform:uppercase;
    user-select:none;-webkit-user-select:none;touch-action:none;
    backdrop-filter:blur(4px);
  `;
  btn.textContent = action.replace(/([A-Z])/g, ' $1').replace('steer', '');
  const press = (e) => {
    e.preventDefault();
    inputManager.setAction(action, 1);
    btn.style.background = 'rgba(255,77,46,0.7)';
  };
  const release = (e) => {
    e.preventDefault();
    inputManager.setAction(action, 0);
    btn.style.background = `rgba(255,255,255,${opacity})`;
  };
  btn.addEventListener('touchstart', press, { passive: false });
  btn.addEventListener('touchend', release, { passive: false });
  btn.addEventListener('touchcancel', release, { passive: false });
  btn.addEventListener('mousedown', press);
  btn.addEventListener('mouseup', release);
  btn.addEventListener('mouseleave', release);
  return btn;
}

// Export for the activate() closure above
activate._makeButton = _makeButton;

export default { activate, deactivate, poll };
