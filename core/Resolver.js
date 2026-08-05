// core/Resolver.js
// IMMUTABLE CORE — THE GUARD. Every barrel component registers here. Schema-validated.
// Anti-alien-design: a component that doesn't match its schema is REJECTED at boot.
//   - The game still boots.
//   - The rejection is emitted as 'resolver:rejected' on the EventBus.
//   - The diagnostics overlay shows it.
//   - The bad component simply doesn't appear in menus.

import { EventBus } from './EventBus.js';
import { SchemaValidator } from './SchemaValidator.js';

export class Resolver {
  constructor() {
    this._schemas = new Map();      // category -> schema object
    this._registry = new Map();     // `${category}:${id}` -> { entry, module, category, id }
    this._byCategory = new Map();   // category -> Set<id>
  }

  registerSchema(category, schema) {
    this._schemas.set(category, schema);
  }

  /**
   * Register a component. Validates entry against schema, validates module's interface.
   * @returns {boolean} true if accepted
   */
  register(category, entry, module) {
    const schema = this._schemas.get(category);
    if (!schema) {
      EventBus.emit('resolver:rejected', { category, entry, errors: [`Unknown category "${category}"`] });
      return false;
    }

    // Validate entry data
    const { ok, errors } = SchemaValidator.validate(entry, schema);
    if (!ok) {
      EventBus.emit('resolver:rejected', { category, entry, errors });
      return false;
    }

    // Validate module's exported interface
    const requiredInterface = schema.requiredInterface || [];
    const missing = requiredInterface.filter(fn => typeof module[fn] !== 'function');
    if (missing.length > 0) {
      EventBus.emit('resolver:rejected', { category, entry, errors: [`Module missing interface: ${missing.join(', ')}`] });
      return false;
    }

    const id = entry.id;
    const key = `${category}:${id}`;
    this._registry.set(key, { entry, module, category, id });
    if (!this._byCategory.has(category)) this._byCategory.set(category, new Set());
    this._byCategory.get(category).add(id);
    EventBus.emit('resolver:registered', { category, id });
    return true;
  }

  resolve(category, id) {
    const hit = this._registry.get(`${category}:${id}`);
    if (!hit) {
      EventBus.emit('resolver:missing', { category, id });
      return null;
    }
    return hit;
  }

  /**
   * List all registered entries in a category.
   * Optional filter fn narrows by entry field.
   */
  list(category, filterFn = null) {
    const ids = this._byCategory.get(category);
    if (!ids) return [];
    const out = [];
    for (const id of ids) {
      const hit = this._registry.get(`${category}:${id}`);
      if (!hit) continue;
      if (filterFn && !filterFn(hit.entry)) continue;
      out.push(hit.entry);
    }
    return out;
  }

  /**
   * Resolve all registered entries in a category as {entry, module} pairs.
   */
  listWithModules(category) {
    const ids = this._byCategory.get(category);
    if (!ids) return [];
    const out = [];
    for (const id of ids) {
      const hit = this._registry.get(`${category}:${id}`);
      if (hit) out.push(hit);
    }
    return out;
  }

  has(category, id) {
    return this._registry.has(`${category}:${id}`);
  }

  stats() {
    const out = {};
    for (const [cat, ids] of this._byCategory) out[cat] = ids.size;
    return out;
  }
}

export const resolver = new Resolver();
