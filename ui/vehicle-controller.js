// ui/vehicle-controller.js
// VEHICLE CONTROLLER SYSTEM — Driving physics, input handling, vehicle state management
// Handles acceleration, braking, steering, drifting, boosting, and collision response

import { EventBus } from '../core/EventBus.js';

/**
 * VehicleState — Current state of the player's vehicle
 * @typedef {Object} VehicleState
 * @property {THREE.Vector3} position - World position
 * @property {THREE.Vector3} velocity - Current velocity vector
 * @property {THREE.Vector3} angularVelocity - Rotation speed
 * @property {THREE.Euler} rotation - Vehicle orientation
 * @property {number} speed - Current speed (scalar)
 * @property {number} rpm - Engine RPM (0-1 normalized)
 * @property {number} gear - Current gear (1-6)
 * @property {number} nitro - Nitro amount (0-100)
 * @property {number} health - Vehicle integrity (0-100)
 * @property {boolean} isGrounded - Is vehicle on ground
 * @property {boolean} isDrifting - Currently in drift mode
 * @property {boolean} isBoosting - Currently using boost
 * @property {number} currentLap - Current lap number
 * @property {number} checkpointIndex - Last passed checkpoint
 */

/**
 * VehicleConfig — Configuration for vehicle behavior
 * @typedef {Object} VehicleConfig
 * @property {string} vehicleId - Vehicle identifier
 * @property {number} maxSpeed - Maximum forward speed (units/s)
 * @property {number} acceleration - Acceleration rate
 * @property {number} braking - Braking deceleration
 * @property {number} reverseSpeed - Max reverse speed
 * @property {number} turnSpeed - Base turn rate (rad/s)
 * @property {number} grip - Tire grip factor (0-1)
 * @property {number} driftGrip - Grip during drift
 * @property {number} mass - Vehicle mass
 * @property {number} downforce - Aerodynamic downforce
 */

export class VehicleController {
  constructor() {
    /** @type {THREE.Group|null} */
    this._vehicleMesh = null;
    /** @type {THREE.Camera|null} */
    this._camera = null;
    
    /** @type {VehicleState} */
    this._state = this._createInitialState();
    
    /** @type {VehicleConfig} */
    this._config = this._getDefaultConfig();
    
    // Input state
    this._input = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      brake: false,
      boost: false,
      horn: false,
      drift: false
    };
    
    // Physics accumulators
    this._physics = {
      steerAngle: 0,
      targetSteerAngle: 0,
      wheelRotation: 0,
      suspensionCompression: 0,
      lastGroundNormal: new THREE.Vector3(0, 1, 0)
    };
    
    // Statistics
    this._stats = {
      topSpeed: 0,
      distanceTraveled: 0,
      timeInDrift: 0,
      driftScore: 0,
      boostsUsed: 0,
      collisions: 0
    };
    
    // Trail effects
    this._trails = {
      tireMarks: [],
      exhaustParticles: [],
      boostFlames: null
    };
    
    // Event subscriptions
    this._subscriptions = [];
    
    // Bound handlers
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleKeyUp = this._handleKeyUp.bind(this);
    this._handleGamepad = this._handleGamepad.bind(this);
  }

  /**
   * Initialize the vehicle controller
   * @param {Object} params
   * @param {THREE.Group} params.vehicleMesh - The 3D vehicle model
   * @param {THREE.Camera} params.camera - Camera to follow vehicle
   * @param {Partial<VehicleConfig>} params.config - Vehicle configuration overrides
   * @returns {VehicleController}
   */
  init({ vehicleMesh, camera, config = {} }) {
    this._vehicleMesh = vehicleMesh;
    this._camera = camera;
    Object.assign(this._config, config);
    
    // Setup input listeners
    this._setupInputListeners();
    
    // Create visual effects
    this._createTireTrailSystem();
    this._createExhaustEffect();
    this._createBoostEffect();
    
    console.log('[VehicleController] Initialized', this._config.vehicleId);
    EventBus.emit('vehicle:initialized', { config: this._config });
    
    return this;
  }

  /**
   * Update vehicle physics and state each frame
   * @param {number} deltaTime - Frame delta in seconds
   * @param {Object} environment - Track/environment data
   */
  update(deltaTime, environment = {}) {
    if (!this._vehicleMesh) return;
    
    const dt = Math.min(deltaTime, 0.05); // Cap delta for stability
    
    // Process input
    this._processInput(dt);
    
    // Apply physics
    this._applyPhysics(dt, environment);
    
    // Update vehicle mesh transform
    this._updateTransform();
    
    // Update camera follow
    this._updateCamera(dt);
    
    // Update visual effects
    this._updateEffects(dt);
    
    // Emit state events
    this._emitStateEvents();
    
    // Update statistics
    this._updateStats(dt);
  }

  /**
   * Reset vehicle to starting position
   * @param {THREE.Vector3} position - Start position
   * @param {number} rotation - Initial Y rotation (radians)
   */
  reset(position, rotation = 0) {
    this._state.position.copy(position);
    this._state.rotation.set(0, rotation, 0);
    this._state.velocity.set(0, 0, 0);
    this._state.angularVelocity.set(0, 0, 0);
    this._state.speed = 0;
    this._state.rpm = 0;
    this._state.gear = 1;
    this._state.nitro = 100;
    this._state.health = 100;
    this._state.isDrifting = false;
    this._state.isBoosting = false;
    this._state.currentLap = 0;
    this._state.checkpointIndex = 0;
    
    this._physics.steerAngle = 0;
    this._physics.targetSteerAngle = 0;
    
    if (this._vehicleMesh) {
      this._vehicleMesh.position.copy(position);
      this._vehicleMesh.rotation.set(0, rotation, 0);
    }
    
    EventBus.emit('vehicle:reset', { position, rotation });
  }

  /**
   * Apply collision impulse from impact
   * @param {THREE.Vector3} normal - Collision normal
   * @param {number} impulse - Impact force magnitude
   */
  applyCollision(normal, impulse) {
    // Reflect velocity along collision normal
    const dot = this._state.velocity.dot(normal);
    if (dot < 0) {
      const reflection = normal.clone().multiplyScalar(-2 * dot);
      this._state.velocity.add(reflection).multiplyScalar(0.5); // Energy loss
      
      // Add some spin from impact
      this._state.angularVelocity.y += (Math.random() - 0.5) * impulse * 0.01;
      
      // Damage
      this._state.health -= impulse * 0.5;
      this._stats.collisions++;
      
      EventBus.emit('vehicle:collision', { 
        normal, 
        impulse, 
        health: this._state.health 
      });
    }
  }

  /**
   * Set vehicle configuration (e.g., when changing vehicles)
   * @param {Partial<VehicleConfig>} config
   */
  setConfig(config) {
    Object.assign(this._config, config);
    EventBus.emit('vehicle:configChanged', { config: this._config });
  }

  // ============================================
  // INPUT HANDLING
  // ============================================

  /**
   * Setup keyboard and gamepad listeners
   * @private
   */
  _setupInputListeners() {
    window.addEventListener('keydown', this._handleKeyDown);
    window.addEventListener('keyup', this._handleKeyUp);
    
    // Gamepad polling
    this._gamepadInterval = setInterval(this._handleGamepad, 16); // ~60fps
    
    // Touch controls integration point
    this._subscriptions.push(
      EventBus.on('touch:control', ({ control, active }) => {
        if (control in this._input) {
          this._input[control] = active;
        }
      })
    );
  }

  /**
   * Handle keyboard key down
   * @private
   */
  _handleKeyDown(e) {
    const keyMap = {
      'KeyW': 'forward', 'ArrowUp': 'forward',
      'KeyS': 'backward', 'ArrowDown': 'backward',
      'KeyA': 'left', 'ArrowLeft': 'left',
      'KeyD': 'right', 'ArrowRight': 'right',
      'Space': 'brake',
      'ShiftLeft': 'boost', 'ShiftRight': 'boost',
      'ControlLeft': 'drift', 'ControlRight': 'drift',
      'KeyH': 'horn'
    };
    
    if (keyMap[e.code]) {
      e.preventDefault();
      this._input[keyMap[e.code]] = true;
    }
  }

  /**
   * Handle keyboard key up
   * @private
   */
  _handleKeyUp(e) {
    const keyMap = {
      'KeyW': 'forward', 'ArrowUp': 'forward',
      'KeyS': 'backward', 'ArrowDown': 'backward',
      'KeyA': 'left', 'ArrowLeft': 'left',
      'KeyD': 'right', 'ArrowRight': 'right',
      'Space': 'brake',
      'ShiftLeft': 'boost', 'ShiftRight': 'boost',
      'ControlLeft': 'drift', 'ControlRight': 'drift',
      'KeyH': 'horn'
    };
    
    if (keyMap[e.code]) {
      this._input[keyMap[e.code]] = false;
    }
  }

  /**
   * Handle gamepad input
   * @private
   */
  _handleGamepad() {
    const gamepads = navigator.getGamepads?.() || [];
    const gp = gamepads[0];
    
    if (!gp) return;
    
    // Deadzone threshold
    const dz = 0.15;
    
    // Axes (normalized -1 to 1)
    const lx = Math.abs(gp.axes[0]) > dz ? gp.axes[0] : 0;
    const ly = Math.abs(gp.axes[1]) > dz ? gp.axes[1] : 0;
    const rx = Math.abs(gp.axes[2]) > dz ? gp.axes[2] : 0; // Right stick (if available)
    
    // Map to input state
    this._input.forward = ly < -0.3;
    this._input.backward = ly > 0.3;
    this._input.left = lx < -0.3;
    this._input.right = lx > 0.3;
    this._input.brake = gp.buttons[2]?.pressed || false; // X button
    this._input.boost = gp.buttons[0]?.pressed || false; // A button
    this._input.drift = gp.buttons[1]?.pressed || false; // B button
    
    // Store analog values for smooth steering
    this._input.steerAxis = lx;
    this._input.accelAxis = -ly;
  }

  /**
   * Process raw input into actions
   * @private
   */
  _processInput(dt) {
    // Steering with smoothing
    let targetSteer = 0;
    if (this._input.left) targetSteer = -1;
    if (this._input.right) targetSteer = 1;
    
    // Use analog steering if available
    if (this._input.steerAxis !== undefined) {
      targetSteer = this._input.steerAxis;
    }
    
    // Smooth steering transition
    const steerSpeed = this._state.isDrifting ? 8 : 12;
    this._physics.targetSteerAngle = targetSteer * this._config.turnSpeed;
    
    // Drift toggle
    const wasDrifting = this._state.isDrifting;
    this._state.isDrifting = this._input.drift && Math.abs(this._state.speed) > 15;
    
    // Start/end drift events
    if (this._state.isDrifting && !wasDrifting) {
      EventBus.emit('vehicle:driftStart');
    } else if (!this._state.isDrifting && wasDrifting) {
      EventBus.emit('vehicle:driftEnd', { 
        duration: this._stats.timeInDrift,
        score: this._stats.driftScore
      });
      this._stats.timeInDrift = 0;
      this._stats.driftScore = 0;
    }
  }

  // ============================================
  // PHYSICS SIMULATION
  // ============================================

  /**
   * Apply physics forces and update state
   * @private
   */
  _applyPhysics(dt, environment) {
    const cfg = this._config;
    const state = this._state;
    const phys = this._physics;
    
    // Get forward direction from vehicle rotation
    const quat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, state.rotation.y, 0, 'YXZ')
    );
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quat);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(quat);
    
    // === ACCELERATION / BRAKING ===
    let throttle = 0;
    if (this._input.forward) throttle = 1;
    if (this._input.backward) throttle = -0.6; // Reverse is weaker
    
    // Apply acceleration
    if (throttle !== 0) {
      const accelForce = throttle * cfg.acceleration;
      const currentForwardSpeed = state.velocity.dot(forward);
      
      // Don't accelerate beyond max speed (unless boosting)
      let maxSpd = cfg.maxSpeed;
      if (this._input.boost && state.nitro > 0) {
        maxSpd *= 1.4;
        state.isBoosting = true;
        state.nitro = Math.max(0, state.nitro - dt * 30); // Drain nitro
      } else {
        state.isBoosting = false;
        // Slowly regenerate nitro
        state.nitro = Math.min(100, state.nitro + dt * 5);
      }
      
      if (currentForwardSpeed < maxSpd || throttle < 0) {
        state.velocity.add(forward.clone().multiplyScalar(accelForce * dt));
      }
    }
    
    // Braking / Handbrake
    if (this._input.brake) {
      const brakeForce = cfg.braking * dt;
      const forwardVel = state.velocity.dot(forward);
      
      if (forwardVel > 0) {
        // Apply brake force opposite to motion
        state.velocity.add(forward.clone().multiplyScalar(-Math.min(brakeForce, forwardVel)));
      } else if (Math.abs(state.speed) < 5) {
        // Handbrake when nearly stopped
        state.velocity.multiplyScalar(0.9);
      }
    }
    
    // === STEERING ===
    // Smooth steer angle interpolation
    const steerLerp = 1 - Math.pow(0.001, dt);
    phys.steerAngle += (phys.targetSteerAngle - phys.steerAngle) * steerLerp * 10;
    
    // Calculate grip (reduced during drift)
    const grip = state.isDrifting ? cfg.driftGrip : cfg.grip;
    
    // Apply steering rotation
    if (Math.abs(state.speed) > 0.5) {
      // Turn rate varies with speed (faster = slower turning at high speeds)
      const speedFactor = Math.min(1, Math.abs(state.speed) / 50);
      const turnRate = phys.steerAngle * dt * (1 - speedFactor * 0.5);
      
      // Apply yaw rotation
      state.rotation.y += turnRate;
      
      // Lateral grip - prevents infinite sliding
      const lateralVel = state.velocity.dot(right);
      const lateralDamping = Math.pow(1 - grip * 0.15, dt * 60);
      state.velocity.add(right.clone().multiplyScalar(-lateralVel * (1 - lateralDamping)));
      
      // During drift, add some lateral slide
      if (state.isDrifting) {
        const driftSlide = right.clone().multiplyScalar(lateralVel * 0.02 * dt);
        state.velocity.add(driftSlide);
        
        // Accumulate drift score
        this._stats.timeInDrift += dt;
        this._stats.driftScore += Math.abs(lateralVel) * dt * 10;
      }
    }
    
    // === DRAG & RESISTANCE ===
    // Air resistance (quadratic with speed)
    const dragCoeff = 0.002 * (1 + cfg.downforce * 0.1);
    const speedSq = state.velocity.lengthSq();
    if (speedSq > 0) {
      const drag = state.velocity.clone().normalize().multiplyScalar(-dragCoeff * speedSq * dt);
      state.velocity.add(drag);
    }
    
    // Rolling resistance
    state.velocity.multiplyScalar(Math.pow(0.998, dt * 60));
    
    // === GRAVITY & GROUND ===
    // Simple ground clamping (full physics would use raycast)
    if (environment.groundHeight !== undefined) {
      const groundY = environment.groundHeight;
      if (state.position.y <= groundY + 0.5) {
        state.position.y = groundY + 0.5;
        state.velocity.y = Math.max(0, state.velocity.y);
        state.isGrounded = true;
      } else {
        state.isGrounded = false;
        // Simple gravity
        state.velocity.y -= 20 * dt; // ~9.8 m/s² scaled
      }
    }
    
    // === UPDATE DERIVED STATE ===
    // Update position
    state.position.add(state.velocity.clone().multiplyScalar(dt));
    
    // Update scalar speed
    state.speed = state.velocity.length();
    
    // Track top speed
    if (state.speed > this._stats.topSpeed) {
      this._stats.topSpeed = state.speed;
    }
    
    // Distance traveled
    this._stats.distanceTraveled += state.speed * dt;
    
    // RPM simulation (based on speed and gear)
    const gearSpeeds = [0, 20, 40, 65, 90, 120]; // Speed thresholds per gear
    for (let g = cfg.gearCount || 6; g >= 1; g--) {
      if (state.speed >= (gearSpeeds[g - 1] || 0)) {
        state.gear = g;
        break;
      }
    }
    
    // RPM within current gear range
    const prevGearMax = gearSpeeds[state.gear - 2] || 0;
    const currGearMax = gearSpeeds[state.gear - 1] || cfg.maxSpeed;
    state.rpm = Math.min(1, (state.speed - prevGearMax) / Math.max(1, currGearMax - prevGearMax));
    
    // Wheel rotation for visuals
    phys.wheelRotation += state.speed * dt * 0.5;
  }

  /**
   * Update vehicle mesh transform from state
   * @private
   */
  _updateTransform() {
    if (!this._vehicleMesh) return;
    
    this._vehicleMesh.position.copy(this._state.position);
    this._vehicleMesh.rotation.set(
      this._state.rotation.x,
      this._state.rotation.y,
      this._state.rotation.z
    );
    
    // Add body roll based on steering
    const targetRoll = -this._physics.steerAngle * 0.08;
    this._vehicleMesh.rotation.z += (targetRoll - this._vehicleMesh.rotation.z) * 0.1;
    
    // Pitch based on vertical velocity
    const targetPitch = this._state.velocity.y * 0.01;
    this._vehicleMesh.rotation.x += (targetPitch - this._vehicleMesh.rotation.x) * 0.1;
  }

  /**
   * Update camera to follow vehicle
   * @private
   */
  _updateCamera(dt) {
    if (!this._camera || !this._vehicleMesh) return;
    
    // Camera offset behind and above vehicle
    const offset = new THREE.Vector3(0, 5, 12);
    
    // Rotate offset by vehicle yaw
    const euler = new THREE.Euler(0, this._state.rotation.y, 0, 'YXZ');
    const quat = new THREE.Quaternion().setFromEuler(euler);
    offset.applyQuaternion(quat);
    
    // Target position
    const targetPos = this._state.position.clone().add(offset);
    
    // Smooth camera follow
    const camLerp = 1 - Math.pow(0.001, dt);
    this._camera.position.lerp(targetPos, camLerp * 5);
    
    // Look at vehicle (slightly ahead)
    const lookTarget = this._state.position.clone();
    lookTarget.y += 1;
    this._camera.lookAt(lookTarget);
  }

  // ============================================
  // VISUAL EFFECTS
  // ============================================

  /**
   * Create tire trail system for drift marks
   * @private
   */
  _createTireTrailSystem() {
    // Tire trails will be rendered as fading lines on the ground
    console.log('[VehicleController] Tire trail system ready');
  }

  /**
   * Create exhaust particle effect
   * @private
   */
  _createExhaustEffect() {
    console.log('[VehicleController] Exhaust effect ready');
  }

  /**
   * Create boost flame effect
   * @private
   */
  _createBoostEffect() {
    console.log('[VehicleController] Boost effect ready');
  }

  /**
   * Update all visual effects
   * @private
   */
  _updateEffects(dt) {
    // Tire marks during drift
    if (this._state.isDrifting && this._state.isGrounded) {
      this._addTireMark();
    }
    
    // Exhaust intensity based on throttle/RPM
    // Boost flames when boosting
  }

  /**
   * Add a tire mark at current wheel positions
   * @private
   */
  _addTireMark() {
    // Would add to trail geometry
    EventBus.emit('vehicle:tireMark', {
      position: this._state.position.clone(),
      rotation: this._state.rotation.y
    });
  }

  /**
   * Emit state change events
   * @private
   */
  _emitStateEvents() {
    EventBus.emit('vehicle:update', {
      position: this._state.position,
      speed: this._state.speed,
      rpm: this._state.rpm,
      gear: this._state.gear,
      nitro: this._state.nitro,
      health: this._state.health,
      isDrifting: this._state.isDrifting,
      isBoosting: this._state.isBoosting
    });
  }

  /**
   * Update statistics tracking
   * @private
   */
  _updateStats(dt) {
    if (this._state.isBoosting) {
      this._stats.boostsUsed += dt;
    }
  }

  // ============================================
  // FACTORY METHODS
  // ============================================

  /**
   * Create initial vehicle state
   * @private
   */
  _createInitialState() {
    return {
      position: new THREE.Vector3(0, 0.5, 0),
      velocity: new THREE.Vector3(),
      angularVelocity: new THREE.Vector3(),
      rotation: new THREE.Euler(0, 0, 0, 'YXZ'),
      speed: 0,
      rpm: 0,
      gear: 1,
      nitro: 100,
      health: 100,
      isGrounded: true,
      isDrifting: false,
      isBoosting: false,
      currentLap: 0,
      checkpointIndex: 0
    };
  }

  /**
   * Get default vehicle configuration
   * @private
   */
  _getDefaultConfig() {
    return {
      vehicleId: 'default',
      maxSpeed: 120,
      acceleration: 45,
      braking: 80,
      reverseSpeed: 25,
      turnSpeed: 2.5,
      grip: 0.92,
      driftGrip: 0.35,
      mass: 1200,
      downforce: 0.4,
      gearCount: 6
    };
  }

  // ============================================
  // PRESET CONFIGURATIONS
  // ============================================

  /** @type {Object<string, VehicleConfig>} */
  static VEHICLE_PRESETS = {
    // D-Tier: Scrap Bucket
    scrapBucket: {
      vehicleId: 'scrap-bucket',
      maxSpeed: 85,
      acceleration: 35,
      braking: 70,
      turnSpeed: 2.8,
      grip: 0.88,
      driftGrip: 0.40,
      mass: 1400,
      downforce: 0.3
    },
    // C-Tier: Neon Flash
    neonFlash: {
      vehicleId: 'neon-flash',
      maxSpeed: 95,
      acceleration: 48,
      braking: 75,
      turnSpeed: 2.6,
      grip: 0.90,
      driftGrip: 0.38,
      mass: 1150,
      downforce: 0.45
    },
    // C-Tier: Ironclad
    ironclad: {
      vehicleId: 'ironclad',
      maxSpeed: 88,
      acceleration: 38,
      braking: 90,
      turnSpeed: 2.2,
      grip: 0.95,
      driftGrip: 0.30,
      mass: 1600,
      downforce: 0.55
    },
    // B-Tier: Phantom X
    phantomX: {
      vehicleId: 'phantom-x',
      maxSpeed: 110,
      acceleration: 52,
      braking: 78,
      turnSpeed: 2.5,
      grip: 0.91,
      driftGrip: 0.36,
      mass: 1100,
      downforce: 0.5
    },
    // B-Tier: Sideswiper
    sideswiper: {
      vehicleId: 'sideswiper',
      maxSpeed: 105,
      acceleration: 55,
      braking: 80,
      turnSpeed: 2.9,
      grip: 0.87,
      driftGrip: 0.45,
      mass: 1000,
      downforce: 0.35
    },
    // S-Tier: Apex Predator
    apexPredator: {
      vehicleId: 'apex-predator',
      maxSpeed: 130,
      acceleration: 58,
      braking: 85,
      turnSpeed: 2.7,
      grip: 0.93,
      driftGrip: 0.42,
      mass: 1050,
      downforce: 0.6
    }
  };

  // ============================================
  // PUBLIC GETTERS
  // ============================================

  get state() { return this._state; }
  get config() { return this._config; }
  get stats() { return this._stats; }
  get input() { return this._input; }

  /**
   * Get formatted speed display value
   * @returns {string}
   */
  getFormattedSpeed() {
    return Math.round(this._state.speed * 3.6).toString(); // Convert to km/h display
  }

  /**
   * Dispose of controller resources
   */
  dispose() {
    window.removeEventListener('keydown', this._handleKeyDown);
    window.removeEventListener('keyup', this._handleKeyUp);
    
    if (this._gamepadInterval) {
      clearInterval(this._gamepadInterval);
    }
    
    this._subscriptions.forEach(unsub => unsub());
    this._subscriptions = [];
    
    console.log('[VehicleController] Disposed');
  }
}

// Singleton export
export const vehicleController = new VehicleController();

// Make available globally
if (typeof window !== 'undefined') {
  window.__vehicleCtrl = vehicleController;
}
