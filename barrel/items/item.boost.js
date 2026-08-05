// barrel/items/item.boost.js — instant nitro boost
export function activate(ctx, { vehicle, vehicleModule }) {
  vehicleModule.applyBoost(vehicle, 1.2, 1.5);
  ctx.engine.bus.emit('item:boost:used', { vehicle: vehicle.entry.id });
}
export default { activate };
