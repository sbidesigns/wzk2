// ui/ui-router.js
// Manages the screen navigation stack. Push/pop/replace.
// Each navigation triggers a transition orchestrated by ui-shell.js.

import { EventBus } from '../core/EventBus.js';

export class UIRouter {
  constructor() {
    this._stack = [];             // [{ screenId, payload, module, element }]
    this._screenGraph = null;     // from ui.config.json
    this._manifests = new Map();  // screenId -> manifest entry (with module reference)
    this._transitioning = false;
  }

  init(screenGraph, screenManifests) {
    this._screenGraph = screenGraph;
    for (const entry of screenManifests) {
      this._manifests.set(entry.id, entry);
    }
  }

  /**
   * Navigate to a screen by id. Pushes onto the stack.
   */
  async push(screenId, payload = {}) {
    if (this._transitioning) return;
    const node = this._screenGraph[screenId];
    if (!node) { console.error(`UIRouter.push: unknown screen "${screenId}"`); return; }
    const manifestEntry = this._manifests.get(screenId);
    if (!manifestEntry) { console.error(`UIRouter.push: no manifest entry for "${screenId}"`); return; }

    this._transitioning = true;
    EventBus.emit('router:navigateStart', { to: screenId, from: this._stack[this._stack.length - 1]?.screenId });

    const fromEntry = this._stack[this._stack.length - 1];
    if (fromEntry?.module?.unmount) {
      try { await fromEntry.module.unmount(fromEntry.element, fromEntry.payload); } catch (e) { console.error(e); }
      if (fromEntry.element) fromEntry.element.remove();
    }

    const element = document.createElement('div');
    element.className = `screen-mount screen-${screenId.replace(/\./g, '-')} entering`;
    element.dataset.screenId = screenId;
    document.getElementById('screen-mount-point').appendChild(element);

    try {
      await manifestEntry.module.mount(element, payload, { router: this, node, manifestEntry });
    } catch (e) {
      console.error(`UIRouter: screen "${screenId}" mount threw`, e);
    }

    // Remove entering class after animation
    setTimeout(() => element.classList.remove('entering'), 900);

    this._stack.push({ screenId, payload, module: manifestEntry.module, element, node });
    EventBus.emit('router:navigateEnd', { to: screenId });
    this._transitioning = false;
  }

  /**
   * Pop the top screen. Returns to the previous.
   */
  async pop() {
    if (this._transitioning) return;
    if (this._stack.length <= 1) return;
    this._transitioning = true;
    const fromEntry = this._stack.pop();
    EventBus.emit('router:navigateStart', { to: this._stack[this._stack.length - 1].screenId, from: fromEntry.screenId, pop: true });

    if (fromEntry.module?.unmount) {
      try { await fromEntry.module.unmount(fromEntry.element, fromEntry.payload); } catch (e) { console.error(e); }
    }
    if (fromEntry.element) {
      fromEntry.element.classList.add('leaving');
      setTimeout(() => fromEntry.element.remove(), 900);
    }

    // Re-mount previous (it was unmounted when navigated away). Actually, with our model, we always unmount on push, so we need to re-mount on pop.
    const toEntry = this._stack[this._stack.length - 1];
    const element = document.createElement('div');
    element.className = `screen-mount screen-${toEntry.screenId.replace(/\./g, '-')} entering`;
    element.dataset.screenId = toEntry.screenId;
    document.getElementById('screen-mount-point').appendChild(element);
    try {
      await toEntry.module.mount(element, toEntry.payload, { router: this, node: toEntry.node, manifestEntry: this._manifests.get(toEntry.screenId) });
    } catch (e) { console.error(`UIRouter: re-mount threw`, e); }
    toEntry.element = element;
    setTimeout(() => element.classList.remove('entering'), 900);

    EventBus.emit('router:navigateEnd', { to: toEntry.screenId, pop: true });
    this._transitioning = false;
  }

  /**
   * Replace the top screen (no back stack change).
   */
  async replace(screenId, payload = {}) {
    if (this._transitioning) return;
    if (this._stack.length === 0) return this.push(screenId, payload);
    this._transitioning = true;
    const fromEntry = this._stack[this._stack.length - 1];
    if (fromEntry.module?.unmount) {
      try { await fromEntry.module.unmount(fromEntry.element, fromEntry.payload); } catch (e) { console.error(e); }
    }
    if (fromEntry.element) fromEntry.element.remove();

    const node = this._screenGraph[screenId];
    const manifestEntry = this._manifests.get(screenId);
    const element = document.createElement('div');
    element.className = `screen-mount screen-${screenId.replace(/\./g, '-')} entering`;
    document.getElementById('screen-mount-point').appendChild(element);
    try {
      await manifestEntry.module.mount(element, payload, { router: this, node, manifestEntry });
    } catch (e) { console.error(e); }
    setTimeout(() => element.classList.remove('entering'), 900);
    this._stack[this._stack.length - 1] = { screenId, payload, module: manifestEntry.module, element, node };
    this._transitioning = false;
  }

  /**
   * Pop back to the root (main-menu).
   */
  async popToRoot() {
    while (this._stack.length > 1) await this.pop();
  }

  current() { return this._stack[this._stack.length - 1]; }
  stack() { return [...this._stack]; }
}

export const uiRouter = new UIRouter();
