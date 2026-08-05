// barrel/characters/character.brick.js — Bruiser: mass x2 on ability
export function onAbilityActivate(character, ctx) {
  character._ramChargeActive = true;
  ctx.engine.bus.emit('character:ability', { id: 'brick', ability: 'ram-charge' });
}
export function onAbilityEnd(character, ctx) {
  character._ramChargeActive = false;
  ctx.engine.bus.emit('character:abilityEnd', { id: 'brick' });
}
export function applyPassive(character, ctx) {
  return { massMultiplier: character._ramChargeActive ? 2.0 : 1.0, knockbackForce: 1.5 };
}
export default { onAbilityActivate, onAbilityEnd, applyPassive };
