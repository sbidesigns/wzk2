// ui/race-environment.js
// RACE ENVIRONMENT SYSTEM — 3D scene management, procedural track generation, dynamic environment
// Handles track creation, scenery, lighting, weather, and atmosphere for racing

import { EventBus } from '../core/EventBus.js';

/**
 * TrackSegment — Individual segment of the procedural track
 * @typedef {Object} TrackSegment
 * @property {number} index - Segment index
 * @property {THREE.Vector3} start - Start position
 * @property {THREE.Vector3} end - End position
 * @property {number} curvature - Curve amount (-1 to 1)
 * @property {number} slope - Incline/decline angle
 * @property {string} type - Segment type (straight, curve, hill, jump, etc.)
 * @property {number} width - Track width at this segment
 */

/**
 * EnvironmentConfig — Configuration for race environment
 * @typedef {Object} EnvironmentConfig
 * @property {string} timeOfDay - 'dawn', 'day', 'dusk', 'night'
 * @property {string} weather - 'clear', 'rain', 'fog', 'snow', 'neonstorm'
 * @property {string} biome - 'neoncity', 'volcanic', 'arctic', 'toxic', 'skyway'
 * @property {object} track - Track generation parameters
 */

export class RaceEnvironmentSystem {
  constructor() {
    /** @type {THREE.Scene|null} */
    this._scene = null;
    /** @type {THREE.Camera|null} */
    this._camera = null;
    /** @type {THREE.WebGLRenderer|null} */
    this._renderer = null;
    
    /** @type {TrackSegment[]} */
    this._trackSegments = [];
    /** @type {THREE.Group|null} */
    this._trackMesh = null;
    /** @type {THREE.Group|null} */
    this._sceneryGroup = null;
    /** @type {THREE.Group|null} */
    this._effectsGroup = null;
    
    /** @type {EnvironmentConfig} */
    this._config = {
      timeOfDay: 'night',
      weather: 'clear',
      biome: 'neoncity',
      track: {
        length: 2000,        // Total track units
        width: 18,           // Track width
        laneCount: 4,
        complexity: 0.6,     // 0-1 curve/hill frequency
        difficulty: 0.5      // Overall difficulty modifier
      }
    };
    
    /** @type {Object<string, *>} */
    this._state = {
      initialized: false,
      trackGenerated: false,
      environmentLoaded: false,
      currentLap: 0,
      totalTime: 0
    };
    
    // Lighting references
    this._lights = {
      ambient: null,
      directional: null,
      pointLights: [],
      spotLights: []
    };
    
    // Sky/Atmosphere
    this._sky = {
      dome: null,
      stars: null,
      clouds: [],
      fog: null
    };
    
    // Particle systems
    this._particles = {
      rain: null,
      snow: null,
      dust: null,
      sparks: null
    };
    
    // Event subscriptions
    this._subscriptions = [];
  }

  /**
   * Initialize the race environment system
   * @param {HTMLCanvasElement} canvas - Target canvas for rendering
   * @param {Partial<EnvironmentConfig>} config - Override configuration
   * @returns {Promise<RaceEnvironmentSystem>}
   */
  async init(canvas, config = {}) {
    if (this._state.initialized) {
      console.warn('[RaceEnvironment] Already initialized');
      return this;
    }
    
    // Merge configuration
    Object.assign(this._config, config);
    
    try {
      // Wait for Three.js to be available
      const THREE = await this._waitForThreeJS();
      
      // Create scene
      this._scene = new THREE.Scene();
      this._scene.fog = new THREE.FogExp2(0x050510, 0.008);
      
      // Create camera
      const aspect = canvas.clientWidth / canvas.clientHeight;
      this._camera = new THREE.PerspectiveCamera(70, aspect, 0.1, 2000);
      this._camera.position.set(0, 8, 20);
      
      // Create renderer
      this._renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance'
      });
      this._renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this._renderer.shadowMap.enabled = true;
      this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this._renderer.toneMappingExposure = 1.2;
      this._renderer.outputColorSpace = THREE.SRGBColorSpace;
      
      // Initialize groups
      this._trackMesh = new THREE.Group();
      this._trackMesh.name = 'track';
      this._scene.add(this._trackMesh);
      
      this._sceneryGroup = new THREE.Group();
      this._sceneryGroup.name = 'scenery';
      this._scene.add(this._sceneryGroup);
      
      this._effectsGroup = new THREE.Group();
      this._effectsGroup.name = 'effects';
      this._scene.add(this._effectsGroup);
      
      // Setup environment
      this._setupLighting(THREE);
      this._setupSky(THREE);
      this._setupGroundPlane(THREE);
      
      this._state.initialized = true;
      EventBus.emit('raceEnvironment:initialized', { config: this._config });
      
      console.log('[RaceEnvironment] Initialized successfully');
      return this;
      
    } catch (err) {
      console.error('[RaceEnvironment] Initialization failed:', err);
      throw err;
    }
  }

  /**
   * Generate procedural track based on configuration
   * @returns {Promise<TrackSegment[]>}
   */
  async generateTrack() {
    if (!this._state.initialized) {
      throw new Error('[RaceEnvironment] Not initialized');
    }
    
    const THREE = await this._waitForThreeJS();
    const cfg = this._config.track;
    
    console.log(`[RaceEnvironment] Generating track: ${cfg.length}m, complexity: ${cfg.complexity}`);
    
    // Clear existing track
    while (this._trackMesh.children.length > 0) {
      const child = this._trackMesh.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
      this._trackMesh.remove(child);
    }
    this._trackSegments = [];
    
    // Generate track path using Catmull-Rom spline control points
    const controlPoints = this._generateControlPoints(cfg);
    const curve = new THREE.CatmullRomCurve3(controlPoints, false, 'catmullrom', 0.5);
    
    // Create track segments along curve
    const segmentLength = 10; // Units per segment
    const totalSegments = Math.floor(cfg.length / segmentLength);
    
    for (let i = 0; i < totalSegments; i++) {
      const t = i / totalSegments;
      const tNext = Math.min((i + 1) / totalSegments, 1);
      
      const pos = curve.getPointAt(t);
      const posNext = curve.getPointAt(tNext);
      const tangent = curve.getTangentAt(t);
      
      // Determine segment properties
      const segment = this._createSegment(i, pos, posNext, tangent, cfg, THREE);
      this._trackSegments.push(segment);
      
      // Create mesh for this segment
      this._createTrackSegmentMesh(segment, THREE);
    }
    
    // Add track decorations (barriers, lights, etc.)
    this._addTrackDecorations(THREE);
    
    // Generate scenery around track
    this._generateScenery(curve, THREE);
    
    this._state.trackGenerated = true;
    EventBus.emit('raceEnvironment:trackGenerated', {
      segmentCount: this._trackSegments.length,
      totalLength: cfg.length
    });
    
    return this._trackSegments;
  }

  /**
   * Update environment state each frame
   * @param {number} deltaTime - Time since last frame in seconds
   * @param {Object} playerState - Current player position/state
   */
  update(deltaTime, playerState = {}) {
    if (!this._state.initialized) return;
    
    this._state.totalTime += deltaTime;
    
    // Update particle effects
    this._updateParticles(deltaTime);
    
    // Update dynamic lighting
    this._updateDynamicLighting(playerState);
    
    // Animate scenery
    this._animateScenery(deltaTime);
    
    // Update effects
    this._updateEffects(deltaTime);
    
    // Render scene
    if (this._renderer && this._scene && this._camera) {
      this._renderer.render(this._scene, this._camera);
    }
  }

  /**
   * Set time of day and update lighting accordingly
   * @param {string} timeOfDay - 'dawn', 'day', 'dusk', 'night'
   */
  setTimeOfDay(timeOfDay) {
    this._config.timeOfDay = timeOfDay;
    this._applyTimeOfDayPreset();
    EventBus.emit('raceEnvironment:timeChanged', { timeOfDay });
  }

  /**
   * Set weather conditions
   * @param {string} weather - 'clear', 'rain', 'fog', 'snow', 'neonstorm'
   */
  setWeather(weather) {
    this._config.weather = weather;
    this._applyWeatherEffects();
    EventBus.emit('raceEnvironment:weatherChanged', { weather });
  }

  /**
   * Get position along track at given distance
   * @param {number} distance - Distance from start
   * @returns {{position: THREE.Vector3, tangent: THREE.Vector3, segment: TrackSegment}}
   }
   */
  getTrackPosition(distance) {
    if (!this._trackSegments.length) {
      return { position: new THREE.Vector3(), tangent: new THREE.Vector3(0, 0, 1), segment: null };
    }
    
    const cfg = this._config.track;
    const totalLength = cfg.length;
    const normalizedDist = ((distance % totalLength) + totalLength) % totalLength;
    const segmentIndex = Math.floor((normalizedDist / totalLength) * this._trackSegments.length);
    const segment = this._trackSegments[Math.min(segmentIndex, this._trackSegments.length - 1)];
    
    return {
      position: segment.start.clone(),
      tangent: segment.end.clone().sub(segment.start).normalize(),
      segment
    };
  }

  /**
   * Get checkpoint positions for lap validation
   * @returns {THREE.Vector3[]}
   */
  getCheckpoints() {
    const checkpoints = [];
    const count = 8; // 8 checkpoints per lap
    
    for (let i = 1; i <= count; i++) {
      const dist = (this._config.track.length / count) * i;
      const { position } = this.getTrackPosition(dist);
      checkpoints.push(position);
    }
    
    return checkpoints;
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Wait for Three.js to be available globally
   * @private
   */
  async _waitForThreeJS() {
    if (typeof THREE !== 'undefined') return THREE;
    
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds
      
      const check = setInterval(() => {
        attempts++;
        if (typeof THREE !== 'undefined') {
          clearInterval(check);
          resolve(THREE);
        } else if (attempts >= maxAttempts) {
          clearInterval(check);
          reject(new Error('Three.js not available after timeout'));
        }
      }, 100);
    });
  }

  /**
   * Generate control points for track spline
   * @private
   */
  _generateControlPoints(cfg) {
    const points = [];
    const numPoints = 30; // Control points for spline
    
    let x = 0, y = 0, z = 0;
    let angle = 0; // Direction angle in radians
    
    points.push(new THREE.Vector3(x, y, z));
    
    for (let i = 1; i < numPoints; i++) {
      // Vary direction based on complexity
      const turnAmount = (Math.random() - 0.5) * cfg.complexity * 1.5;
      angle += turnAmount;
      
      // Calculate distance to next point
      const distance = (cfg.length / numPoints) * (0.8 + Math.random() * 0.4);
      
      // Move forward
      x += Math.sin(angle) * distance;
      z += Math.cos(angle) * distance;
      
      // Add elevation changes
      const hillHeight = Math.sin(i * 0.5) * 15 * cfg.complexity +
                         (Math.random() - 0.5) * 10 * cfg.complexity;
      y = Math.max(0, hillHeight);
      
      points.push(new THREE.Vector3(x, y, z));
    }
    
    // Ensure last point connects back somewhat toward start area
    const last = points[points.length - 1];
    points.push(new THREE.Vector3(last.x * 0.9, 0, last.z * 0.9));
    
    return points;
  }

  /**
   * Create a track segment definition
   * @private
   */
  _createSegment(index, start, end, tangent, cfg, THREE) {
    // Determine segment type based on geometry
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const dy = end.y - start.y;
    const horizontalDist = Math.sqrt(dx * dx + dz * dz);
    
    // Curvature: how much we're turning
    const cross = tangent.x * Math.cos(Math.atan2(dz, dx)) - tangent.z * Math.sin(Math.atan2(dz, dx));
    const curvature = Math.max(-1, Math.min(1, cross * 2));
    
    // Slope: uphill or downhill
    const slope = Math.atan2(dy, horizontalDist);
    
    // Determine type
    let type = 'straight';
    if (Math.abs(curvature) > 0.3) type = 'curve';
    if (Math.abs(slope) > 0.15) type = Math.abs(slope) > 0.35 ? 'hill' : 'slope';
    if (index > 0 && Math.abs(dy) > 5 && horizontalDist < 15) type = 'jump';
    
    // Width variation
    const widthVariation = 1 + Math.sin(index * 0.3) * 0.15;
    const width = cfg.width * widthVariation;
    
    return {
      index,
      start: start.clone(),
      end: end.clone(),
      curvature,
      slope,
      type,
      width,
      length: start.distanceTo(end)
    };
  }

  /**
   * Create mesh for a track segment
   * @private
   */
  _createTrackSegmentMesh(segment, THREE) {
    const { start, end, width, type, index } = segment;
    
    // Calculate perpendicular vector for width
    const direction = end.clone().sub(start).normalize();
    const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
    
    // Create quad for track surface
    const halfWidth = width / 2;
    const vertices = [
      start.clone().add(perpendicular.clone().multiplyScalar(halfWidth)),
      start.clone().sub(perpendicular.clone().multiplyScalar(halfWidth)),
      end.clone().sub(perpendicular.clone().multiplyScalar(halfWidth)),
      end.clone().add(perpendicular.clone().multiplyScalar(halfWidth))
    ];
    
    // Create geometry
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array([
      vertices[0].x, vertices[0].y, vertices[0].z,
      vertices[1].x, vertices[1].y, vertices[1].z,
      vertices[3].x, vertices[3].y, vertices[3].z,
      vertices[1].x, vertices[1].y, vertices[1].z,
      vertices[2].x, vertices[2].y, vertices[2].z,
      vertices[3].x, vertices[3].y, vertices[3].z
    ]);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    
    // Material based on segment type and biome
    const material = this._getTrackMaterial(type, index, THREE);
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.name = `segment_${index}`;
    mesh.userData.segmentIndex = index;
    mesh.userData.segmentType = type;
    
    this._trackMesh.add(mesh);
    
    // Add road markings
    this._addRoadMarkings(vertices, type, THREE);
  }

  /**
   * Get material for track segment based on type and style
   * @private
   */
  _getTrackMaterial(type, index, THREE) {
    const biome = this._config.biome;
    
    // Base colors per biome
    const biomeColors = {
      neoncity: { main: 0x1a1a2e, accent: 0xe94560, emissive: 0x0f3460 },
      volcanic: { main: 0x2d132c, accent: 0xff6b35, emissive: 0x801336 },
      arctic: { main: 0x1b262c, accent: 0x00fff5, emissive: 0x0f4c75 },
      toxic: { main: 0x1e3a1e, accent: 0x39ff14, emissive: 0x0d260d },
      skyway: { main: 0x16213e, accent: 0xffd700, emissive: 0x1a1a2e }
    };
    
    const colors = biomeColors[biome] || biomeColors.neoncity;
    
    // Vary color slightly by segment
    const hueShift = Math.sin(index * 0.1) * 0.05;
    const baseColor = new THREE.Color(colors.main).offsetHSL(hueShift, 0, 0);
    
    const material = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.7,
      metalness: 0.3,
      envMapIntensity: 0.5
    });
    
    // Add glow effect for certain types
    if (type === 'curve') {
      material.emissive = new THREE.Color(colors.accent);
      material.emissiveIntensity = 0.1;
    }
    
    return material;
  }

  /**
   * Add road markings (center line, edge lines)
   * @private
   */
  _addRoadMarkings(vertices, type, THREE) {
    // Center dashed line
    if (index % 2 === 0) {
      const centerLeft = vertices[0].clone().lerp(vertices[1], 0.5);
      const centerRight = vertices[2].clone().lerp(vertices[3], 0.5);
      
      const lineGeo = new THREE.BufferGeometry().setFromPoints([centerLeft, centerRight]);
      const lineMat = new THREE.LineBasicMaterial({ 
        color: this._config.biome === 'neoncity' ? 0x00ffff : 0xffffff,
        transparent: true,
        opacity: 0.7
      });
      const line = new THREE.Line(lineGeo, lineMat);
      this._trackMesh.add(line);
    }
    
    // Edge glow lines
    const edgeColor = this._getBiomeAccentColor();
    [ [vertices[0], vertices[3]], [vertices[1], vertices[2]] ].forEach(([start, end]) => {
      const edgeGeo = new THREE.BufferGeometry().setFromPoints([start, end]);
      const edgeMat = new THREE.LineBasicMaterial({ 
        color: edgeColor,
        transparent: true,
        opacity: 0.9
      });
      const edgeLine = new THREE.Line(edgeGeo, edgeMat);
      this._trackMesh.add(edgeLine);
    });
  }

  /**
   * Add track decorations (barriers, lights, signs)
   * @private
   */
  _addTrackDecorations(THREE) {
    const accentColor = this._getBiomeAccentColor();
    
    // Add decorative elements every N segments
    this._trackSegments.forEach((segment, i) => {
      if (i % 5 === 0) {
        // Track side lights/poles
        this._addTrackLight(segment, THREE);
      }
      
      if (i % 20 === 0) {
        // Large signage/billboards
        this._addTrackSign(segment, i, THREE);
      }
      
      if (segment.type === 'curve' && i % 3 === 0) {
        // Curve warning barriers
        this._addCurveBarrier(segment, THREE);
      }
    });
    
    // Start/finish line
    this._addStartFinishLine(THREE);
  }

  /**
   * Add light pole at track segment
   * @private
   */
  _addTrackLight(segment, THREE) {
    const { start, width } = segment;
    const direction = segment.end.clone().sub(start).normalize();
    const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
    
    // Both sides of track
    [-1, 1].forEach(side => {
      const offset = perpendicular.clone().multiplyScalar((width / 2 + 3) * side);
      const position = start.clone().add(offset);
      
      // Light pole
      const poleGeo = new THREE.CylinderGeometry(0.1, 0.15, 8, 8);
      const poleMat = new THREE.MeshStandardMaterial({ 
        color: 0x222233,
        metalness: 0.8,
        roughness: 0.3
      });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.copy(position);
      pole.position.y += 4;
      pole.castShadow = true;
      this._sceneryGroup.add(pole);
      
      // Light fixture
      const lightGeo = new THREE.SphereGeometry(0.4, 16, 16);
      const lightMat = new THREE.MeshBasicMaterial({ 
        color: this._getBiomeAccentColor()
      });
      const fixture = new THREE.Mesh(lightGeo, lightMat);
      fixture.position.copy(position);
      fixture.position.y += 8;
      this._sceneryGroup.add(fixture);
      
      // Actual point light
      if (this._lights.pointLights.length < 50) {
        const pointLight = new THREE.PointLight(
          this._getBiomeAccentColor(), 
          2, 
          25
        );
        pointLight.position.copy(fixture.position);
        this._scene.add(pointLight);
        this._lights.pointLights.push(pointLight);
      }
    });
  }

  /**
   * Add signage/billboard near track
   * @private
   */
  _addTrackSign(segment, index, THREE) {
    const { start, width } = segment;
    const direction = segment.end.clone().sub(start).normalize();
    const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
    
    const position = start.clone().add(perpendicular.multiplyScalar(width / 2 + 8));
    position.y += 5;
    
    // Billboard plane
    const signGeo = new THREE.PlaneGeometry(8, 4);
    
    // Create gradient texture for sign
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 256, 128);
    gradient.addColorStop(0, '#e94560');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 128);
    
    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px "Bebas Neue", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`ZONE ${index}`, 128, 75);
    
    const texture = new THREE.CanvasTexture(canvas);
    const signMat = new THREE.MeshBasicMaterial({ 
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.copy(position);
    sign.lookAt(new THREE.Vector3(position.x, position.y, position.z - 10));
    this._sceneryGroup.add(sign);
  }

  /**
   * Add barrier for curves
   * @private
   */
  _addCurveBarrier(segment, THREE) {
    const { start, end, width, curvature } = segment;
    const direction = end.clone().sub(start).normalize();
    const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
    
    // Barrier on inside of curve
    const side = curvature > 0 ? -1 : 1;
    const offset = perpendicular.clone().multiplyScalar((width / 2 + 1) * side);
    
    const barrierStart = start.clone().add(offset);
    barrierStart.y += 0.5;
    const barrierEnd = end.clone().add(offset);
    barrierEnd.y += 0.5;
    
    const barrierGeo = new THREE.BoxGeometry(0.3, 1, start.distanceTo(end));
    const barrierMat = new THREE.MeshStandardMaterial({
      color: this._getBiomeAccentColor(),
      emissive: this._getBiomeAccentColor(),
      emissiveIntensity: 0.3,
      metalness: 0.6,
      roughness: 0.4
    });
    
    const barrier = new THREE.Mesh(barrierGeo, barrierMat);
    barrier.position.copy(barrierStart.clone().add(barrierEnd).multiplyScalar(0.5));
    barrier.lookAt(barrierEnd);
    barrier.castShadow = true;
    this._sceneryGroup.add(barrier);
  }

  /**
   * Add start/finish line with checkered pattern
   * @private
   */
  _addStartFinishLine(THREE) {
    if (!this._trackSegments.length) return;
    
    const firstSegment = this._trackSegments[0];
    const { start, width } = firstSegment;
    
    // Checkered pattern
    const checkeredSize = 2;
    const checksPerRow = Math.ceil(width / checkeredSize);
    const rows = 3;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < checksPerRow; col++) {
        const isWhite = (row + col) % 2 === 0;
        
        const checkGeo = new THREE.PlaneGeometry(checkeredSize, checkeredSize);
        const checkMat = new THREE.MeshBasicMaterial({ 
          color: isWhite ? 0xffffff : 0x000000,
          side: THREE.DoubleSide
        });
        
        const check = new THREE.Mesh(checkGeo, checkMat);
        check.rotation.x = -Math.PI / 2;
        check.position.set(
          start.x + (col - checksPerRow / 2) * checkeredSize,
          start.y + 0.02,
          start.z + row * checkeredSize
        );
        this._trackMesh.add(check);
      }
    }
    
    // Start line glow
    const glowGeo = new THREE.PlaneGeometry(width, 0.2);
    const glowMat = new THREE.MeshBasicMaterial({ 
      color: this._getBiomeAccentColor(),
      transparent: true,
      opacity: 0.8
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(start.x, start.y + 0.03, start.z);
    this._trackMesh.add(glow);
  }

  /**
   * Generate scenery around the track
   * @private
   */
  _generateScenery(trackCurve, THREE) {
    const biome = this._config.biome;
    
    switch (biome) {
      case 'neoncity':
        this._generateCityScenery(trackCurve, THREE);
        break;
      case 'volcanic':
        this._generateVolcanicScenery(trackCurve, THREE);
        break;
      case 'arctic':
        this._generateArcticScenery(trackCurve, THREE);
        break;
      case 'toxic':
        this._generateToxicScenery(trackCurve, THREE);
        break;
      case 'skyway':
        this._generateSkywayScenery(trackCurve, THREE);
        break;
      default:
        this._generateGenericScenery(trackCurve, THREE);
    }
  }

  /**
   * Generate neon city buildings and structures
   * @private
   */
  _generateCityScenery(trackCurve, THREE) {
    const buildingCount = 80;
    
    for (let i = 0; i < buildingCount; i++) {
      const t = (i / buildingCount) + (Math.random() - 0.5) * 0.1;
      const clampedT = Math.max(0, Math.min(1, t));
      const pos = trackCurve.getPointAt(clampedT);
      
      // Random offset from track
      const side = Math.random() > 0.5 ? 1 : -1;
      const distance = 30 + Math.random() * 60;
      const angle = Math.random() * Math.PI * 0.3;
      
      const buildingPos = new THREE.Vector3(
        pos.x + Math.cos(angle) * distance * side,
        0,
        pos.z + Math.sin(angle) * distance * side
      );
      
      // Building dimensions
      const width = 8 + Math.random() * 15;
      const depth = 8 + Math.random() * 15;
      const height = 20 + Math.random() * 80;
      
      // Building geometry
      const buildingGeo = new THREE.BoxGeometry(width, height, depth);
      
      // Neon-lit windows effect
      const windowColor = new THREE.Color().setHSL(
        Math.random() * 0.2 + 0.5, // Cyan to magenta range
        0.8,
        0.5
      );
      
      const buildingMat = new THREE.MeshStandardMaterial({
        color: 0x111122,
        emissive: windowColor,
        emissiveIntensity: 0.1 + Math.random() * 0.2,
        metalness: 0.3,
        roughness: 0.7
      });
      
      const building = new THREE.Mesh(buildingGeo, buildingMat);
      building.position.set(buildingPos.x, height / 2, buildingPos.z);
      building.castShadow = true;
      building.receiveShadow = true;
      this._sceneryGroup.add(building);
      
      // Rooftop accent lights
      if (Math.random() > 0.5) {
        const lightGeo = new THREE.BoxGeometry(width * 0.8, 0.5, 0.5);
        const lightMat = new THREE.MeshBasicMaterial({ color: windowColor });
        const roofLight = new THREE.Mesh(lightGeo, lightMat);
        roofLight.position.set(buildingPos.x, height + 0.25, buildingPos.z);
        this._sceneryGroup.add(roofLight);
      }
    }
    
    // Add holographic advertisements
    this._addHolographicAds(THREE);
  }

  /**
   * Generate volcanic terrain with lava flows
   * @private
   */
  _generateVolcanicScenery(trackCurve, THREE) {
    // Rocky formations
    for (let i = 0; i < 50; i++) {
      const t = Math.random();
      const pos = trackCurve.getPointAt(t);
      const side = Math.random() > 0.5 ? 1 : -1;
      const distance = 25 + Math.random() * 50;
      
      const rockPos = new THREE.Vector3(
        pos.x + (Math.random() - 0.5) * distance * side,
        0,
        pos.z + (Math.random() - 0.5) * distance
      );
      
      const size = 5 + Math.random() * 20;
      const rockGeo = new THREE.DodecahedronGeometry(size, 1);
      
      // Distort vertices for organic look
      const positions = rockGeo.attributes.position;
      for (let j = 0; j < positions.count; j++) {
        positions.setY(j, positions.getY(j) * (0.5 + Math.random()));
      }
      rockGeo.computeVertexNormals();
      
      const rockMat = new THREE.MeshStandardMaterial({
        color: 0x2d132c,
        roughness: 0.9,
        metalness: 0.1
      });
      
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.set(rockPos.x, size * 0.3, rockPos.z);
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      rock.castShadow = true;
      this._sceneryGroup.add(rock);
      
      // Lava cracks on some rocks
      if (Math.random() > 0.6) {
        const lavaMat = new THREE.MeshBasicMaterial({
          color: 0xff4500,
          transparent: true,
          opacity: 0.8
        });
        const lavaGeo = new THREE.SphereGeometry(size * 0.3, 8, 8);
        const lava = new THREE.Mesh(lavaGeo, lavaMat);
        lava.position.set(rockPos.x, size * 0.5, rockPos.z);
        this._effectsGroup.add(lava);
      }
    }
  }

  /**
   * Generate arctic ice formations
   * @private
   */
  _generateArcticScenery(trackCurve, THREE) {
    // Ice crystals and glaciers
    for (let i = 0; i < 40; i++) {
      const t = Math.random();
      const pos = trackCurve.getPointAt(t);
      const side = Math.random() > 0.5 ? 1 : -1;
      const distance = 30 + Math.random() * 50;
      
      const icePos = new THREE.Vector3(
        pos.x + (Math.random() - 0.5) * distance * side,
        0,
        pos.z + (Math.random() - 0.5) * distance
      );
      
      const height = 10 + Math.random() * 40;
      const iceGeo = new THREE.ConeGeometry(5 + Math.random() * 10, height, 6);
      const iceMat = new THREE.MeshPhysicalMaterial({
        color: 0xa5f3fc,
        transmission: 0.6,
        thickness: 2,
        roughness: 0.1,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.1
      });
      
      const ice = new THREE.Mesh(iceGeo, iceMat);
      ice.position.set(icePos.x, height / 2, icePos.z);
      ice.rotation.y = Math.random() * Math.PI * 2;
      ice.castShadow = true;
      this._sceneryGroup.add(ice);
    }
    
    // Aurora borealis effect planes
    this._addAuroraEffect(THREE);
  }

  /**
   * Generate toxic swamp environment
   * @private
   */
  _generateToxicScenery(trackCurve, THREE) {
    // Twisted trees and toxic pools
    for (let i = 0; i < 60; i++) {
      const t = Math.random();
      const pos = trackCurve.getPointAt(t);
      const side = Math.random() > 0.5 ? 1 : -1;
      const distance = 25 + Math.random() * 45;
      
      const treePos = new THREE.Vector3(
        pos.x + (Math.random() - 0.5) * distance * side,
        0,
        pos.z + (Math.random() - 0.5) * distance
      );
      
      // Twisted trunk
      const trunkHeight = 8 + Math.random() * 15;
      const trunkGeo = new THREE.CylinderGeometry(0.3, 0.8, trunkHeight, 8);
      const trunkMat = new THREE.MeshStandardMaterial({
        color: 0x2d4a1c,
        roughness: 0.9
      });
      
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(treePos.x, trunkHeight / 2, treePos.z);
      trunk.rotation.z = (Math.random() - 0.5) * 0.3;
      trunk.castShadow = true;
      this._sceneryGroup.add(trunk);
      
      // Glowing toxic leaves
      const leafGeo = new THREE.SphereGeometry(3 + Math.random() * 4, 8, 8);
      const leafMat = new THREE.MeshBasicMaterial({
        color: 0x39ff14,
        transparent: true,
        opacity: 0.7
      });
      
      const leaves = new THREE.Mesh(leafGeo, leafMat);
      leaves.position.set(treePos.x, trunkHeight + 2, treePos.z);
      this._sceneryGroup.add(leaves);
    }
    
    // Toxic ground fog
    const fogGeo = new THREE.PlaneGeometry(500, 500);
    const fogMat = new THREE.MeshBasicMaterial({
      color: 0x39ff14,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    const fogPlane = new THREE.Mesh(fogGeo, fogMat);
    fogPlane.rotation.x = -Math.PI / 2;
    fogPlane.position.y = 0.5;
    this._effectsGroup.add(fogPlane);
  }

  /**
   * Generate floating skyway platforms
   * @private
   */
  _generateSkywayScenery(trackCurve, THREE) {
    // Floating islands/platforms
    for (let i = 0; i < 30; i++) {
      const t = Math.random();
      const pos = trackCurve.getPointAt(t);
      const side = Math.random() > 0.5 ? 1 : -1;
      const distance = 40 + Math.random() * 80;
      
      const platformPos = new THREE.Vector3(
        pos.x + (Math.random() - 0.5) * distance * side,
        20 + Math.random() * 60,
        pos.z + (Math.random() - 0.5) * distance
      );
      
      const size = 15 + Math.random() * 30;
      const platformGeo = new THREE.CylinderGeometry(size, size * 1.2, 5, 8);
      const platformMat = new THREE.MeshStandardMaterial({
        color: 0x16213e,
        metalness: 0.5,
        roughness: 0.5
      });
      
      const platform = new THREE.Mesh(platformGeo, platformMat);
      platform.position.copy(platformPos);
      platform.castShadow = true;
      this._sceneryGroup.add(platform);
      
      // Glowing edge ring
      const ringGeo = new THREE.TorusGeometry(size, 0.5, 8, 16);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(platformPos);
      ring.position.y += 2.5;
      ring.rotation.x = Math.PI / 2;
      this._sceneryGroup.add(ring);
    }
    
    // Cloud layer below
    const cloudGeo = new THREE.PlaneGeometry(1000, 1000);
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0x8899aa,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    const clouds = new THREE.Mesh(cloudGeo, cloudMat);
    clouds.rotation.x = -Math.PI / 2;
    clouds.position.y = -10;
    this._effectsGroup.add(clouds);
  }

  /**
   * Generate generic fallback scenery
   * @private
   */
  _generateGenericScenery(trackCurve, THREE) {
    // Simple hills and trees
    for (let i = 0; i < 50; i++) {
      const t = Math.random();
      const pos = trackCurve.getPointAt(t);
      const side = Math.random() > 0.5 ? 1 : -1;
      const distance = 30 + Math.random() * 50;
      
      const objPos = new THREE.Vector3(
        pos.x + (Math.random() - 0.5) * distance * side,
        0,
        pos.z + (Math.random() - 0.5) * distance
      );
      
      const size = 3 + Math.random() * 8;
      const geo = Math.random() > 0.5 
        ? new THREE.SphereGeometry(size, 8, 8)
        : new THREE.ConeGeometry(size, size * 2, 8);
      
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.3, 0.5, 0.2 + Math.random() * 0.2),
        roughness: 0.8
      });
      
      const obj = new THREE.Mesh(geo, mat);
      obj.position.set(objPos.x, size, objPos.z);
      obj.castShadow = true;
      this._sceneryGroup.add(obj);
    }
  }

  /**
   * Add holographic advertisement billboards
   * @private
   */
  _addHolographicAds(THREE) {
    const adTexts = ['NEON SPEED', 'CYBER RACE', 'ZONE WARS', 'APEX KART', 'TURBO'];
    
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const radius = 80 + Math.random() * 40;
      
      const position = new THREE.Vector3(
        Math.cos(angle) * radius,
        15 + Math.random() * 20,
        Math.sin(angle) * radius
      );
      
      // Holographic plane
      const adGeo = new THREE.PlaneGeometry(20, 10);
      
      // Canvas texture
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0)';
      ctx.fillRect(0, 0, 256, 128);
      
      const hue = (i / 12) * 360;
      ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.8)`;
      ctx.font = 'bold 48px "Bebas Neue", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(adTexts[i % adTexts.length], 128, 75);
      
      const texture = new THREE.CanvasTexture(canvas);
      const adMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      
      const ad = new THREE.Mesh(adGeo, adMat);
      ad.position.copy(position);
      ad.lookAt(0, position.y, 0);
      this._effectsGroup.add(ad);
    }
  }

  /**
   * Add aurora borealis effect for arctic biome
   * @private
   */
  _addAuroraEffect(THREE) {
    const auroraGeo = new THREE.PlaneGeometry(400, 100);
    const auroraMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color(0x00ff88) },
        uColor2: { value: new THREE.Color(0x0088ff) },
        uColor3: { value: new THREE.Color(0xff00ff) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        varying vec2 vUv;
        
        float noise(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }
        
        void main() {
          float n = noise(vUv * 10.0 + uTime * 0.5);
          float wave = sin(vUv.x * 20.0 + uTime + n * 5.0) * 0.5 + 0.5;
          
          vec3 color = mix(uColor1, uColor2, wave);
          color = mix(color, uColor3, sin(vUv.y * 3.14159) * 0.5);
          
          float alpha = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
          alpha *= 0.4 + wave * 0.3;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this._aurora = new THREE.Mesh(auroraGeo, auroraMat);
    this._aurora.position.set(0, 80, -100);
    this._aurora.rotation.x = -0.3;
    this._effectsGroup.add(this._aurora);
  }

  /**
   * Setup scene lighting
   * @private
   */
  _setupLighting(THREE) {
    // Ambient light (dim for night racing)
    this._lights.ambient = new THREE.AmbientLight(0x111133, 0.4);
    this._scene.add(this._lights.ambient);
    
    // Main directional (moonlight)
    this._lights.directional = new THREE.DirectionalLight(0x6688cc, 0.3);
    this._lights.directional.position.set(50, 100, -50);
    this._lights.directional.castShadow = true;
    this._lights.directional.shadow.mapSize.width = 2048;
    this._lights.directional.shadow.mapSize.height = 2048;
    this._lights.directional.shadow.camera.near = 10;
    this._lights.directional.shadow.camera.far = 300;
    this._lights.directional.shadow.camera.left = -100;
    this._lights.directional.shadow.camera.right = 100;
    this._lights.directional.shadow.camera.top = 100;
    this._lights.directional.shadow.camera.bottom = -100;
    this._scene.add(this._lights.directional);
    
    // Hemisphere light for subtle sky color
    const hemi = new THREE.HemisphereLight(0x0a0a20, 0x050510, 0.3);
    this._scene.add(hemi);
    
    // Apply initial time preset
    this._applyTimeOfDayPreset();
  }

  /**
   * Setup sky dome and stars
   * @private
   */
  _setupSky(THREE) {
    // Starfield
    const starGeo = new THREE.BufferGeometry();
    const starPositions = [];
    const starColors = [];
    
    for (let i = 0; i < 2000; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 800 + Math.random() * 200;
      
      starPositions.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
      
      // Slight color variation
      const color = new THREE.Color();
      color.setHSL(0.6 + Math.random() * 0.2, 0.2, 0.7 + Math.random() * 0.3);
      starColors.push(color.r, color.g, color.b);
    }
    
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
    
    const starMat = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.9
    });
    
    this._sky.stars = new THREE.Points(starGeo, starMat);
    this._scene.add(this._sky.stars);
    
    // Subtle nebula clouds
    this._addNebulaClouds(THREE);
  }

  /**
   * Add nebula cloud effects
   * @private
   */
  _addNebulaClouds(THREE) {
    const cloudColors = [0xe94560, 0x0f3460, 0x00d9ff, 0xff6b35];
    
    for (let i = 0; i < 8; i++) {
      const cloudGeo = new THREE.SphereGeometry(100 + Math.random() * 150, 16, 16);
      const cloudMat = new THREE.MeshBasicMaterial({
        color: cloudColors[i % cloudColors.length],
        transparent: true,
        opacity: 0.03 + Math.random() * 0.05,
        side: THREE.BackSide
      });
      
      const cloud = new THREE.Mesh(cloudGeo, cloudMat);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5;
      cloud.position.set(
        600 * Math.sin(phi) * Math.cos(theta),
        200 + Math.random() * 200,
        600 * Math.sin(phi) * Math.sin(theta)
      );
      this._sky.clouds.push(cloud);
      this._scene.add(cloud);
    }
  }

  /**
   * Setup ground plane
   * @private
   */
  _setupGroundPlane(THREE) {
    const groundGeo = new THREE.PlaneGeometry(2000, 2000, 50, 50);
    
    // Add slight terrain variation
    const positions = groundGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const noise = Math.sin(x * 0.01) * Math.cos(y * 0.01) * 2;
      positions.setZ(i, noise - 0.5);
    }
    groundGeo.computeVertexNormals();
    
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a12,
      roughness: 0.95,
      metalness: 0.05
    });
    
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'ground';
    this._scene.add(ground);
  }

  /**
   * Apply time of day lighting preset
   * @private
   */
  _applyTimeOfDayPreset() {
    const presets = {
      dawn: {
        ambient: { color: 0xff8844, intensity: 0.5 },
        directional: { color: 0xffaa66, intensity: 0.6, position: [100, 30, 50] },
        fog: { color: 0x221122, density: 0.006 }
      },
      day: {
        ambient: { color: 0x8899bb, intensity: 0.7 },
        directional: { color: 0xffffee, intensity: 1.0, position: [50, 150, -30] },
        fog: { color: 0x8899aa, density: 0.003 }
      },
      dusk: {
        ambient: { color: 0xff6644, intensity: 0.4 },
        directional: { color: 0xff4422, intensity: 0.5, position: [-80, 20, 50] },
        fog: { color: 0x221115, density: 0.007 }
      },
      night: {
        ambient: { color: 0x111133, intensity: 0.3 },
        directional: { color: 0x6688cc, intensity: 0.25, position: [50, 100, -50] },
        fog: { color: 0x050510, density: 0.008 }
      }
    };
    
    const preset = presets[this._config.timeOfDay] || presets.night;
    
    if (this._lights.ambient) {
      this._lights.ambient.color.setHex(preset.ambient.color);
      this._lights.ambient.intensity = preset.ambient.intensity;
    }
    
    if (this._lights.directional) {
      this._lights.directional.color.setHex(preset.directional.color);
      this._lights.directional.intensity = preset.directional.intensity;
      this._lights.directional.position.set(...preset.directional.position);
    }
    
    if (this._scene.fog) {
      this._scene.fog.color.setHex(preset.fog.color);
      this._scene.fog.density = preset.fog.density;
    }
  }

  /**
   * Apply weather effects
   * @private
   */
  _applyWeatherEffects() {
    // Clear existing particles
    Object.values(this._particles).forEach(p => {
      if (p) {
        this._effectsGroup.remove(p);
        p = null;
      }
    });
    
    switch (this._config.weather) {
      case 'rain':
        this._createRainParticles();
        break;
      case 'snow':
        this._createSnowParticles();
        break;
      case 'fog':
        if (this._scene.fog) {
          this._scene.fog.density *= 3;
        }
        break;
      case 'neonstorm':
        this._createNeonStorm();
        break;
      default:
        // Clear weather - reset fog
        this._applyTimeOfDayPreset();
    }
  }

  /**
   * Create rain particle system
   * @private
   */
  _createRainParticles() {
    // Will be implemented with Three.js Points
    console.log('[RaceEnvironment] Rain effect active');
  }

  /**
   * Create snow particle system
   * @private
   */
  _createSnowParticles() {
    console.log('[RaceEnvironment] Snow effect active');
  }

  /**
   * Create neon storm effect
   * @private
   */
  _createNeonStorm() {
    console.log('[RaceEnvironment] Neon storm active');
  }

  /**
   * Update particle systems each frame
   * @private
   */
  _updateParticles(deltaTime) {
    // Update aurora shader
    if (this._aurora && this._aurora.material.uniforms) {
      this._aurora.material.uniforms.uTime.value += deltaTime;
    }
    
    // Rotate stars slowly
    if (this._sky.stars) {
      this._sky.stars.rotation.y += deltaTime * 0.01;
    }
  }

  /**
   * Update dynamic lighting based on player position
   * @private
   */
  _updateDynamicLighting(playerState) {
    // Could implement headlight-like following light
    // or dynamic shadow updates based on player position
  }

  /**
   * Animate scenery elements
   * @private
   */
  _animateScenery(deltaTime) {
    // Subtle animation for holographic ads
    this._effectsGroup.children.forEach((child, i) => {
      if (child.material && child.material.opacity !== undefined) {
        // Pulsing opacity
        child.material.opacity = 0.5 + Math.sin(this._state.totalTime * 2 + i) * 0.2;
      }
    });
  }

  /**
   * Update visual effects
   * @private
   */
  _updateEffects(deltaTime) {
    // Future: sparks, exhaust trails, etc.
  }

  /**
   * Get accent color for current biome
   * @private
   */
  _getBiomeAccentColor() {
    const accents = {
      neoncity: 0x00ffff,
      volcanic: 0xff4500,
      arctic: 0x00fff5,
      toxic: 0x39ff14,
      skyway: 0xffd700
    };
    return accents[this._config.biome] || 0x00ffff;
  }

  // ============================================
  // PUBLIC GETTERS
  // ============================================

  get scene() { return this._scene; }
  get camera() { return this._camera; }
  get renderer() { return this._renderer; }
  get trackSegments() { return this._trackSegments; }
  get config() { return this._config; }
  get state() { return this._state; }

  /**
   * Dispose of all resources
   */
  dispose() {
    // Unsubscribe from events
    this._subscriptions.forEach(unsub => unsub());
    this._subscriptions = [];
    
    // Dispose geometries and materials
    if (this._trackMesh) {
      this._trackMesh.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
    
    // Dispose renderer
    if (this._renderer) {
      this._renderer.dispose();
    }
    
    this._state.initialized = false;
    console.log('[RaceEnvironment] Disposed');
  }
}

// Singleton export
export const raceEnvironment = new RaceEnvironmentSystem();

// Make available globally for debugging
if (typeof window !== 'undefined') {
  window.__raceEnv = raceEnvironment;
}
