"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeBasicAttackDamage = computeBasicAttackDamage;
exports.applyDamage = applyDamage;
// Basic damage formula applying DEF and crits.
function computeBasicAttackDamage(attacker, defender, ctx, rng) {
    // Pick the higher of atk_fis/atk_mag as model simplification
    const useMag = attacker.stats.atk_mag > attacker.stats.atk_fis;
    const base = (useMag ? attacker.stats.atk_mag : attacker.stats.atk_fis) * Math.max(1, attacker.stats.vel_atk);
    const def = useMag ? defender.stats.def_mag : defender.stats.def_fis;
    const raw = Math.max(0, base - def);
    const isCrit = rng.nextFloat() < attacker.stats.crit;
    const amount = Math.max(0, Math.floor(raw * (isCrit ? ctx.critMultiplier : 1)));
    return { amount, crit: isCrit, type: useMag ? 'mag' : 'fis' };
}
function applyDamage(target, dmg) {
    target.stats.hp = Math.max(0, target.stats.hp - dmg.amount);
}
