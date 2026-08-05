// core/SceneManager.js
// IMMUTABLE CORE — lifecycle for 3D scenes (race, cutscene, boot).
// UI screens are separate (handled by ui-router.js); this is for the 3D canvas layer.

import { EventBus } from './EventBus.js';

export class SceneManager {
  constructor() {
    this._current = null;        // { module, instance, payload }
    this._transitioning = false;
  }

  async transition(sceneEntry, payload = {}) {
    if (this._transitioning) {
      console.warn('[SceneManager] transition requested while another in progress; ignoring');
      return;
    }
    this._transitioning = true;
    EventBus.emit('scene:transitionStart', { to: sceneEntry.id, from: this._current?.module?.id });

    // Unmount current
    if (this._current) {
      try {
        await this._current.instance.unmount();
      } catch (err) {
        console.error('[SceneManager] unmount threw', err);
      }
      this._current = null;
    }

    // Mount new
    const instance = sceneEntry.module;
    if (!instance?.mount) {
      console.error('[SceneManager] scene module missing mount()', sceneEntry);
      this._transitioning = false;
      return;
    }
    try {
      await instance.mount(payload);
    } catch (err) {
      console.error('[SceneManager] mount threw', err);
    }
    this._current = { module: sceneEntry, instance, payload };
    EventBus.emit('scene:transitionEnd', { to: sceneEntry.id });
    this._transitioning = false;
  }

  update(dt) {
    if (this._current?.instance?.update) {
      try { this._current.instance.update(dt); } catch (err) { console.error('[SceneManager] update threw', err); }
    }
  }

  getCurrent() { return this._current; }
}

export const sceneManager = new SceneManager();
