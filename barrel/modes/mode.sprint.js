// barrel/modes/mode.sprint.js — single-lap point-to-point
export function onMatchStart(ctx, s) {
  s.finished = []; s.startTime = performance.now();
  ctx.engine.bus.emit('mode:sprint:start');
}
export function onLapComplete(ctx, s, { vehicleId }) {
  s.finished.push({ id: vehicleId, time: (performance.now() - s.startTime) / 1000 });
  ctx.engine.bus.emit('mode:sprint:finished', { vehicle: vehicleId, position: s.finished.length });
}
export function onItemUsed() {}
export function onPlayerFinished(ctx, s) {
  ctx.engine.bus.emit('mode:sprint:raceEnd', { results: s.finished });
}
export function getScoreboard(ctx, s) { return [...s.finished]; }
export default { onMatchStart, onLapComplete, onItemUsed, onPlayerFinished, getScoreboard };
