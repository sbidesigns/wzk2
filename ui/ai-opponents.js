// ui/ai-opponents.js — AI Opponent System for WARZONE KART
// Spawns CPU racers that follow the track spline with varying skill levels

import * as THREE from 'three';

export class AIOpponentSystem {
  constructor(scene, trackCurve, trackWidth, config) {
    this._scene = scene;
    this._curve = trackCurve;
    this._trackWidth = trackWidth || 18;
    this._opponents = [];
    this._config = config || {};
    
    // AI configuration
    this._numOpponents = config.numOpponents || 5;
    this._difficulty = config.difficulty || 'normal'; // easy, normal, hard
    
    // Difficulty settings
    this._diffSettings = {
      easy:   { speedMin: 25, speedMax: 40, wobble: 3.0, lateralRange: 0.6, reactionTime: 0.8 },
      normal: { speedMin: 35, speedMax: 55, wobble: 1.5, lateralRange: 0.4, reactionTime: 0.3 },
      hard:   { speedMin: 45, speedMax: 65, wobble: 0.5, lateralRange: 0.2, reactionTime: 0.1 }
    };
    this._settings = this._diffSettings[this._difficulty];
  }
  
  spawn() {
    if (!this._curve) {
      console.warn('[AI] No track curve, cannot spawn opponents');
      return;
    }
    
    var colors = ['#ff4d2e', '#00e5ff', '#ffd23f', '#ff3d5a', '#44ff88', '#ff88ff', '#88aaff', '#ffaa44'];
    var names = ['PHANTOM', 'SPECTER', 'VIPER', 'BOLT', 'FURY', 'GHOST', 'BLAZE', 'STORM'];
    
    for (var i = 0; i < this._numOpponents; i++) {
      var opponent = this._createOpponentMesh(i, colors[i % colors.length], names[i % names.length]);
      this._scene.add(opponent.mesh);
      this._opponents.push(opponent);
    }
    
    console.log('[AI] Spawned', this._numOpponents, 'opponents');
  }
  
  _createOpponentMesh(index, color, name) {
    var group = new THREE.Group();
    group.name = 'ai-opponent-' + index;
    
    // Vehicle body - slightly different shape per opponent for variety
    var bodyW = 1.8 + Math.random() * 0.4;
    var bodyH = 0.7 + Math.random() * 0.3;
    var bodyL = 3.5 + Math.random() * 1.0;
    
    var bodyMat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.85, roughness: 0.15 });
    var darkMat = new THREE.MeshStandardMaterial({ color: '#0a0a18', metalness: 0.9, roughness: 0.1 });
    var wheelMat = new THREE.MeshStandardMaterial({ color: '#1a1a2a', roughness: 0.7 });
    var glowMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.5 });
    
    // Body
    var bodyGeo = new THREE.BoxGeometry(bodyW, bodyH, bodyL);
    var body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.45;
    group.add(body);
    
    // Cabin/cockpit
    var cabinGeo = new THREE.BoxGeometry(bodyW * 0.7, bodyH * 0.6, bodyL * 0.45);
    var cabin = new THREE.Mesh(cabinGeo, darkMat);
    cabin.position.set(0, 0.45 + bodyH / 2 + bodyH * 0.3, -bodyL * 0.1);
    group.add(cabin);
    
    // Wheels (instanced)
    var wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 8);
    var wheels = new THREE.InstancedMesh(wheelGeo, wheelMat, 4);
    var mat4 = new THREE.Matrix4();
    var wps = [[-bodyW/2 - 0.1, 0.35, bodyL * 0.35], [bodyW/2 + 0.1, 0.35, bodyL * 0.35], 
              [-bodyW/2 - 0.1, 0.35, -bodyL * 0.35], [bodyW/2 + 0.1, 0.35, -bodyL * 0.35]];
    wps.forEach(function(pos, wi) {
      mat4.makeRotationFromEuler(new THREE.Euler(0, 0, Math.PI / 2));
      mat4.setPosition(pos[0], pos[1], pos[2]);
      wheels.setMatrixAt(wi, mat4);
    });
    group.add(wheels);
    
    // Underglow
    var ugGeo = new THREE.BoxGeometry(bodyW + 0.2, 0.04, bodyL + 0.2);
    var underglow = new THREE.Mesh(ugGeo, glowMat);
    underglow.position.y = 0.12;
    group.add(underglow);
    
    // Tail lights
    var tailGeo = new THREE.CircleGeometry(0.1, 6);
    var tailMat = new THREE.MeshBasicMaterial({ color: '#ff0000' });
    [-bodyW * 0.3, bodyW * 0.3].forEach(function(x) {
      var tl = new THREE.Mesh(tailGeo, tailMat);
      tl.position.set(x, 0.5, -bodyL / 2 - 0.01);
      tl.rotation.y = Math.PI;
      group.add(tl);
    });
    
    // Exhaust particle system
    var exhaustGeo = new THREE.BufferGeometry();
    var exhaustCount = 12;
    var exhaustPositions = new Float32Array(exhaustCount * 3);
    var exhaustSizes = new Float32Array(exhaustCount);
    var exhaustOpacities = new Float32Array(exhaustCount);
    for (var ei = 0; ei < exhaustCount; ei++) {
      exhaustPositions[ei * 3] = 0;
      exhaustPositions[ei * 3 + 1] = 0.3;
      exhaustPositions[ei * 3 + 2] = -bodyL / 2 - ei * 0.4;
      exhaustSizes[ei] = Math.max(0.01, 0.3 - ei * 0.02);
      exhaustOpacities[ei] = Math.max(0, 0.6 - ei * 0.05);
    }
    exhaustGeo.setAttribute('position', new THREE.BufferAttribute(exhaustPositions, 3));
    exhaustGeo.setAttribute('size', new THREE.BufferAttribute(exhaustSizes, 1));
    var exhaustMat = new THREE.PointsMaterial({ 
      color: '#ff6633', size: 0.25, transparent: true, opacity: 0.4, 
      blending: THREE.AdditiveBlending, depthWrite: false 
    });
    var exhaust = new THREE.Points(exhaustGeo, exhaustMat);
    group.add(exhaust);
    
    // Starting position: staggered behind player on the track
    var startT = 0.02 + (index + 1) * 0.008; // Staggered behind start line
    var lateralOffset = (index % 2 === 0 ? -1 : 1) * (0.2 + Math.random() * 0.3);
    
    var startPos = this._curve.getPoint(startT);
    var startTan = this._curve.getTangent(startT);
    var side = new THREE.Vector3(-startTan.z, 0, startTan.x).normalize();
    
    group.position.copy(startPos).addScaledVector(side, lateralOffset * this._trackWidth / 2);
    group.position.y = 0.5;
    
    var angle = Math.atan2(startTan.x, startTan.z);
    group.rotation.y = angle;
    
    // AI state
    var baseSpeed = this._settings.speedMin + Math.random() * (this._settings.speedMax - this._settings.speedMin);
    
    return {
      mesh: group,
      name: name,
      color: color,
      progress: startT,         // 0-1 along spline
      lateralOffset: lateralOffset, // -1 to 1
      targetLateral: lateralOffset,
      speed: baseSpeed,
      baseSpeed: baseSpeed,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleTimer: 0,
      lap: 1,
      position: index + 1,  // Race position
      finished: false,
      exhaust: exhaust,
      exhaustPositions: exhaustPositions
    };
  }
  
  update(dt, playerProgress) {
    if (!this._curve || this._opponents.length === 0) return;
    
    var trackLen = this._curve.getLength();
    
    for (var i = 0; i < this._opponents.length; i++) {
      var opp = this._opponents[i];
      if (opp.finished) continue;
      
      // Speed variation (simulate acceleration/deceleration)
      opp.wobbleTimer += dt;
      var speedVar = Math.sin(opp.wobbleTimer * 0.5 + opp.wobblePhase) * this._settings.wobble;
      var currentSpeed = opp.baseSpeed + speedVar;
      
      // Slow down on tight curves
      var tangent = this._curve.getTangent(opp.progress);
      var nextTangent = this._curve.getTangent((opp.progress + 0.01) % 1);
      var curvature = 1 - tangent.dot(nextTangent);
      if (curvature > 0.01) {
        currentSpeed *= Math.max(0.6, 1 - curvature * 8);
      }
      
      // Update progress along track
      var progressDelta = (currentSpeed / trackLen) * dt;
      opp.progress += progressDelta;
      
      // Lap detection
      if (opp.progress >= 1) {
        opp.progress -= 1;
        opp.lap++;
        if (opp.lap > 3) { // Same totalLaps as player
          opp.finished = true;
        }
      }
      
      // Lateral wobble for realism
      if (Math.random() < 0.02) {
        opp.targetLateral = (Math.random() - 0.5) * this._settings.lateralRange * 2;
      }
      opp.lateralOffset += (opp.targetLateral - opp.lateralOffset) * dt * 2;
      opp.lateralOffset = Math.max(-0.8, Math.min(0.8, opp.lateralOffset));
      
      // Get position and orientation from curve
      var point = this._curve.getPoint(opp.progress % 1);
      var tan = this._curve.getTangent(opp.progress % 1);
      var perp = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      
      opp.mesh.position.copy(point).addScaledVector(perp, opp.lateralOffset * this._trackWidth / 2);
      opp.mesh.position.y = 0.5 + Math.sin(this._wobblePhase + opp.wobbleTimer * 6) * 0.01;
      
      // Orient along track
      var targetAngle = Math.atan2(tan.x, tan.z);
      opp.mesh.rotation.y = targetAngle;
      
      // Body roll in turns
      var roll = -curvature * 15 * Math.sign(opp.lateralOffset);
      opp.mesh.rotation.z = THREE.MathUtils.lerp(opp.mesh.rotation.z, roll * 0.015, dt * 3);
      
      // Animate exhaust particles
      if (opp.exhaustPositions) {
        for (var ei = 0; ei < opp.exhaustPositions.length / 3; ei++) {
          opp.exhaustPositions[ei * 3 + 2] -= dt * currentSpeed * 0.15;
          if (opp.exhaustPositions[ei * 3 + 2] < -6) {
            opp.exhaustPositions[ei * 3 + 2] = -2;
            opp.exhaustPositions[ei * 3] = (Math.random() - 0.5) * 0.5;
          }
        }
        opp.exhaust.geometry.attributes.position.needsUpdate = true;
      }
    }
    
    // Calculate race positions
    this._calculatePositions(playerProgress);
  }
  
  _calculatePositions(playerProgress) {
    // Combine progress and laps for total distance
    var playerDist = (playerProgress || 0) + (window.__raceScene ? (window.__raceScene._state.lap - 1) : 0);
    
    var allRacers = [{ name: 'YOU', dist: playerDist, isPlayer: true }];
    for (var i = 0; i < this._opponents.length; i++) {
      var opp = this._opponents[i];
      allRacers.push({ name: opp.name, dist: opp.progress + (opp.lap - 1), isPlayer: false, opponent: opp });
    }
    
    // Sort by total distance (descending)
    allRacers.sort(function(a, b) { return b.dist - a.dist; });
    
    // Update positions
    for (var j = 0; j < allRacers.length; j++) {
      allRacers[j].position = j + 1;
      if (!allRacers[j].isPlayer && allRacers[j].opponent) {
        allRacers[j].opponent.position = j + 1;
      }
    }
    
    // Find player position
    var playerPos = 1;
    for (var k = 0; k < allRacers.length; k++) {
      if (allRacers[k].isPlayer) { playerPos = allRacers[k].position; break; }
    }
    
    // Emit position update
    if (window.__engine && window.__engine.bus) {
      window.__engine.bus.emit('player:positionChanged', { 
        position: playerPos, 
        totalRacers: allRacers.length 
      });
    }
  }
  
  getOpponentData() {
    return this._opponents.map(function(opp) {
      return {
        name: opp.name,
        color: opp.color,
        position: opp.position,
        lap: opp.lap,
        x: opp.mesh.position.x,
        z: opp.mesh.position.z,
        finished: opp.finished
      };
    });
  }
  
  dispose() {
    for (var i = 0; i < this._opponents.length; i++) {
      var opp = this._opponents[i];
      if (opp.mesh.parent) opp.mesh.parent.remove(opp.mesh);
      opp.mesh.traverse(function(child) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(function(m) { m.dispose(); });
          else child.material.dispose();
        }
      });
    }
    this._opponents = [];
  }
}

export default AIOpponentSystem;