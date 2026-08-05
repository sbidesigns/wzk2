// ui/race-scene.js — AAA RACING SCENE
// Dual Mode: Track-Bound (NFS/Mario Kart) AND Open-World (Free Roam)
// Performance: Merged geometries, instanced meshes, minimal draw calls
// HUD: Proper DOM structure matching hud.css exactly

import * as THREE from 'three';

export class RaceScene {
  // Racing mode constants
  static get MODE() { return { TRACK_BOUND: 'track_bound', OPEN_WORLD: 'open_world' }; }
  static get RACE_TYPE() { return { QUICK_RACE: 'quick_race', TIME_TRIAL: 'time_trial', CAREER: 'career', TOURNAMENT: 'tournament', ONLINE: 'online' }; }
  
  constructor(raceConfig) {
    // raceConfig: { mode: 'track_bound'|'open_world', raceType: 'quick_race'|'time_trial'|..., laps: 3, ... }
    // FIXED: Default to OPEN_WORLD mode for proper free-roam driving (user can switch to TRACK_BOUND)
    this._raceConfig = raceConfig || { mode: RaceScene.MODE.OPEN_WORLD, raceType: RaceScene.RACE_TYPE.QUICK_RACE, laps: 3 };
    
    this._scene = null;
    this._camera = null;
    this._renderer = null;
    this._track = null;
    this._vehicle = null;
    this._sky = null;
    this._lights = {
      ambient: null,
      directional: null,
      pointLights: [],
      spotLights: []
    };
    this._clock = new THREE.Clock();
    
    this._barrelVehicle = null;
    this._useBarrelVehicle = false;
    this._vehicleContext = null;
    
    // Track-following state (for track-bound mode)
    this._trackProgress = 0;        // Position along spline (0-1)
    this._lateralOffset = 0;        // Left/right offset on track (-1 to 1)
    this._targetLateralOffset = 0;  // Smoothed lateral target
    
    this._state = {
      running: false,
      speed: 0,
      position: 0,
      lap: 1,
      totalLaps: this._raceConfig.laps || 3,
      countdown: false,
      raceStarted: false,
      countdownValue: 3,
      bestLapTime: Infinity,
      lapTimes: [],
      checkpointsPassed: 0,
      totalCheckpoints: 16
    };
    
    this._trackSegments = [];
    this._trackLength = 2000;
    this._trackWidth = 20;
    
    this._keys = {
      throttle: false,
      brake: false,
      steerLeft: false,
      steerRight: false,
      drift: false
    };
    
    this._onKeyDown = this._handleKeyDown.bind(this);
    this._onKeyUp = this._handleKeyUp.bind(this);
    this._hudElement = null;
  }
  
  _setupInputListeners() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }
  
  _removeInputListeners() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
  }
  
  _handleKeyDown(e) {
    switch(e.code) {
      case 'KeyW': case 'ArrowUp': 
        this._keys.throttle = true; 
        if (window.__engine && window.__engine.input) window.__engine.input._setAction('throttle', 1);
        break;
      case 'KeyS': case 'ArrowDown': 
        this._keys.brake = true; 
        if (window.__engine && window.__engine.input) window.__engine.input._setAction('brake', 1);
        break;
      case 'KeyA': case 'ArrowLeft': 
        this._keys.steerLeft = true; 
        if (window.__engine && window.__engine.input) window.__engine.input._setAction('steerLeft', 1);
        break;
      case 'KeyD': case 'ArrowRight': 
        this._keys.steerRight = true; 
        if (window.__engine && window.__engine.input) window.__engine.input._setAction('steerRight', 1);
        break;
      case 'Space': 
        this._keys.drift = true; 
        if (window.__engine && window.__engine.input) window.__engine.input._setAction('drift', 1);
        break;
    }
  }
  
  _handleKeyUp(e) {
    switch(e.code) {
      case 'KeyW': case 'ArrowUp': 
        this._keys.throttle = false; 
        if (window.__engine && window.__engine.input) window.__engine.input._setAction('throttle', 0);
        break;
      case 'KeyS': case 'ArrowDown': 
        this._keys.brake = false; 
        if (window.__engine && window.__engine.input) window.__engine.input._setAction('brake', 0);
        break;
      case 'KeyA': case 'ArrowLeft': 
        this._keys.steerLeft = false; 
        if (window.__engine && window.__engine.input) window.__engine.input._setAction('steerLeft', 0);
        break;
      case 'KeyD': case 'ArrowRight': 
        this._keys.steerRight = false; 
        if (window.__engine && window.__engine.input) window.__engine.input._setAction('steerRight', 0);
        break;
      case 'Space': 
        this._keys.drift = false; 
        if (window.__engine && window.__engine.input) window.__engine.input._setAction('drift', 0);
        break;
    }
  }

  async mount(payload = {}) {
    console.log('[RaceScene] Mounting (OPTIMIZED)...');
    
    if (window.__engine) {
      this._renderer = window.__engine.renderer.getRenderer();
      this._scene = window.__engine.renderer.getScene();
      this._camera = window.__engine.renderer.getCamera();
      this._applyRendererOptimizations();
    }
    
    if (!this._scene || !this._camera || !this._renderer) {
      console.error('[RaceScene] Cannot mount');
      return;
    }
    
    this._config = payload;
    this._state.totalLaps = payload.laps || 3;
    this._state.track = payload.track || 'neon-dragway';
    
    const canvas = document.getElementById('game-canvas');
    if (canvas) canvas.style.display = 'block';
    
    this._setupInputListeners();
    
    try { this._createSky(); } catch (e) { console.error('[RaceScene] Sky failed:', e); }
    try { this._createLights(); } catch (e) { console.error('[RaceScene] Lights failed:', e); }
    try { this._createGround(); } catch (e) { console.error('[RaceScene] Ground failed:', e); }
    try { await this._createTrack(); } catch (e) { console.error('[RaceScene] Track failed:', e); }
    
    // AAA FIX: Always use fallback vehicle (barrel vehicle physics is broken - no ground plane)
    this._useBarrelVehicle = false;
    this._createVehicle();
    this._positionVehicleAtStart();
    
    try { this._createScenery(); } catch (e) { console.error('[RaceScene] Scenery failed:', e); }
    try { this._createHUDElements(); } catch (e) { console.error('[RaceScene] HUD failed:', e); }
    
    // AAA FIX: Set camera BEHIND vehicle based on heading (not hardcoded offset)
    if (this._camera && this._vehicle) {
      var startHeading = this._heading || 0;
      var camDist = 14;
      var camH = 6;
      this._camera.position.set(
        this._vehicle.position.x - Math.sin(startHeading) * camDist,
        this._vehicle.position.y + camH,
        this._vehicle.position.z - Math.cos(startHeading) * camDist
      );
      var lookAhead = new THREE.Vector3(
        this._vehicle.position.x + Math.sin(startHeading) * 20,
        this._vehicle.position.y + 0.5,
        this._vehicle.position.z + Math.cos(startHeading) * 20
      );
      this._camera.lookAt(lookAhead);
    }
    
    this._state.running = true;
    console.log('[RaceScene] Mounted' + (this._useBarrelVehicle ? ' +BARREL' : ' +FALLBACK'));
    
    if (window.__engine && window.__engine.bus) {
      window.__engine.bus.emit('race:sceneReady', { scene: this });
      window.__engine.bus.once('race:go', () => {
        this._state.raceStarted = true;
        this._barrelVehicleWatchdogStart = this._clock.getElapsedTime();
      });
    }
  }
  
  _applyRendererOptimizations() {
    if (!this._renderer) return;
    this._renderer.shadowMap.enabled = false;
    const pixelRatio = Math.min(window.devicePixelRatio, 1.5);
    this._renderer.setPixelRatio(pixelRatio);
  }

  async _spawnBarrelVehicle(payload = {}) {
    const vehicleRegistry = window.__vehicleRegistry;
    const defaultVehicle = window.__defaultVehicle;
    
    if (!vehicleRegistry || vehicleRegistry.length === 0 || !defaultVehicle) return false;
    
    const entry = defaultVehicle.entry;
    const module = defaultVehicle.module;
    
    this._vehicleContext = {
      engine: window.__engine,
      physics: window.__engine ? window.__engine.physics : null,
      renderer: window.__engine ? window.__engine.renderer : null,
      input: window.__engine ? window.__engine.input : null,
      scene: this._scene
    };
    
    if (!this._vehicleContext.physics || !this._vehicleContext.physics.getCANNON) return false;
    
    try {
      if (typeof module.spawn === 'function') {
        // FIXED: Use proper starting position from track data instead of hardcoded coords
        var spawnPos = [0, 1, -this._trackLength / 2 + 15];
        if (this._trackData && this._trackData.startPos) {
          spawnPos = [this._trackData.startPos.x, 1, this._trackData.startPos.z];
        }
        this._barrelVehicle = module.spawn(entry, this._vehicleContext, spawnPos);
        if (!this._barrelVehicle || !this._barrelVehicle.physicsBody) return false;
        
        // FIXED: Immediately set correct orientation from track start tangent
        if (this._trackData && this._trackData.startTan && this._barrelVehicle.physicsBody.quaternion) {
          var angle = Math.atan2(this._trackData.startTan.x, this._trackData.startTan.z);
          var q = new THREE.Quaternion();
          q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
          this._barrelVehicle.physicsBody.quaternion.copy(q);
          this._heading = angle;
        }
        
        this._useBarrelVehicle = true;
        window.__raceScene._barrelVehicle = this._barrelVehicle;
        this._barrelVehicleWatchdogStart = this._clock.getElapsedTime();
        this._barrelVehicleWatchdogActive = true;
        return true;
      }
      return false;
    } catch (e) {
      console.warn('[RaceScene] Barrel spawn failed:', e);
      return false;
    }
  }

  async unmount() {
    this._state.running = false;
    this._removeInputListeners();
    
    if (this._barrelVehicle && this._useBarrelVehicle) {
      try { if (typeof this._barrelVehicle.despawn === 'function') this._barrelVehicle.despawn(); } catch(e) {}
      this._barrelVehicle = null;
      this._useBarrelVehicle = false;
    }
    
    if (this._scene) {
      while (this._scene.children.length > 0) {
        const obj = this._scene.children[0];
        this._disposeObject(obj);
        this._scene.remove(obj);
      }
    }
    
    if (this._hudElement && this._hudElement.parentNode) {
      this._hudElement.parentNode.removeChild(this._hudElement);
    }
    
    this._track = null;
    this._vehicle = null;
    this._sky = null;
    this._trackSegments = [];
    this._hudElement = null;
  }
  
  _disposeObject(obj) {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach(function(m) { m.dispose(); });
      else obj.material.dispose();
    }
    if (obj.children) obj.children.forEach(function(c) { this._disposeObject(c); }.bind(this));
  }

  update(dt) {
    if (!this._state.running) return;
    
    // Always use fallback vehicle (barrel physics disabled)
    if (this._vehicle) {
      this._updateFallbackVehicle(dt);
    }
    
    this._updateCamera(dt);
    this._updateHUDDirect();
  }
  
  _switchToFallbackVehicle() {
    if (this._barrelVehicle && typeof this._barrelVehicle.despawn === 'function') {
      try { this._barrelVehicle.despawn(); } catch(e) {}
    }
    this._barrelVehicle = null;
    this._useBarrelVehicle = false;
    this._barrelVehicleWatchdogActive = false;
    if (!this._vehicle) this._createVehicle();
    // FIXED: Use proper start position when switching to fallback
    if (this._vehicle) this._positionVehicleAtStart();
  }
  
  _updateBarrelVehicle(dt) {
    if (!this._barrelVehicle) return;
    try {
      if (typeof this._barrelVehicle.update === 'function') this._barrelVehicle.update(dt);
      
      var speedKmh = this._barrelVehicle.speedKmh || 0;
      this._state.speed = speedKmh / 3.6;
      
      if (window.__engine && window.__engine.bus) {
        window.__engine.bus.emit('player:speedChanged', { speed: this._state.speed, maxSpeed: 60, speedKmh: Math.round(speedKmh * 10) / 10 });
        
        var pos = this._barrelVehicle.physicsBody ? this._barrelVehicle.physicsBody.position : null;
        if (pos) {
          this._state.position = Math.abs(pos.z) + this._trackLength / 2;
          if (this._state.position > this._trackLength) {
            this._state.position = 0;
            this._state.lap++;
            window.__engine.bus.emit('player:lapCompleted', { lapNumber: this._state.lap - 1, lapTime: this._clock.getElapsedTime() });
          }
          this._minimapUpdateTimer = (this._minimapUpdateTimer || 0) + dt;
          if (this._minimapUpdateTimer > 0.15) {
            this._minimapUpdateTimer = 0;
            window.__engine.bus.emit('player:positionUpdate', { x: pos.x, y: pos.z, rotation: this._vehicle ? this._vehicle.rotation.y : 0, opponents: [] });
          }
        }
        window.__engine.bus.emit('player:positionChanged', { position: 1, totalRacers: 8 });
        var gear = Math.min(6, Math.max(1, Math.floor(speedKmh / 30) + 1));
        window.__engine.bus.emit('player:gearChanged', { gear: gear });
      }
    } catch (e) {
      console.warn('[RaceScene] Barrel update error:', e);
    }
  }
  
  _updateFallbackVehicle(dt) {
    if (!this._vehicle) return;
    
    // DUAL MODE: Track-Bound (NFS style) OR Open-World (free roam)
    if (this._raceConfig.mode === RaceScene.MODE.TRACK_BOUND && this._trackData && this._trackData.curve) {
      this._updateTrackBoundVehicle(dt);
    } else {
      this._updateOpenWorldVehicle(dt);
    }
  }
  
  // TRACK-BOUND MODE: Car follows spline curve like NFS/Mario Kart
  _updateTrackBoundVehicle(dt) {
    var curve = this._trackData.curve;
    var trackLen = curve.getLength();
    
    // Physics constants
    var accelRate = 55;
    var brakeRate = 95;
    var maxSpeed = 65;
    var steerRate = 4.0;
    var lateralSpeed = 12; // How fast car moves side-to-side on track
    var friction = 1.5;
    var halfWidth = (this._trackWidth || 20) / 2 - 1.5; // Usable track width
    
    // Speed control
    if (this._keys.throttle && !this._keys.brake) {
      this._state.speed = Math.min(maxSpeed, this._state.speed + accelRate * dt);
    } else if (this._keys.brake && !this._keys.throttle) {
      if (this._state.speed > 0) this._state.speed = Math.max(0, this._state.speed - brakeRate * dt);
      else this._state.speed = Math.max(-maxSpeed * 0.2, this._state.speed - accelRate * dt * 0.5);
    } else {
      if (this._state.speed > 0) this._state.speed = Math.max(0, this._state.speed - friction * dt);
      else if (this._state.speed < 0) this._state.speed = Math.min(0, this._state.speed + friction * dt);
      if (Math.abs(this._state.speed) < 0.1) this._state.speed = 0;
    }
    
    // FIXED: Lateral steering - Left key now moves LEFT (negative offset), Right key moves RIGHT (positive offset)
    // In screen space: left side of screen = negative X = negative lateral offset
    if (this._keys.steerLeft) this._targetLateralOffset = Math.max(-1, this._targetLateralOffset - steerRate * dt * 0.8);
    else if (this._keys.steerRight) this._targetLateralOffset = Math.min(1, this._targetLateralOffset + steerRate * dt * 0.8);
    else this._targetLateralOffset *= 0.9; // Center slowly when no input
    
    // Smooth lateral movement
    this._lateralOffset += (this._targetLateralOffset - this._lateralOffset) * Math.min(1, lateralSpeed * dt);
    
    // Clamp to track bounds
    this._lateralOffset = Math.max(-1, Math.min(1, this._lateralOffset));
    
    // Progress along track based on speed
    var progressDelta = (this._state.speed / trackLen) * dt;
    this._trackProgress += progressDelta;
    
    // Handle lap completion (loop around)
    if (this._trackProgress >= 1) {
      this._trackProgress -= 1;
      var lapTime = this._clock.getElapsedTime();
      this._state.lapTimes.push(lapTime);
      
      if (lapTime < this._state.bestLapTime) {
        this._state.bestLapTime = lapTime;
      }
      
      this._state.lap++;
      if (window.__engine) window.__engine.bus.emit('player:lapCompleted', { 
        lapNumber: this._state.lap - 1, 
        lapTime: lapTime,
        bestLapTime: this._state.bestLapTime
      });
      
      // Check race completion
      if (this._state.lap > this._state.totalLaps) {
        this._finishRace();
        return;
      }
    }
    
    // Handle reverse (going backwards on track)
    if (this._trackProgress < 0) {
      this._trackProgress += 1;
      this._state.lap--;
      if (this._state.lap < 1) this._state.lap = 1;
    }
    
    // Get position and orientation from curve
    var point = curve.getPoint(this._trackProgress);
    var tangent = curve.getTangent(this._trackProgress);
    
    // Calculate perpendicular direction for lateral offset
    // FIXED: Perpendicular now correctly maps: positive offset = right side, negative offset = left side
    var perp = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
    
    // Apply lateral offset (positive = right, negative = left)
    var finalPos = point.clone().add(perp.multiplyScalar(this._lateralOffset * halfWidth));
    
    // Update vehicle position
    this._vehicle.position.copy(finalPos);
    this._vehicle.position.y = 0.5 + Math.sin(this._clock.getElapsedTime() * 6) * 0.015; // Slight bounce
    
    // Orient vehicle along track tangent
    var targetAngle = Math.atan2(tangent.x, tangent.z);
    
    // Add slight steering tilt visually
    var steerTilt = this._lateralOffset * 0.15;
    if (this._keys.drift) steerTilt *= 2.5;
    
    this._heading = targetAngle + steerTilt;
    this._vehicle.rotation.y = this._heading;
    
    // Roll effect when drifting/steering
    var rollTarget = this._keys.drift ? this._targetLateralOffset * 0.25 : this._targetLateralOffset * 0.08;
    this._vehicleRoll = this._vehicleRoll || 0;
    this._vehicleRoll += (rollTarget - this._vehicleRoll) * 0.15;
    this._vehicle.rotation.z = this._vehicleRoll;
    
    // Update state position (for HUD/display)
    this._state.position = this._trackProgress * trackLen;
    
    // Checkpoint detection (for lap validation)
    var checkpointIdx = Math.floor(this._trackProgress * this._state.totalCheckpoints);
    if (checkpointIdx > this._state.checkpointsPassed) {
      this._state.checkpointsPassed = checkpointIdx;
      window.__engine.bus.emit('player:checkpointPassed', { 
        checkpoint: checkpointIdx, 
        total: this._state.totalCheckpoints 
      });
    }
    
    // Emit telemetry events
    if (window.__engine && window.__engine.bus) {
      var spdKmh = Math.abs(this._state.speed) * 3.6;
      var gr = Math.min(6, Math.max(1, Math.floor(spdKmh / 25) + 1));
      
      window.__engine.bus.emit('player:speedChanged', { 
        speed: Math.abs(this._state.speed), 
        maxSpeed: maxSpeed, 
        speedKmh: Math.round(spdKmh * 10) / 10 
      });
      window.__engine.bus.emit('player:positionChanged', { position: 1, totalRacers: 8 });
      window.__engine.bus.emit('player:gearChanged', { gear: gr });
      
      // Minimap update
      this._minimapUpdateTimer = (this._minimapUpdateTimer || 0) + dt;
      if (this._minimapUpdateTimer > 0.15) {
        this._minimapUpdateTimer = 0;
        window.__engine.bus.emit('player:positionUpdate', { 
          x: this._vehicle.position.x, 
          y: this._vehicle.position.z, 
          rotation: this._heading, 
          progress: this._trackProgress,
          opponents: [] 
        });
      }
    }
  }
  
  // OPEN-WORLD MODE: Free roam driving (AAA feel)
  _updateOpenWorldVehicle(dt) {
    if (!this._vehicle) return;
    
    var accelRate = 55;
    var brakeRate = 100;
    var maxSpeed = 65;
    var maxReverseSpeed = 15;
    var steerRate = 3.2;
    var maxSteerAngle = Math.PI / 3.5;
    var friction = 2.5;
    var driftFriction = 0.6;
    
    if (this._heading === undefined) this._heading = 0;
    
    // Speed control with smooth feel
    if (this._keys.throttle && !this._keys.brake) {
      // Acceleration decreases at high speed (realistic)
      var speedFactor = 1 - (this._state.speed / maxSpeed) * 0.5;
      this._state.speed = Math.min(maxSpeed, this._state.speed + accelRate * speedFactor * dt);
    } else if (this._keys.brake && !this._keys.throttle) {
      if (this._state.speed > 0) {
        this._state.speed = Math.max(0, this._state.speed - brakeRate * dt);
      } else {
        this._state.speed = Math.max(-maxReverseSpeed, this._state.speed - accelRate * 0.4 * dt);
      }
    } else {
      // Natural deceleration
      var decel = this._keys.drift ? friction * driftFriction : friction;
      if (this._state.speed > 0) this._state.speed = Math.max(0, this._state.speed - decel * dt);
      else if (this._state.speed < 0) this._state.speed = Math.min(0, this._state.speed + decel * dt);
      if (Math.abs(this._state.speed) < 0.15) this._state.speed = 0;
    }
    
    // Steering: speed-dependent (less steering at high speed, more at low speed)
    // FIXED: Inverted signs - steerLeft now actually turns LEFT (negative heading change = turn left when facing +Z)
    var targetSteer = 0;
    if (this._keys.steerLeft) targetSteer = -1;
    if (this._keys.steerRight) targetSteer = 1;
    
    // Speed factor for steering: responsive at low speed, stable at high speed
    var steerSpeedFactor = Math.max(0.3, 1 - Math.abs(this._state.speed) / maxSpeed * 0.6);
    
    if (Math.abs(this._state.speed) > 0.5) {
      this._steerInput = this._steerInput || 0;
      this._steerInput += (targetSteer - this._steerInput) * Math.min(1, steerRate * dt * 4);
      var steerAmount = this._steerInput * maxSteerAngle * steerSpeedFactor * dt;
      
      // Reverse steering when going backwards
      if (this._state.speed >= 0) this._heading += steerAmount;
      else this._heading -= steerAmount;
    }
    
    // Apply movement
    var moveDist = this._state.speed * dt;
    var dx = Math.sin(this._heading) * moveDist;
    var dz = Math.cos(this._heading) * moveDist;
    
    this._vehicle.position.x += dx;
    this._vehicle.position.z += dz;
    this._state.position += Math.abs(moveDist);
    
    // Keep vehicle on ground with slight hover
    this._vehicle.position.y = 0.5 + Math.sin(this._clock.getElapsedTime() * 5) * 0.02;
    
    // Visual rotation
    this._vehicle.rotation.y = this._heading;
    
    // Roll effect (body lean during turns)
    var rollTarget = this._keys.drift ? this._steerInput * 0.22 : this._steerInput * 0.08;
    this._vehicleRoll = this._vehicleRoll || 0;
    this._vehicleRoll += (rollTarget - this._vehicleRoll) * 0.12;
    this._vehicle.rotation.z = this._vehicleRoll;
    
    // Pitch effect (nose down during acceleration, up during braking)
    var pitchTarget = 0;
    if (this._keys.throttle && this._state.speed > 5) pitchTarget = -0.02;
    else if (this._keys.brake && this._state.speed > 5) pitchTarget = 0.03;
    this._vehiclePitch = this._vehiclePitch || 0;
    this._vehiclePitch += (pitchTarget - this._vehiclePitch) * 0.08;
    this._vehicle.rotation.x = this._vehiclePitch;
    
    // Soft world bounds (generous)
    if (Math.abs(this._vehicle.position.x) > 150) {
      this._vehicle.position.x = Math.sign(this._vehicle.position.x) * 150;
      this._state.speed *= 0.5;
    }
    if (Math.abs(this._vehicle.position.z) > 250) {
      this._vehicle.position.z = Math.sign(this._vehicle.position.z) * 250;
      this._state.speed *= 0.5;
    }
    
    // Track-bound collision: bounce off barrel track barriers if near track
    if (this._trackBounds) {
      // Only apply track bounds when car is near the track Z range
      var trackMinZ = this._trackBounds.minZ;
      var trackMaxZ = this._trackBounds.maxZ;
      if (trackMinZ !== undefined && this._vehicle.position.z >= trackMinZ && this._vehicle.position.z <= trackMaxZ) {
        if (this._vehicle.position.x < this._trackBounds.left) {
          this._vehicle.position.x = this._trackBounds.left;
          this._state.speed *= 0.7;
          this._steerInput *= -0.3;
        }
        if (this._vehicle.position.x > this._trackBounds.right) {
          this._vehicle.position.x = this._trackBounds.right;
          this._state.speed *= 0.7;
          this._steerInput *= -0.3;
        }
      }
    }
    
    // Lap counting for open world - SECTOR-BASED CHECKPOINT SYSTEM
    // Uses 4 sectors around the oval track for reliable lap detection
    if (!this._lapSectors) {
      // Define 4 checkpoint sectors for the oval track (centered on track path)
      this._lapSectors = [
        { x: 0, z: 0, r: 35, id: 0 },     // Start/Finish line
        { x: 110, z: -200, r: 50, id: 1 }, // Back straight / far end
        { x: 220, z: 0, r: 50, id: 2 },    // Right side turn
        { x: 110, z: 140, r: 50, id: 3 }   // Front straight return
      ];
      this._currentSector = -1;  // Which sector we last passed
      this._sectorsPassed = 0;    // How many unique sectors passed this lap
      this._passedSectorFlags = [false, false, false, false];
      this._lastLapDist = 0;      // Distance at last lap completion
    }
    
    var vx = this._vehicle.position.x;
    var vz = this._vehicle.position.z;
    
    // Check each sector
    for (var si = 0; si < this._lapSectors.length; si++) {
      var sector = this._lapSectors[si];
      var distToSector = Math.sqrt((vx - sector.x) * (vx - sector.x) + (vz - sector.z) * (vz - sector.z));
      
      if (distToSector < sector.r && !this._passedSectorFlags[si]) {
        // Entered a new sector
        this._passedSectorFlags[si] = true;
        this._currentSector = si;
        this._sectorsPassed++;
        
        // Emit checkpoint event
        if (window.__engine && window.__engine.bus) {
          window.__engine.bus.emit('player:checkpointPassed', {
            checkpoint: si,
            total: this._lapSectors.length
          });
        }
        
        // Check for lap completion: crossed start/finish (sector 0) after passing all other sectors
        if (si === 0 && this._sectorsPassed >= this._lapSectors.length) {
          // LAP COMPLETED!
          var lapTime = this._clock.getElapsedTime();
          this._state.lap++;
          this._state.lapTimes.push(lapTime);
          
          if (lapTime < this._state.bestLapTime || this._state.bestLapTime === Infinity) {
            this._state.bestLapTime = lapTime;
          }
          
          if (window.__engine) window.__engine.bus.emit('player:lapCompleted', { 
            lapNumber: this._state.lap - 1, 
            lapTime: lapTime,
            bestLapTime: this._state.bestLapTime
          });
          
          // Reset sector tracking for next lap
          this._sectorsPassed = 1;  // Just passed sector 0
          this._passedSectorFlags = [true, false, false, false];
          this._lastLapDist = this._state.position;
          
          // Check race completion
          if (this._state.lap > this._state.totalLaps) {
            this._finishRace();
            return;
          }
        }
      }
    }
    
    // Emit telemetry
    if (window.__engine && window.__engine.bus) {
      var spd = Math.abs(this._state.speed) * 3.6;
      var gr = Math.min(6, Math.max(1, Math.floor(spd / 20) + 1));
      window.__engine.bus.emit('player:speedChanged', { 
        speed: Math.abs(this._state.speed), 
        maxSpeed: maxSpeed, 
        speedKmh: Math.round(spd * 10) / 10 
      });
      window.__engine.bus.emit('player:positionChanged', { position: 1, totalRacers: 8 });
      window.__engine.bus.emit('player:gearChanged', { gear: gr });
      
      this._minimapUpdateTimer = (this._minimapUpdateTimer || 0) + dt;
      if (this._minimapUpdateTimer > 0.15) {
        this._minimapUpdateTimer = 0;
        window.__engine.bus.emit('player:positionUpdate', { 
          x: this._vehicle.position.x, 
          y: this._vehicle.position.z, 
          rotation: this._heading, 
          opponents: [] 
        });
      }
    }
  }
  
  // Race completion handler
  _finishRace() {
    this._state.running = false;
    this._state.speed = 0;
    
    var totalTime = this._clock.getElapsedTime();
    var results = {
      laps: this._state.totalLaps,
      lapTimes: this._state.lapTimes.slice(),
      bestLapTime: this._state.bestLapTime,
      totalTime: totalTime,
      raceType: this._raceConfig.raceType
    };
    
    console.log('[RaceScene] Race Complete!', results);
    
    if (window.__engine && window.__engine.bus) {
      window.__engine.bus.emit('race:finished', results);
      window.__engine.bus.emit('race:showResults', results);
    }
  }

  // SCENE CREATION
  _createSky() {
    var canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    var ctx = canvas.getContext('2d');
    var gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#050510');
    gradient.addColorStop(0.3, '#0a0a20');
    gradient.addColorStop(0.6, '#1a1035');
    gradient.addColorStop(1, '#2d1b4e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    var texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    this._scene.background = texture;
    this._scene.fog = new THREE.FogExp2('#0a0a15', 0.008);
    this._createStars();
  }

  _createGround() {
    // Large ground plane so the car is never over the purple void
    var groundGeo = new THREE.PlaneGeometry(800, 800);
    var groundMat = new THREE.MeshStandardMaterial({ color: '#08080f', roughness: 1, metalness: 0 });
    var ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.name = 'ground-plane';
    this._scene.add(ground);
    
    // Subtle grid lines on ground for sense of movement
    var gridHelper = new THREE.GridHelper(800, 80, '#151525', '#0e0e18');
    gridHelper.position.y = -0.02;
    gridHelper.name = 'ground-grid';
    this._scene.add(gridHelper);
  }

  _createStars() {
    var starCount = 800;
    var geometry = new THREE.BufferGeometry();
    var positions = new Float32Array(starCount * 3);
    var colors = new Float32Array(starCount * 3);
    
    for (var i = 0; i < starCount; i++) {
      var radius = 800 + Math.random() * 200;
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(radius * Math.cos(phi));
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      var c = Math.random();
      if (c < 0.7) { colors[i * 3] = 1; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 1; }
      else if (c < 0.85) { colors[i * 3] = 0.8; colors[i * 3 + 1] = 0.9; colors[i * 3 + 2] = 1; }
      else { colors[i * 3] = 1; colors[i * 3 + 1] = 0.95; colors[i * 3 + 2] = 0.8; }
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    var material = new THREE.PointsMaterial({ size: 1.5, vertexColors: true, transparent: true, opacity: 0.85, sizeAttenuation: true });
    var stars = new THREE.Points(geometry, material);
    stars.name = 'starfield';
    this._scene.add(stars);
  }

  _createLights() {
    this._lights.ambient = new THREE.AmbientLight('#334466', 0.5);
    this._scene.add(this._lights.ambient);
    
    this._lights.directional = new THREE.DirectionalLight('#aabbff', 0.4);
    this._lights.directional.position.set(50, 100, -30);
    this._scene.add(this._lights.directional);
    
    var neonColors = [0xff00ff, 0x00ffff, 0xff0066, 0x00ff66];
    var spacing = this._trackLength / 5;
    
    for (var i = 0; i < 4; i++) {
      var light = new THREE.PointLight(neonColors[i], 3, 80);
      light.position.set((i % 2 === 0 ? -1 : 1) * (this._trackWidth / 3), 6, -this._trackLength / 2 + spacing * (i + 1));
      this._scene.add(light);
      this._lights.pointLights.push(light);
    }
    
    var hemi = new THREE.HemisphereLight('#223355', '#110822', 0.3);
    this._scene.add(hemi);
  }

  async _createTrack() {
    var built = await this._tryBuildBarrelTrack();
    if (built) { console.log('[RaceScene] Barrel track loaded'); return; }
    this._createProceduralTrack();
  }

  async _tryBuildBarrelTrack() {
    var trackRegistry = window.__trackRegistry;
    if (!trackRegistry || trackRegistry.length === 0) return false;
    var trackEntry = trackRegistry[0];
    if (!trackEntry || !trackEntry.module || !trackEntry.module.build) return false;
    try {
      var ctx = { renderer: window.__engine ? window.__engine.renderer : null, scene: this._scene, engine: window.__engine };
      var result = trackEntry.module.build(ctx, trackEntry.entry);
      if (result && result.group) {
        this._track = result.group;
        this._scene.add(this._track);
        this._trackData = result;
        if (result.curve) this._trackLength = result.curve.getLength();
        return true;
      }
      return false;
    } catch (e) { return false; }
  }

  _createProceduralTrack() {
    this._track = new THREE.Group();
    this._track.name = 'racetrack';
    
    var halfWidth = this._trackWidth / 2;
    var trackLength = this._trackLength;
    
    var trackGeo = new THREE.PlaneGeometry(this._trackWidth, trackLength, 20, 40);
    var trackMat = new THREE.MeshStandardMaterial({ color: '#1a1a24', roughness: 0.85, metalness: 0.05 });
    var trackMesh = new THREE.Mesh(trackGeo, trackMat);
    trackMesh.rotation.x = -Math.PI / 2;
    this._track.add(trackMesh);
    
    var dashCount = Math.floor(trackLength / 8);
    var dashGeo = new THREE.PlaneGeometry(0.3, 5);
    var dashMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    var centerLines = new THREE.InstancedMesh(dashGeo, dashMat, dashCount);
    var matrix = new THREE.Matrix4();
    for (var di = 0; di < dashCount; di++) {
      matrix.setPosition(0, 0.01, -trackLength / 2 + 4 + di * 8);
      centerLines.setMatrixAt(di, matrix);
    }
    centerLines.rotation.x = -Math.PI / 2;
    this._track.add(centerLines);
    
    var edgeSegLen = 50;
    var edgeCount = Math.ceil(trackLength / edgeSegLen);
    var edgeGeo = new THREE.PlaneGeometry(0.4, edgeSegLen);
    
    var leftEdgeMat = new THREE.MeshBasicMaterial({ color: '#ff00ff' });
    var leftEdges = new THREE.InstancedMesh(edgeGeo, leftEdgeMat, edgeCount);
    for (var li = 0; li < edgeCount; li++) {
      matrix.setPosition(-(halfWidth - 0.5), 0.02, -trackLength / 2 + edgeSegLen / 2 + li * edgeSegLen);
      leftEdges.setMatrixAt(li, matrix);
    }
    leftEdges.rotation.x = -Math.PI / 2;
    this._track.add(leftEdges);
    
    var rightEdgeMat = new THREE.MeshBasicMaterial({ color: '#00ffff' });
    var rightEdges = new THREE.InstancedMesh(edgeGeo, rightEdgeMat, edgeCount);
    for (var ri = 0; ri < edgeCount; ri++) {
      matrix.setPosition(halfWidth - 0.5, 0.02, -trackLength / 2 + edgeSegLen / 2 + ri * edgeSegLen);
      rightEdges.setMatrixAt(ri, matrix);
    }
    rightEdges.rotation.x = -Math.PI / 2;
    this._track.add(rightEdges);
    
    var startGeo = new THREE.PlaneGeometry(this._trackWidth, 3);
    var startCanvas = document.createElement('canvas');
    startCanvas.width = 128;
    startCanvas.height = 32;
    var startCtx = startCanvas.getContext('2d');
    startCtx.fillStyle = '#ffffff';
    startCtx.fillRect(0, 0, 128, 32);
    for (var sx = 0; sx < 16; sx++) {
      for (var sy = 0; sy < 4; sy++) {
        if ((sx + sy) % 2 === 0) { startCtx.fillStyle = '#000000'; startCtx.fillRect(sx * 8, sy * 8, 8, 8); }
      }
    }
    var startTexture = new THREE.CanvasTexture(startCanvas);
    var startMat = new THREE.MeshBasicMaterial({ map: startTexture });
    var startLine = new THREE.Mesh(startGeo, startMat);
    startLine.rotation.x = -Math.PI / 2;
    startLine.position.set(0, 0.03, -trackLength / 2 + 10);
    this._track.add(startLine);
    
    var groundGeo = new THREE.PlaneGeometry(500, trackLength + 200);
    var groundMat = new THREE.MeshStandardMaterial({ color: '#0a0a12', roughness: 1, metalness: 0 });
    var ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    this._track.add(ground);
    
    // AAA FIX: Add proper 3D barrier walls (not just flat lines)
    this._createBarrierWalls(this._track, halfWidth, trackLength);
    
    // Store track bounds for collision
    this._trackBounds = { left: -halfWidth + 1.5, right: halfWidth - 1.5, length: trackLength };
    
    this._scene.add(this._track);
  }

  // Position vehicle at correct track start
  _positionVehicleAtStart() {
    if (!this._vehicle) return;
    
    // Reset vehicle state
    this._steerInput = 0;
    this._vehicleRoll = 0;
    this._vehiclePitch = 0;
    this._state.speed = 0;
    
    if (this._trackData && this._trackData.curve) {
      if (this._raceConfig.mode === RaceScene.MODE.TRACK_BOUND) {
        this._trackProgress = 0;
        this._lateralOffset = 0;
        this._targetLateralOffset = 0;
        var point = this._trackData.curve.getPoint(0);
        var tangent = this._trackData.curve.getTangent(0);
        this._vehicle.position.copy(point);
        this._vehicle.position.y = 0.5;
        var angle = Math.atan2(tangent.x, tangent.z);
        this._vehicle.rotation.y = angle;
        this._heading = angle;
      } else {
        if (this._trackData.startPos) {
          this._vehicle.position.copy(this._trackData.startPos);
          this._vehicle.position.y = 0.5;
          if (this._trackData.startTan) {
            var angle = Math.atan2(this._trackData.startTan.x, this._trackData.startTan.z);
            this._vehicle.rotation.y = angle;
            this._heading = angle;
          }
        }
      }
      console.log('[RaceScene] Mode:', this._raceConfig.mode, '| Track:', Math.round(this._trackLength), 'm | Heading:', ((this._heading || 0) * 180 / Math.PI).toFixed(0) + 'deg');
    } else {
      this._vehicle.position.set(0, 0.5, -this._trackLength / 2 + 15);
      this._vehicle.rotation.y = 0;
      this._heading = 0;
      console.log('[RaceScene] Procedural track | Mode:', this._raceConfig.mode);
    }
    
    // Point headlight in driving direction
    var spotlight = this._vehicle.children.find(function(c) { return c instanceof THREE.SpotLight; });
    if (spotlight && spotlight.target) {
      var hd = this._heading || 0;
      spotlight.target.position.set(
        this._vehicle.position.x + Math.sin(hd) * 20,
        0,
        this._vehicle.position.z + Math.cos(hd) * 20
      );
    }
  }

  // AAA FIX: Create proper 3D barrier walls for procedural track
  _createBarrierWalls(trackGroup, halfWidth, trackLength) {
    var wallHeight = 1.2;
    var wallThickness = 0.5;
    var segmentLength = 25;
    var wallSegments = Math.ceil(trackLength / segmentLength);
    
    // Wall materials with neon glow effect
    var leftWallMat = new THREE.MeshStandardMaterial({ 
      color: '#ff2266', emissive: '#ff2266', emissiveIntensity: 0.4,
      metalness: 0.7, roughness: 0.3 
    });
    var rightWallMat = new THREE.MeshStandardMaterial({ 
      color: '#00ffff', emissive: '#00ffff', emissiveIntensity: 0.4,
      metalness: 0.7, roughness: 0.3 
    });
    var topStripeMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    
    // Create instanced walls for performance
    var wallGeo = new THREE.BoxGeometry(wallThickness, wallHeight, segmentLength);
    var stripeGeo = new THREE.BoxGeometry(wallThickness + 0.05, 0.15, segmentLength);
    
    var leftWalls = new THREE.InstancedMesh(wallGeo, leftWallMat, wallSegments);
    var rightWalls = new THREE.InstancedMesh(wallGeo, rightWallMat, wallSegments);
    var leftStripes = new THREE.InstancedMesh(stripeGeo, topStripeMat, wallSegments);
    var rightStripes = new THREE.InstancedMesh(stripeGeo, topStripeMat, wallSegments);
    
    var matrix = new THREE.Matrix4();
    var leftX = -(halfWidth - wallThickness / 2);
    var rightX = halfWidth - wallThickness / 2;
    
    for (var i = 0; i < wallSegments; i++) {
      var zPos = -trackLength / 2 + segmentLength / 2 + i * segmentLength;
      var yPos = wallHeight / 2;
      
      // Left wall
      matrix.setPosition(leftX, yPos, zPos);
      leftWalls.setMatrixAt(i, matrix);
      leftStripes.setMatrixAt(i, matrix);
      
      // Right wall  
      matrix.setPosition(rightX, yPos, zPos);
      rightWalls.setMatrixAt(i, matrix);
      rightStripes.setMatrixAt(i, matrix);
    }
    
    trackGroup.add(leftWalls);
    trackGroup.add(rightWalls);
    trackGroup.add(leftStripes);
    trackGroup.add(rightStripes);
    
    // Add glowing posts at intervals for visual flair
    var postCount = Math.floor(trackLength / 50);
    var postGeo = new THREE.CylinderGeometry(0.15, 0.2, wallHeight + 0.5, 8);
    var postMat = new THREE.MeshStandardMaterial({ color: '#333344', metalness: 0.8, roughness: 0.2 });
    var glowPostMat = new THREE.MeshBasicMaterial({ color: '#ff00ff' });
    
    var posts = new THREE.InstancedMesh(postGeo, postMat, postCount * 2);
    var glowTops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.25, 8, 8), glowPostMat, postCount * 2);
    
    for (var p = 0; p < postCount; p++) {
      var pz = -trackLength / 2 + 50 + p * 50;
      var py = (wallHeight + 0.5) / 2;
      
      // Left post
      matrix.setPosition(leftX, py, pz);
      posts.setMatrixAt(p * 2, matrix);
      glowTops.setMatrixAt(p * 2, matrix);
      
      // Right post
      matrix.setPosition(rightX, py, pz);
      posts.setMatrixAt(p * 2 + 1, matrix);
      glowTops.setMatrixAt(p * 2 + 1, matrix);
    }
    
    trackGroup.add(posts);
    trackGroup.add(glowTops);
    
    console.log('[RaceScene] Created barrier walls:', wallSegments * 2, 'segments,', postCount * 2, 'posts');
  }

  _createVehicle() {
    this._vehicle = new THREE.Group();
    this._vehicle.name = 'player-vehicle';
    
    var bodyMat = new THREE.MeshStandardMaterial({ color: '#ff3366', metalness: 0.8, roughness: 0.2 });
    var darkMat = new THREE.MeshStandardMaterial({ color: '#111122', metalness: 0.9, roughness: 0.1 });
    var wheelMat = new THREE.MeshStandardMaterial({ color: '#222233', roughness: 0.6 });
    var rimMat = new THREE.MeshStandardMaterial({ color: '#00ffff', metalness: 1, roughness: 0.2 });
    var glowMat = new THREE.MeshBasicMaterial({ color: '#00ffff', transparent: true, opacity: 0.6 });
    
    var bodyGeo = new THREE.BoxGeometry(2, 0.8, 4);
    var body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.5;
    this._vehicle.add(body);
    
    var cabinGeo = new THREE.BoxGeometry(1.6, 0.6, 2);
    var cabin = new THREE.Mesh(cabinGeo, darkMat);
    cabin.position.set(0, 1.05, -0.3);
    this._vehicle.add(cabin);
    
    var wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 12);
    var wheels = new THREE.InstancedMesh(wheelGeo, wheelMat, 4);
    var rimGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.32, 8);
    var rims = new THREE.InstancedMesh(rimGeo, rimMat, 4);
    
    var wheelPositions = [[-1, 0.4, 1.3], [1, 0.4, 1.3], [-1, 0.4, -1.3], [1, 0.4, -1.3]];
    var mat4 = new THREE.Matrix4();
    wheelPositions.forEach(function(pos, i) {
      mat4.makeRotationFromEuler(new THREE.Euler(0, 0, Math.PI / 2));
      mat4.setPosition(pos[0], pos[1], pos[2]);
      wheels.setMatrixAt(i, mat4);
      rims.setMatrixAt(i, mat4);
    });
    this._vehicle.add(wheels);
    this._vehicle.add(rims);
    
    var underglowGeo = new THREE.BoxGeometry(2.2, 0.05, 4.2);
    var underglow = new THREE.Mesh(underglowGeo, glowMat);
    underglow.position.y = 0.15;
    this._vehicle.add(underglow);
    
    var lightGeo = new THREE.CircleGeometry(0.12, 8);
    var headMat = new THREE.MeshBasicMaterial({ color: '#ffffaa' });
    var tailMat = new THREE.MeshBasicMaterial({ color: '#ff0000' });
    [-0.6, 0.6].forEach(function(x) {
      var hl = new THREE.Mesh(lightGeo, headMat);
      hl.position.set(x, 0.5, 2.01);
      this._vehicle.add(hl);
      var tl = new THREE.Mesh(lightGeo, tailMat);
      tl.position.set(x, 0.5, -2.01);
      tl.rotation.y = Math.PI;
      this._vehicle.add(tl);
    }.bind(this));
    
    // Position will be set by _positionVehicleAtStart() after track loads
    this._vehicle.position.set(0, 0.5, 0);
    this._scene.add(this._vehicle);
    
    var spotlight = new THREE.SpotLight('#ffffcc', 2, 40, Math.PI / 6, 0.5);
    spotlight.position.set(0, 2, 2);
    spotlight.target.position.set(0, 0, 15);
    this._vehicle.add(spotlight);
    this._vehicle.add(spotlight.target);
  }

  _createScenery() {
    var scenery = new THREE.Group();
    scenery.name = 'scenery';
    
    var bldgCount = 40;
    var bldgGeo = new THREE.BoxGeometry(1, 1, 1);
    var bldgMat = new THREE.MeshStandardMaterial({ color: '#151525', roughness: 0.9 });
    var buildings = new THREE.InstancedMesh(bldgGeo, bldgMat, bldgCount);
    var matrix = new THREE.Matrix4();
    var color = new THREE.Color();
    
    for (var bi = 0; bi < bldgCount; bi++) {
      var side = bi % 2 === 0 ? -1 : 1;
      var bw = 10 + Math.random() * 20;
      var bh = 20 + Math.random() * 60;
      var bd = 10 + Math.random() * 15;
      matrix.makeScale(bw, bh, bd);
      matrix.setPosition(side * (this._trackWidth / 2 + 20 + Math.random() * 30), bh / 2 - 2, (bi / bldgCount) * this._trackLength - this._trackLength / 2);
      buildings.setMatrixAt(bi, matrix);
      color.setHSL(0.7, 0.3, 0.05 + Math.random() * 0.1);
      buildings.setColorAt(bi, color);
    }
    scenery.add(buildings);
    
    var winAtlasCanvas = document.createElement('canvas');
    winAtlasCanvas.width = 64;
    winAtlasCanvas.height = 64;
    var wCtx = winAtlasCanvas.getContext('2d');
    wCtx.fillStyle = 'rgba(20, 20, 35, 0.9)';
    wCtx.fillRect(0, 0, 64, 64);
    for (var wx = 0; wx < 4; wx++) {
      for (var wy = 0; wy < 4; wy++) {
        if (Math.random() > 0.5) { wCtx.fillStyle = Math.random() > 0.5 ? '#ffaa00' : '#aaddff'; wCtx.globalAlpha = 0.7; wCtx.fillRect(wx * 14 + 4, wy * 14 + 4, 10, 14); }
      }
    }
    var winTexture = new THREE.CanvasTexture(winAtlasCanvas);
    var winPlaneGeo = new THREE.PlaneGeometry(8, 12);
    var winMat = new THREE.MeshBasicMaterial({ map: winTexture, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
    var winPlanes = new THREE.InstancedMesh(winPlaneGeo, winMat, bldgCount);
    for (var wi = 0; wi < bldgCount; wi++) {
      var ws = wi % 2 === 0 ? -1 : 1;
      var wh = 30;
      var wz = (wi / bldgCount) * this._trackLength - this._trackLength / 2;
      matrix.identity();
      matrix.setPosition(ws * (this._trackWidth / 2 + 18), wh / 2, wz);
      if (ws > 0) matrix.multiply(new THREE.Matrix4().makeRotationY(-Math.PI / 2));
      else matrix.multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2));
      winPlanes.setMatrixAt(wi, matrix);
    }
    scenery.add(winPlanes);
    
    var neonSigns = [{ text: 'RACE', color: '#ff00ff', z: -200 }, { text: 'ZONE', color: '#00ffff', z: 0 }, { text: 'KART', color: '#ffff00', z: 200 }, { text: 'GO!', color: '#00ff00', z: 400 }];
    neonSigns.forEach(function(sign) {
      var signCanvas = document.createElement('canvas');
      signCanvas.width = 128;
      signCanvas.height = 64;
      var sCtx = signCanvas.getContext('2d');
      sCtx.fillStyle = sign.color;
      sCtx.font = 'bold 48px Arial, sans-serif';
      sCtx.textAlign = 'center';
      sCtx.fillText(sign.text, 64, 48);
      var signTexture = new THREE.CanvasTexture(signCanvas);
      var signGeo = new THREE.PlaneGeometry(8, 4);
      var signMat = new THREE.MeshBasicMaterial({ map: signTexture, transparent: true, side: THREE.DoubleSide });
      var signMesh = new THREE.Mesh(signGeo, signMat);
      signMesh.position.set(-18, 15, sign.z);
      signMesh.rotation.y = Math.PI / 6;
      scenery.add(signMesh);
    });
    
    var poleCount = 60;
    var poleHt = 12;
    var poleGeo = new THREE.CylinderGeometry(0.15, 0.2, poleHt, 6);
    var poleMat = new THREE.MeshStandardMaterial({ color: '#333344' });
    var poles = new THREE.InstancedMesh(poleGeo, poleMat, poleCount);
    var lampGeo = new THREE.SphereGeometry(0.5, 6, 6);
    var lampMat = new THREE.MeshBasicMaterial({ color: '#ff00ff' });
    var lamps = new THREE.InstancedMesh(lampGeo, lampMat, poleCount);
    var pIdx = 0;
    for (var pi = 0; pi < 30; pi++) {
      var pz = (pi / 30) * this._trackLength - this._trackLength / 2;
      [-1, 1].forEach(function(side) {
        var px = side * (this._trackWidth / 2 + 3);
        matrix.setPosition(px, poleHt / 2, pz);
        poles.setMatrixAt(pIdx, matrix);
        matrix.setPosition(px, poleHt + 0.5, pz);
        lamps.setMatrixAt(pIdx, matrix);
        color.setHex(pi % 2 === 0 ? 0xff00ff : 0x00ffff);
        lamps.setColorAt(pIdx, color);
        pIdx++;
      }.bind(this));
    }
    scenery.add(poles);
    scenery.add(lamps);
    this._scene.add(scenery);
  }

  // HUD SYSTEM
  _createHUDElements() {
    if (this._hudElement && this._hudElement.parentNode) this._hudElement.parentNode.removeChild(this._hudElement);
    
    var hud = document.createElement('div');
    hud.className = 'game-hud visible';
    hud.id = 'game-hud-root';
    
    // Speed panel
    var sp = document.createElement('div');
    sp.className = 'hud-panel hud-speed-panel';
    var sc = document.createElement('div');
    sc.className = 'speed-container';
    var sv = document.createElement('span');
    sv.className = 'speed-value low';
    sv.id = 'hud-speed-value';
    sv.textContent = '0';
    var su = document.createElement('span');
    su.className = 'speed-unit';
    su.textContent = 'KM/H';
    sc.appendChild(sv); sc.appendChild(su); sp.appendChild(sc);
    var sbc = document.createElement('div');
    sbc.className = 'speed-bar-container';
    var sb = document.createElement('div');
    sb.className = 'speed-bar'; sb.id = 'hud-speed-bar'; sb.style.width = '0%';
    sbc.appendChild(sb); sp.appendChild(sbc);
    var gi = document.createElement('div');
    gi.className = 'gear-indicator';
    var gl = document.createElement('span'); gl.className = 'gear-label'; gl.textContent = 'GEAR';
    var gv = document.createElement('span'); gv.className = 'gear-value'; gv.id = 'hud-gear-value'; gv.textContent = 'N';
    gi.appendChild(gl); gi.appendChild(gv); sp.appendChild(gi);
    hud.appendChild(sp);
    
    // Position panel
    var pp = document.createElement('div');
    pp.className = 'hud-panel hud-position-panel';
    var pd = document.createElement('div'); pd.className = 'position-display first';
    var pn = document.createElement('span'); pn.className = 'position-number'; pn.id = 'hud-position-number'; pn.textContent = '1';
    var ps = document.createElement('span'); ps.className = 'position-suffix'; ps.id = 'hud-position-suffix'; ps.textContent = 'st';
    pd.appendChild(pn); pd.appendChild(ps); pp.appendChild(pd);
    var pc = document.createElement('div'); pc.className = 'position-change'; pc.id = 'hud-position-change';
    pp.appendChild(pc);
    var rc = document.createElement('div'); rc.className = 'racers-count'; rc.id = 'hud-racers-count'; rc.textContent = '/ 8';
    pp.appendChild(rc);
    var lc = document.createElement('div'); lc.className = 'lap-container';
    var lcp = document.createElement('div'); lcp.className = 'lap-counter';
    var lcur = document.createElement('span'); lcur.className = 'lap-current'; lcur.id = 'hud-lap-current'; lcur.textContent = '1';
    var lsp = document.createElement('span'); lsp.className = 'lap-separator'; lsp.textContent = '/';
    var ltot = document.createElement('span'); ltot.className = 'lap-total'; ltot.id = 'hud-lap-total'; ltot.textContent = '3';
    lcp.appendChild(lcur); lcp.appendChild(lsp); lcp.appendChild(ltot); lc.appendChild(lcp);
    var ll = document.createElement('div'); ll.className = 'lap-label'; ll.textContent = 'LAP'; lc.appendChild(ll);
    var lpc = document.createElement('div'); lpc.className = 'lap-progress-container';
    var lpb = document.createElement('div'); lpb.className = 'lap-progress-bar'; lpb.id = 'hud-lap-progress'; lpb.style.width = '0%';
    lpc.appendChild(lpb); lc.appendChild(lpc); pp.appendChild(lc); hud.appendChild(pp);
    
    // Timer
    var tp = document.createElement('div'); tp.className = 'hud-panel hud-timer-panel';
    var td = document.createElement('div'); td.className = 'timer-display'; td.id = 'hud-timer-display'; td.textContent = '00:00.00';
    var tl = document.createElement('div'); tl.className = 'timer-label'; tl.textContent = 'RACE TIME';
    tp.appendChild(td); tp.appendChild(tl); hud.appendChild(tp);
    
    // Item panel
    var ip = document.createElement('div'); ip.className = 'hud-panel hud-item-panel';
    var ib = document.createElement('div'); ib.className = 'item-box'; ib.id = 'hud-item-box';
    var ii = document.createElement('div'); ii.className = 'item-icon'; ii.id = 'hud-item-icon';
    ii.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';
    var ipt = document.createElement('div'); ipt.className = 'item-prompt'; ipt.textContent = '[E]';
    var ist = document.createElement('div'); ist.className = 'item-status'; ist.id = 'hud-item-status'; ist.textContent = 'EMPTY';
    ib.appendChild(ii); ib.appendChild(ipt); ib.appendChild(ist); ip.appendChild(ib); hud.appendChild(ip);
    
    // Status panel
    var stp = document.createElement('div'); stp.className = 'hud-panel hud-status-panel'; stp.id = 'hud-status-panel';
    var sbs = document.createElement('div'); sbs.className = 'status-bars';
    var shc = document.createElement('div'); shc.className = 'shield-bar-container';
    var shl = document.createElement('span'); shl.className = 'status-label'; shl.innerHTML = '\uD83D\uDEE1 SHIELD';
    var sht = document.createElement('div'); sht.className = 'bar-track';
    var shf = document.createElement('div'); shf.className = 'bar-fill shield-fill'; shf.id = 'hud-shield-bar'; shf.style.width = '100%';
    var shv = document.createElement('span'); shv.className = 'bar-value'; shv.id = 'hud-shield-value'; shv.textContent = '100';
    sht.appendChild(shf); shc.appendChild(shl); shc.appendChild(sht); shc.appendChild(shv); sbs.appendChild(shc);
    var hec = document.createElement('div'); hec.className = 'health-bar-container';
    var hel = document.createElement('span'); hel.className = 'status-label'; hel.innerHTML = '\u2764 HEALTH';
    var het = document.createElement('div'); het.className = 'bar-track';
    var hef = document.createElement('div'); hef.className = 'bar-fill health-fill'; hef.id = 'hud-health-bar'; hef.style.width = '100%';
    var hev = document.createElement('span'); hev.className = 'bar-value'; hev.id = 'hud-health-value'; hev.textContent = '100';
    het.appendChild(hef); hec.appendChild(hel); hec.appendChild(het); hec.appendChild(hev); sbs.appendChild(hec);
    stp.appendChild(sbs); hud.appendChild(stp);
    
    // Countdown
    var cd = document.createElement('div'); cd.className = 'hud-countdown'; cd.id = 'hud-countdown';
    var cdn = document.createElement('div'); cdn.className = 'countdown-number'; cdn.id = 'hud-countdown-number'; cdn.textContent = '3';
    cd.appendChild(cdn); hud.appendChild(cd);
    
    // Notifications
    var nf = document.createElement('div'); nf.className = 'hud-notifications'; nf.id = 'hud-notifications';
    hud.appendChild(nf);
    
    // Lap times
    var ltm = document.createElement('div'); ltm.className = 'hud-lap-times'; ltm.id = 'hud-lap-times';
    var lth = document.createElement('div'); lth.className = 'lap-time-row'; lth.innerHTML = '<span class="lap-time-label">LAP TIMES</span><span class="lap-time-value"></span>';
    ltm.appendChild(lth);
    for (var li = 1; li <= 3; li++) {
      var lr = document.createElement('div'); lr.className = 'lap-time-row'; lr.id = 'hud-lap-time-' + li;
      lr.innerHTML = '<span class="lap-time-label">LAP ' + li + '</span><span class="lap-time-value">--:--.--</span>';
      ltm.appendChild(lr);
    }
    hud.appendChild(ltm);
    
    // Minimap
    var mmc = document.createElement('div'); mmc.className = 'hud-minimap-container'; mmc.id = 'hud-minimap-container';
    var mmcv = document.createElement('canvas'); mmcv.id = 'minimap-canvas'; mmcv.width = 150; mmcv.height = 150;
    mmcv.style.cssText = 'width:150px;height:150px;border-radius:8px;background:rgba(0,0,0,0.5);';
    mmc.appendChild(mmcv); hud.appendChild(mmc);
    
    document.body.appendChild(hud);
    this._hudElement = hud;
    
    this._hudRefs = { speedValue: sv, speedBar: sb, gearValue: gv, positionNumber: pn, positionSuffix: ps, positionChange: pc, racersCount: rc, lapCurrent: lcur, lapTotal: ltot, lapProgress: lbp, timerDisplay: td, itemBox: ib, itemIcon: ii, itemStatus: ist, statusPanel: stp, shieldBar: shf, shieldValue: shv, healthBar: hef, healthValue: hev, countdown: cd, countdownNumber: cdn, notifications: nf, lapTimes: ltm, minimapCanvas: mmcv };
    
    window.__hud = { element: hud, refs: this._hudRefs, update: function(d) { this._updateHUDData(d); }.bind(this), showCountdown: function(v) { this._showCountdown(v); }.bind(this), hideCountdown: function() { this._hideCountdown(); }.bind(this), showNotification: function(m, t) { this._showNotification(m, t); }.bind(this), setItem: function(it) { this._setItem(it); }.bind(this) };
  }
  
  _updateHUDDirect() {
    if (!this._hudRefs) return;
    var speedKmh = Math.abs(this._state.speed) * 3.6;
    var maxSpeed = 60;
    if (this._hudRefs.speedValue) { this._hudRefs.speedValue.textContent = String(Math.round(speedKmh)); var cls = speedKmh < 20 ? 'low' : speedKmh < 40 ? 'medium' : speedKmh < 55 ? 'high' : 'critical'; this._hudRefs.speedValue.className = 'speed-value ' + cls; }
    if (this._hudRefs.speedBar) { var pct = Math.min(100, (speedKmh / maxSpeed) * 100); this._hudRefs.speedBar.style.width = pct + '%'; }
    if (this._hudRefs.gearValue) { var gear = speedKmh < 1 ? 'N' : String(Math.min(6, Math.max(1, Math.floor(speedKmh / 20) + 1))); this._hudRefs.gearValue.textContent = gear; var gi = this._hudRefs.gearValue.parentElement; if (gi) gi.className = 'gear-indicator gear-' + gear; }
    if (this._hudRefs.lapCurrent) this._hudRefs.lapCurrent.textContent = String(Math.min(this._state.lap, this._state.totalLaps));
    if (this._hudRefs.lapTotal) this._hudRefs.lapTotal.textContent = String(this._state.totalLaps);
    if (this._hudRefs.lapProgress) { var lpct = ((this._state.position % this._trackLength) / this._trackLength) * 100; this._hudRefs.lapProgress.style.width = Math.min(100, lpct) + '%'; }
    if (this._hudRefs.timerDisplay && this._state.running) this._hudRefs.timerDisplay.textContent = this._formatTime(this._clock.getElapsedTime());
    if (this._hudRefs.minimapCanvas && Math.random() < 0.1) this._drawMinimap();
  }
  
  _updateHUDData(data) {
    if (!this._hudRefs) return;
    if (data.speed !== undefined && this._hudRefs.speedValue) this._hudRefs.speedValue.textContent = String(Math.round(data.speedKmh || data.speed * 3.6 || 0));
    if (data.position !== undefined && this._hudRefs.positionNumber) this._hudRefs.positionNumber.textContent = String(data.position);
    if (data.gear !== undefined && this._hudRefs.gearValue) this._hudRefs.gearValue.textContent = data.gear === 0 ? 'N' : String(data.gear);
  }
  
  _showCountdown(value) {
    if (!this._hudRefs || !this._hudRefs.countdown) return;
    this._hudRefs.countdown.classList.add('active');
    this._hudRefs.countdownNumber.textContent = String(value);
    this._hudRefs.countdownNumber.className = value === 'GO!' ? 'countdown-number go' : 'countdown-number';
  }
  
  _hideCountdown() {
    if (!this._hudRefs || !this._hudRefs.countdown) return;
    this._hudRefs.countdown.classList.remove('active');
  }
  
  _showNotification(message, type) {
    if (!this._hudRefs || !this._hudRefs.notifications) return;
    var notif = document.createElement('div');
    notif.className = 'hud-notification ' + type + ' visible';
    notif.innerHTML = '<span class="notif-icon">' + (type === 'success' ? '&#10003;' : type === 'warning' ? '&#9888;' : type === 'danger' ? '&#10007;' : '&#8505;') + '</span><span class="notif-message">' + message + '</span>';
    this._hudRefs.notifications.appendChild(notif);
    setTimeout(function() { notif.classList.remove('visible'); setTimeout(function() { notif.remove(); }, 300); }, 2500);
  }
  
  _setItem(itemType) {
    if (!this._hudRefs || !this._hudRefs.itemBox) return;
    if (itemType) { this._hudRefs.itemBox.classList.add('has-item'); this._hudRefs.itemStatus.textContent = itemType.toUpperCase(); }
    else { this._hudRefs.itemBox.classList.remove('has-item'); this._hudRefs.itemStatus.textContent = 'EMPTY'; }
  }
  
  _drawMinimap() {
    var canvas = this._hudRefs ? this._hudRefs.minimapCanvas : null;
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    ctx.fillStyle = 'rgba(10, 10, 20, 0.9)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 10, w - 40, h - 20);
    var veh = this._vehicle || (this._barrelVehicle ? this._barrelVehicle.mesh : null);
    if (veh) {
      var px = w/2 + (veh.position.x / this._trackWidth) * (w/2 - 25);
      var py = h/2 + (veh.position.z / this._trackLength) * (h/2 - 15);
      ctx.fillStyle = '#ff3366';
      ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
      var hd = this._heading || (veh.rotation ? veh.rotation.y : 0);
      ctx.strokeStyle = '#ff3366';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - Math.sin(hd) * 8, py - Math.cos(hd) * 8); ctx.stroke();
    }
  }
  
  _formatTime(seconds) {
    var mins = Math.floor(seconds / 60);
    var secs = Math.floor(seconds % 60);
    var ms = Math.floor((seconds % 1) * 100);
    return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0') + '.' + String(ms).padStart(2, '0');
  }

  _updateCamera(dt) {
    if (!this._camera || !this._vehicle) return;
    var vehiclePos = this._vehicle.position;
    var vehicleHeading = this._heading || this._vehicle.rotation.y || 0;
    
    // AAA CAMERA: Chase cam behind and above vehicle (NFS/GTA/Forza style)
    var camDistance = 13;
    var camHeight = 5.5;
    var speedRatio = Math.min(1, Math.abs(this._state.speed) / 65);
    
    // Camera pulls back slightly at higher speed for dramatic effect
    var dynamicDist = camDistance + speedRatio * 3;
    var dynamicHeight = camHeight + speedRatio * 1.5;
    
    // Calculate camera position BEHIND the vehicle (opposite to heading)
    var camOffsetX = -Math.sin(vehicleHeading) * dynamicDist;
    var camOffsetZ = -Math.cos(vehicleHeading) * dynamicDist;
    
    var targetPos = new THREE.Vector3(
      vehiclePos.x + camOffsetX,
      vehiclePos.y + dynamicHeight,
      vehiclePos.z + camOffsetZ
    );
    
    // Smooth camera follow (faster when far, slower when close)
    var lerpSpeed = Math.min(1, dt * 5);
    this._camera.position.lerp(targetPos, lerpSpeed);
    
    // Look at a point ahead of the vehicle (in driving direction)
    var lookAheadDist = 12 + speedRatio * 8;
    var lookTarget = new THREE.Vector3(
      vehiclePos.x + Math.sin(vehicleHeading) * lookAheadDist,
      vehiclePos.y + 0.8,
      vehiclePos.z + Math.cos(vehicleHeading) * lookAheadDist
    );
    
    // Smooth look-at transition
    if (!this._cameraLookTarget) this._cameraLookTarget = lookTarget.clone();
    this._cameraLookTarget.lerp(lookTarget, Math.min(1, dt * 6));
    this._camera.lookAt(this._cameraLookTarget);
  }

  getState() { return { running: this._state.running, speed: this._state.speed, position: this._state.position, lap: this._state.lap }; }
  getScene() { return this._scene; }
  getCamera() { return this._camera; }
  getVehicle() { return this._barrelVehicle || this._vehicle; }
  isUsingBarrelVehicle() { return this._useBarrelVehicle; }
  setSpeed(speed) { this._state.speed = speed; }
  setPosition(pos) { this._state.position = pos; }
  
  reset() {
    this._state.position = 0; this._state.lap = 1; this._state.speed = 0;
    this._steerAngle = 0; this._steerInput = 0; this._heading = 0; this._vehicleRoll = 0; this._minimapUpdateTimer = 0;
    if (this._useBarrelVehicle && this._barrelVehicle && this._barrelVehicle.physicsBody) { this._barrelVehicle.physicsBody.position.set(0, 1, -this._trackLength / 2 + 15); this._barrelVehicle.physicsBody.velocity.set(0, 0, 0); }
    else if (this._vehicle) { this._vehicle.position.set(0, 0.5, -this._trackLength / 2 + 15); this._vehicle.rotation.y = 0; this._vehicle.rotation.z = 0; }
  }
}

var _instance = null;

export function getRaceScene(raceConfig) {
  // If config provided or no instance, create new; otherwise return existing
  if (raceConfig || !_instance) _instance = new RaceScene(raceConfig);
  // Update config if provided on existing instance
  else if (raceConfig && _instance) _instance._raceConfig = Object.assign(_instance._raceConfig, raceConfig);
  return _instance;
}

// Factory for creating fresh instances (for new races)
export function createRaceScene(raceConfig) {
  return new RaceScene(raceConfig);
}

if (typeof window !== 'undefined') window.__raceScene = getRaceScene;
if (typeof window !== 'undefined') window.__createRaceScene = createRaceScene;
