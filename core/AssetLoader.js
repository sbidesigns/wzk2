// core/AssetLoader.js
// IMMUTABLE CORE — manifest-driven asset loading. GLTF, textures, audio, fonts.
// Why: the AssetLoader is generic; per-asset-type behavior is registered, not hardcoded.

import { EventBus } from './EventBus.js';

export class AssetLoader {
  constructor() {
    this._loaders = new Map();    // type -> async loader fn(url, opts) => asset
    this._cache = new Map();      // url -> { asset, promise }
    this._stats = { loaded: 0, failed: 0, bytes: 0 };
  }

  registerLoader(type, loaderFn) {
    if (typeof loaderFn !== 'function') throw new Error(`AssetLoader.registerLoader: loaderFn must be a function`);
    this._loaders.set(type, loaderFn);
  }

  async load(type, url, opts = {}) {
    const cacheKey = `${type}::${url}`;
    if (this._cache.has(cacheKey)) {
      const entry = this._cache.get(cacheKey);
      return entry.promise;
    }
    const loader = this._loaders.get(type);
    if (!loader) {
      const err = new Error(`AssetLoader: no loader registered for type "${type}"`);
      EventBus.emit('asset:failed', { type, url, error: err.message });
      throw err;
    }
    const promise = Promise.resolve().then(() => loader(url, opts))
      .then(asset => {
        this._stats.loaded++;
        EventBus.emit('asset:loaded', { type, url });
        return asset;
      })
      .catch(err => {
        this._stats.failed++;
        EventBus.emit('asset:failed', { type, url, error: err.message });
        throw err;
      });
    this._cache.set(cacheKey, { promise });
    return promise;
  }

  async loadManifest(manifest) {
    // manifest: { type: url | [{url, ...opts}] }
    const entries = [];
    for (const [type, urls] of Object.entries(manifest)) {
      const list = Array.isArray(urls) ? urls : [urls];
      for (const item of list) {
        const url = typeof item === 'string' ? item : item.url;
        const opts = typeof item === 'string' ? {} : item;
        entries.push({ type, url, opts });
      }
    }
    const results = await Promise.allSettled(entries.map(e => this.load(e.type, e.url, e.opts)));
    return results.map((r, i) => ({ ...entries[i], status: r.status, value: r.value, reason: r.reason }));
  }

  getStats() {
    return { ...this._stats, cached: this._cache.size };
  }
}

export const assetLoader = new AssetLoader();
