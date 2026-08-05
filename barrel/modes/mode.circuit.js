// barrel/modes/mode.circuit.js
// Standard circuit race. Tracks lap count, position, finish order.

export function onMatchStart(ctx, matchState) {
  matchState.laps = ctx.matchConfig.laps;
  matchState.playerLaps = 0;
  matchState.aiLaps = new Map();
  matchState.finished = [];
  matchState.startTime = performance.now();
  ctx.engine.bus.emit('mode:circuit:start', { laps: matchState.laps });
}

export function onLapComplete(ctx, matchState, { vehicleId }) {
  if (vehicleId === 'player') {
    matchState.playerLaps++;
    ctx.engine.bus.emit('mode:circuit:lap', { vehicle: 'player', lap: matchState.playerLaps, total: matchState.laps });
    if (matchState.playerLaps >= matchState.laps) {
      matchState.finished.push({ id: 'player', time: (performance.now() - matchState.startTime) / 1000 });
      ctx.engine.bus.emit('mode:circuit:finished', { vehicle: 'player', position: matchState.finished.length });
    }
  } else {
    const cur = (matchState.aiLaps.get(vehicleId) || 0) + 1;
    matchState.aiLaps.set(vehicleId, cur);
    if (cur >= matchState.laps) {
      matchState.finished.push({ id: vehicleId, time: (performance.now() - matchState.startTime) / 1000 });
      ctx.engine.bus.emit('mode:circuit:finished', { vehicle: vehicleId, position: matchState.finished.length });
    }
  }
}

export function onItemUsed(ctx, matchState, { vehicleId, itemId }) {
  ctx.engine.bus.emit('mode:circuit:item', { vehicle: vehicleId, item: itemId });
}

export function onPlayerFinished(ctx, matchState) {
  ctx.engine.bus.emit('mode:circuit:raceEnd', { results: matchState.finished });
}

export function getScoreboard(ctx, matchState) {
  return [...matchState.finished];
}

export default { onMatchStart, onLapComplete, onItemUsed, onPlayerFinished, getScoreboard };
