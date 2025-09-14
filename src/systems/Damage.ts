import { DamageContext, Unit } from '../models/Types';
import { RNG } from '../engine/RNG';

export interface DamageResult {
  amount: number;
  crit: boolean;
  type: 'fis' | 'mag';
}

// Basic damage formula applying DEF and crits.
export function computeBasicAttackDamage(attacker: Unit, defender: Unit, ctx: DamageContext, rng: RNG): DamageResult {
  // Pick the higher of atk_fis/atk_mag as model simplification
  const useMag = attacker.stats.atk_mag > attacker.stats.atk_fis;
  const base = (useMag ? attacker.stats.atk_mag : attacker.stats.atk_fis) * Math.max(1, attacker.stats.vel_atk);
  const def = useMag ? defender.stats.def_mag : defender.stats.def_fis;
  const raw = Math.max(0, base - def);
  const isCrit = rng.nextFloat() < attacker.stats.crit;
  const amount = Math.max(0, Math.floor(raw * (isCrit ? ctx.critMultiplier : 1)));
  return { amount, crit: isCrit, type: useMag ? 'mag' : 'fis' };
}

export function applyDamage(target: Unit, dmg: DamageResult): void {
  target.stats.hp = Math.max(0, target.stats.hp - dmg.amount);
}

