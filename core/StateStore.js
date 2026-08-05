// core/StateStore.js
// IMMUTABLE CORE — reactive state tree. Components subscribe to slices; never to the whole tree.
// Why: prevents the "every file rereads the whole world" anti-pattern. Selectors scope reads.

export class StateStore {
  constructor(initial = {}) {
    this._state = structuredClone(initial);
    this._subscribers = new Map();     // path -> Set<(newValue, oldValue)>
    this._globalSubscribers = new Set();
  }

  get(path = '') {
    if (!path) return this._state;
    return this._getByPath(this._state, path);
  }

  set(path, value) {
    const oldValue = this._getByPath(this._state, path);
    this._setByPath(this._state, path, value);
    // Notify exact-path subscribers
    const set = this._subscribers.get(path);
    if (set) for (const fn of [...set]) fn(value, oldValue);
    // Notify global subscribers
    for (const fn of [...this._globalSubscribers]) fn(this._state, path, value);
  }

  patch(partial) {
    for (const [key, value] of Object.entries(partial)) {
      this.set(key, value);
    }
  }

  subscribe(path, handler) {
    if (!this._subscribers.has(path)) this._subscribers.set(path, new Set());
    this._subscribers.get(path).add(handler);
    return () => this._subscribers.get(path)?.delete(handler);
  }

  subscribeAll(handler) {
    this._globalSubscribers.add(handler);
    return () => this._globalSubscribers.delete(handler);
  }

  _getByPath(obj, path) {
    const parts = path.split('.');
    let cur = obj;
    for (const p of parts) {
      if (cur == null) return undefined;
      cur = cur[p];
    }
    return cur;
  }

  _setByPath(obj, path, value) {
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (cur[parts[i]] == null || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }
}

export const stateStore = new StateStore();
