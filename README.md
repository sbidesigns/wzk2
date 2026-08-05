---
title: WZK
emoji: 🏎️
colorFrom: red
colorTo: yellow
sdk: static
app_port: 7860
pinned: false
license: mit
tags:
  - game
  - three-js
  - racing
  - arcade
  - vanilla-js
---

# WARZONE KART — Neon Underground

Arcade driving game (Mario Kart feel × NFS Underground physics × AAA meta-loop).
Built with vanilla semantic HTML, ES modules, and CSS. No build step. No framework.

## Stack (pinned as of 2026-08-03)

- **three.js** r0.160.0 — 3D rendering, PBR, post-processing
- **cannon-es** 0.20.0 — rigid-body physics, raycast vehicle
- **howler.js** 2.2.4 — audio bus routing
- **gsap** 3.12.5 — UI / cutscene tweening
- **localforage** 1.10.0 — save data persistence

## Architecture

The project has an **immutable core** (`/core`) — 12 framework-level files that never need editing per-feature — and a **barrel-loaded** system (`/barrel`) where every vehicle, character, controller, mode, track, item, scene, and UI screen is a self-contained module registered through a schema-validating Resolver.

**Anti-alien-design guard**: every barrel component must declare a manifest entry that matches its category's JSON schema AND export the required interface. Components that fail validation are **rejected at boot** — the game still runs, the bad component just doesn't appear. This prevents the "isolated parts that never tie together" failure mode.

See `ARCHITECTURE.md` for the full spec.

## Controls

- **WASD** or **Arrows** — drive
- **Space** — drift / burnout (from standstill: hold throttle+brake)
- **E** — use item
- **C** — look back
- **R** — reset to track
- **Escape** — pause
- **Gamepad** — auto-detected (XInput mapping)
- **Touch** — on-screen controls on touch devices

## How to extend

- **Add a vehicle**: drop `barrel/vehicles/vehicle.foo.js`, add one entry to `barrel/vehicles/manifest.json`. Reboot. The vehicle appears in vehicle-select.
- **Add a track**: drop `barrel/tracks/track.bar.js`, add to manifest.
- **Add a mode / character / item / controller / screen**: same pattern.
- **Rebalance the game**: edit `config/game.config.json`. No code changes.
- **Swap renderer**: replace `core/Renderer.js` only. Public interface is the contract.
