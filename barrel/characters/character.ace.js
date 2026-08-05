// barrel/characters/character.ace.js — Racer archetype: perfect start bonus.
export function onAbilityActivate(character, ctx) {
  ctx.engine.bus.emit('character:ability', { id: 'ace', ability: 'perfect-start' });
}
export function onAbilityEnd(character, ctx) {
  ctx.engine.bus.emit('character:abilityEnd', { id: 'ace' });
}
export function applyPassive(character, ctx) {
  // Perfect-start passive: triggered by RaceMode on green light
  return { perfectStartWindow: 200, perfectStartBoost: 1.5 };
}
export default { onAbilityActivate, onAbilityEnd, applyPassive };
