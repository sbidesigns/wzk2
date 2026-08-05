// core/EventBus.js
// IMMUTABLE CORE — do not edit per-feature. This file is the only cross-system comm channel.
// Why: decouples systems. A vehicle doesn't know about the HUD; it just emits 'vehicle:boost'.
// Implemented as a static-method class so any caller can use EventBus.emit() without an instance.

export class EventBus {
  static _handlers = new Map();          // event -> Set<fn>
  static _onceWrappers = new Map();      // fn -> wrappedFn (for cleanup)
  static _history = [];                  // last N events for diagnostics
  static _maxHistory = 200;

  static on(event, handler) {
    if (typeof handler !== 'function') throw new Error(`EventBus.on(${event}): handler must be a function`);
    if (!EventBus._handlers.has(event)) EventBus._handlers.set(event, new Set());
    EventBus._handlers.get(event).add(handler);
    return () => EventBus.off(event, handler);
  }

  static once(event, handler) {
    const wrapper = (payload) => {
      EventBus.off(event, wrapper);
      handler(payload);
    };
    EventBus._onceWrappers.set(handler, wrapper);
    return EventBus.on(event, wrapper);
  }

  static off(event, handler) {
    const set = EventBus._handlers.get(event);
    if (!set) return;
    const actual = EventBus._onceWrappers.get(handler) || handler;
    set.delete(actual);
    EventBus._onceWrappers.delete(handler);
  }

  static emit(event, payload) {
    EventBus._history.push({ event, payload, t: performance.now() });
    if (EventBus._history.length > EventBus._maxHistory) EventBus._history.shift();

    const set = EventBus._handlers.get(event);
    if (!set) return;
    for (const handler of [...set]) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[EventBus] handler for "${event}" threw:`, err);
      }
    }
  }

  static clear() {
    EventBus._handlers.clear();
    EventBus._onceWrappers.clear();
  }

  static getHistory() {
    return [...EventBus._history];
  }
}

// Backwards-compat: also export a singleton instance for code that prefers that style
export const eventBus = EventBus;
