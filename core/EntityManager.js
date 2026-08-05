// core/EntityManager.js
// IMMUTABLE CORE — spawns/despawns entities. An entity = { id, type, module, data, sceneObject, physicsBody }.
// Generic; doesn't know about vehicles or characters. Just tracks what's alive.

import { EventBus } from './EventBus.js';

export class EntityManager {
  constructor() {
    this._entities = new Map();
    this._nextId = 1;
  }

  spawn(type, module, initData = {}) {
    const id = this._nextId++;
    const entity = {
      id, type, module,
      data: { ...initData },
      sceneObject: null,
      physicsBody: null,
      meta: {},
      spawnedAt: performance.now()
    };
    this._entities.set(id, entity);
    // The calling scene is responsible for calling the module's spawn() to populate sceneObject / physicsBody
    EventBus.emit('entity:spawned', { id, type });
    return entity;
  }

  despawn(id) {
    const e = this._entities.get(id);
    if (!e) return;
    if (e.module?.despawn) {
      try { e.module.despawn(e); } catch (err) { console.error('[EntityManager] despawn threw', err); }
    }
    this._entities.delete(id);
    EventBus.emit('entity:despawned', { id, type: e.type });
  }

  get(id) { return this._entities.get(id); }

  all(filterFn = null) {
    const out = [];
    for (const e of this._entities.values()) {
      if (filterFn && !filterFn(e)) continue;
      out.push(e);
    }
    return out;
  }

  byType(type) {
    return this.all(e => e.type === type);
  }

  clear() {
    for (const id of [...this._entities.keys()]) this.despawn(id);
  }
}

export const entityManager = new EntityManager();
