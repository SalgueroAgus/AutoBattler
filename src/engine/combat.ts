import { RoundResult, UnitInstance, PlayerState } from './types';

type DamagePacket = { phys: number; mag: number; isCrit: boolean };

function calcBasicDamage(attacker: UnitInstance, target: UnitInstance): DamagePacket {
  const crit = Math.random() < attacker.stats.crit; // will be overridden by deterministic layer in BattleScene
  const physRaw = attacker.stats.atkPhys * (crit ? attacker.stats.critDmg : 1);
  const magRaw = attacker.stats.atkMag * (crit ? attacker.stats.critDmg : 1);
  const phys = Math.max(1, Math.floor(physRaw - target.stats.defPhys));
  const mag = Math.max(1, Math.floor(magRaw - target.stats.defMag));
  return { phys, mag, isCrit: crit };
}

function applyDamage(target: UnitInstance, dmg: DamagePacket): number {
  let total = dmg.phys + dmg.mag;
  // absorb by shield first
  if (target.current.shield && target.current.shield > 0) {
    const absorb = Math.min(target.current.shield, total);
    target.current.shield -= absorb;
    total -= absorb;
  }
  if (total <= 0) return 0;
  target.current.hp = Math.max(0, target.current.hp - total);
  return total;
}

function firstAlive(units: Array<UnitInstance | null>): number | null {
  for (let i = 0; i < units.length; i++) if (units[i] && units[i]!.current.hp > 0) return i;
  return null;
}

export function cloneCombatants(ps: PlayerState): Array<UnitInstance | null> {
  return ps.board.active.map(u => (u ? JSON.parse(JSON.stringify(u)) as UnitInstance : null));
}

export function simulateRound(p1: PlayerState, p2: PlayerState, baseLoss: number): RoundResult {
  const log: string[] = [];
  const a1 = cloneCombatants(p1);
  const a2 = cloneCombatants(p2);

  const slots = [0,1,2];
  let turns = 0;
  const maxTurns = 200; // safety
  while (turns++ < maxTurns) {
    for (const slot of slots) {
      // P1 acts
      const u1 = a1[slot];
      const t2Idx = firstAlive(a2);
      if (u1 && u1.current.hp > 0 && t2Idx !== null) {
        const t2 = a2[t2Idx]!;
        // mana/ability check
        let dealt = 0;
        const g1 = u1.manaGain || { perAttack: 0, perHitTaken: 0 };
        const g2 = t2.manaGain || { perAttack: 0, perHitTaken: 0 };
        const hasMana = u1.current.mana >= u1.stats.manaMax;
        if (hasMana && u1.ability.kind.includes('shield')) {
          u1.current.shield = (u1.current.shield || 0) + u1.ability.value;
          u1.current.mana = 0;
          log.push(`P1:${slot+1} shields ${u1.ability.value}`);
        } else if (hasMana && (u1.ability.kind.includes('manaReplace') || u1.ability.kind.includes('nuke') || u1.ability.kind.includes('fastManaNuke'))) {
          // cast a magic nuke (replace attack)
          dealt = Math.max(1, Math.floor(u1.ability.value - t2.stats.defMag));
          applyDamage(t2, { phys: 0, mag: dealt, isCrit: false });
          u1.current.mana = 0;
          log.push(`P1:${slot+1} casts for ${dealt}`);
        } else {
          let pkt = calcBasicDamage(u1, t2);
          // on-hit extra when mana is full
          if (hasMana && u1.ability.kind.includes('onHitManaAttack')) {
            pkt = { ...pkt, phys: pkt.phys + u1.ability.value };
            u1.current.mana = 0;
            log.push(`P1:${slot+1} empowered hit +${u1.ability.value}`);
          }
          dealt = applyDamage(t2, pkt);
          log.push(`P1:${slot+1} hits for ${dealt}`);
          // gain mana
          u1.current.mana = Math.min(u1.stats.manaMax, u1.current.mana + g1.perAttack);
          t2.current.mana = Math.min(t2.stats.manaMax, t2.current.mana + g2.perHitTaken);
          // trigger-on-damaged retaliation if target just reached full
          if (t2.current.mana >= t2.stats.manaMax && t2.ability.kind.includes('triggerOnDamaged') && t2.current.hp > 0) {
            t2.current.mana = 0;
            const ret = Math.max(1, t2.ability.value - u1.stats.defPhys);
            applyDamage(u1, { phys: ret, mag: 0, isCrit: false });
            log.push(`P2:${slot+1} retaliates for ${ret}`);
          }
        }
      }
      // P2 acts
      const u2 = a2[slot];
      const t1Idx = firstAlive(a1);
      if (u2 && u2.current.hp > 0 && t1Idx !== null) {
        const t1 = a1[t1Idx]!;
        let dealt = 0;
        const gU2 = u2.manaGain || { perAttack: 0, perHitTaken: 0 };
        const gT1 = t1.manaGain || { perAttack: 0, perHitTaken: 0 };
        const hasMana = u2.current.mana >= u2.stats.manaMax;
        if (hasMana && u2.ability.kind.includes('shield')) {
          u2.current.shield = (u2.current.shield || 0) + u2.ability.value;
          u2.current.mana = 0;
          log.push(`P2:${slot+1} shields ${u2.ability.value}`);
        } else if (hasMana && (u2.ability.kind.includes('manaReplace') || u2.ability.kind.includes('nuke') || u2.ability.kind.includes('fastManaNuke'))) {
          dealt = Math.max(1, Math.floor(u2.ability.value - t1.stats.defMag));
          applyDamage(t1, { phys: 0, mag: dealt, isCrit: false });
          u2.current.mana = 0;
          log.push(`P2:${slot+1} casts for ${dealt}`);
        } else {
          let pkt = calcBasicDamage(u2, t1);
          if (hasMana && u2.ability.kind.includes('onHitManaAttack')) {
            pkt = { ...pkt, phys: pkt.phys + u2.ability.value };
            u2.current.mana = 0;
            log.push(`P2:${slot+1} empowered hit +${u2.ability.value}`);
          }
          dealt = applyDamage(t1, pkt);
          log.push(`P2:${slot+1} hits for ${dealt}`);
          u2.current.mana = Math.min(u2.stats.manaMax, u2.current.mana + gU2.perAttack);
          t1.current.mana = Math.min(t1.stats.manaMax, t1.current.mana + gT1.perHitTaken);
          if (t1.current.mana >= t1.stats.manaMax && t1.ability.kind.includes('triggerOnDamaged') && t1.current.hp > 0) {
            t1.current.mana = 0;
            const ret = Math.max(1, t1.ability.value - u2.stats.defPhys);
            applyDamage(u2, { phys: ret, mag: 0, isCrit: false });
            log.push(`P1:${slot+1} retaliates for ${ret}`);
          }
        }
      }

      // check board states mid-loop to allow simultaneous deaths as per clarifications
      const p1Alive = a1.filter(u => u && u.current.hp > 0).length;
      const p2Alive = a2.filter(u => u && u.current.hp > 0).length;
      if (p1Alive === 0 || p2Alive === 0) {
        const damageToP1 = p1Alive === 0 && p2Alive > 0 ? baseLoss + p2Alive : 0;
        const damageToP2 = p2Alive === 0 && p1Alive > 0 ? baseLoss + p1Alive : 0;
        const winner: 1 | 2 | 0 = p1Alive > p2Alive ? 1 : p2Alive > p1Alive ? 2 : 0;
        return { p1Alive, p2Alive, damageToP1, damageToP2, winner, log };
      }
    }
  }
  // Fallback on turn cap
  const p1Alive = a1.filter(u => u && u.current.hp > 0).length;
  const p2Alive = a2.filter(u => u && u.current.hp > 0).length;
  const winner: 1 | 2 | 0 = p1Alive > p2Alive ? 1 : p2Alive > p1Alive ? 2 : 0;
  const damageToP1 = winner === 2 ? baseLoss + p2Alive : 0;
  const damageToP2 = winner === 1 ? baseLoss + p1Alive : 0;
  log.push('Turn cap reached');
  return { p1Alive, p2Alive, damageToP1, damageToP2, winner, log };
}
