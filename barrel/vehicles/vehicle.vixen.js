// barrel/vehicles/vehicle.vixen.js — agile drift machine
import { BaseVehicle } from './vehicle.base.js';

class VixenVehicle extends BaseVehicle {
  buildMesh() {
    const group = super.buildMesh();
    // Vixen: smaller, lower, with neon accents and rear wing
    const neonMat = new THREE.MeshBasicMaterial({
      color: '#00e5ff', transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    // Side neon stripes
    for (const side of [-1, 1]) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 3.6), neonMat);
      stripe.position.set(side * 0.92, 0.5, 0);
      group.add(stripe);
    }
    return group;
  }

  update(dt) {
    super.update(dt);
    // Vixen: extra drift rotation assist for that "swing" feel
    if (this.driftActive) {
      const steerInput = (this.ctx.input.isPressed('steerLeft') ? -1 : 0) + (this.ctx.input.isPressed('steerRight') ? 1 : 0);
      const yawBoost = steerInput * 0.8 * dt * (this.speedKmh / 80);
      this.physicsBody.angularVelocity.y += yawBoost;
    }
  }
}

export function spawn(entry, ctx, position) {
  const v = new VixenVehicle(entry, ctx);
  v.spawn(position);
  return v;
}
export function update(vehicle, dt) { vehicle.update(dt); }
export function getSpeedKmh(vehicle) { return vehicle.getSpeedKmh(); }
export function applyBoost(vehicle, strength, duration) { vehicle.applyBoost(strength, duration); }
export function despawn(vehicle) { vehicle.despawn(); }
export default { spawn, update, getSpeedKmh, applyBoost, despawn };
