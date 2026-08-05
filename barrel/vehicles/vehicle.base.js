// barrel/vehicles/vehicle.base.js
// Shared base class for all vehicles. Barrel-loaded. NOT core.
// Each concrete vehicle file imports this and overrides hooks.

import * as THREE from 'three';

export class BaseVehicle {
  constructor(entry, ctx) {
    this.entry = entry;
    this.tuning = entry.tuning;
    this.cosmetic = entry.cosmetic || {};
    this.ctx = ctx;          // { engine, physics, scene, input }
    this.physicsBody = null;
    this.vehicle = null;     // cannon-es RaycastVehicle
    this.sceneObject = null;
    this.wheelMeshes = [];
    this.speedKmh = 0;
    this.boostTimer = 0;
    this.driftActive = false;
    this.driftTimer = 0;
    this.miniTurboCharge = 0;
    this.burnoutActive = false;
    this.bodyRoll = 0;
    this.smokeParticles = [];
  }

  /**
   * Spawn the vehicle into the world at the given position.
   * Override buildMesh() to customize appearance.
   */
  spawn(position = [0, 1, 0]) {
    const C = this.ctx.physics.getCANNON();
    const world = this.ctx.physics.getWorld();

    // Chassis body
    const chassisShape = new C.Box(new C.Vec3(0.9, 0.4, 1.9));
    const chassisBody = new C.Body({
      mass: this.entry.tuning.weight ? 200 + this.entry.tuning.weight * 80 : 600,
      position: new C.Vec3(...position),
      material: world.defaultMaterial
    });
    chassisBody.addShape(chassisShape);
    chassisBody.angularDamping = 0.4;
    this.ctx.physics.addBody(chassisBody);
    this.physicsBody = chassisBody;

    // RaycastVehicle
    this.vehicle = new C.RaycastVehicle({
      chassisBody,
      indexRightAxis: 0,
      indexUpAxis: 1,
      indexForwardAxis: 2
    });

    // Wheel options (tuned from entry.tuning)
    const wheelOptions = {
      radius: 0.4,
      directionLocal: new C.Vec3(0, -1, 0),
      suspensionStiffness: this.tuning.suspensionStiffness || 30,
      suspensionRestLength: 0.35,
      frictionSlip: 1.8,
      dampingRelaxation: this.tuning.suspensionDamping || 4.5,
      dampingCompression: 3.5,
      maxSuspensionForce: 1e5,
      rollInfluence: 0.0,
      axleLocal: new C.Vec3(-1, 0, 0),
      chassisConnectionPointLocal: new C.Vec3(),
      maxSuspensionTravel: 0.4,
      customSlidingRotationalSpeed: -30,
      useCustomSlidingRotationalSpeed: true
    };

    // 4 wheels
    wheelOptions.chassisConnectionPointLocal.set(-0.85, -0.1, 1.4);
    this.vehicle.addWheel(wheelOptions);
    wheelOptions.chassisConnectionPointLocal.set(0.85, -0.1, 1.4);
    this.vehicle.addWheel(wheelOptions);
    wheelOptions.chassisConnectionPointLocal.set(-0.85, -0.1, -1.4);
    this.vehicle.addWheel(wheelOptions);
    wheelOptions.chassisConnectionPointLocal.set(0.85, -0.1, -1.4);
    this.vehicle.addWheel(wheelOptions);

    this.vehicle.addToWorld(world);
    this.vehicle.setBrake(0, 0); this.vehicle.setBrake(0, 1); this.vehicle.setBrake(0, 2); this.vehicle.setBrake(0, 3);

    // Update wheel bodies to follow raycast hits
    this.vehicle.wheelInfos.forEach((wheel, i) => {
      const transform = this.vehicle.wheelInfos[i].worldTransform;
      // We'll create visual wheels in buildMesh()
    });

    // Build 3D mesh
    this.sceneObject = this.buildMesh();
    // Sync visual to physics body's initial position immediately (otherwise camera setup at mount reads 0,0,0)
    this.sceneObject.position.copy(chassisBody.position);
    this.sceneObject.quaternion.copy(chassisBody.quaternion);
    this.ctx.renderer.addObject(this.sceneObject);

    // Listen for collision events for items
    chassisBody.addEventListener('collide', (e) => {
      this.ctx.engine.bus.emit('vehicle:collide', { vehicle: this, other: e.body });
    });

    this.ctx.engine.bus.emit('vehicle:spawned', { id: this.entry.id });
    return this;
  }

  /**
   * Build the visual mesh. Override in subclass for unique look.
   * Default: a stylized low-poly car.
   */
  buildMesh() {
    const group = new THREE.Group();

    // Body
    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.cosmetic.bodyColor || '#ff4d2e',
      metalness: 0.7, roughness: 0.35,
      emissive: this.cosmetic.bodyColor || '#ff4d2e', emissiveIntensity: 0.05
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: this.cosmetic.accentColor || '#ffd23f',
      metalness: 0.5, roughness: 0.4,
      emissive: this.cosmetic.accentColor || '#ffd23f', emissiveIntensity: 0.15
    });
    const wheelMat = new THREE.MeshStandardMaterial({
      color: this.cosmetic.wheelColor || '#0a0a0a',
      metalness: 0.8, roughness: 0.25
    });

    // Lower body
    const lower = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 3.8), bodyMat);
    lower.position.y = 0.3;
    lower.castShadow = true;
    group.add(lower);

    // Cabin (sloped)
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 1.8), accentMat);
    cabin.position.set(0, 0.75, -0.2);
    group.add(cabin);

    // Spoiler
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.4), accentMat);
    spoiler.position.set(0, 0.85, -1.8);
    group.add(spoiler);
    const spoilerL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.4), accentMat);
    spoilerL.position.set(-0.8, 0.65, -1.8); group.add(spoilerL);
    const spoilerR = spoilerL.clone(); spoilerR.position.x = 0.8; group.add(spoilerR);

    // Headlights (emissive)
    const headMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff4d6', emissiveIntensity: 1.5 });
    const headL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.05), headMat);
    headL.position.set(-0.55, 0.35, 1.92); group.add(headL);
    const headR = headL.clone(); headR.position.x = 0.55; group.add(headR);

    // Tail lights
    const tailMat = new THREE.MeshStandardMaterial({ color: '#ff0033', emissive: '#ff0033', emissiveIntensity: 1.2 });
    const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.05), tailMat);
    tailL.position.set(-0.55, 0.4, -1.92); group.add(tailL);
    const tailR = tailL.clone(); tailR.position.x = 0.55; group.add(tailR);

    // Wheels (visual only; physics is raycast)
    for (let i = 0; i < 4; i++) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.castShadow = true;
      const x = i % 2 === 0 ? -0.9 : 0.9;
      const z = i < 2 ? 1.4 : -1.4;
      wheel.position.set(x, 0.4, z);
      group.add(wheel);
      this.wheelMeshes.push(wheel);
    }

    return group;
  }

  /**
   * Per-frame update. Reads input, applies forces, syncs visual.
   */
  update(dt) {
    const input = this.ctx.input;
    const throttle = input.getAxis('throttle') || (input.isPressed('throttle') ? 1 : 0);
    const brake = input.getAxis('brake') || (input.isPressed('brake') ? 1 : 0);
    const steerInput = (input.isPressed('steerLeft') ? -1 : 0) + (input.isPressed('steerRight') ? 1 : 0)
                    + (input.getAxis('steerLeft') ? -input.getAxis('steerLeft') : 0)
                    + (input.getAxis('steerRight') ? input.getAxis('steerRight') : 0);
    const steer = Math.max(-1, Math.min(1, steerInput));
    const driftHeld = input.isPressed('drift') || input.isPressed('burnout');

    // Burnout: brake+throttle from low speed
    if (throttle > 0.5 && brake > 0.5 && this.speedKmh < 15) {
      this.burnoutActive = true;
      this.vehicle.applyEngineForce(this.tuning.enginePower * this.tuning.burnoutTorqueBoost, 2);
      this.vehicle.applyEngineForce(this.tuning.enginePower * this.tuning.burnoutTorqueBoost, 3);
      this.vehicle.setBrake(0.1, 0); this.vehicle.setBrake(0.1, 1);
      this.vehicle.setBrake(0.9, 2); this.vehicle.setBrake(0.9, 3);
      this.ctx.engine.bus.emit('vehicle:burnout', { id: this.entry.id });
    } else if (this.burnoutActive && (brake < 0.3 || this.speedKmh > 30)) {
      this.burnoutActive = false;
      this.ctx.engine.bus.emit('vehicle:burnoutEnd', { id: this.entry.id });
    } else {
      // Normal throttle / brake
      if (throttle > 0.05) {
        this.vehicle.applyEngineForce(this.tuning.enginePower * throttle, 2);
        this.vehicle.applyEngineForce(this.tuning.enginePower * throttle, 3);
        this.vehicle.setBrake(0, 0); this.vehicle.setBrake(0, 1);
        this.vehicle.setBrake(0, 2); this.vehicle.setBrake(0, 3);
      } else if (brake > 0.05) {
        this.vehicle.applyEngineForce(0, 2); this.vehicle.applyEngineForce(0, 3);
        const brakeForce = 20 * brake;
        this.vehicle.setBrake(brakeForce, 0); this.vehicle.setBrake(brakeForce, 1);
        this.vehicle.setBrake(brakeForce, 2); this.vehicle.setBrake(brakeForce, 3);
      } else {
        this.vehicle.applyEngineForce(0, 2); this.vehicle.applyEngineForce(0, 3);
        this.vehicle.setBrake(2, 0); this.vehicle.setBrake(2, 1);
        this.vehicle.setBrake(0, 2); this.vehicle.setBrake(0, 3);
      }
    }

    // Steering with speed-sensitive reduction
    const speedFactor = Math.max(0.3, 1 - this.speedKmh / 200);
    const steerAngle = this.tuning.maxSteer * steer * speedFactor;
    this.vehicle.setSteeringValue(steerAngle, 0);
    this.vehicle.setSteeringValue(steerAngle, 1);

    // Drift: lower grip on rear wheels
    if (driftHeld && Math.abs(steer) > 0.3 && this.speedKmh > 25) {
      if (!this.driftActive) {
        this.driftActive = true;
        this.driftTimer = 0;
        this.ctx.engine.bus.emit('vehicle:driftStart', { id: this.entry.id });
      }
      this.driftTimer += dt;
      this.vehicle.wheelInfos[2].frictionSlip = 1.8 * this.tuning.driftGripMultiplier;
      this.vehicle.wheelInfos[3].frictionSlip = 1.8 * this.tuning.driftGripMultiplier;
      // Mini-turbo charge
      this.miniTurboCharge = Math.min(1, this.miniTurboCharge + dt * 0.5);
    } else {
      if (this.driftActive) {
        this.driftActive = false;
        // Release mini-turbo
        if (this.miniTurboCharge > 0.3) {
          this.applyBoost(this.miniTurboCharge * 1.5, 0.8);
          this.ctx.engine.bus.emit('vehicle:miniTurbo', { id: this.entry.id, charge: this.miniTurboCharge });
        }
        this.miniTurboCharge = 0;
        this.ctx.engine.bus.emit('vehicle:driftEnd', { id: this.entry.id });
      }
      this.vehicle.wheelInfos[2].frictionSlip = 1.8;
      this.vehicle.wheelInfos[3].frictionSlip = 1.8;
    }

    // Boost timer
    if (this.boostTimer > 0) {
      this.boostTimer -= dt;
      const boostForce = this.tuning.enginePower * 1.3;
      this.vehicle.applyEngineForce(boostForce, 2);
      this.vehicle.applyEngineForce(boostForce, 3);
    }

    // Compute speed (km/h) from chassis velocity
    const v = this.physicsBody.velocity;
    this.speedKmh = Math.sqrt(v.x * v.x + v.z * v.z) * 3.6;

    // Body roll visual (lean into turns)
    const targetRoll = -steer * this.tuning.bodyRollFactor * Math.min(1, this.speedKmh / 80);
    this.bodyRoll += (targetRoll - this.bodyRoll) * Math.min(1, dt * 6);

    // Sync visual to physics
    this.sceneObject.position.copy(this.physicsBody.position);
    this.sceneObject.quaternion.copy(this.physicsBody.quaternion);
    this.sceneObject.rotateZ(this.bodyRoll);

    // Wheel spin & steer visual
    for (let i = 0; i < 4; i++) {
      const wi = this.vehicle.wheelInfos[i];
      const wheel = this.wheelMeshes[i];
      // steer visual for front wheels
      if (i < 2) wheel.rotation.y = steerAngle;
      // spin
      wheel.rotation.x -= this.speedKmh * dt * 0.05;
    }
  }

  applyBoost(strength = 1, durationSec = 0.8) {
    this.boostTimer = Math.max(this.boostTimer, durationSec);
    this.boostStrength = strength;
  }

  getSpeedKmh() { return this.speedKmh; }

  despawn() {
    const world = this.ctx.physics.getWorld();
    this.vehicle.removeFromWorld(world);
    this.ctx.physics.removeBody(this.physicsBody);
    this.ctx.renderer.removeObject(this.sceneObject);
    this.ctx.engine.bus.emit('vehicle:despawned', { id: this.entry.id });
  }
}

export default BaseVehicle;
