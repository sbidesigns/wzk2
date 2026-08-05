// barrel/modes/mode.drift.js — score-based drift trial
export function onMatchStart(ctx, s) {
  s.score = 0;
  s.combo = 0;
  s.timeLeft = ctx.matchConfig.timeLimitSec;
  s.startTime = performance.now();
  ctx.engine.bus.emit('mode:drift:start', { timeLimit: s.timeLeft });
}
export function onLapComplete() {}
export function onItemUsed() {}
export function onPlayerFinished(ctx, s) {
  ctx.engine.bus.emit('mode:drift:end', { score: s.score });
}
export function getScoreboard(ctx, s) { return [{ id: 'player', score: s.score }]; }

// Drift-specific: called by RaceScene when player drifts
export function addDriftScore(ctx, s, points) {
  s.combo++;
  s.score += points * s.combo;
  ctx.engine.bus.emit('mode:drift:score', { score: s.score, combo: s.combo });
}
export function breakCombo(ctx, s) {
  s.combo = 0;
  ctx.engine.bus.emit('mode:drift:comboBreak');
}

export default { onMatchStart, onLapComplete, onItemUsed, onPlayerFinished, getScoreboard, addDriftScore, breakCombo };
