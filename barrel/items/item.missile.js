// barrel/items/item.missile.js — homing projectile (simplified: targets leader)
export function activate(ctx, { vehicle, targetVehicle, targetVehicleModule }) {
  if (!targetVehicle) return;
  // Apply a forward impulse knockback to target
  const forward = new ctx.physics.getCANNON().Vec3(0, 0, 1);
  targetVehicle.physicsBody.quaternion.vmult(forward, forward);
  forward.scale(40, forward);
  targetVehicle.physicsBody.applyImpulse(forward, new ctx.physics.getCANNON().Vec3(0, 0.5, 0));
  ctx.engine.bus.emit('item:missile:hit', { target: targetVehicle.entry.id });
}
export default { activate };
