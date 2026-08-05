// barrel/vehicles/vehicle.titan.js — heavy muscle car
import { BaseVehicle } from './vehicle.base.js';

class TitanVehicle extends BaseVehicle {
  buildMesh() {
    const group = super.buildMesh();
    // Add hood scoop and side pipes (muscle car styling)
    const scoopMat = new THREE.MeshStandardMaterial({ color: '#0a0a0a', metalness: 0.9, roughness: 0.2 });
    const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.6), scoopMat);
    scoop.position.set(0, 0.85, 1.2);
    group.add(scoop);

    // Side exhaust pipes
    const pipeMat = new THREE.MeshStandardMaterial({ color: '#cccccc', metalness: 1, roughness: 0.3 });
    for (const side of [-1, 1]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8), pipeMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(side * 0.95, 0.35, -0.5);
      group.add(pipe);
    }
    return group;
  }
}

export function spawn(entry, ctx, position) {
  const v = new TitanVehicle(entry, ctx);
  v.spawn(position);
  return v;
}
export function update(vehicle, dt) { vehicle.update(dt); }
export function getSpeedKmh(vehicle) { return vehicle.getSpeedKmh(); }
export function applyBoost(vehicle, strength, duration) { vehicle.applyBoost(strength, duration); }
export function despawn(vehicle) { vehicle.despawn(); }
export default { spawn, update, getSpeedKmh, applyBoost, despawn };
