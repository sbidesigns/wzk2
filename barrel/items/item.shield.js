// barrel/items/item.shield.js — temporary invulnerability
export function activate(ctx, { vehicle }) {
  vehicle._shieldUntil = performance.now() + 4000;
  ctx.engine.bus.emit('item:shield:used', { vehicle: vehicle.entry.id, durationMs: 4000 });
}
export default { activate };
