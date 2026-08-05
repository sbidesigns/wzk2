// core/Engine.js
// IMMUTABLE CORE — bootstrap. Wires every subsystem in deterministic order.
// This is the only file main.js needs to import (besides vendor loader and barrel registration).

import { EventBus } from './EventBus.js';
import { StateStore } from './StateStore.js';
import { Resolver } from './Resolver.js';
import { SchemaValidator } from './SchemaValidator.js';
import { AssetLoader } from './AssetLoader.js';
import { InputManager } from './InputManager.js';
import { Renderer } from './Renderer.js';
import { PhysicsWorld } from './PhysicsWorld.js';
import { AudioManager } from './AudioManager.js';
import { EntityManager } from './EntityManager.js';
import { SceneManager } from './SceneManager.js';

class Engine {
  constructor() {
    this.bus = EventBus; // Use class directly (EventBus uses static methods)
    this.state = new StateStore();
    this.resolver = new Resolver();
    this.schema = SchemaValidator;
    this.assets = new AssetLoader();
    this.input = new InputManager();
    this.renderer = new Renderer();
    this.physics = new PhysicsWorld();
    this.audio = new AudioManager();
    this.entities = new EntityManager();
    this.scenes = new SceneManager();

    this._running = false;
    this._lastFrameTime = 0;
    this._frameCount = 0;
    this._diagnostics = { fps: 0, frameTime: 0, physicsSteps: 0 };
    this._vendorVersions = {};
  }

  /**
   * Boot the engine. Order is critical:
   *   1. Load configs
   *   2. Init subsystems (renderer, physics, audio, input)
   *   3. Register schemas
   *   4. Register asset loaders
   *   5. Load barrel manifests (resolver registers components)
   *   6. Wire event listeners
   *   7. Start main loop
   */
  async boot({ engineConfig, gameConfig, uiConfig, inputConfig, schemas, vendorVersions, features }) {
    this._vendorVersions = vendorVersions || {};
    this._features = features || {};
    
    // Store configs with fallbacks for missing values
    this.state.set('engine.config', engineConfig || {});
    this.state.set('game.config', gameConfig || {});
    this.state.set('ui.config', uiConfig || {});
    this.state.set('input.config', inputConfig || {});

    this.bus.emit('engine:bootStart');

    // 1. Subsystems with error handling
    try {
      await this.renderer.init(engineConfig?.renderer || {});
      await this.renderer.setupPostFx();
    } catch (err) {
      console.warn('[Engine] Renderer initialization issue:', err.message);
      // Continue without renderer - may be headless mode
    }
    
    try {
      await this.physics.init(engineConfig?.physics || {});
    } catch (err) {
      console.warn('[Engine] Physics initialization issue:', err.message);
      // Continue without physics - UI-only mode
    }
    
    try {
      await this.audio.init(engineConfig?.audio || {});
    } catch (err) {
      console.warn('[Engine] Audio initialization issue:', err.message);
      // Continue without audio - silent mode
    }
    
    try {
      this.input.init(inputConfig || {});
    } catch (err) {
      console.warn('[Engine] Input initialization issue:', err.message);
    }

    // 2. Schemas
    for (const [category, schema] of Object.entries(schemas)) {
      this.resolver.registerSchema(category, schema);
    }

    // 3. Asset loaders (texture, gltf, audio are registered by main.js after vendor modules ready)

    // 4. Diagnostics overlay (always available, toggled via config)
    if (engineConfig.diagnostics?.showOverlay) {
      this._setupDiagnostics();
    }

    // 5. Track resolver events for diagnostics
    this.bus.on('resolver:rejected', ({ category, entry, errors }) => {
      console.warn(`[Resolver] REJECTED ${category}:${entry?.id || '<unknown>'}`, errors);
    });
    this.bus.on('resolver:missing', ({ category, id }) => {
      console.warn(`[Resolver] MISSING ${category}:${id}`);
    });

    this.bus.emit('engine:bootComplete', { vendor: this._vendorVersions });
    return this;
  }

  /**
   * Load and register all barrel components.
   * Called by main.js after boot. Walks each manifest, dynamic-imports each module, registers.
   */
  async loadBarrel(barrelRoot, manifestPaths) {
    const results = { registered: 0, rejected: 0, byCategory: {} };
    for (const { category, manifestPath } of manifestPaths) {
      try {
        // Resolve manifest path to an absolute URL so it can be used as a base for module paths
        const absoluteManifestUrl = new URL(manifestPath, document.baseURI).href;
        const resp = await fetch(absoluteManifestUrl);
        if (!resp.ok) { console.warn(`[Barrel] ${manifestPath} returned ${resp.status}`); continue; }
        const manifest = await resp.json();
        const entries = manifest.entries || [];
        results.byCategory[category] = { total: entries.length, registered: 0, rejected: 0 };
        for (const entry of entries) {
          const moduleUrl = new URL(entry.module, absoluteManifestUrl).href;
          try {
            const mod = await import(moduleUrl);
            const ok = this.resolver.register(category, entry, mod);
            if (ok) { results.registered++; results.byCategory[category].registered++; }
            else    { results.rejected++;  results.byCategory[category].rejected++; }
          } catch (err) {
            console.error(`[Barrel] failed to import ${entry.module}`, err);
            results.rejected++;
            results.byCategory[category].rejected++;
          }
        }
      } catch (err) {
        console.error(`[Barrel] failed to load manifest ${manifestPath}`, err);
      }
    }
    this.bus.emit('barrel:loaded', results);
    return results;
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._lastFrameTime = performance.now();
    this.input.startPolling();
    this._loop();
    this.bus.emit('engine:started');
  }

  stop() {
    this._running = false;
    this.bus.emit('engine:stopped');
  }

  _loop = () => {
    if (!this._running) return;
    requestAnimationFrame(this._loop);
    const now = performance.now();
    const dt = Math.min((now - this._lastFrameTime) / 1000, 0.1);
    this._lastFrameTime = now;
    this._frameCount++;

    // Poll gamepad for UI navigation when not in race
    this.input.pollGamepadForUI();

    // Step physics (only when a 3D scene is active)
    const currentScene = this.scenes.getCurrent();
    const currentSceneType = currentScene?.module?.entry?.type || currentScene?.module?.type;
    if (currentSceneType === '3d') {
      this.physics.step(dt);
    }

    // Update active scene
    this.scenes.update(dt);

    // Render 3D
    if (currentSceneType === '3d' || currentSceneType === 'cutscene') {
      this.renderer.render();
    }

    // End-of-frame input cleanup
    this.input.endFrame();

    // Diagnostics
    if (this._frameCount % 30 === 0) {
      this._diagnostics.fps = 1 / dt;
      this._diagnostics.frameTime = dt * 1000;
      this.bus.emit('diagnostics:tick', { ...this._diagnostics });
    }
  };

  _setupDiagnostics() {
    const overlay = document.createElement('div');
    overlay.id = 'engine-diagnostics';
    overlay.style.cssText = 'position:fixed;bottom:8px;left:8px;background:rgba(0,0,0,0.7);color:#0f0;font:11px monospace;padding:6px 10px;border-radius:4px;pointer-events:none;z-index:99999;min-width:200px';
    document.body.appendChild(overlay);
    this.bus.on('diagnostics:tick', (d) => {
      const stats = this.resolver.stats();
      overlay.innerHTML = `
        FPS: ${d.fps.toFixed(1)} | Frame: ${d.frameTime.toFixed(1)}ms<br>
        Resolver: ${Object.entries(stats).map(([k,v])=>`${k}:${v}`).join(' ')}
      `;
    });
  }
}

export const engine = new Engine();
export default engine;
