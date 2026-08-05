// barrel/scenes/scene.race.js
// The 3D race scene. Wires together: track (barrel), mode (barrel), player vehicle (barrel),
// AI vehicles (barrel, reusing vehicle modules), HUD overlay, camera rig, item boxes, lap logic.

import * as THREE from 'three';

class RaceScene {
  constructor() {
    this.id = 'race';
    this.type = '3d';
    this._built = null;
    this._player = null;
    this._ai = [];
    this._itemBoxes = [];
    this._checkpoints = [];
    this._currentCheckpoint = 0;
    this._hud = null;
    this._cameraRig = null;
    this._countdown = 3;
    this._countdownTimer = 0;
    this._raceStarted = false;
    this._matchState = {};
    this._unsubBus = [];
  }

  async mount(payload = {}) {
    const engine = window.__engine;
    const { mode: modeId, vehicle: vehicleId, character: characterId, track: trackId } = payload;
    if (!modeId || !vehicleId || !trackId) {
      console.error('[scene.race] missing required payload', payload);
      return;
    }

    engine.renderer.show();

    // Resolve barrel components
    const trackEntry = engine.resolver.resolve('tracks', trackId);
    const modeEntry  = engine.resolver.resolve('modes',  modeId);
    const vehEntry   = engine.resolver.resolve('vehicles', vehicleId);
    if (!trackEntry || !modeEntry || !vehEntry) {
      console.error('[scene.race] could not resolve barrel components', { trackEntry, modeEntry, vehEntry });
      return;
    }

    // Build track
    this._built = trackEntry.module.build(engine, trackEntry.entry);
    this._checkpoints = trackEntry.module.getCheckpoints(this._built);

    // Spawn player vehicle
    const startPos = trackEntry.module.getStartPosition(this._built);
    const playerStart = [startPos.x, 1, startPos.z];
    this._player = vehEntry.module.spawn(vehEntry.entry, { engine, physics: engine.physics, renderer: engine.renderer, input: engine.input }, playerStart);

    // Spawn 3 AI opponents (reuse same vehicle module for simplicity; can pick random)
    const allVehicles = engine.resolver.list('vehicles');
    for (let i = 0; i < 3; i++) {
      const aiVehEntry = allVehicles[i % allVehicles.length];
      const offset = (i + 1) * 3;
      const side = (i % 2 === 0 ? 1 : -1) * 2;
      const aiStart = [startPos.x + side, 1, startPos.z - offset];
      const aiVehicle = aiVehEntry.module.spawn(aiVehEntry, { engine, physics: engine.physics, renderer: engine.renderer, input: this._makeAIInput(engine, i) }, aiStart);
      this._ai.push({ vehicle: aiVehicle, module: aiVehEntry.module, nextCheckpoint: 0, lap: 0, id: `ai-${i}` });
    }

    // Camera rig (third-person chase)
    this._setupCamera();

    // HUD overlay
    this._setupHUD();

    // Item boxes
    this._setupItemBoxes();

    // Start mode
    modeEntry.module.onMatchStart({ engine, matchConfig: modeEntry.entry.matchConfig }, this._matchState);

    // Countdown
    this._countdown = 3;
    this._countdownTimer = 0;
    this._raceStarted = false;

    // Subscribe to events
    this._unsubBus.push(engine.bus.on('item:used', ({ vehicleId, itemId }) => {
      const itemEntry = engine.resolver.resolve('items', itemId);
      if (!itemEntry) return;
      const targetVehicle = this._ai[Math.floor(Math.random() * this._ai.length)]?.vehicle || null;
      itemEntry.module.activate({ engine, physics: engine.physics }, {
        vehicle: this._player, vehicleModule: vehEntry.module, targetVehicle
      });
    }));
    this._unsubBus.push(engine.bus.on('input:action:pause', () => {
      engine.bus.emit('ui:showPause');
    }));
  }

  _setupCamera() {
    const engine = window.__engine;
    this._cameraOffset = new THREE.Vector3(0, 4, -8);
    this._cameraLookOffset = new THREE.Vector3(0, 1.5, 4);
    engine.renderer.getCamera().position.copy(this._player.sceneObject.position).add(this._cameraOffset);
  }

  _setupHUD() {
    const hud = document.createElement('div');
    hud.id = 'race-hud';
    hud.innerHTML = `
      <div class="hud-corner hud-tl">
        <div class="hud-label">LAP</div>
        <div class="hud-value" id="hud-lap">1 / 3</div>
      </div>
      <div class="hud-corner hud-tr">
        <div class="hud-label">POSITION</div>
        <div class="hud-value" id="hud-pos">1/4</div>
      </div>
      <div class="hud-corner hud-bl">
        <div class="hud-label">ITEM</div>
        <div class="hud-value" id="hud-item">—</div>
      </div>
      <div class="hud-speed">
        <div class="hud-speed-num" id="hud-speed">0</div>
        <div class="hud-speed-unit">KM/H</div>
      </div>
      <div class="hud-minimap" id="hud-minimap"></div>
      <div class="hud-countdown" id="hud-countdown" style="display:none"></div>
      <div class="hud-controls-hint">
        WASD drive · SPACE drift/burnout · E item · ESC pause
      </div>
    `;
    document.body.appendChild(hud);
    this._hud = hud;
  }

  _setupItemBoxes() {
    const engine = window.__engine;
    const allItems = engine.resolver.list('items');
    if (allItems.length === 0) return;
    // Place 6 item boxes around the track
    for (let i = 0; i < 6; i++) {
      const t = (i + 0.5) / 6;
      const p = this._built.curve.getPoint(t);
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.2, 1.2),
        new THREE.MeshStandardMaterial({
          color: '#00e5ff', emissive: '#00e5ff', emissiveIntensity: 1.0,
          transparent: true, opacity: 0.7
        })
      );
      box.position.set(p.x, 1, p.z);
      box.userData = { type: 'item-box', cooldownUntil: 0 };
      engine.renderer.addObject(box);
      this._itemBoxes.push(box);
    }
  }

  _makeAIInput(engine, idx) {
    // Fake input object with throttled controls aimed at next checkpoint
    const ai = {
      _pressed: new Set(['throttle']),
      _axis: { steerLeft: 0, steerRight: 0 },
      isPressed: (a) => ai._pressed.has(a),
      getAxis: (a) => ai._axis[a] || 0,
      wasJustPressed: () => false,
      wasJustReleased: () => false,
      setAction: (a, v) => { if (v) ai._pressed.add(a); else ai._pressed.delete(a); },
      setAxis: (a, v) => { ai._axis[a] = v; },
      endFrame: () => {},
      pollGamepadForUI: () => {},
      _aiIdx: idx
    };
    return ai;
  }

  update(dt) {
    if (!this._player) return;
    const engine = window.__engine;

    // Countdown
    if (!this._raceStarted) {
      this._countdownTimer += dt;
      const cdEl = document.getElementById('hud-countdown');
      if (cdEl) {
        cdEl.style.display = 'flex';
        const remaining = 3 - Math.floor(this._countdownTimer);
        if (remaining > 0) {
          cdEl.textContent = remaining;
          cdEl.style.fontSize = `${120 + Math.sin(this._countdownTimer * 6) * 10}px`;
          cdEl.style.color = 'var(--accent-primary)';
        } else if (this._countdownTimer < 4) {
          cdEl.textContent = 'GO!';
          cdEl.style.color = 'var(--success)';
        }
      }
      if (this._countdownTimer >= 4) {
        this._raceStarted = true;
        if (cdEl) cdEl.style.display = 'none';
      }
      // During countdown: freeze the player vehicle (don't call update).
      // AI is also frozen for fairness.
      // Camera still tracks the player.
      const cam = engine.renderer.getCamera();
      const targetPos = tmpVec1.copy(this._player.sceneObject.position);
      const desiredCamPos = tmpVec2.copy(targetPos).add(this._cameraOffset);
      cam.position.lerp(desiredCamPos, Math.min(1, dt * 6));
      const lookTarget = tmpVec3.copy(targetPos).add(this._cameraLookOffset);
      cam.lookAt(lookTarget);
      return;
    }

    // Update player
    this._player.update(dt);

    // Update AI: steer toward next checkpoint
    for (const aiObj of this._ai) {
      this._updateAI(aiObj, dt);
      aiObj.module.update(aiObj.vehicle, dt);
    }

    // Camera chase
    const cam = engine.renderer.getCamera();
    const targetPos = tmpVec1.copy(this._player.sceneObject.position);
    const desiredCamPos = tmpVec2.copy(targetPos).add(this._cameraOffset);
    cam.position.lerp(desiredCamPos, Math.min(1, dt * 6));
    const lookTarget = tmpVec3.copy(targetPos).add(this._cameraLookOffset);
    cam.lookAt(lookTarget);

    // Checkpoint progression for player
    if (this._raceStarted) {
      this._checkPlayerCheckpoint();
      // Item box pickups
      this._checkItemBoxes();
    }

    // Update HUD
    this._updateHUD();
  }

  _updateAI(aiObj, dt) {
    const ai = aiObj.vehicle.ctx.input;
    const nextCp = this._checkpoints[aiObj.nextCheckpoint];
    if (!nextCp) return;
    const aiPos = aiObj.vehicle.physicsBody.position;
    const dx = nextCp.x - aiPos.x;
    const dz = nextCp.z - aiPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 8) {
      aiObj.nextCheckpoint = (aiObj.nextCheckpoint + 1) % this._checkpoints.length;
      if (aiObj.nextCheckpoint === 0) aiObj.lap++;
    }
    // Steer toward checkpoint
    const forward = new (aiObj.vehicle.ctx.physics.getCANNON().Vec3)(0, 0, 1);
    aiObj.vehicle.physicsBody.quaternion.vmult(forward, forward);
    const desired = new (aiObj.vehicle.ctx.physics.getCANNON().Vec3)(dx, 0, dz); desired.normalize();
    const cross = forward.cross(desired);
    const steer = Math.max(-1, Math.min(1, cross.y * 2));
    ai._axis.steerLeft = steer < 0 ? -steer : 0;
    ai._axis.steerRight = steer > 0 ? steer : 0;
    ai._pressed.add('throttle');
    // Random drift
    if (Math.abs(steer) > 0.5 && Math.random() > 0.7) ai._pressed.add('drift');
    else ai._pressed.delete('drift');
  }

  _checkPlayerCheckpoint() {
    const playerPos = this._player.sceneObject.position;
    const cp = this._checkpoints[this._currentCheckpoint];
    if (!cp) return;
    const dx = cp.x - playerPos.x;
    const dz = cp.z - playerPos.z;
    if (Math.sqrt(dx * dx + dz * dz) < 10) {
      this._currentCheckpoint = (this._currentCheckpoint + 1) % this._checkpoints.length;
      if (this._currentCheckpoint === 0) {
        // Lap complete
        const engine = window.__engine;
        const modeEntry = engine.resolver.resolve('modes', engine.state.get('race.payload').mode);
        if (modeEntry) modeEntry.module.onLapComplete({ engine, matchConfig: modeEntry.entry.matchConfig }, this._matchState, { vehicleId: 'player' });
      }
    }
  }

  _checkItemBoxes() {
    const playerPos = this._player.sceneObject.position;
    for (const box of this._itemBoxes) {
      if (performance.now() < box.userData.cooldownUntil) continue;
      const dx = box.position.x - playerPos.x;
      const dz = box.position.z - playerPos.z;
      if (Math.abs(dx) < 1.5 && Math.abs(dz) < 1.5) {
        box.userData.cooldownUntil = performance.now() + 5000;
        box.visible = false;
        // Grant random item
        const engine = window.__engine;
        const items = engine.resolver.list('items');
        if (items.length > 0) {
          const item = items[Math.floor(Math.random() * items.length)];
          this._player._heldItem = item.id;
        }
        setTimeout(() => { box.visible = true; }, 5000);
      }
    }
  }

  _updateHUD() {
    const engine = window.__engine;
    const speedEl = document.getElementById('hud-speed');
    if (speedEl) speedEl.textContent = Math.round(this._player.getSpeedKmh());
    const lapEl = document.getElementById('hud-lap');
    if (lapEl) {
      const total = this._matchState.laps || 3;
      const current = Math.min(total, (this._matchState.playerLaps || 0) + 1);
      lapEl.textContent = `${current} / ${total}`;
    }
    const itemEl = document.getElementById('hud-item');
    if (itemEl) itemEl.textContent = this._player._heldItem ? this._player._heldItem.toUpperCase() : '—';
    const posEl = document.getElementById('hud-pos');
    if (posEl) {
      // Simple position calc by lap + checkpoint progress
      const playerScore = (this._matchState.playerLaps || 0) * 100 + this._currentCheckpoint;
      let pos = 1;
      for (const ai of this._ai) {
        const aiScore = ai.lap * 100 + ai.nextCheckpoint;
        if (aiScore > playerScore) pos++;
      }
      posEl.textContent = `${pos}/${this._ai.length + 1}`;
    }
  }

  async unmount() {
    const engine = window.__engine;
    for (const unsub of this._unsubBus) unsub();
    this._unsubBus = [];

    if (this._player) { this._player.despawn(); this._player = null; }
    for (const ai of this._ai) ai.vehicle.despawn();
    this._ai = [];
    if (this._built?.group) engine.renderer.removeObject(this._built.group);
    if (this._hud) { this._hud.remove(); this._hud = null; }
    for (const box of this._itemBoxes) engine.renderer.removeObject(box);
    this._itemBoxes = [];

    engine.renderer.hide();
  }
}

const tmpVec1 = new THREE.Vector3();
const tmpVec2 = new THREE.Vector3();
const tmpVec3 = new THREE.Vector3();

const instance = new RaceScene();
export function mount(payload) { return instance.mount(payload); }
export function unmount() { return instance.unmount(); }
export function update(dt) { instance.update(dt); }
export default { mount, unmount, update, id: 'race', type: '3d' };
