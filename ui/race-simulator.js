// ui/race-simulator.js — Simulated Race Logic for Demo/Testing for Warzone Kart: Neon Underground
//
// This creates a SIMULATED race experience for testing the HUD, minimap,
// achievements, and other systems without needing actual gameplay.
//
// Features:
// - Full demo mode with timed event sequence
// - Real-time HUD updates via engine.bus events
// - Configurable race parameters
// - Speed multiplier for faster/slower simulation
// - Integration with all game systems (achievements, challenges, leaderboard)
// - Visual console logging of events

/**
 * @class RaceSimulator
 * Simulates a complete race with realistic data and event emission
 * for testing and demonstration purposes.
 */
class RaceSimulator {
  constructor() {
    /** @type {boolean} Whether demo is currently running */
    this._isRunning = false;

    /** @type {number|null} Main simulation loop interval reference */
    this._mainLoop = null;

    /** @type {number|null} Event sequence timeout references array */
    this._eventTimeouts = [];

    /** @type {number} Current simulated time in milliseconds since race start */
    this._simulatedTime = 0;

    /** @type {number} Speed multiplier for simulation (1 = real-time) */
    this._speedMultiplier = 10; // 10x speed by default

    /** @type {Object} Current race configuration */
    this._config = this._getDefaultConfig();

    /** @type {Object} Current race state */
    this._state = this._getInitialState();

    /** @type {Object|null} Reference to engine bus for event emission */
    this._eventBus = null;

    /** @type {Object|null} Reference to HUD system for direct updates */
    this._hudSystem = null;

    /** @type {Object|null} Reference to minimap for position updates */
    this._minimap = null;

    /** @type {Array<string>} Event log for debugging */
    this._eventLog = [];

    /** @type {boolean} Verbose console output */
    this._verbose = true;
  }

  /**
   * Get default race configuration
   * @returns {Object} Default config object
   * @private
   */
  _getDefaultConfig() {
    return {
      duration: 120000,        // 2 minutes total
      totalLaps: 3,
      trackId: 'downtown',
      playerStartPos: 4,
      opponents: [
        { name: 'NeonRacer99', skill: 0.85, vehicleId: 'vehicle.spectre' },
        { name: 'SpeedDemon', skill: 0.75, vehicleId: 'vehicle.titan' },
        { name: 'DriftKing', skill: 0.90, vehicleId: 'vehicle.vixen' },
        { name: 'NightHawk', skill: 0.70, vehicleId: 'vehicle.base' },
        { name: 'VortexX', skill: 0.65, vehicleId: 'vehicle.spectre' },
        { name: 'TurboAce', skill: 0.80, vehicleId: 'vehicle.titan' },
        { name: 'PlasmaDriver', skill: 0.72, vehicleId: 'vehicle.vixen' }
      ],
      lapTimeMs: 40000,       // Target lap time
      maxSpeed: 280,          // km/h
      accelerationRate: 60,    // km/h per second
      itemsAvailable: ['boost', 'shield', 'missile', 'nitro'],
      itemBoxPositions: [0.25, 0.55, 0.85] // Track positions as percentage
    };
  }

  /**
   * Get initial race state
   * @returns {Object} Initial state object
   * @private
   */
  _getInitialState() {
    return {
      phase: 'idle',          // idle, countdown, racing, finished
      currentLap: 1,
      position: this._config.playerStartPos,
      totalRacers: this._config.opponents.length + 1,
      speed: 0,               // km/h
      maxSpeedReached: 0,
      distance: 0,            // meters traveled
      currentItem: null,
      shieldHealth: 100,
      health: 100,
      gear: 0,
      driftTime: 0,
      itemsUsed: 0,
      missileHits: 0,
      blocks: 0,
      overtakes: 0,
      boostPadsHit: 0,
      wallHits: 0,
      perfectLap: true,
      startTime: null,
      currentTime: 0
    };
  }

  /**
   * Initialize the simulator with dependencies
   * @param {Object} options - Initialization options
   * @param {Object} [options.eventBus] - Engine EventBus instance
   * @param {Object} [options.hudSystem] - HUD System instance
   * @param {Object} [options.minimap] - Minimap instance
   * @param {boolean} [options.verbose=true] - Enable console logging
   * @returns {RaceSimulator} This instance for chaining
   */
  init(options = {}) {
    this._eventBus = options.eventBus || (window.__engine?.bus || null);
    this._hudSystem = options.hudSystem || window.__hud || null;
    this._minimap = options.minimap || null;
    this._verbose = options.verbose !== false;

    console.log('[RaceSimulator] Initialized', this._eventBus ? '(with EventBus)' : '(standalone)');
    return this;
  }

  /**
   * Start the simulated race demo
   * @param {Object} [options] - Override options for this run
   * @returns {Promise<void>} Resolves when race ends or is stopped
   */
  async startDemo(options = {}) {
    if (this._isRunning) {
      this._log('Demo already running');
      return;
    }

    // Apply any overrides
    if (options.config) {
      this._config = { ...this._getDefaultConfig(), ...options.config };
    }
    if (options.speedMultiplier !== undefined) {
      this._speedMultiplier = options.speedMultiplier;
    }

    // Reset state
    this._state = this._getInitialState();
    this._state.position = this._config.playerStartPos;
    this._simulatedTime = 0;
    this._eventLog = [];
    this._isRunning = true;

    this._log('🏁 Starting demo race...', this._config);

    try {
      // Start countdown
      await this._runCountdown();

      // Start main loop and scheduled events
      this._startMainLoop();
      this._scheduleEvents();

      // Wait for race to complete
      await this._waitForCompletion();

    } catch (err) {
      if (err.message !== 'STOPPED') {
        console.error('[RaceSimulator] Error during demo:', err);
      }
    }

    this._stop();
    return this._getResults();
  }

  /**
   * Stop the demo early
   */
  stopDemo() {
    if (!this._isRunning) return;

    this._log('⛔ Demo stopped by user');
    this._isRunning = false;
    
    // Clear all timeouts
    this._eventTimeouts.forEach(t => clearTimeout(t));
    this._eventTimeouts = [];

    // Clear main loop
    if (this._mainLoop) {
      clearInterval(this._mainLoop);
      this._mainLoop = null;
    }

    const error = new Error('STOPPED');
    throw error;
  }

  /**
   * Set simulation speed multiplier
   * @param {number} multiplier - New speed (1=realtime, 10=10x fast)
   */
  setSpeed(multiplier) {
    this._speedMultiplier = Math.max(0.5, Math.min(100, multiplier));
    this._log(`Speed set to ${this._speedMultiplier}x`);
  }

  // ==================== RACE PHASES ====================

  /**
   * Run the pre-race countdown (3-2-1-GO!)
   * @private
   * @returns {Promise<void>}
   */
  async _runCountdown() {
    this._state.phase = 'countdown';
    this._emit('race:countdown', { stage: 'start' });

    const countdownSteps = [
      { text: '3', delay: 1000 },
      { text: '2', delay: 1000 },
      { text: '1', delay: 1000 },
      { text: 'GO!', delay: 500 }
    ];

    for (const step of countdownSteps) {
      this._log(`Countdown: ${step.text}`);
      this._emit('race:countdown', { 
        stage: step.text.toLowerCase().replace('!', ''), 
        remaining: countdownSteps.indexOf(step) + 1 
      });

      // Update HUD with countdown
      this._updateHUD({ countdown: step.text });
      
      await this._delay(step.delay / this._speedMultiplier);
    }

    // Race start!
    this._state.phase = 'racing';
    this._state.startTime = Date.now();

    this._emit('race:start', {
      trackId: this._config.trackId,
      totalLaps: this._config.totalLaps,
      racers: this._config.totalRacers
    });

    this._log('🚀 RACE START!');
  }

  /**
   * Start the main update loop
   * @private
   */
  _startMainLoop() {
    const tickInterval = 50; // 20 updates per second real-time
    const simTickMs = tickInterval * this._speedMultiplier;

    let lastTime = Date.now();

    this._mainLoop = setInterval(() => {
      if (!this._isRunning) return;

      const now = Date.now();
      const deltaReal = now - lastTime;
      lastTime = now;

      // Calculate simulated delta
      const deltaSim = deltaReal * this._speedMultiplier;
      this._simulatedTime += deltaSim;
      this._state.currentTime = this._simulatedTime;

      // Update physics/state
      this._updateState(deltaSim);

      // Emit periodic updates
      this._emitPeriodicUpdates();

    }, tickInterval);
  }

  /**
   * Schedule timed race events
   * @private
   */
  _scheduleEvents() {
    const schedule = (delayMs, handler) => {
      const adjustedDelay = delayMs / this._speedMultiplier;
      const timeout = setTimeout(() => {
        if (this._isRunning) handler();
      }, adjustedDelay);
      this._eventTimeouts.push(timeout);
    };

    // Event timeline (in simulated milliseconds)
    const t = {
      // Acceleration phase (0-5s): Speed ramps up
      ACCEL_END: 5000,

      // First item pickup (~8s in)
      ITEM_1: 8000,

      // First overtake (~15s in)
      OVERTAKE_1: 15000,

      // Hit boost pad (~25s in)
      BOOST_PAD: 25000,

      // Second item pickup (~30s in)
      ITEM_2: 30000,

      // Lap 1 complete (~40s in)
      LAP_1: 40000,

      // Drifting segment (~45s)
      DRIFT_START: 45000,
      DRIFT_END: 52000,

      // Hit by missile (~55s)
      MISSILE_HIT: 55000,

      // Shield block attempt (~58s)
      SHIELD_BLOCK: 58000,

      // Another overtake (~70s)
      OVERTAKE_2: 70000,

      // Lap 2 complete (~80s)
      LAP_2: 80000,

      // Third item pickup (~85s)
      ITEM_3: 85000,

      // Top speed achievement (~95s)
      TOP_SPEED: 95000,

      // Final push - overtaken briefly (~105s)
      OVERTAKEN: 105000,

      // Recovery overtake (~110s)
      OVERTAKE_3: 110000,

      // Lap 3 complete - RACE END! (~120s)
      LAP_3_FINISH: 120000
    };

    // Schedule all events
    schedule(t.ITEM_1, () => this._onItemPickup());
    schedule(t.OVERTAKE_1, () => this._onOvertake(1));
    schedule(t.BOOST_PAD, () => this._onBoostPad());
    schedule(t.ITEM_2, () => this._onItemPickup(true)); // Missile this time
    schedule(t.LAP_1, () => this._onLapComplete(1));
    schedule(t.DRIFT_START, () => this._onDriftStart());
    schedule(t.DRIFT_END, () => this._onDriftEnd(7));
    schedule(t.MISSILE_HIT, () => this._onMissileHit());
    schedule(t.SHIELD_BLOCK, () => this._onShieldBlock());
    schedule(t.OVERTAKE_2, () => this._onOvertake(2));
    schedule(t.LAP_2, () => this._onLapComplete(2));
    schedule(t.ITEM_3, () => this._onItemPickup()); // Boost
    schedule(t.TOP_SPEED, () => this._onTopSpeed());
    schedule(t.OVERTAKEN, () => this._onOvertaken());
    schedule(t.OVERTAKE_3, () => this._onOvertake(3)); // Comeback!
    schedule(t.LAP_3_FINISH, () => this._onRaceEnd());
  }

  // ==================== EVENT HANDLERS ====================

  /**
   * Handle item box pickup
   * @param {boolean} [isMissile=false] - Force missile type
   * @private
   */
  _onItemPickup(isMissile = false) {
    const items = isMissile 
      ? ['missile'] 
      : this._config.itemsAvailable.filter(i => i !== 'missile');
    
    const item = items[Math.floor(Math.random() * items.length)];
    this._state.currentItem = item;

    this._log(`📦 Item picked up: ${item}`);
    this._emit('player:itemPicked', { item, slot: 0 });

    // Auto-use after short delay
    const useDelay = 2000;
    setTimeout(() => {
      if (this._isRunning && this._state.currentItem === item) {
        this._onItemUse(item);
      }
    }, useDelay / this._speedMultiplier);
  }

  /**
   * Handle item usage
   * @param {string} item - Item being used
   * @private
   */
  _onItemUse(item) {
    this._state.itemsUsed++;
    this._state.currentItem = null;

    this._log(`✨ Item used: ${item}`);
    this._emit('player:itemUsed', { item });

    // Special handling based on item type
    switch (item) {
      case 'missile':
        // Will hit target shortly
        setTimeout(() => {
          if (this._isRunning) {
            this._emit('item:missile:hit', { target: this._config.opponents[0].name });
          }
        }, 1500 / this._speedMultiplier);
        break;
      case 'boost':
      case 'nitro':
        this._state.speed = Math.min(this._state.speed + 40, this._config.maxSpeed + 20);
        break;
      case 'shield':
        this._state.shieldHealth = 100;
        break;
    }

    this._updateHUD({ currentItem: null });
  }

  /**
   * Handle successful overtake
   * @param {number} overtakeNumber - Which overtake this is (for logging)
   * @private
   */
  _onOvertake(overtakeNumber) {
    if (this._state.position <= 1) return; // Can't improve from first

    const oldPosition = this._state.position;
    this._state.position--;
    this._state.overtakes++;

    const opponentName = this._config.opponents[this._state.position]?.name || 'opponent';

    this._log(`⬆️ Overtake #${overtakeNumber}: P${oldPosition} → P${this._state.position}`);
    this._emit('player:positionChanged', {
      position: this._state.position,
      previousPosition: oldPosition,
      totalRacers: this._state.totalRacers,
      opponentName
    });
    this._emit('player:overtake', { opponentName, newPosition: this._state.position });

    this._updateHUD({ position: this._state.position });
  }

  /**
   * Handle being overtaken
   * @private
   */
  _onOvertaken() {
    if (this._state.position >= this._state.totalRacers) return;

    const oldPosition = this._state.position;
    this._state.position++;

    this._log(`⬇️ Got overtaken: P${oldPosition} → P${this._state.position}`);
    this._emit('player:positionChanged', {
      position: this._state.position,
      previousPosition: oldPosition,
      totalRacers: this._state.totalRacers,
      wasOvertaken: true
    });

    this._updateHUD({ position: this._state.position });
  }

  /**
   * Handle boost pad hit
   * @private
   */
  _onBoostPad() {
    this._state.boostPadsHit++;
    this._state.speed = Math.min(this._state.speed + 35, this._config.maxSpeed + 15);

    this._log(`💨 Boost pad hit! Speed: ${Math.round(this._state.speed)} km/h`);
    this._emit('player:boostPadHit', { newSpeed: this._state.speed });

    // Also triggers speed changed event
    this._emit('player:speedChanged', {
      speed: this._state.speed,
      source: 'boost'
    });
  }

  /**
   * Handle lap completion
   * @param {number} lapNumber - Which lap just completed
   * @private
   */
  _onLapComplete(lapNumber) {
    this._state.currentLap++;

    // Check for perfect lap
    if (this._state.perfectLap) {
      this._emit('player:perfectLap', { lapNumber });
    } else {
      this._state.perfectLap = true; // Reset for next lap
    }

    const lapTime = this._simulatedTime - ((lapNumber - 1) * this._config.lapTimeMs);

    this._log(`🏁 Lap ${lapNumber} complete! Time: ${this._formatTime(lapTime)}`);

    this._emit('player:lapCompleted', {
      lapNumber,
      lapTime,
      currentPosition: this._state.position,
      perfect: this._state.perfectLap
    });

    this._updateHUD({
      currentLap: this._state.currentLap,
      lapProgress: 0
    });

    // If final lap, we're almost done (handled by separate finish event)
  }

  /**
   * Handle drift segment start
   * @private
   */
  _onDriftStart() {
    this._log(`🌪️ Drift started...`);
    this._emit('player:driftStart', {});
  }

  /**
   * Handle drift end
   * @param {number} seconds - Duration of drift
   * @private
   */
  _onDriftEnd(seconds) {
    this._state.driftTime += seconds;

    this._log(`🌪️ Drift ended: ${seconds.toFixed(1)}s (total: ${this._state.driftTime.toFixed(1)}s)`);
    this._emit('player:driftEnd', { duration: seconds, totalDrift: this._state.driftTime });

    // Update daily challenge progress
    if (window.__dailyChallenges) {
      window.__dailyChallenges.onDrift(seconds);
    }
  }

  /**
   * Handle being hit by enemy missile
   * @private
   */
  _onMissileHit() {
    this._state.health -= 25;
    this._state.missileHits++; // Tracking hits received
    this._state.speed *= 0.75; // Slow down on hit

    this._log(`💥 Hit by missile! Health: ${this._state.health}%`);
    this._emit('player:damageTaken', {
      damage: 25,
      source: 'missile',
      healthRemaining: this._state.health
    });

    this._updateHUD({
      health: this._state.health,
      speed: this._state.speed
    });
  }

  /**
   * Handle blocking an attack with shield
   * @private
   */
  _onShieldBlock() {
    this._state.blocks++;
    this._state.shieldHealth = Math.max(0, this._state.shieldHealth - 30);

    this._log(`🛡️ Attack blocked! Shield: ${this._state.shieldHealth}%`);
    this._emit('player:shieldBlock', {
      blockedDamage: 30,
      shieldRemaining: this._state.shieldHealth
    });

    // Update daily challenge progress
    if (window.__dailyChallenges) {
      window.__dailyChallenges.onShieldBlock();
    }
  }

  /**
   * Handle reaching top speed
   * @private
   */
  _onTopSpeed() {
    this._state.speed = 255; // Above 250 threshold
    this._state.maxSpeedReached = Math.max(this._state.maxSpeedReached, this._state.speed);

    this._log(`🚀 Top speed achieved: ${this._state.speed} km/h!`);
    this._emit('player:speedChanged', {
      speed: this._state.speed,
      maxSpeed: this._state.maxSpeedReached,
      source: 'natural'
    });

    // Update achievements/challenges
    if (window.__dailyChallenges) {
      window.__dailyChallenges.onSpeedChange(this._state.speed);
    }
  }

  /**
   * Handle race end
   * @private
   */
  _onRaceEnd() {
    this._state.phase = 'finished';

    const totalTime = this._simulatedTime;
    const finalPosition = this._state.position;

    // Build results object
    const result = {
      position: finalPosition,
      totalTime,
      lapsCompleted: this._state.currentLap - 1,
      bestLapTime: this._config.lapTimeMs,
      trackId: this._config.trackId,
      distance: this._state.distance,
      itemsUsed: this._state.itemsUsed,
      topSpeed: this._state.maxSpeedReached,
      driftTime: this._state.driftTime,
      perfectRace: this._state.wallHits === 0,
      overtakes: this._state.overtakes,
      boostsUsed: this._state.boostPadsHit,
      health: this._state.health,
      timeMs: totalTime
    };

    this._log(`🏁 RACE FINISHED! Position: #${finalPosition}`, result);

    // Emit main race:end event
    this._emit('race:end', {
      result,
      trackId: this._config.trackId,
      dnf: false
    });

    // Trigger integrations
    this._triggerIntegrations(result);

    // Stop will be called by waitForCompletion
  }

  // ==================== STATE UPDATES ====================

  /**
   * Update race state each tick
   * @param {number} deltaMs - Time delta in ms
   * @private
   */
  _updateState(deltaMs) {
    if (this._state.phase !== 'racing') return;

    const dt = deltaMs / 1000; // Convert to seconds

    // Accelerate towards max speed (with natural variation)
    const targetSpeed = this._config.maxSpeed * (0.7 + Math.random() * 0.25);
    const accel = this._config.accelerationRate * dt;

    if (this._state.speed < targetSpeed) {
      this._state.speed = Math.min(this._state.speed + accel, targetSpeed);
    } else {
      // Slight speed variation
      this._state.speed += (Math.random() - 0.5) * 5;
      this._state.speed = Math.max(100, Math.min(targetSpeed, this._state.speed));
    }

    // Track max speed reached
    if (this._state.speed > this._state.maxSpeedReached) {
      this._state.maxSpeedReached = this._state.speed;
    }

    // Update distance (approximate: speed in m/s)
    const metersPerSecond = this._state.speed / 3.6;
    this._state.distance += metersPerSecond * dt;

    // Calculate lap progress (rough estimate)
    const trackLength = this._distanceToTrackLength();
    const lapProgress = (this._state.distance % trackLength) / trackLength;

    // Update gear based on speed
    this._state.gear = this._calculateGear(this._state.speed);

    // Random wall hit chance (low)
    if (Math.random() < 0.001) {
      this._state.wallHits++;
      this._state.perfectLap = false;
    }

    // Update HUD periodically (throttled internally by HUD system)
    this._updateHUD({
      speed: Math.round(this._state.speed),
      position: this._state.position,
      currentLap: this._state.currentLap,
      totalLaps: this._config.totalLaps,
      lapProgress: lapProgress,
      gear: this._state.gear,
      raceTime: this._simulatedTime,
      shield: this._state.shieldHealth,
      health: this._state.health
    });

    // Update minimap positions
    this._updateMinimap(lapProgress);
  }

  /**
   * Estimate track length from lap time and average speed
   * @returns {number} Estimated track length in meters
   * @private
   */
  _distanceToTrackLength() {
    // Average speed ~180km/h = 50m/s, 40 second lap ≈ 2000m
    return 2000;
  }

  /**
   * Calculate gear from speed
   * @param {number} speedKmh - Speed in km/h
   * @returns {number} Gear number (0-6)
   * @private
   */
  _calculateGear(speedKmh) {
    if (speedKmh < 20) return 0;
    if (speedKmh < 50) return 1;
    if (speedKmh < 90) return 2;
    if (speedKmh < 140) return 3;
    if (speedKmh < 190) return 4;
    if (speedKmh < 240) return 5;
    return 6;
  }

  /**
   * Emit periodic updates (for systems that need frequent data)
   * @private
   */
  _emitPeriodicUpdates() {
    // Position update for minimap (every tick is fine, minimap will throttle)
    this._emit('player:positionUpdate', {
      x: Math.sin(this._simulatedTime / 5000) * 100,
      y: Math.cos(this._simulatedTime / 5000) * 100,
      rotation: (this._simulatedTime / 100) % (2 * Math.PI),
      speed: this._state.speed,
      opponents: this._generateOpponentPositions()
    });

    // Speed change event (only on significant changes)
    const roundedSpeed = Math.round(this._state.speed);
    if (roundedSpeed % 10 === 0 && this._lastEmittedSpeed !== roundedSpeed) {
      this._lastEmittedSpeed = roundedSpeed;
      this._emit('player:speedChanged', {
        speed: this._state.speed,
        maxSpeed: this._state.maxSpeedReached
      });
    }
  }

  /**
   * Generate fake opponent positions for minimap
   * @returns {Array} Opponent position data
   * @private
   */
  _generateOpponentPositions() {
    return this._config.opponents.map((opp, idx) => ({
      name: opp.name,
      x: Math.sin((this._simulatedTime / 4000) + idx) * 80 + (idx * 10 - 40),
      y: Math.cos((this._simulatedTime / 4000) + idx) * 80,
      position: idx + 1 >= this._state.position ? idx + 2 : idx + 1
    }));
  }

  // ==================== INTEGRATIONS ====================

  /**
   * Trigger post-race integrations
   * @param {Object} result - Race result data
   * @private
   */
  _triggerIntegrations(result) {
    // Leaderboard integration
    if (window.__leaderboard) {
      window.__leaderboard.addEntry({
        playerName: window.__leaderboard._playerName || 'Player',
        vehicleId: 'vehicle.base',
        trackId: result.trackId,
        timeMs: result.totalTime,
        laps: result.lapsCompleted,
        position: result.position,
        isPlayer: true
      });

      window.__leaderboard.updateStats({
        racesCompleted: 1,
        wins: result.position === 1 ? 1 : 0,
        losses: result.position > 1 ? 1 : 0,
        distance: result.distance,
        topSpeed: result.topSpeed,
        itemsUsed: result.itemsUsed,
        perfect: result.perfectRace,
        driftTime: result.driftTime,
        playTime: Math.floor(result.totalTime / 1000)
      });
    }

    // Daily challenges integration
    if (window.__dailyChallenges) {
      window.__dailyChallenges.onRaceResult(result);
    }

    // Achievement system integration (via bus events already handled)
  }

  /**
   * Update HUD with new state
   * @param {Object} stateUpdate - Partial state to apply
   * @private
   */
  _updateHUD(stateUpdate) {
    if (!this._hudSystem) return;

    try {
      this._hudSystem.update(stateUpdate);
    } catch (e) {
      // Silent fail for HUD updates
    }
  }

  /**
   * Update minimap with position
   * @param {number} lapProgress - Current lap progress (0-1)
   * @private
   */
  _updateMinimap(lapProgress) {
    // Minimap updates are handled via positionUpdate event
    // This method can be used for direct minimap API calls if needed
  }

  // ==================== UTILITIES ====================

  /**
   * Emit an event through the bus (if available)
   * @param {string} eventName - Event name
   * @param {*} data - Event payload
   * @private
   */
  _emit(eventName, data) {
    const logEntry = { event: eventName, data, time: this._simulatedTime };
    this._eventLog.push(logEntry);

    if (this._verbose) {
      const preview = typeof data === 'object' 
        ? JSON.stringify(data).slice(0, 80) 
        : data;
      console.log(
        `%c[RaceSim]%c ${eventName}`,
        'color: #ff4d2e; font-weight: bold',
        'color: #888',
        preview
      );
    }

    if (this._eventBus) {
      try {
        this._eventBus.emit(eventName, data);
      } catch (e) {
        console.warn('[RaceSim] Event emit failed:', e.message);
      }
    }
  }

  /**
   * Create a promise that resolves after a delay
   * @param {number} ms - Delay in milliseconds
   * @returns {Promise<void>}
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Wait for race completion
   * @returns {Promise<void>}
   * @private
   */
  async _waitForCompletion() {
    return new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (!this._isRunning || this._state.phase === 'finished') {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100 / this._speedMultiplier);
    });
  }

  /**
   * Stop all running processes
   * @private
   */
  _stop() {
    this._isRunning = false;

    // Clear timeouts
    this._eventTimeouts.forEach(t => clearTimeout(t));
    this._eventTimeouts = [];

    // Clear intervals
    if (this._mainLoop) {
      clearInterval(this._mainLoop);
      this._mainLoop = null;
    }

    this._log('Demo stopped');
  }

  /**
   * Get final race results
   * @returns {Object} Results summary
   */
  _getResults() {
    return {
      position: this._state.position,
      totalLaps: this._config.totalLaps,
      completedLaps: this._state.currentLap - 1,
      totalTime: this._simulatedTime,
      topSpeed: this._state.maxSpeedReached,
      distance: this._state.distance,
      itemsUsed: this._state.itemsUsed,
      overtakes: this._state.overtakes,
      driftTime: this._state.driftTime,
      wallHits: this._state.wallHits,
      perfectRace: this._state.wallHits === 0,
      eventLog: this._eventLog,
      trackId: this._config.trackId
    };
  }

  /**
   * Log message to console (if verbose)
   * @param {string} message - Message to log
   * @param {*} [data] - Optional additional data
   * @private
   */
  _log(message, data) {
    if (!this._verbose) return;
    if (data !== undefined) {
      console.log(`[RaceSim] ${message}`, data);
    } else {
      console.log(`[RaceSim] ${message}`);
    }
  }

  /**
   * Format time in MM:SS.mmm
   * @param {number} ms - Time in milliseconds
   * @returns {string}
   * @private
   */
  _formatTime(ms) {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    const millis = Math.floor((ms % 1000) / 10);
    return `${mins}:${String(secs).padStart(2, '0')}.${String(millis).padStart(2, '0')}`;
  }

  /**
   * Get the event log for debugging
   * @returns {Array} Array of logged events
   */
  getEventLog() {
    return [...this._eventLog];
  }

  /**
   * Get current simulation state
   * @returns {Object} Copy of current state
   */
  getState() {
    return JSON.parse(JSON.stringify(this._state));
  }

  /**
   * Check if currently running
   * @returns {boolean}
   */
  get isRunning() {
    return this._isRunning;
  }

  /**
   * Get current configuration
   * @returns {Object} Copy of config
   */
  getConfig() {
    return JSON.parse(JSON.stringify(this._config));
  }

  /**
   * Set custom race configuration
   * @param {Object} config - Configuration overrides
   */
  setConfig(config) {
    this._config = { ...this._getDefaultConfig(), ...config };
    console.log('[RaceSim] Config updated:', this._config);
  }
}

// Singleton instance export
const raceSimulator = new RaceSimulator();

export { RaceSimulator, raceSimulator };
export default raceSimulator;

// Global exposure for dev tools
window.__raceSim = raceSimulator;
