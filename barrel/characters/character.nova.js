// barrel/characters/character.nova.js — Trickster: drift mini-turbo 2x
export function onAbilityActivate(character, ctx) {
  character._driftMasterActive = true;
  ctx.engine.bus.emit('character:ability', { id: 'nova', ability: 'drift-master' });
}
export function onAbilityEnd(character, ctx) {
  character._driftMasterActive = false;
  ctx.engine.bus.emit('character:abilityEnd', { id: 'nova' });
}
export function applyPassive(character, ctx) {
  return { driftTurboMultiplier: character._driftMasterActive ? 2.0 : 1.0 };
}
export default { onAbilityActivate, onAbilityEnd, applyPassive };
