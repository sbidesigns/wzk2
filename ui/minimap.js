// ui/minimap.js — Canvas-based Minimap/Radar Component for Warzone Kart
// Features: Track outline, player position, opponent blips, item spawns, checkpoints
// CSS: loaded via ui/styles/minimap.css in index.html

/**
 * @class Minimap
 * Canvas-based minimap component for racing gameplay
 */
export class Minimap {
  /**
   * Create a new Minimap instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    // Core configuration
    this._container = options.container || null;
    this._width = options.width || 200;
    this._height = options.height || 200;
    
    // Display settings
    this._visible = true;
    this._zoom = options.zoom || 1.0;
    this._minZoom = options.minZoom || 0.5;
    this._maxZoom = options.maxZoom || 2.0;
    this._rotationMode = options.rotationMode || 'fixed'; // 'fixed' or 'rotating'
    this._showTrail = options.showTrail ?? true;
    this._showCheckpoints = options.showCheckpoints ?? true;
    this._showItemSpawns = options.showItemSpawns ?? true;
    this._trailLength = options.trailLength || 30;
    
    // Canvas and context
    this._canvas = null;
    this._ctx = null;
    
    // Track data
    this._trackData = null;
    this._trackBounds = { minX: 0, maxX: 100, minY: 0, maxY: 100 };
    
    // State
    this._playerData = { x: 0, y: 0, rotation: 0 };
    this._opponents = [];
    this._trailPoints = [];
    this._itemSpawnPoints = [];
    this._checkpoints = [];
    this._finishLine = null;
    
    // Touch/drag state for mobile zoom
    this._touchState = {
      active: false,
      startDist: 0,
      startZoom: 1,
      lastX: 0,
      lastY: 0
    };
    
    // Colors (neon theme)
    this._colors = {
      background: 'rgba(5, 6, 10, 0.85)',
      border: 'rgba(0, 229, 255, 0.4)',
      track: 'rgba(255, 255, 255, 0.25)',
      trackBorder: 'rgba(255, 77, 46, 0.6)',
      player: '#00e5ff',
      playerGlow: 'rgba(0, 229, 255, 0.5)',
      playerTrail: 'rgba(0, 229, 255, 0.3)',
      opponent1st: '#ffd23f',
      opponent2nd: '#c0c0c0',
      opponent3rd: '#cd7f32',
      opponentDefault: '#ff4d2e',
      checkpoint: 'rgba(61, 220, 132, 0.6)',
      finishLine: 'rgba(255, 210, 63, 0.8)',
      itemSpawn: 'rgba(160, 82, 255, 0.7)'
    };
    
    // Animation
    this._playerPulsePhase = 0;
    this._animationFrame = null;
    this._isInitialized = false;
    this._reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Event handlers
    this._listeners = new Map();
    this._boundHandlers = new Map();
  }

  /**
   * Initialize the minimap
   * @returns {Minimap} This instance for chaining
   */
  init() {
    if (this._isInitialized) return this;
    
    if (!this._container) {
      console.warn('[Minimap] No container provided');
      return this;
    }
    
    // Create canvas element
    this._canvas = document.createElement('canvas');
    this._canvas.className = 'minimap-canvas';
    this._canvas.width = this._width * window.devicePixelRatio;
    this._canvas.height = this._height * window.devicePixelRatio;
    this._canvas.style.width = `${this._width}px`;
    this._canvas.style.height = `${this._height}px`;
    this._canvas.setAttribute('role', 'img');
    this._canvas.setAttribute('aria-label', 'Racing minimap showing track layout and positions');
    
    // Get 2D context
    this._ctx = this._canvas.getContext('2d');
    this._ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    // Create wrapper element
    const wrapper = document.createElement('div');
    wrapper.className = 'minimap-wrapper';
    wrapper.appendChild(this._canvas);
    
    // Add zoom controls
    const zoomControls = this._createZoomControls();
    wrapper.appendChild(zoomControls);
    
    // Add to container
    this._container.appendChild(wrapper);
    this._wrapperElement = wrapper;
    
    // Bind interaction handlers
    this._bindInteractionHandlers();
    
    // Start render loop if not reduced motion
    if (!this._reducedMotion) {
      this._startRenderLoop();
    }
    
    this._isInitialized = true;
    console.log('[Minimap] Initialized', this._width, 'x', this._height);
    
    return this;
  }

  /**
   * Set track data for rendering
   * @param {Object} trackData - Track path and metadata
   * @returns {Minimap} This instance
   */
  setTrack(trackData) {
    if (!trackData) {
      console.warn('[Minimap] No track data provided');
      return this;
    }
    
    this._trackData = trackData;
    
    // Extract path points
    if (trackData.path && Array.isArray(trackData.path)) {
      this._calculateTrackBounds(trackData.path);
    } else if (trackData.centerline) {
      this._calculateTrackBounds(trackData.centerline);
    }
    
    // Extract checkpoints
    if (trackData.checkpoints) {
      this._checkpoints = trackData.checkpoints.map(cp => ({
        x: cp.x,
        y: cp.y,
        width: cp.width || 10,
        height: cp.height || 3,
        passed: false
      }));
    }
    
    // Extract finish line
    if (trackData.finishLine) {
      this._finishLine = trackData.finishLine;
    }
    
    // Extract item spawn points
    if (trackData.itemSpawns) {
      this._itemSpawnPoints = trackData.itemSpawns;
    }
    
    // Initial render
    this.render(this._playerData, this._opponents);
    
    this._emit('trackLoaded', trackData);
    return this;
  }

  /**
   * Render the minimap with current game state
   * @param {Object} playerData - Player position data {x, y, rotation}
   * @param {Array} opponents - Array of opponent positions [{x, y, position}]
   */
  render(playerData = {}, opponents = []) {
    if (!this._isInitialized || !this._ctx) return;
    
    // Update state
    if (playerData.x !== undefined) this._playerData.x = playerData.x;
    if (playerData.y !== undefined) this._playerData.y = playerData.y;
    if (playerData.rotation !== undefined) this._playerData.rotation = playerData.rotation;
    this._opponents = opponents;
    
    // Update trail
    if (this._showTrail) {
      this._trailPoints.push({ x: this._playerData.x, y: this._playerData.y });
      if (this._trailPoints.length > this._trailLength) {
        this._trailPoints.shift();
      }
    }
    
    // Clear and draw
    this._draw();
  }

  /**
   * Show the minimap
   */
  show() {
    this._visible = true;
    if (this._wrapperElement) {
      this._wrapperElement.classList.add('visible');
    }
    this._emit('visibilityChange', true);
  }

  /**
   * Hide the minimap
   */
  hide() {
    this._visible = false;
    if (this._wrapperElement) {
      this._wrapperElement.classList.remove('visible');
    }
    this._emit('visibilityChange', false);
  }

  /**
   * Toggle minimap visibility
   * @returns {boolean} New visible state
   */
  toggle() {
    if (this._visible) {
      this.hide();
    } else {
      this.show();
    }
    return this._visible;
  }

  /**
   * Check if minimap is visible
   * @returns {boolean}
   */
  get isVisible() {
    return this._visible;
  }

  /**
   * Set minimap size
   * @param {number} width 
   * @param {number} height 
   */
  setSize(width, height) {
    this._width = width;
    this._height = height;
    
    if (this._canvas) {
      this._canvas.width = width * window.devicePixelRatio;
      this._canvas.height = height * window.devicePixelRatio;
      this._canvas.style.width = `${width}px`;
      this._canvas.style.height = `${height}px`;
      
      this._ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    
    this.render(this._playerData, this._opponents);
  }

  /**
   * Set zoom level
   * @param {number} zoom - Zoom value between minZoom and maxZoom
   */
  setZoom(zoom) {
    this._zoom = Math.max(this._minZoom, Math.min(this._maxZoom, zoom));
    this.render(this._playerData, this._opponents);
    this._emit('zoomChange', this._zoom);
  }

  /**
   * Get current zoom level
   * @returns {number}
   */
  get zoom() {
    return this._zoom;
  }

  /**
   * Set rotation mode
   * @param {string} mode - 'fixed' or 'rotating'
   */
  setRotationMode(mode) {
    if (mode === 'fixed' || mode === 'rotating') {
      this._rotationMode = mode;
      this._emit('rotationModeChange', mode);
    }
  }

  /**
   * Update checkpoint status
   * @param {number} index - Checkpoint index
   * @param {boolean} passed - Whether checkpoint is passed
   */
  updateCheckpoint(index, passed) {
    if (this._checkpoints[index]) {
      this._checkpoints[index].passed = passed;
    }
  }

  /**
   * Reset all checkpoints to unpassed
   */
  resetCheckpoints() {
    this._checkpoints.forEach(cp => cp.passed = false);
  }

  /**
   * Clear the player trail
   */
  clearTrail() {
    this._trailPoints = [];
  }

  /**
   * Destroy the minimap and cleanup resources
   */
  destroy() {
    // Stop animation loop
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }
    
    // Unbind handlers
    this._unbindInteractionHandlers();
    
    // Remove DOM elements
    if (this._wrapperElement && this._wrapperElement.parentNode) {
      this._wrapperElement.parentNode.removeChild(this._wrapperElement);
    }
    
    this._listeners.clear();
    this._boundHandlers.clear();
    this._isInitialized = false;
    
    this._emit('destroy');
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Main draw method
   * @private
   */
  _draw() {
    const ctx = this._ctx;
    const w = this._width;
    const h = this._height;
    
    // Clear
    ctx.clearRect(0, 0, w, h);
    
    // Save context for potential rotation
    ctx.save();
    
    // Apply rotation if in rotating mode
    if (this._rotationMode === 'rotating') {
      ctx.translate(w / 2, h / 2);
      ctx.rotate(-this._playerData.rotation + Math.PI / 2);
      ctx.translate(-w / 2, -h / 2);
    }
    
    // Draw background
    this._drawBackground(ctx, w, h);
    
    // Draw track
    this._drawTrack(ctx, w, h);
    
    // Draw finish line
    this._drawFinishLine(ctx, w, h);
    
    // Draw checkpoints
    if (this._showCheckpoints) {
      this._drawCheckpoints(ctx, w, h);
    }
    
    // Draw item spawns
    if (this._showItemSpawns) {
      this._drawItemSpawns(ctx, w, h);
    }
    
    // Draw trail
    if (this._showTrail && this._trailPoints.length > 1) {
      this._drawTrail(ctx, w, h);
    }
    
    // Draw opponents
    this._drawOpponents(ctx, w, h);
    
    // Draw player (always on top)
    this._drawPlayer(ctx, w, h);
    
    ctx.restore();
  }

  /**
   * Draw background
   * @private
   */
  _drawBackground(ctx, w, h) {
    // Background fill
    ctx.fillStyle = this._colors.background;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 8);
    ctx.fill();
    
    // Border glow effect
    ctx.strokeStyle = this._colors.border;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(1, 1, w - 2, h - 2, 7);
    ctx.stroke();
    
    // Inner subtle gradient overlay
    const gradient = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2);
    gradient.addColorStop(0, 'rgba(0, 229, 255, 0.03)');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  /**
   * Draw track outline
   * @private
   */
  _drawTrack(ctx, w, h) {
    if (!this._trackData) {
      this._drawPlaceholderTrack(ctx, w, h);
      return;
    }
    
    const padding = 15;
    const drawW = (w - padding * 2) * this._zoom;
    const drawH = (h - padding * 2) * this._zoom;
    
    const bounds = this._trackBounds;
    const rangeX = bounds.maxX - bounds.minX || 1;
    const rangeY = bounds.maxY - bounds.minY || 1;
    
    // Scale to fit while maintaining aspect ratio
    const scale = Math.min(drawW / rangeX, drawH / rangeY);
    const offsetX = (w - rangeX * scale) / 2;
    const offsetY = (h - rangeY * scale) / 2;
    
    const transformX = (x) => (x - bounds.minX) * scale + offsetX;
    const transformY = (y) => (bounds.maxY - y) * scale + offsetY; // Flip Y
    
    // Draw centerline or path
    const path = this._trackData.centerline || this._trackData.path || this._trackData.outline;
    
    if (path && path.length > 1) {
      // Track fill (subtle)
      if (this._trackData.outline && this._trackData.outline.length > 2) {
        ctx.beginPath();
        const outline = this._trackData.outline.map(p => ({ x: transformX(p.x), y: transformY(p.y) }));
        ctx.moveTo(outline[0].x, outline[0].y);
        for (let i = 1; i < outline.length; i++) {
          ctx.lineTo(outline[i].x, outline[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 77, 46, 0.08)';
        ctx.fill();
      }
      
      // Main path line
      ctx.beginPath();
      ctx.moveTo(transformX(path[0].x), transformY(path[0].y));
      
      for (let i = 1; i < path.length; i++) {
        const p = path[i];
        
        // Use smooth curves if control points available
        if (p.cp1x !== undefined) {
          ctx.quadraticCurveTo(
            transformX(p.cp1x), transformY(p.cp1y),
            transformX(p.x), transformY(p.y)
          );
        } else {
          ctx.lineTo(transformX(p.x), transformY(p.y));
        }
      }
      
      // Close loop if it's a circuit
      if (this._trackData.type === 'circuit') {
        ctx.closePath();
      }
      
      // Style the path
      ctx.strokeStyle = this._colors.track;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      
      // Path border (accent)
      ctx.strokeStyle = this._colors.trackBorder;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  /**
   * Draw placeholder track when no data loaded
   * @private
   */
  _drawPlaceholderTrack(ctx, w, h) {
    const cx = w / 2;
    const cy = h / 2;
    const rx = w * 0.35;
    const ry = h * 0.38;
    
    // Simple oval track
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = this._colors.track;
    ctx.lineWidth = 8;
    ctx.stroke();
    
    ctx.strokeStyle = this._colors.trackBorder;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  /**
   * Draw finish line marker
   * @private
   */
  _drawFinishLine(ctx, w, h) {
    if (!this._finishLine) return;
    
    const padding = 15;
    const drawW = (w - padding * 2) * this._zoom;
    const drawH = (h - padding * 2) * this._zoom;
    
    const bounds = this._trackBounds;
    const rangeX = bounds.maxX - bounds.minX || 1;
    const rangeY = bounds.maxY - bounds.minY || 1;
    const scale = Math.min(drawW / rangeX, drawH / rangeY);
    const offsetX = (w - rangeX * scale) / 2;
    const offsetY = (h - rangeY * scale) / 2;
    
    const x = (this._finishLine.x - bounds.minX) * scale + offsetX;
    const y = (bounds.maxY - this._finishLine.y) * scale + offsetY;
    const length = (this._finishLine.length || 15) * scale;
    const angle = -(this._finishLine.angle || 0);
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    // Checkered pattern
    const checkSize = 3;
    const numChecks = Math.floor(length / checkSize);
    
    for (let i = 0; i < numChecks; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#fff' : '#000';
      ctx.fillRect(-length/2 + i * checkSize, -checkSize, checkSize, checkSize * 2);
    }
    
    // Glow effect
    ctx.shadowColor = this._colors.finishLine;
    ctx.shadowBlur = 8;
    ctx.restore();
  }

  /**
   * Draw checkpoints
   * @private
   */
  _drawCheckpoints(ctx, w, h) {
    if (this._checkpoints.length === 0) return;
    
    const padding = 15;
    const drawW = (w - padding * 2) * this._zoom;
    const drawH = (h - padding * 2) * this._zoom;
    
    const bounds = this._trackBounds;
    const rangeX = bounds.maxX - bounds.minX || 1;
    const rangeY = bounds.maxY - bounds.minY || 1;
    const scale = Math.min(drawW / rangeX, drawH / rangeY);
    const offsetX = (w - rangeX * scale) / 2;
    const offsetY = (h - rangeY * scale) / 2;
    
    this._checkpoints.forEach((cp, index) => {
      const x = (cp.x - bounds.minX) * scale + offsetX;
      const y = (bounds.maxY - cp.y) * scale + offsetY;
      const width = cp.width * scale;
      const height = cp.height * scale;
      
      ctx.save();
      
      if (cp.passed) {
        ctx.fillStyle = 'rgba(61, 220, 132, 0.4)';
        ctx.strokeStyle = 'rgba(61, 220, 132, 0.7)';
      } else {
        ctx.fillStyle = this._colors.checkpoint;
        ctx.strokeStyle = this._colors.checkpoint;
      }
      
      ctx.globalAlpha = cp.passed ? 0.5 : 0.8;
      
      // Draw as small gate/bar
      ctx.fillRect(x - width/2, y - height/2, width, height);
      ctx.lineWidth = 1;
      ctx.strokeRect(x - width/2, y - height/2, width, height);
      
      ctx.restore();
    });
  }

  /**
   * Draw item spawn point markers
   * @private
   */
  _drawItemSpawns(ctx, w, h) {
    if (this._itemSpawnPoints.length === 0) return;
    
    const padding = 15;
    const drawW = (w - padding * 2) * this._zoom;
    const drawH = (h - padding * 2) * this._zoom;
    
    const bounds = this._trackBounds;
    const rangeX = bounds.maxX - bounds.minX || 1;
    const rangeY = bounds.maxY - bounds.minY || 1;
    const scale = Math.min(drawW / rangeX, drawH / rangeY);
    const offsetX = (w - rangeX * scale) / 2;
    const offsetY = (h - rangeY * scale) / 2;
    
    this._itemSpawnPoints.forEach(spawn => {
      const x = (spawn.x - bounds.minX) * scale + offsetX;
      const y = (bounds.maxY - spawn.y) * scale + offsetY;
      const size = 4;
      
      // Diamond shape for items
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      
      ctx.fillStyle = this._colors.itemSpawn;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(-size/2, -size/2, size, size);
      
      ctx.restore();
    });
  }

  /**
   * Draw player movement trail
   * @private
   */
  _drawTrail(ctx, w, h) {
    if (this._trailPoints.length < 2) return;
    
    const padding = 15;
    const drawW = (w - padding * 2) * this._zoom;
    const drawH = (h - padding * 2) * this._zoom;
    
    const bounds = this._trackBounds;
    const rangeX = bounds.maxX - bounds.minX || 1;
    const rangeY = bounds.maxY - bounds.minY || 1;
    const scale = Math.min(drawW / rangeX, drawH / rangeY);
    const offsetX = (w - rangeX * scale) / 2;
    const offsetY = (h - rangeY * scale) / 2;
    
    const transformX = (x) => (x - bounds.minX) * scale + offsetX;
    const transformY = (y) => (bounds.maxY - y) * scale + offsetY;
    
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(transformX(this._trailPoints[0].x), transformY(this._trailPoints[0].y));
    
    for (let i = 1; i < this._trailPoints.length; i++) {
      ctx.lineTo(transformX(this._trailPoints[i].x), transformY(this._trailPoints[i].y));
    }
    
    // Gradient from transparent to solid
    const gradient = ctx.createLinearGradient(
      transformX(this._trailPoints[0].x),
      transformY(this._trailPoints[0].y),
      transformX(this._trailPoints[this._trailPoints.length - 1].x),
      transformY(this._trailPoints[this._trailPoints.length - 1].y)
    );
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, this._colors.playerTrail);
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Draw opponents on map
   * @private
   */
  _drawOpponents(ctx, w, h) {
    if (this._opponents.length === 0) return;
    
    const padding = 15;
    const drawW = (w - padding * 2) * this._zoom;
    const drawH = (h - padding * 2) * this._zoom;
    
    const bounds = this._trackBounds;
    const rangeX = bounds.maxX - bounds.minX || 1;
    const rangeY = bounds.maxY - bounds.minY || 1;
    const scale = Math.min(drawW / rangeX, drawH / rangeY);
    const offsetX = (w - rangeX * scale) / 2;
    const offsetY = (h - rangeY * scale) / 2;
    
    this._opponents.forEach(opponent => {
      const x = (opponent.x - bounds.minX) * scale + offsetX;
      const y = (bounds.maxY - opponent.y) * scale + offsetY;
      const position = opponent.position || 99;
      const size = position <= 3 ? 6 : 4; // Larger dots for top 3
      
      // Color by position
      let color;
      switch (position) {
        case 1: color = this._colors.opponent1st; break;
        case 2: color = this._colors.opponent2nd; break;
        case 3: color = this._colors.opponent3rd; break;
        default: color = this._colors.opponentDefault;
      }
      
      // Draw blip
      ctx.save();
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.9;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      
      // Subtle glow for top 3
      if (position <= 3) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        ctx.fill();
      }
      
      ctx.restore();
    });
  }

  /**
   * Draw player position indicator
   * @private
   */
  _drawPlayer(ctx, w, h) {
    const padding = 15;
    const drawW = (w - padding * 2) * this._zoom;
    const drawH = (h - padding * 2) * this._zoom;
    
    const bounds = this._trackBounds;
    const rangeX = bounds.maxX - bounds.minX || 1;
    const rangeY = bounds.maxY - bounds.minY || 1;
    const scale = Math.min(drawW / rangeX, drawH / rangeY);
    const offsetX = (w - rangeX * scale) / 2;
    const offsetY = (h - rangeY * scale) / 2;
    
    const x = (this._playerData.x - bounds.minX) * scale + offsetX;
    const y = (bounds.maxY - this._playerData.y) * scale + offsetY;
    
    // Pulse animation
    this._playerPulsePhase += 0.05;
    const pulseAmount = this._reducedMotion ? 0 : Math.sin(this._playerPulsePhase) * 2;
    const baseSize = 8;
    const size = baseSize + pulseAmount;
    
    ctx.save();
    ctx.translate(x, y);
    
    // Only rotate player icon in fixed mode (to show direction)
    if (this._rotationMode === 'fixed') {
      ctx.rotate(-(this._playerData.rotation - Math.PI / 2));
    }
    
    // Outer glow
    ctx.shadowColor = this._colors.playerGlow;
    ctx.shadowBlur = 12;
    
    // Player shape (triangle/arrow pointing up)
    ctx.fillStyle = this._colors.player;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.7, size * 0.6);
    ctx.lineTo(0, size * 0.3);
    ctx.lineTo(-size * 0.7, size * 0.6);
    ctx.closePath();
    ctx.fill();
    
    // Inner highlight
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.6);
    ctx.lineTo(size * 0.25, size * 0.2);
    ctx.lineTo(0, 0);
    ctx.lineTo(-size * 0.25, size * 0.2);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  }

  /**
   * Calculate bounding box of track coordinates
   * @param {Array} points - Array of {x, y} points
   * @private
   */
  _calculateTrackBounds(points) {
    if (!points || points.length === 0) return;
    
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    points.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });
    
    // Add some padding
    const padX = (maxX - minX) * 0.05 || 10;
    const padY = (maxY - minY) * 0.05 || 10;
    
    this._trackBounds = {
      minX: minX - padX,
      maxX: maxX + padX,
      minY: minY - padY,
      maxY: maxY + padY
    };
  }

  /**
   * Create zoom control buttons
   * @returns {HTMLElement}
   * @private
   */
  _createZoomControls() {
    const container = document.createElement('div');
    container.className = 'minimap-zoom-controls';
    
    container.innerHTML = `
      <button class="zoom-btn zoom-out" aria-label="Zoom out" tabindex="0">−</button>
      <button class="zoom-btn zoom-in" aria-label="Zoom in" tabindex="0">+</button>
      <button class="zoom-btn zoom-toggle" aria-label="Toggle minimap" tabindex="0">◉</button>
    `;
    
    const zoomInBtn = container.querySelector('.zoom-in');
    const zoomOutBtn = container.querySelector('.zoom-out');
    const toggleBtn = container.querySelector('.zoom-toggle');
    
    zoomInBtn.addEventListener('click', () => this.setZoom(this._zoom + 0.2));
    zoomOutBtn.addEventListener('click', () => this.setZoom(this._zoom - 0.2));
    toggleBtn.addEventListener('click', () => this.toggle());
    
    return container;
  }

  /**
   * Bind touch/mouse interaction handlers
   * @private
   */
  _bindInteractionHandlers() {
    if (!this._canvas) return;
    
    // Pinch-to-zoom on touch devices
    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        this._touchState.active = true;
        this._touchState.startDist = this._getTouchDistance(e.touches);
        this._touchState.startZoom = this._zoom;
      }
    };
    
    const handleTouchMove = (e) => {
      if (!this._touchState.active || e.touches.length !== 2) return;
      e.preventDefault();
      
      const dist = this._getTouchDistance(e.touches);
      const scale = dist / this._touchState.startDist;
      this.setZoom(this._touchState.startZoom * scale);
    };
    
    const handleTouchEnd = () => {
      this._touchState.active = false;
    };
    
    // Mouse wheel zoom
    const handleWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      this.setZoom(this._zoom + delta);
    };
    
    // Double-click toggle rotation mode
    const handleDoubleClick = (e) => {
      this.setRotationMode(
        this._rotationMode === 'fixed' ? 'rotating' : 'fixed'
      );
    };
    
    this._canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    this._canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    this._canvas.addEventListener('touchend', handleTouchEnd);
    this._canvas.addEventListener('wheel', handleWheel, { passive: false });
    this._canvas.addEventListener('dblclick', handleDoubleClick);
    
    this._boundHandlers.set('touchstart', handleTouchStart);
    this._boundHandlers.set('touchmove', handleTouchMove);
    this._boundHandlers.set('touchend', handleTouchEnd);
    this._boundHandlers.set('wheel', handleWheel);
    this._boundHandlers.set('dblclick', handleDoubleClick);
  }

  /**
   * Unbind interaction handlers
   * @private
   */
  _unbindInteractionHandlers() {
    if (!this._canvas) return;
    
    for (const [event, handler] of this._boundHandlers) {
      this._canvas.removeEventListener(event, handler);
    }
  }

  /**
   * Get distance between two touch points
   * @param {TouchList} touches
   * @returns {number}
   * @private
   */
  _getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Start continuous render loop for animations
   * @private
   */
  _startRenderLoop() {
    const loop = () => {
      if (this._isInitialized && this._visible) {
        this._draw();
      }
      this._animationFrame = requestAnimationFrame(loop);
    };
    
    this._animationFrame = requestAnimationFrame(loop);
  }

  /**
   * Emit event to listeners
   * @private
   */
  _emit(event, data) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.forEach(fn => fn(data));
    }
  }

  // ==================== PUBLIC EVENT API ====================

  /**
   * Register event listener
   * @param {string} event - Event name(s), comma-separated
   * @param {Function} callback - Handler function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    const events = event.split(',');
    
    events.forEach(e => {
      const name = e.trim();
      if (!this._listeners.has(name)) {
        this._listeners.set(name, []);
      }
      this._listeners.get(name).push(callback);
    });
    
    return () => {
      events.forEach(e => {
        const name = e.trim();
        const listeners = this._listeners.get(name);
        if (listeners) {
          const idx = listeners.indexOf(callback);
          if (idx > -1) listeners.splice(idx, 1);
        }
      });
    };
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Handler to remove
   */
  off(event, callback) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      const idx = listeners.indexOf(callback);
      if (idx > -1) listeners.splice(idx, 1);
    }
  }
}

export default Minimap;
