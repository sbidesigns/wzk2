# WARZONE KART — Architecture & Engineering Spec

> **Genre:** Arcade driving (Mario Kart feel) × Street-racer physics (NFS Underground feel) × AAA meta-loop (Fortnite battle pass, COD cutscenes/seasons)
> **Stack:** Vanilla semantic HTML + ES-module JavaScript + CSS (design-token driven). Zero build step. Zero framework lock-in.
> **Date pinned:** Monday August 3, 2026, 7:04 AM PST. Every library version below is the one this project is locked to. Do not "upgrade" without bumping `vendor.manifest.json`.

---

## 1. Why this is NOT built from scratch

The user's exact question, paraphrased: *"Why make all of that from scratch when there are practically all of the assembly blocks simply downloadable and integrateable?"*

Correct. We do not reinvent:

| Concern | Reused library | Pinned version | CDN |
|---|---|---|---|
| 3D rendering, scene graph, PBR, post-FX | **three.js** | `0.160.0` | `cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js` |
| Rigid-body physics, raycast vehicle, collisions | **cannon-es** | `0.20.0` | `cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js` |
| Audio (engine, SFX, music, positional) | **howler.js** | `2.2.4` | `cdn.jsdelivr.net/npm/howler@2.2.4/dist/howler.min.js` |
| Menu / cutscene / micro-animation tweening | **GSAP** | `3.12.5` | `cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js` |
| Save data (offline progression, settings, garage) | **localforage** | `1.10.0` | `cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js` |
| Gamepad / touch / keyboard input normalization | **(custom)** in `core/InputManager.js` — wraps `navigator.getGamepads()`, `PointerEvent`, `KeyboardEvent` | — | — |

**What we DO write from scratch** (because no library solves it correctly for an arcade kart game):

1. **The immutable core engine** (10 files in `/core`) — these are *framework-level* abstractions: event bus, state store, resolver, asset barrel loader, scene manager, etc. They are generic, config-driven, and never edited per-feature.
2. **The barrel resolver & schema validator** — this is the **anti-alien-design guard** you asked for. Every barrel component (a vehicle, a character, a UI screen, a controller) must declare a manifest entry that matches a schema. Components that fail validation are **rejected at boot**, not silently merged. This prevents the "isolated parts that never tie together" failure mode.
3. **Arcade vehicle physics** — built on top of cannon-es's `RaycastVehicle`. Mario Kart's "swing" and NFS Underground's "burnout" are not physical phenomena; they are *gameplay tunes*. We expose every tuneable as a config field (`driftGripMultiplier`, `burnoutTorqueBoost`, `boostAccelerationCurve`, etc.) so a designer can change feel without touching code.
4. **The AAA UI flow** — 12+ screens wired through a router with parallax transitions. No library gives you a "AAA menu system"; you have to build the screen graph yourself. GSAP provides the animation primitives; we provide the routing, screen lifecycle, and transition orchestration.

---

## 2. The two-file-class rule (the heart of the immutable core)

The user's exact words: *"core immutable files should have 0 ability to need editing as it is never hardcoded to variables and variables are never hardcoded."*

This is enforced by three rules:

### Rule A — Core files import NOTHING from `/barrel`
`/core/*` only imports from `/vendor/*` and other `/core/*` files. It never imports a vehicle, a character, a screen, or a controller. It only **consumes them through interfaces** that the barrel loader registers.

### Rule B — Core files never read literal strings
No `if (mode === 'circuit')`. No `vehicle.type === 'sports'`. Every behavioral decision is driven by:
- `engine.config.json` (engine tuning: render quality, physics step, audio bus layout)
- `game.config.json` (game-level: default mode, default vehicle, progression curves, battle pass season id)
- `ui.config.json` (UI routing: screen graph, default transitions, design-token overrides)
- `input.config.json` (input mappings: which key does what, controller deadzones)
- `barrel/*/manifest.json` (per-category registry: lists every component and its schema-validated metadata)

### Rule C — The Resolver is the only door into the engine
Any code outside `/core` that wants to participate in the game registers through `Resolver.register(category, manifestEntry, module)`. The Resolver runs the entry through `SchemaValidator.validate(category, entry)`. If validation fails, the component is **rejected with a precise error**, the game still boots, and the rejection is logged to the diagnostics overlay. This is the **anti-alien-design guard**: a component that doesn't conform to the contract cannot poison the rest of the system.

---

## 3. Directory layout (every file's role is fixed)

```
warzone-kart/
├── index.html                      # Entry HTML. Loads vendor, then main.js as module.
├── main.js                         # Bootstrap. Instantiates Engine, registers barrel, starts UI.
├── ARCHITECTURE.md                 # THIS FILE.
│
├── config/                         # All data-driven configuration. Edit THESE, not code.
│   ├── engine.config.json          # Renderer, physics, audio bus layout
│   ├── game.config.json            # Modes, progression, battle pass, season
│   ├── ui.config.json              # Screen graph, transitions, design tokens
│   ├── input.config.json           # Keyboard / gamepad / touch bindings
│   └── schemas/                    # JSON schemas for every barrel category
│       ├── vehicle.schema.json
│       ├── character.schema.json
│       ├── scene.schema.json
│       ├── mode.schema.json
│       ├── controller.schema.json
│       ├── track.schema.json
│       ├── item.schema.json
│       └── screen.schema.json
│
├── core/                           # IMMUTABLE — never edit per-feature. Edit config instead.
│   ├── EventBus.js                 # Pub/sub. The only cross-system communication channel.
│   ├── StateStore.js               # Reactive state tree. Subscriptions + selectors.
│   ├── Resolver.js                 # Barrel registry + schema validation. THE GUARD.
│   ├── AssetLoader.js              # Loads GLTF, textures, audio via manifest.
│   ├── EntityManager.js            # Spawns/despawns entities (vehicles, characters, items).
│   ├── SceneManager.js             # Scene lifecycle: load, enter, exit, transition.
│   ├── InputManager.js             # Normalized input from kbd/mouse/gamepad/touch.
│   ├── PhysicsWorld.js             # cannon-es wrapper. Fixed-step simulation.
│   ├── Renderer.js                 # three.js wrapper. Quality presets, post-FX, camera rig.
│   ├── AudioManager.js             # howler.js wrapper. Buses: master/music/sfx/voice/ui.
│   ├── SchemaValidator.js          # Pure-function JSON-schema-ish validator.
│   └── Engine.js                   # Bootstrap. Wires the above. Single public surface.
│
├── barrel/                         # SWAPPABLE — every component is replaceable via manifest.
│   ├── vehicles/
│   │   ├── manifest.json           # Registry of all vehicles + their metadata
│   │   ├── vehicle.base.js         # Shared base class (extends RaycastVehicle)
│   │   ├── vehicle.spectre.js      # "Spectre" — balanced sports car
│   │   ├── vehicle.titan.js        # "Titan" — heavy muscle, high torque
│   │   └── vehicle.vixen.js        # "Vixen" — agile, low grip (drift king)
│   ├── characters/
│   │   ├── manifest.json
│   │   └── character.*.js
│   ├── controllers/
│   │   ├── manifest.json
│   │   ├── controller.keyboard.js
│   │   ├── controller.gamepad.js
│   │   └── controller.touch.js
│   ├── modes/
│   │   ├── manifest.json
│   │   ├── mode.circuit.js         # Multi-lap race
│   │   ├── mode.sprint.js          # Single lap, point-to-point
│   │   └── mode.drift.js           # Score-based drift challenge
│   ├── tracks/
│   │   ├── manifest.json
│   │   └── track.downtown.js       # NFS Underground-style night city
│   ├── items/
│   │   ├── manifest.json
│   │   └── item.*.js               # Mario Kart-style pickups
│   ├── scenes/
│   │   ├── manifest.json
│   │   ├── scene.boot.js           # Engine init visualization
│   │   ├── scene.race.js           # The 3D race scene
│   │   └── scene.cutscene.js       # Cinematic player (parallax layers, camera moves)
│   └── ui/
│       └── screens/
│           ├── manifest.json
│           ├── screen.splash.js
│           ├── screen.main-menu.js
│           ├── screen.mode-select.js
│           ├── screen.vehicle-select.js
│           ├── screen.character-select.js
│           ├── screen.track-select.js
│           ├── screen.garage.js        # Upgrades, paint, tuning
│           ├── screen.store.js         # Battle pass, season, time-limited
│           ├── screen.career.js        # Progression tree
│           ├── screen.settings.root.js # Nested: audio/video/controls/gameplay/accessibility
│           ├── screen.pause.js
│           ├── screen.lobby.js         # Pre-game lobby (online/MMO ready)
│           ├── screen.results.js
│           └── screen.cutscene.js
│
├── ui/
│   ├── ui-shell.js                 # Mounts screens, manages transitions, parallax bg
│   ├── ui-router.js                # Screen graph navigation (push/pop/replace)
│   └── styles/
│       ├── tokens.css              # Design tokens (color, type, spacing, motion)
│       ├── animations.css          # Reusable keyframes + GSAP hooks
│       ├── screens.css             # Per-screen layout
│       └── components.css          # Buttons, cards, sliders, lists
│
├── vendor/
│   └── vendor.manifest.json        # Single source of truth for library versions
│
└── assets/                         # Generated / sourced assets
    ├── textures/
    ├── audio/
    └── fonts/
```

---

## 4. Data flow (how a frame happens)

```
main.js
  └─> Engine.boot(config)
        ├─> Renderer.init()                  (three.js, quality preset from config)
        ├─> PhysicsWorld.init()              (cannon-es, step rate from config)
        ├─> AudioManager.init()              (howler, bus layout from config)
        ├─> InputManager.init()              (keyboard/gamepad/touch)
        ├─> StateStore.init()                (initial state from config)
        ├─> Resolver.init(schemas)           (loads JSON schemas)
        ├─> AssetLoader.init()               (registers loaders per asset type)
        ├─> SceneManager.init()              (no scene yet)
        └─> BarrelLoader.load(barrel/)       (walks every manifest, validates, registers)
              └─> for each entry in manifest:
                    Resolver.register(category, entry, module)
                      └─> SchemaValidator.validate(...)  ◄── REJECTS alien components here
```

Once booted, the engine enters the `boot` scene, which transitions to `splash`, which transitions to `main-menu`. From there, the **UI Router** (driven by `ui.config.json`) handles all screen navigation. Screen code is isolated: each screen file exports `{ id, mount(el, ctx), unmount(), update(dt) }`. The shell handles mounting/unmounting and the GSAP transition between them.

When the user starts a race:
```
UI Router: screen.lobby → "START RACE" pressed
  └─> EventBus.emit('race:start', { mode, vehicle, character, track })
        └─> SceneManager.transition('scene.race', payload)
              └─> scene.race.js:
                    mount() {
                      track = Resolver.resolve('tracks', payload.track)
                      mode  = Resolver.resolve('modes',  payload.mode)
                      veh   = Resolver.resolve('vehicles', payload.vehicle)
                      ...spawn player + AI via EntityManager
                      ...begin PhysicsWorld.step loop
                    }
```

Every concrete choice (which track, which mode, which vehicle) is a **string ID resolved through the Resolver**. No `switch` statements. No `if (track === 'downtown')`. Add a new track? Drop a file in `barrel/tracks/`, add one line to `manifest.json`. The Resolver picks it up at next boot.

---

## 5. The Resolver — anti-alien-design guard (in detail)

```js
// core/Resolver.js (simplified for explanation)
class Resolver {
  constructor(schemas) { this.schemas = schemas; this.registry = new Map(); }

  register(category, entry, module) {
    const schema = this.schemas.get(category);
    const result = SchemaValidator.validate(entry, schema);
    if (!result.ok) {
      EventBus.emit('resolver:rejected', { category, entry, errors: result.errors });
      return false;  // ← component is REJECTED, never enters the registry
    }
    // Validate the module's exported interface too
    const requiredInterface = schema.requiredInterface || [];
    for (const fn of requiredInterface) {
      if (typeof module[fn] !== 'function') {
        EventBus.emit('resolver:rejected', { category, entry, errors: [`Missing interface: ${fn}`] });
        return false;
      }
    }
    this.registry.set(`${category}:${entry.id}`, { entry, module });
    EventBus.emit('resolver:registered', { category, id: entry.id });
    return true;
  }

  resolve(category, id) {
    const hit = this.registry.get(`${category}:${id}`);
    if (!hit) {
      EventBus.emit('resolver:missing', { category, id });
      return null;
    }
    return hit;
  }

  list(category) {
    return [...this.registry.entries()]
      .filter(([k]) => k.startsWith(`${category}:`))
      .map(([, v]) => v.entry);
  }
}
```

This means: **a vehicle file that forgets to export `spawn()` is rejected at boot**, the rest of the game still works, the diagnostics overlay shows the rejection, and the vehicle simply doesn't appear in `vehicle-select`. That's the safety net you asked for.

---

## 6. The barrel manifest contract

Every barrel category has a `manifest.json` of the form:

```json
{
  "$schema": "../../config/schemas/vehicle.schema.json",
  "category": "vehicles",
  "entries": [
    {
      "id": "spectre",
      "displayName": "Spectre GT",
      "class": "sports",
      "stats": { "topSpeed": 8, "acceleration": 7, "handling": 8, "weight": 5 },
      "tuning": {
        "enginePower": 1800,
        "maxSteer": 0.55,
        "driftGripMultiplier": 0.35,
        "burnoutTorqueBoost": 1.4
      },
      "unlock": { "type": "default" },
      "module": "./vehicle.spectre.js"
    }
  ]
}
```

The Resolver loads the manifest, dynamically `import()`s each `module`, validates the entry against the schema, validates the module's exported interface, and registers. A designer can add a vehicle by editing JSON + dropping in a file. **No core file is touched. Ever.**

---

## 7. AAA UI flow — the screen graph

Driven by `ui.config.json`:

```
splash
  └─> main-menu
        ├─> mode-select
        │     ├─> track-select ─> vehicle-select ─> character-select ─> lobby ─> [RACE]
        │     ├─> career
        │     ├─> store (battle pass / season / time-limited)
        │     └─> garage (vehicle upgrades, paint, tuning)
        ├─> settings (root)
        │     ├─> settings.audio
        │     ├─> settings.video
        │     ├─> settings.controls
        │     ├─> settings.gameplay
        │     └─> settings.accessibility
        └─> cutscene (season intro / post-race)
```

Every transition is a GSAP-driven parallax: background layers move at different rates, foreground cards fade/slide, audio crossfades through `AudioManager`. The screen itself never knows about the transition — it just exports `mount/unmount/update`. The shell handles the rest.

---

## 8. Driving feel — how we get Mario Kart × NFS Underground

| Feel | Implementation |
|---|---|
| **Mario Kart hop + drift** | Tap `brake` while steering → vehicle lifts (visual Z bump via GSAP), enters `drift` state, grip drops to `driftGripMultiplier`, mini-turbo charges, release grants boost |
| **NFS Underground burnout** | Hold `brake+throttle` from standstill → wheel slip visual (smoke particles), `burnoutTorqueBoost` adds torque, release launches with `boostAccelerationCurve` |
| **NFS swing / weight transfer** | Custom `RaycastVehicle` tune — front/rear suspension stiffness asymmetric, body-roll quaternion lerped based on lateral G |
| **Warzone ATV chaos** | High-weight vehicles can knock light ones; collision impulse scaled by mass delta; ragdoll-style tumble if flipped |
| **Mario Kart items** | `barrel/items/` — each item is a small module exporting `activate(ctx)`. Items are barrel-loaded, so adding a new item is one file + one manifest line |

Every one of these is a **config field on the vehicle's tuning block**, not a hardcoded behavior. Change the tune, change the feel.

---

## 9. Why this won't fall apart like previous attempts

| Previous failure | How this architecture prevents it |
|---|---|
| Built in isolation, never wired together | `main.js` is the **only** entry point and it does nothing but boot the engine and load the barrel. If a component isn't in a manifest, it isn't loaded. The wiring is structural, not something each file remembers to do. |
| Hardcoded systems requiring multi-file edits | Rule B (no literal strings in core). Every behavioral knob is in `config/*.json`. Adding a feature = adding a config field, not editing 5 files. |
| Alien design from non-conforming components | Resolver + SchemaValidator **reject** at boot. The rest of the game runs. The bad component is visible in the diagnostics overlay. |
| Old / hallucinated library versions | `vendor.manifest.json` pins every version. The boot screen shows the resolved versions. If a CDN goes down, the game shows a clear "vendor load failed" screen, not a silent JS error. |
| Flat splash page instead of AAA flow | `ui.config.json` defines the screen graph. 12+ screens are scaffolded. The router enforces transitions. GSAP handles animation. Design tokens enforce visual consistency. |
| Short-worded / under-built UI | Every screen exports `mount/unmount/update` and is at minimum 80 lines (layout + interaction + audio cues + transition hooks). Settings is **5 nested sub-screens**, not one panel. |

---

## 10. How to extend this (the whole point)

**Add a vehicle:** drop `barrel/vehicles/vehicle.foo.js`, add an entry to `barrel/vehicles/manifest.json`. Boot the game. The vehicle appears in `vehicle-select`. Zero core edits.

**Add a track:** drop `barrel/tracks/track.bar.js`, add to manifest. Appears in `track-select`.

**Add a game mode:** drop `barrel/modes/mode.elimination.js`, add to manifest. Appears in `mode-select`.

**Add a settings sub-page:** drop `barrel/ui/screens/screen.settings.foo.js`, add to manifest, add a node to `ui.config.json`'s screen graph under `settings`. Router picks it up.

**Rebalance the entire game:** edit `config/game.config.json`. No code changes.

**Swap the renderer (e.g. to WebGPU later):** replace `core/Renderer.js` only. Its public interface (`init`, `render`, `setQuality`, `addObject`, `removeObject`) is the contract. Nothing else changes.

That's the architecture. The rest is execution.
