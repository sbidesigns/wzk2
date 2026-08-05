// barrel/vehicles/vehicle.spectre.js
import { BaseVehicle } from './vehicle.base.js';

class SpectreVehicle extends BaseVehicle {
  // Spectre is the balanced sports car. Default override: subtle neon underglow.
  buildMesh() {
    const group = super.buildMesh();
    // Underglow plane
    const glowMat = new THREE.MeshBasicMaterial({
      color: this.cosmetic.accentColor || '#ffd23f',
      transparent: true, opacity: 0.35,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 4.2), glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.05;
    group.add(glow);
    this.underglow = glow;
    return group;
  }

  update(dt) {
    super.update(dt);
    if (this.underglow) {
      // Pulse underglow with boost
      const intensity = 0.3 + (this.boostTimer > 0 ? 0.4 : 0) + (this.driftActive ? 0.2 : 0);
      this.underglow.material.opacity = intensity + Math.sin(performance.now() * 0.005) * 0.05;
    }
  }
}

// Module exports — must match vehicle.schema.json requiredInterface
export function spawn(entry, ctx, position) {
  const v = new SpectreVehicle(entry, ctx);
  v.spawn(position);
  return v;
}
export function update(vehicle, dt) { vehicle.update(dt); }
export function getSpeedKmh(vehicle) { return vehicle.getSpeedKmh(); }
export function applyBoost(vehicle, strength, duration) { vehicle.applyBoost(strength, duration); }
export function despawn(vehicle) { vehicle.despawn(); }
export default { spawn, update, getSpeedKmh, applyBoost, despawn };
