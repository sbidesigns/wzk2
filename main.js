// main.js — bootstrap. The ONLY entry point besides index.html.
// Responsibilities (in strict order):
//   1. Verify vendor globals are loaded
//   2. Load three.js as ES module
//   3. Load all config files
//   4. Load all schema files
//   5. Boot the engine
//   6. Register asset loaders (texture, gltf, audio)
//   7. Load all barrel manifests
//   8. Init UI shell + router
//   9. Initialize save system & notifications
//  10. Initialize touch controls (if mobile)
//  11. Navigate to splash screen
//  12. Start main loop

import { engine } from './core/Engine.js';
import { uiShell } from './ui/ui-shell.js';
import { uiRouter } from './ui/ui-router.js';

// Import audio effects system (optional, graceful fallback)
let audioEffects;
try {
  const { audioEffects: ae } = await import('./ui/audio-effects.js');
  audioEffects = ae;
  window.__audioEffects = ae;
} catch (e) {
  console.warn('[main] Audio effects module not available:', e.message);
}

// Expose globally so barrel modules (which don't import the engine) can access it
window.__engine = engine;
window.__uiRouter = uiRouter;
window.__uiShell = uiShell;

const VENDOR_VERSIONS = {
  three: '0.160.0',
  'cannon-es': '0.20.0',
  howler: '2.2.4',
  gsap: '3.12.5',
  localforage: '1.10.0'
};

// Error tracking for diagnostics
const _errors = [];
const _warnings = [];

function trackError(err) {
  _errors.push({ time: Date.now(), error: err.message || String(err), stack: err.stack });
  console.error('[main]', err);
}

function trackWarning(msg) {
  _warnings.push({ time: Date.now(), message: msg });
  console.warn('[main]', msg);
}

// WebGL detection utility
function detectWebGL() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || 
               canvas.getContext('experimental-webgl');
    if (!gl) return { supported: false, reason: 'WebGL not available' };
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';
    const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown';
    
    // Clean up
    const loseCtx = gl.getExtension('WEBGL_lose_context');
    if (loseCtx) loseCtx.loseContext();
    
    return { supported: true, renderer, vendor };
  } catch (e) {
    return { supported: false, reason: e.message };
  }
}

// Feature detection
function detectFeatures() {
  return {
    webgl: detectWebGL(),
    gamepad: 'getGamepads' in navigator,
    touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    webAudio: !!(window.AudioContext || window.webkitAudioContext),
    esModules: typeof Symbol !== 'undefined' && !!Symbol.toStringTag,
    requestAnimationFrame: typeof requestAnimationFrame === 'function',
    intersectionObserver: 'IntersectionObserver' in window,
    resizeObserver: 'ResizeObserver' in window,
    pointerEvents: 'onpointerdown' in window,
    localStorage: (() => { try { return !!localStorage; } catch { return false; }})(),
    indexedDB: !!window.indexedDB,
  };
}

// Safe fetch wrapper with timeout and retry
async function safeFetch(url, options = {}) {
  const { timeout = 10000, retries = 2 } = options;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (err) {
      if (attempt === retries) {
        throw new Error(`Failed to fetch ${url}: ${err.message}`);
      }
      trackWarning(`Fetch attempt ${attempt + 1} failed for ${url}, retrying...`);
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
    }
  }
}

// Update boot progress bar safely
function updateBootProgress(percent) {
  const el = document.getElementById('boot-progress');
  const pctEl = document.getElementById('boot-percent');
  const textEl = document.getElementById('boot-text');
  if (el) el.style.width = `${Math.min(100, Math.max(0, percent))}%`;
  if (pctEl) pctEl.textContent = `${Math.round(Math.min(100, Math.max(0, percent)))}%`;
}

// Update status text
function updateBootStatus(text) {
  const el = document.getElementById('boot-text');
  if (el) el.textContent = text;
}

// Show error screen
function showErrorScreen(title, message, stack = '') {
  const fallback = document.getElementById('boot-fallback');
  if (fallback) {
    fallback.innerHTML = `
      <div class="error-content" style="color:#ff3d5a; font-family:system-ui; max-width:560px; text-align:center; padding:24px;">
        <div style="font-size:24px; font-weight:700; margin-bottom:12px;">${title}</div>
        <div style="font-size:14px; color:#a0a4b0; margin-bottom:16px;">${message}</div>
        ${stack ? `<div style="font-size:12px; color:#5a5e6a; font-family:monospace; background:rgba(255,255,255,0.04); padding:16px; border-radius:8px; overflow:auto; max-height:200px; text-align:left;">${stack}</div>` : ''}
        <div style="font-size:12px; color:#5a5e6a; margin-top:16px;">Open the browser console for details.</div>
      </div>
    `;
  }
}

// Show no-WebGL fallback
function showNoWebGLScreen(features) {
  document.body.classList.add('nowebgl');
  const fallback = document.getElementById('boot-fallback');
  if (fallback) {
    fallback.innerHTML = `
      <div class="error-content" style="color:#ffb13d; font-family:system-ui; max-width:560px; text-align:center; padding:24px;">
        <div style="font-size:24px; font-weight:700; margin-bottom:12px;">⚠️ WebGL Required</div>
        <div style="font-size:14px; color:#f5f6fa; margin-bottom:16px;">
          Your browser or device doesn't support WebGL, which is required for this game.
        </div>
        <div style="font-size:13px; color:#a0a4b0; margin-bottom:16px;">
          Please try:<br>
          • Updating your graphics drivers<br>
          • Using a modern browser (Chrome, Firefox, Edge)<br>
          • Enabling hardware acceleration<br>
          • Checking if WebGL is blocked by your IT admin
        </div>
        <div style="font-size:11px; color:#5a5e6a; font-family:monospace; background:rgba(255,255,255,0.04); padding:12px; border-radius:8px; margin-top:16px;">
          Detected: ${features.webgl.reason || 'Unknown error'}
        </div>
      </div>
    `;
  }
}

async function main() {
  try {
    // Feature detection first
    updateBootProgress(3);
    updateBootStatus('Detecting system features...');
    const features = detectFeatures();
    console.log('[main] Features detected:', features);
    
    // Check critical requirements
    if (!features.webgl.supported) {
      showNoWebGLScreen(features);
      trackError(new Error('WebGL not supported'));
      return;
    }
    
    if (!features.esModules) {
      showErrorScreen(
        'Browser Not Supported',
        'Your browser does not support ES Modules, which are required for this game.',
        'Please use a modern browser like Chrome, Firefox, Safari, or Edge.'
      );
      trackError(new Error('ES Modules not supported'));
      return;
    }

    // 1. Verify vendor globals
    updateBootProgress(8);
    updateBootStatus('Loading vendor libraries...');
    const vendorChecks = [
      { name: 'cannon-es', obj: window.CANNON },
      { name: 'howler', obj: window.Howler },
      { name: 'gsap', obj: window.gsap },
      { name: 'localforage', obj: window.localforage }
    ];
    
    for (const vendor of vendorChecks) {
      if (!vendor.obj) {
        // Try to provide more helpful error message
        const scriptEl = document.querySelector(`script[src*="${vendor.name.split('-')[0]}"]`);
        if (scriptEl) {
          throw new Error(`${vendor.name} not loaded (script found at ${scriptEl.src} but failed to execute). Check browser console for CORS/script errors.`);
        }
        throw new Error(`${vendor.name} not loaded. The CDN may be blocked or unreachable.`);
      }
    }

    // 2. Load three.js (ES module - LOCAL FIRST via importmap)
    updateBootProgress(18);
    updateBootStatus('Loading 3D engine...');
    let three = null;
    let threeLoadError = null;
    
    // Try multiple strategies to load Three.js
    const threeLoadStrategies = [
      { name: 'importmap', fn: () => import('three') },
      { name: 'jsdelivr', fn: () => import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js') },
      { name: 'unpkg', fn: () => import('https://unpkg.com/three@0.160.0/build/three.module.js') },
      { name: 'skypack', fn: () => import('https://cdn.skypack.dev/three@0.160.0') }
    ];
    
    for (const strategy of threeLoadStrategies) {
      try {
        console.log(`[main] Trying to load Three.js via ${strategy.name}...`);
        three = await strategy.fn();
        window.THREE = three;
        console.log(`[main] Three.js loaded successfully via ${strategy.name}`);
        break;
      } catch (err) {
        threeLoadError = err;
        console.warn(`[main] ${strategy.name} failed:`, err.message);
      }
    }
    
    if (!three) {
      // Enter UI-only mode - the UI will work but 3D features won't
      trackWarning('Three.js could not be loaded - entering UI-only mode');
      window.__uiOnlyMode = true;
      // Create a mock THREE object for compatibility
      window.THREE = {
        Scene: class MockScene {},
        Vector2: class MockVector2 { constructor(x, y) { this.x = x; this.y = y; } },
        Vector3: class MockVector3 { constructor(x, y, z) { this.x = x; this.y = y; this.z = z; } },
        Color: class MockColor {},
        Fog: class MockFog {},
        PerspectiveCamera: class MockCamera {},
        WebGLRenderer: class MockRenderer {
          constructor() { this.domElement = document.createElement('canvas'); }
          setSize() {}
          render() {}
          setPixelRatio() {}
          setClearColor() {}
        },
        ACESFilmicToneMapping: 0,
        SRGBColorSpace: 0,
        TextureLoader: class MockLoader {
          load(url, onLoad, onProgress, onError) {
            if (onError) onError(new Error('UI-only mode'));
          }
        },
        Clock: class MockClock {
          getDelta() { return 0.016; }
          getElapsedTime() { return 0; }
        }
      };
    }

    // 3. Load configs with error handling
    updateBootProgress(28);
    updateBootStatus('Loading game configuration...');
    const configFiles = [
      { key: 'engineConfig', path: './config/engine.config.json' },
      { key: 'gameConfig', path: './config/game.config.json' },
      { key: 'uiConfig', path: './config/ui.config.json' },
      { key: 'inputConfig', path: './config/input.config.json' }
    ];
    
    const configs = {};
    for (const cfg of configFiles) {
      try {
        const resp = await safeFetch(cfg.path);
        configs[cfg.key] = await resp.json();
      } catch (err) {
        trackWarning(`Failed to load ${cfg.path}: ${err.message}`);
        // Provide sensible defaults for critical configs
        if (cfg.key === 'engineConfig') {
          configs[cfg.key] = getDefaultEngineConfig();
        } else if (cfg.key === 'uiConfig') {
          configs[cfg.key] = getDefaultUIConfig();
        } else if (cfg.key === 'inputConfig') {
          configs[cfg.key] = getDefaultInputConfig();
        } else {
          configs[cfg.key] = {};
        }
      }
    }
    
    const { engineConfig, gameConfig, uiConfig, inputConfig } = configs;
    updateBootProgress(42);
    updateBootStatus('Validating game data...');

    // 4. Load schemas (file names are singular; categories are plural — map them)
    const schemaFiles = [
      { file: 'vehicle',    category: 'vehicles' },
      { file: 'character',  category: 'characters' },
      { file: 'controller', category: 'controllers' },
      { file: 'mode',       category: 'modes' },
      { file: 'track',      category: 'tracks' },
      { file: 'item',       category: 'items' },
      { file: 'scene',      category: 'scenes' },
      { file: 'screen',     category: 'screens' }
    ];
    const schemas = {};
    
    await Promise.all(schemaFiles.map(async ({ file, category }) => {
      try {
        const r = await safeFetch(`./config/schemas/${file}.schema.json`);
        if (r.ok) {
          schemas[category] = await r.json();
        }
      } catch (err) {
        trackWarning(`Schema ${file} not loaded: ${err.message}`);
      }
    }));
    updateBootProgress(52);
    updateBootStatus('Initializing engine core...');

    // 5. Boot engine
    try {
      await engine.boot({
        engineConfig, gameConfig, uiConfig, inputConfig,
        schemas,
        vendorVersions: VENDOR_VERSIONS,
        features
      });
    } catch (err) {
      throw new Error(`Engine boot failed: ${err.message}`);
    }

    updateBootProgress(62);
    updateBootStatus('Setting up asset system...');

    // 6. Register asset loaders
    engine.assets.registerLoader('texture', async (url) => {
      return new Promise((resolve, reject) => {
        const loader = new three.TextureLoader();
        loader.load(url, 
          (texture) => {
            // Configure texture defaults for quality
            texture.colorSpace = three.SRGBColorSpace;
            texture.generateMipmaps = true;
            texture.minFilter = three.LinearMipmapLinearFilter;
            texture.magFilter = three.LinearFilter;
            resolve(texture);
          }, 
          undefined, 
          (err) => reject(new Error(`Failed to load texture: ${url}`))
        );
      });
    });

    engine.assets.registerLoader('gltf', async (url) => {
      try {
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        return new Promise((resolve, reject) => {
          new GLTFLoader().load(url, resolve, undefined, reject);
        });
      } catch (err) {
        // Fallback: try direct URL
        try {
          const { GLTFLoader } = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js');
          return new Promise((resolve, reject) => {
            new GLTFLoader().load(url, resolve, undefined, reject);
          });
        } catch (err2) {
          throw new Error(`GLTFLoader unavailable: ${err.message}`);
        }
      }
    });

    engine.assets.registerLoader('audio', async (url) => {
      // Audio registration handled via engine.audio.registerSound
      return url;
    });

    // Additional loader for JSON data files
    engine.assets.registerLoader('json', async (url) => {
      const resp = await safeFetch(url);
      return resp.json();
    });

    // Loader for font files
    engine.assets.registerLoader('font', async (url) => {
      return new Promise((resolve, reject) => {
        const loader = new three.FontLoader();
        loader.load(url, resolve, undefined, reject);
      });
    });

    updateBootProgress(70);
    updateBootStatus('Loading game modules...');

    // 7. Load all barrel manifests
    const barrelManifests = [
      { category: 'vehicles',    manifestPath: './barrel/vehicles/manifest.json' },
      { category: 'characters',  manifestPath: './barrel/characters/manifest.json' },
      { category: 'controllers', manifestPath: './barrel/controllers/manifest.json' },
      { category: 'modes',       manifestPath: './barrel/modes/manifest.json' },
      { category: 'tracks',      manifestPath: './barrel/tracks/manifest.json' },
      { category: 'items',       manifestPath: './barrel/items/manifest.json' },
      { category: 'scenes',      manifestPath: './barrel/scenes/manifest.json' },
      { category: 'screens',     manifestPath: './barrel/ui/screens/manifest.json' }
    ];
    
    let barrelResults;
    try {
      barrelResults = await engine.loadBarrel('./barrel/', barrelManifests);
      console.log('[main] Barrel loaded:', barrelResults);
    } catch (err) {
      trackWarning(`Barrel loading had issues: ${err.message}`);
      barrelResults = { registered: 0, rejected: 0, byCategory: {} };
    }

    // 7.5 ACTIVATE BARREL SYSTEMS — Wire registered components to their consumers
    // This is the CRITICAL integration step that was missing!
    // PART 1: Systems that don't depend on saveSystem (controllers, basic registries)
    
    // --- CONTROLLERS: Register with InputManager ---
    try {
      const controllers = engine.resolver.listWithModules('controllers');
      console.log(`[main] Activating ${controllers.length} controllers...`);
      for (const { entry, module } of controllers) {
        if (module.activate || module.deactivate || module.poll) {
          engine.input.registerController(entry.id, module);
          console.log(`[main] ✓ Controller activated: ${entry.displayName || entry.id}`);
        }
      }
    } catch (err) {
      trackWarning(`Controller activation failed: ${err.message}`);
    }

    // --- BASIC REGISTRIES (no saveSystem dependency) ---
    // These are set up now so they're available when race scene mounts
    
    // Items registry
    try {
      const items = engine.resolver.listWithModules('items');
      window.__itemRegistry = items;
      console.log(`[main] ✓ ${items.length} items registered for activation`);
    } catch (err) {
      trackWarning(`Item registry setup failed: ${err.message}`);
    }

    // Tracks registry
    try {
      const tracks = engine.resolver.listWithModules('tracks');
      window.__trackRegistry = tracks;
      console.log(`[main] ✓ ${tracks.length} tracks available`);
    } catch (err) {
      trackWarning(`Track registry setup failed: ${err.message}`);
    }

    // Modes registry
    try {
      const modes = engine.resolver.listWithModules('modes');
      window.__modeRegistry = modes;
      console.log(`[main] ✓ ${modes.length} game modes available`);
    } catch (err) {
      trackWarning(`Mode registry setup failed: ${err.message}`);
    }

    // Vehicles/Characters need saveSystem → will be set up after saveSystem init (section 9.5)

    updateBootProgress(85);
    updateBootStatus('Launching game...');

    // 8. Init UI shell + router
    try {
      uiShell.init();
      
      const screensList = engine.resolver.listWithModules('screens');
      if (screensList.length === 0) {
        trackWarning('No screens registered - UI may not function correctly');
      }
      
      uiRouter.init(uiConfig.screenGraph, screensList);
    } catch (err) {
      throw new Error(`UI initialization failed: ${err.message}`);
    }

    // Wire pause overlay
    engine.bus.on('ui:showPause', () => {
      uiRouter.push('pause');
    });
    engine.bus.on('ui:hidePause', () => {
      if (uiRouter.current()?.screenId === 'pause') uiRouter.pop();
    });

    // Wire race:start → record payload for results
    engine.bus.on('race:start', (payload) => {
      engine.state.set('race.payload', payload);
    });

    // Wire race finished → show results
    engine.bus.on('mode:circuit:raceEnd', ({ results }) => {
      engine.scenes.transition({ module: { mount: async () => {}, unmount: async () => {} } }, {});
      const uiShell = document.getElementById('ui-shell');
      if (uiShell) uiShell.style.display = 'block';
      uiRouter.push('results', { results });
    });

    // Handle visibility change (pause when tab hidden)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        engine.bus.emit('app:hidden');
      } else {
        engine.bus.emit('app:visible');
      }
    });

    // Handle window focus/blur
    window.addEventListener('blur', () => {
      engine.bus.emit('window:blur');
    });
    window.addEventListener('focus', () => {
      engine.bus.emit('window:focus');
    });

    // Prevent context menu during gameplay
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    updateBootProgress(95);

    // 9. Navigate to splash
    try {
      await uiRouter.push('splash');
    } catch (err) {
      trackWarning(`Splash navigation issue: ${err.message}`);
      // Fallback: try to show main-menu directly
      try {
        await uiRouter.push('main-menu');
      } catch (err2) {
        showErrorScreen(
          'Navigation Error',
          `Could not navigate to any screen: ${err2.message}`,
          err2.stack
        );
        return;
      }
    }

    // 10. Start main loop
    engine.start();

    // Remove boot fallback with smooth transition
    setTimeout(() => {
      const fallback = document.getElementById('boot-fallback');
      if (fallback) {
        fallback.style.transition = 'opacity 0.5s ease';
        fallback.style.opacity = '0';
        setTimeout(() => {
          if (fallback.parentNode) fallback.remove();
        }, 500);
      }
    }, 600);

    // 9. Initialize save system
    let saveSystem = null;
    try {
      const saveModule = await import('./ui/save-system.js');
      // Handle both default export (instance) and named export (class)
      const SaveSystem = saveModule.default || saveModule.saveSystem || saveModule.SaveSystem;
      
      if (typeof SaveSystem?.init === 'function') {
        // It's an instance or class with init method
        saveSystem = await SaveSystem.init();
      } else if (SaveSystem && typeof SaveSystem.on === 'function') {
        // Already initialized instance
        saveSystem = SaveSystem;
      } else {
        console.warn('[main] SaveSystem format unexpected, using fallback');
        saveSystem = { 
          getData: () => null, 
          get: () => null,
          on: () => {}, 
          off: () => {},
          emit: () => {}
        };
      }
      window.__saveSystem = saveSystem;
      console.log('[main] Save system initialized:', saveSystem.getData?.()?.player?.level ? `Level ${saveSystem.getData().player.level}` : 'New player');
    } catch (e) {
      console.warn('[main] Save system not available:', e.message);
      // Create minimal fallback to prevent crashes
      saveSystem = { 
        getData: () => null, 
        get: () => null,
        getSetting: () => undefined,
        on: () => {}, 
        off: () => {},
        emit: () => {},
        data: { player: {}, settings: {} }
      };
    }

    // 9.5 BARREL SYSTEMS PART 2 — Registries that depend on saveSystem
    // Now that saveSystem is initialized, we can set up vehicles and characters
    
    // --- VEHICLES: Store references for race scene to use ---
    try {
      const vehicles = engine.resolver.listWithModules('vehicles');
      window.__vehicleRegistry = vehicles;
      console.log(`[main] ✓ ${vehicles.length} vehicles available for spawning`);
      
      // Set default vehicle (first one or saved selection)
      const defaultVehicleId = saveSystem?.data?.garage?.selectedVehicle || 'spectre';
      const defaultVehicle = vehicles.find(v => v.entry.id === defaultVehicleId) || vehicles[0];
      window.__defaultVehicle = defaultVehicle || null;
      if (defaultVehicle) {
        console.log(`[main] ✓ Default vehicle: ${defaultVehicle.entry.displayName}`);
      }
    } catch (err) {
      trackWarning(`Vehicle registry setup failed: ${err.message}`);
    }

    // --- CHARACTERS: Store references for ability system ---
    try {
      const characters = engine.resolver.listWithModules('characters');
      window.__characterRegistry = characters;
      console.log(`[main] ✓ ${characters.length} characters available`);
      
      // Set default character
      const defaultCharId = saveSystem?.data?.player?.characterId || 'ace';
      const defaultChar = characters.find(c => c.entry.id === defaultCharId) || characters[0];
      window.__defaultCharacter = defaultChar || null;
      if (defaultChar) {
        console.log(`[main] ✓ Default character: ${defaultChar.entry.displayName}`);
      }
    } catch (err) {
      trackWarning(`Character registry setup failed: ${err.message}`);
    }

    // Wire item activation: when player uses an item, call barrel item module
    engine.bus.on('player:useItem', ({ itemId, context }) => {
      const itemModule = window.__itemRegistry?.find(i => i.entry.id === itemId)?.module;
      if (itemModule?.activate && window.__raceScene?._barrelVehicle) {
        try {
          itemModule.activate(context || {
            engine: engine,
            vehicle: window.__raceScene._barrelVehicle,
            vehicleModule: window.__raceScene._barrelVehicle
          });
          console.log(`[main] ✓ Item activated: ${itemId}`);
        } catch (e) {
          console.error(`[main] Item activation failed for ${itemId}:`, e);
        }
      }
    });

    // Wire character abilities on race start
    engine.bus.on('race:start', (payload) => {
      const charModule = window.__defaultCharacter?.module;
      if (charModule?.applyPassive) {
        try {
          const passive = charModule.applyPassive(window.__defaultCharacter?.entry, { engine });
          window.__characterPassives = passive;
          console.log('[main] ✓ Character passives applied:', passive);
        } catch (e) {
          console.warn('[main] Character passive application failed:', e);
        }
      }
    });

    // 10. Initialize notification system
    let notifications = null;
    try {
      const { default: Notifications } = await import('./ui/notifications.js');
      notifications = Notifications.init();
      window.__notifications = notifications;
      console.log('[main] Notification system ready');
    } catch (e) {
      console.warn('[main] Notification system not available:', e.message);
    }

    // 11. Initialize touch controls on mobile devices
    if (features.touch) {
      try {
        const { TouchControls } = await import('./ui/touch-controls.js');
        const tc = TouchControls.getInstance();
        
        // Get saved settings or use defaults
        const showControls = saveSystem?.getSetting('controls', 'showTouchControls', 'auto') || 'auto';
        
        if (showControls !== 'never') {
          tc.init({
            hapticsEnabled: true,
            debugMode: false,
            steerSensitivity: saveSystem?.getSetting('controls', 'steeringSensitivity', 1.0) || 1.0,
          });
          window.__touchControls = tc;
          
          // Wire touch events to input manager if available
          tc.on('statechange', (state) => {
            engine.bus.emit('input:touch', state);
          });
          
          console.log('[main] Touch controls initialized');
        }
      } catch (e) {
        console.warn('[main] Touch controls not available:', e.message);
      }
    }

    // 13. Initialize HUD system for racing gameplay
    let hudSystem = null;
    try {
      const { getHUD } = await import('./ui/hud.js');
      hudSystem = getHUD({
        showMinimap: true,
        minimapOptions: {
          rotationMode: 'fixed',
          showTrail: true,
          zoom: 1.0
        }
      });
      window.__hud = hudSystem;
      console.log('[main] HUD system initialized');
      
      // Wire engine events to HUD updates
      // Race start → Show HUD, start countdown
      engine.bus.on('race:start', async (payload) => {
        if (hudSystem && !hudSystem.isVisible) {
          hudSystem.show();
          hudSystem.reset();
          
          // Start countdown sequence (3, 2, 1, GO!)
          await hudSystem.startCountdown(3);
          
          // Set track data on minimap if provided
          if (payload?.trackData) {
            hudSystem.setTrackData(payload.trackData);
          }
        }
      });
      
      // Race end → Hide HUD, stop timer
      engine.bus.on('race:end', () => {
        if (hudSystem) {
          const finalTime = hudSystem.stopRaceTimer();
          hudSystem.hide();
          console.log('[HUD] Race ended. Final time:', finalTime);
        }
      });
      
      // Also handle circuit-specific race end event
      engine.bus.on('mode:circuit:raceEnd', ({ results }) => {
        if (hudSystem) {
          hudSystem.stopRaceTimer();
          hudSystem.showNotification(`Race Complete! Position: ${results?.playerPosition || '-'}`, {
            type: results?.playerPosition === 1 ? 'success' : 'info',
            duration: 3000
          });
        }
      });
      
      // Player speed changed → Update speed display
      engine.bus.on('player:speedChanged', ({ speed, maxSpeed }) => {
        if (hudSystem && hudSystem.isVisible) {
          hudSystem.update({ speed, maxSpeed });
        }
      });
      
      // Player position changed → Update position display
      engine.bus.on('player:positionChanged', ({ position, totalRacers }) => {
        if (hudSystem && hudSystem.isVisible) {
          hudSystem.update({ position, totalRacers });
        }
      });
      
      // Lap progress/changed → Update lap counter
      engine.bus.on('player:lapProgress', ({ currentLap, totalLaps, progress, lapTimes }) => {
        if (hudSystem && hudSystem.isVisible) {
          hudSystem.update({ 
            currentLap, 
            totalLaps, 
            lapProgress: progress,
            lapTimes 
          });
        }
      });
      
      // Lap completed → Show notification and update
      engine.bus.on('player:lapCompleted', ({ lapNumber, lapTime, bestLapTime }) => {
        if (hudSystem) {
          // Check for new record
          if (!bestLapTime || lapTime <= bestLapTime) {
            hudSystem.showNotification(`New Best Lap! ${_formatLapTime(lapTime)}`, {
              type: 'success',
              duration: 2500
            });
          } else {
            hudSystem.showNotification(`Lap ${lapNumber} Complete`, {
              type: 'info',
              duration: 1500
            });
          }
        }
      });
      
      // Item picked up → Update item box
      engine.bus.on('player:itemPicked', (item) => {
        if (hudSystem && hudSystem.isVisible) {
          hudSystem.update({ currentItem: item });
        }
      });
      
      // Item used → Clear item display
      engine.bus.on('player:itemUsed', () => {
        if (hudSystem && hudSystem.isVisible) {
          hudSystem.update({ currentItem: null });
        }
      });
      
      // Damage taken → Update shield/health
      engine.bus.on('player:damageTaken', ({ shield, health, source }) => {
        if (hudSystem && hudSystem.isVisible) {
          hudSystem.update({ shield, health });
        }
      });
      
      // Gear changed → Update gear indicator
      engine.bus.on('player:gearChanged', ({ gear }) => {
        if (hudSystem && hudSystem.isVisible) {
          hudSystem.update({ gear });
        }
      });
      
      // Overtake event → Show notification
      engine.bus.on('player:overtake', ({ opponentName, newPosition }) => {
        if (hudSystem && hudSystem.isVisible) {
          hudSystem.showNotification(`Overtook ${opponentName || 'opponent'}!`, {
            type: 'success',
            duration: 1200
          });
        }
      });
      
      // Player position update for minimap (high frequency)
      engine.bus.on('player:positionUpdate', ({ x, y, rotation, opponents }) => {
        if (hudSystem && hudSystem.isVisible) {
          hudSystem.update({
            playerPosition: { x, y, rotation },
            opponents: opponents || []
          });
        }
      });
      
      // Listen for HUD item use events and forward to game
      if (hudSystem) {
        hudSystem.on('itemUse', (item) => {
          engine.bus.emit('player:useItem', item);
        });
      }

    } catch (e) {
      console.warn('[main] HUD system not available:', e.message);
    }

    // 15. Initialize Achievement System
    let achievementSystem = null;
    try {
      const { default: AchievementSystem } = await import('./ui/achievements.js');
      achievementSystem = AchievementSystem;
      
      await achievementSystem.init({
        saveSystem: saveSystem,
        audioEffects: audioEffects,
        eventBus: engine.bus
      });
      
      window.__achievements = achievementSystem;
      console.log(`[main] Achievement System ready - ${achievementSystem.getStats().unlocked}/${achievementSystem.getStats().total} unlocked`);
    } catch (e) {
      console.warn('[main] Achievement system not available:', e.message);
    }

    // 16. Initialize Power-Up System
    let powerUpSystem = null;
    try {
      const { default: PowerUpSystem } = await import('./ui/powerups.js');
      powerUpSystem = PowerUpSystem;
      
      await powerUpSystem.init({
        eventBus: engine.bus,
        achievementSystem: achievementSystem,
        audioEffects: audioEffects
      });
      
      window.__powerups = powerUpSystem;
      console.log(`[main] Power-Up System ready - ${powerUpSystem.definitions.size} power-ups loaded`);
    } catch (e) {
      console.warn('[main] Power-Up system not available:', e.message);
    }

    // Wire up cross-system event handlers for achievements
    
    // Race events → Check race-related achievements
    if (achievementSystem && engine.bus) {
      // Speed tracking for speed-based achievements
      engine.bus.on('player:speedChanged', ({ speed }) => {
        // Convert to km/h and check for speed demon (200 km/h)
        const speedKmh = speed * 3.6;
        if (speedKmh >= 200) {
          achievementSystem.check('speed_demon', speedKmh);
        }
      });
      
      // Position change tracking for position-based achievements
      engine.bus.on('player:positionChanged', ({ position, totalRacers }) => {
        // Update power-up system's position tracking for item generation
        if (powerUpSystem) {
          powerUpSystem._currentPosition = position;
          powerUpSystem._totalRacers = totalRacers;
        }
        
        // Track last-to-first potential (save start position on first update after start)
        if (position === totalRacers && !achievementSystem._raceSession?.startPositionSaved) {
          if (!achievementSystem._raceSession) achievementSystem._raceSession = {};
          achievementSystem._raceSession.startPositionSaved = true;
          achievementSystem._raceSession.startPosition = position;
        }
      });
      
      // Item box hit → Generate item via power-up system
      engine.bus.on('itembox:hit', () => {
        if (powerUpSystem) {
          powerUpSystem.onItemBoxHit();
        }
      });
      
      // Shield block tracking
      engine.bus.on('player:shieldBlock', () => {
        achievementSystem._onShieldBlock();
      });
      
      // Missile hit tracking  
      engine.bus.on('item:missile:hit', () => {
        achievementSystem._onMissileHit(1);
      });
      
      // Boost pad hit
      engine.bus.on('player:boostPadHit', () => {
        achievementSystem._onBoostPadHit();
        if (powerUpSystem) {
          powerUpSystem.addToInventory('boostPad');
        }
      });
      
      // Level up check for Legend achievement
      if (saveSystem) {
        saveSystem.on('xpGained', ({ levelUps }) => {
          if (levelUps.length > 0) {
            const newLevel = levelUps[levelUps.length - 1].newLevel;
            achievementSystem.check('legend', newLevel);
          }
        });
      }
    }

    // Helper function to format lap time for notifications
    function _formatLapTime(ms) {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      const millis = Math.floor((ms % 1000) / 10);
      return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(2, '0')}`;
    }

    // 14. Wire up save system event handlers
    if (saveSystem && notifications) {
      // Show XP gained notification
      saveSystem.on('xpGained', ({ levelUps }) => {
        if (levelUps.length > 0) {
          notifications.xpGained(0, levelUps);
        }
      });
      
      // Show currency earned notification
      saveSystem.on('currencyEarned', ({ type, amount }) => {
        if (amount >= 100) {
          notifications.currencyEarned(amount, type);
        }
      });
      
      // Show achievement notification
      saveSystem.on('achievementUnlocked', (achievement) => {
        notifications.achievement(achievement);
      });
    }

    // 17. Initialize Leaderboard System
    let leaderboard = null;
    try {
      const { default: leaderboardSystem } = await import('./ui/leaderboard.js');
      leaderboard = leaderboardSystem;
      
      await leaderboard.init({
        saveSystem: saveSystem,
        playerName: saveSystem?.data?.player?.name || 'Racer',
        playerVehicleId: saveSystem?.data?.garage?.selectedVehicle || 'vehicle.base'
      });
      
      window.__leaderboard = leaderboard;
      console.log(`[main] Leaderboard System ready - ${leaderboard.getEntries().filteredCount} entries`);
    } catch (e) {
      console.warn('[main] Leaderboard system not available:', e.message);
    }

    // 18. Initialize Daily Challenge System
    let dailyChallenges = null;
    try {
      const { default: dailyChallengeSystem } = await import('./ui/daily-challenges.js');
      dailyChallenges = dailyChallengeSystem;
      
      await dailyChallengeSystem.init({
        saveSystem: saveSystem
      });
      
      window.__dailyChallenges = dailyChallenges;
      console.log(`[main] Daily Challenges System ready - ${dailyChallenges.getSummary().completed}/${dailyChallenges.getSummary().total} challenges`);
    } catch (e) {
      console.warn('[main] Daily Challenges system not available:', e.message);
    }

    // 19. Initialize Race Simulator (dev/demo mode)
    try {
      const { raceSimulator } = await import('./ui/race-simulator.js');
      
      raceSimulator.init({
        eventBus: engine.bus,
        hudSystem: hudSystem || null,
        verbose: false // Set true for detailed console logging
      });
      
      window.__raceSim = raceSimulator;
      console.log('[main] Race Simulator ready (dev tool)');
    } catch (e) {
      console.warn('[main] Race Simulator not available:', e.message);
    }

    // 19.5 Initialize Race Scene for 3D gameplay
    let raceScene = null;
    try {
      const { getRaceScene, createRaceScene, RaceScene } = await import('./ui/race-scene.js');
      
      // Create default instance
      raceScene = getRaceScene({ 
        mode: 'track_bound',  // Default to track-bound (NFS style)
        raceType: 'quick_race',
        laps: 3 
      });
      window.__raceScene = raceScene;
      window.__createRaceScene = createRaceScene;
      window.__RaceScene = RaceScene; // Expose class for reference
      
      console.log('[main] Race Scene system ready | Default mode: track_bound');
      
      // Wire race:start → mount the 3D race scene
      engine.bus.on('race:start', async (payload) => {
        console.log('[main] Starting 3D race scene with payload:', payload);
        
        // Extract or build race configuration
        var raceConfig = (payload && payload.raceConfig) || payload || {};
        
        // Ensure required fields with defaults
        raceConfig = {
          mode: raceConfig.mode || 'open_world',        // 'track_bound' | 'open_world'
          raceType: raceConfig.raceType || 'quick_race',   // 'quick_race' | 'time_trial' | 'career' | 'tournament' | 'online'
          laps: raceConfig.laps || 3,
          track: raceConfig.track || 'downtown',
          vehicle: raceConfig.vehicle || 'spectre',
          ...raceConfig
        };
        
        console.log('[main] Race Config:', JSON.stringify(raceConfig));
        
        try {
          // Create fresh scene instance for this race
          var sceneInstance = createRaceScene(raceConfig);
          
          // Mount the race scene via SceneManager
          await engine.scenes.transition(
            { 
              id: 'race-scene', 
              module: sceneInstance,
              type: '3d' 
            }, 
            payload
          );
          
          // Show renderer canvas
          if (engine.renderer && engine.renderer.show) {
            engine.renderer.show();
          }
          
          console.log('[main] Race scene mounted successfully | Mode:', raceConfig.mode);
        } catch (sceneErr) {
          console.error('[main] Failed to mount race scene:', sceneErr);
        }
      });
      
      // Wire race:end → unmount race scene
      engine.bus.on('race:end', async () => {
        if (engine.scenes.getCurrent()?.module?.id === 'race-scene') {
          await engine.scenes.transition({ module: { mount: async () => {}, unmount: async () => {} } }, {});
          if (engine.renderer && engine.renderer.hide) {
            engine.renderer.hide();
          }
        }
      });
      
    } catch (e) {
      console.warn('[main] Race Scene not available:', e.message);
    }

    // 20. Wire up cross-system events for Leaderboard & Challenges
    
    // Race end → Record to leaderboard + update challenges
    engine.bus.on('race:end', ({ result }) => {
      if (!result) return;
      
      // Update leaderboard with race time
      if (leaderboard && result.timeMs && result.trackId) {
        leaderboard.addEntry({
          playerName: saveSystem?.data?.player?.name || 'Player',
          vehicleId: saveSystem?.data?.garage?.selectedVehicle || 'vehicle.base',
          trackId: result.trackId,
          timeMs: result.timeMs,
          laps: result.lapsCompleted || 3,
          position: result.position,
          isPlayer: true
        });
        
        leaderboard.updateStats({
          racesCompleted: 1,
          wins: result.position === 1 ? 1 : 0,
          losses: result.position > 1 ? 1 : 0,
          distance: result.distance || 0,
          topSpeed: (result.topSpeed * 3.6) || 0, // Convert m/s to km/h if needed
          itemsUsed: result.itemsUsed || 0,
          perfect: result.perfectRace || false,
          driftTime: result.driftTime || 0,
          playTime: Math.floor((result.totalTime || 0) / 1000)
        });
      }
      
      // Update daily challenges with race results
      if (dailyChallenges) {
        dailyChallenges.onRaceResult(result);
      }
    });

    // Achievement unlocked → Could grant challenge progress
    if (dailyChallenges) {
      engine.bus.on('achievement:unlocked', (achievement) => {
        // Some achievements might count toward special challenges
        // This is a hook for future expansion
        dailyChallenges.emit('achievementUnlocked', achievement);
      });
    }

    // Speed changes → Update challenges that track speed
    if (dailyChallenges) {
      engine.bus.on('player:speedChanged', ({ speed }) => {
        const speedKmh = speed * 3.6; // Assume m/s input
        dailyChallenges.onSpeedChange(speedKmh);
      });
    }

    // Item usage → Track for item-based challenges
    if (dailyChallenges) {
      engine.bus.on('player:itemPicked', ({ item }) => {
        if (item) dailyChallenges.onItemUse(item || 'unknown');
      });
      
      engine.bus.on('item:missile:hit', () => {
        dailyChallenges.onMissileHit();
      });
      
      engine.bus.on('player:shieldBlock', () => {
        dailyChallenges.onShieldBlock();
      });
      
      engine.bus.on('player:boostPadHit', () => {
        dailyChallenges.onBoostPadHit();
      });
    }

    // Overtake tracking for challenges
    if (dailyChallenges) {
      engine.bus.on('player:overtake', () => {
        dailyChallenges.onOvertake();
      });
    }

    // Perfect lap tracking
    if (dailyChallenges) {
      engine.bus.on('player:perfectLap', () => {
        dailyChallenges.onPerfectLap();
      });
    }

    // Daily challenge completion → Notification popup
    if (dailyChallenges && notifications) {
      dailyChallenges.on('challengeCompleted', ({ challenge }) => {
        notifications.showNotification(
          `Challenge Complete: ${challenge.title}`,
          { type: 'success', duration: 4000 }
        );
      });
      
      dailyChallenges.on('rewardClaimed', ({ reward }) => {
        notifications.showNotification(
          `Rewards claimed! +${reward.reward.credits} credits, +${reward.reward.xp} XP`,
          { type: 'reward', duration: 3000 }
        );
      });
      
      dailyChallenges.on('allChallengesCompleted', ({ streak }) => {
        notifications.showNotification(
          `🎉 All challenges complete! Day ${streak} streak!`,
          { type: 'celebration', duration: 5000 }
        );
      });
    }

    updateBootProgress(100);

    // Update boot screen to complete state
    if (window.bootScreenAPI) {
      window.bootScreenAPI.setPercent(100);
      window.bootScreenAPI.setStatus('Ready');
      window.bootScreenAPI.showContinue();
    }

    console.log('[main] Warzone Kart booted successfully!');
    console.log('[main] Vendor versions:', VENDOR_VERSIONS);
    console.log('[main] Resolver stats:', engine.resolver.stats());
    console.log('[main] Barrel results:', barrelResults);
    console.log('[main] Features:', features);

    // Emit ready event for external listeners
    engine.bus.emit('app:ready', { 
      features, 
      vendorVersions: VENDOR_VERSIONS,
      stats: engine.resolver.stats()
    });

  } catch (err) {
    console.error('[main] BOOT FAILED:', err);
    trackError(err);
    showErrorScreen(
      'BOOT FAILED',
      err.message,
      err.stack || ''
    );
  }
}

// Default configuration fallbacks
function getDefaultEngineConfig() {
  return {
    renderer: {
      qualityPresets: {
        low: { pixelRatio: 0.75, shadowMapEnabled: false, bloom: false, antialias: false },
        medium: { pixelRatio: 1.0, shadowMapEnabled: true, bloom: false, antialias: true, shadowMapSize: 1024 },
        high: { pixelRatio: 1.5, shadowMapEnabled: true, bloom: true, antialias: true, shadowMapSize: 2048, bloomStrength: 0.6 }
      },
      defaultPreset: 'medium',
      toneMappingExposure: 1.0,
      fog: { enabled: true, color: '#0a0a14', near: 60, far: 320 },
      clearColor: '#05060a'
    },
    physics: {
      stepRate: 60,
      maxSubSteps: 4,
      gravity: [0, -9.82, 0],
      defaultMaterial: { friction: 0.4, restitution: 0.1 }
    },
    audio: {
      buses: {
        master: { volume: 1.0, muted: false },
        music: { volume: 0.7, muted: false },
        sfx: { volume: 0.9, muted: false },
        ui: { volume: 0.6, muted: false }
      }
    },
    diagnostics: { showOverlay: false }
  };
}

function getDefaultUIConfig() {
  return {
    designTokens: {},
    screenGraph: {
      splash: { module: 'screen.splash.js', parent: null, transition: 'fade', next: 'main-menu' },
      'main-menu': { module: 'screen.main-menu.js', parent: null, transition: 'fade' }
    },
    defaultTransition: 'fade'
  };
}

function getDefaultInputConfig() {
  return {
    actions: [],
    controllers: {
      keyboard: {
        enabled: true,
        defaultBindings: {}
      },
      gamepad: { enabled: true },
      touch: { enabled: true }
    }
  };
}

// Start the application
main();
