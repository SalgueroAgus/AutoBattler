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

function predictDamage(attacker: UnitInstance, defender: UnitInstance): number {
  const hasMana = attacker.current.mana >= attacker.stats.manaMax;
  if (hasMana && attacker.ability.kind.includes('shield')) {
    return 0; // no damage this action
  }
  if (hasMana && (attacker.ability.kind.includes('manaReplace') || attacker.ability.kind.includes('nuke') || attacker.ability.kind.includes('fastManaNuke'))) {
    const dealt = Math.max(1, Math.floor(attacker.ability.value - defender.stats.defMag));
    return Math.max(0, dealt - (defender.current.shield || 0));
  }
  // basic, possibly empowered on-hit
  const crit = Math.random() < attacker.stats.crit;
  const physRaw = (attacker.stats.atkPhys + (hasMana && attacker.ability.kind.includes('onHitManaAttack') ? attacker.ability.value : 0)) * (crit ? attacker.stats.critDmg : 1);
  const magRaw = attacker.stats.atkMag * (crit ? attacker.stats.critDmg : 1);
  const phys = Math.max(1, Math.floor(physRaw - defender.stats.defPhys));
  const mag = Math.max(1, Math.floor(magRaw - defender.stats.defMag));
  const total = phys + mag;
  return Math.max(0, total - (defender.current.shield || 0));
}

function selectTarget(attackerSide: 1|2, slot: number, attackers: Array<UnitInstance | null>, defenders: Array<UnitInstance | null>): number | null {
  // Eligible defender indices
  const candidates: number[] = [];
  for (let i = 0; i < defenders.length; i++) if (defenders[i] && defenders[i]!.current.hp > 0) candidates.push(i);
  if (!candidates.length) return null;
  const attacker = attackers[slot]!;
  // Evaluate predicted damage and remaining HP for each candidate
  const scored = candidates.map(i => {
    const d = defenders[i]!;
    const dmg = predictDamage(attacker, d);
    const rem = d.current.hp - dmg;
    return { idx: i, dmg, rem, hp: d.current.hp };
  });
  // 1) Among those we can one-shot, pick the one with the highest current HP
  const oneshots = scored.filter(s => s.dmg >= s.hp);
  if (oneshots.length) return oneshots.sort((a,b) => b.hp - a.hp)[0].idx;
  // 2) Otherwise, pick the target that would be left with the least remaining HP (tie-breaker: lowest HP, then lowest index)
  const best = scored.sort((a,b) => (a.rem - b.rem) || (a.hp - b.hp) || (a.idx - b.idx))[0];
  return best.idx;
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
      const t2Idx = u1 ? selectTarget(1, slot, a1, a2) : null;
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
      const t1Idx = u2 ? selectTarget(2, slot, a2, a1) : null;
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

export type CombatEvent =
  | { type: 'act'; actorSide: 1|2; actorSlot: number; targetSlot: number; action: 'hit'|'cast'|'empowered'|'shield'|'retaliate'; damage: number; crit?: boolean; snapshots: { p1: Array<{ hp: number; mana: number; shield?: number } | null>; p2: Array<{ hp: number; mana: number; shield?: number } | null> } }
  | { type: 'death'; side: 1|2; slot: number }
  | { type: 'end'; result: RoundResult };

function snap(units: Array<UnitInstance | null>) {
  return units.map(u => (u ? { hp: u.current.hp, mana: u.current.mana, shield: u.current.shield } : null));
}

export function simulateRoundWithEvents(p1: PlayerState, p2: PlayerState, baseLoss: number): { events: CombatEvent[]; result: RoundResult } {
  const events: CombatEvent[] = [];
  const a1 = cloneCombatants(p1);
  const a2 = cloneCombatants(p2);
  const log: string[] = [];

  const slots = [0,1,2];
  let turns = 0;
  const maxTurns = 200;
  while (turns++ < maxTurns) {
    for (const slot of slots) {
      // P1 acts
      const u1 = a1[slot];
      const t2Idx = u1 ? selectTarget(1, slot, a1, a2) : null;
      if (u1 && u1.current.hp > 0 && t2Idx !== null) {
        const t2 = a2[t2Idx]!;
        const g1 = u1.manaGain || { perAttack: 0, perHitTaken: 0 };
        const g2 = t2.manaGain || { perAttack: 0, perHitTaken: 0 };
        const hasMana = u1.current.mana >= u1.stats.manaMax;
        if (hasMana && u1.ability.kind.includes('shield')) {
          u1.current.shield = (u1.current.shield || 0) + u1.ability.value;
          u1.current.mana = 0;
          log.push(`P1:${slot+1} shields ${u1.ability.value}`);
          events.push({ type: 'act', actorSide: 1, actorSlot: slot, targetSlot: t2Idx, action: 'shield', damage: 0, snapshots: { p1: snap(a1), p2: snap(a2) } });
        } else if (hasMana && (u1.ability.kind.includes('manaReplace') || u1.ability.kind.includes('nuke') || u1.ability.kind.includes('fastManaNuke'))) {
          const dealt = Math.max(1, Math.floor(u1.ability.value - t2.stats.defMag));
          applyDamage(t2, { phys: 0, mag: dealt, isCrit: false });
          u1.current.mana = 0;
          log.push(`P1:${slot+1} casts for ${dealt}`);
          events.push({ type: 'act', actorSide: 1, actorSlot: slot, targetSlot: t2Idx, action: 'cast', damage: dealt, snapshots: { p1: snap(a1), p2: snap(a2) } });
          if (t2.current.hp <= 0) events.push({ type: 'death', side: 2, slot: t2Idx });
        } else {
          let pkt = calcBasicDamage(u1, t2);
          if (hasMana && u1.ability.kind.includes('onHitManaAttack')) {
            pkt = { ...pkt, phys: pkt.phys + u1.ability.value };
            u1.current.mana = 0;
            log.push(`P1:${slot+1} empowered hit +${u1.ability.value}`);
            const dealt = applyDamage(t2, pkt);
            events.push({ type:'act', actorSide:1, actorSlot:slot, targetSlot:t2Idx, action:'empowered', damage:dealt, crit:pkt.isCrit, snapshots:{ p1: snap(a1), p2: snap(a2) } });
            if (t2.current.hp <= 0) events.push({ type: 'death', side: 2, slot: t2Idx });
          } else {
            const dealt = applyDamage(t2, pkt);
            log.push(`P1:${slot+1} hits for ${dealt}`);
            events.push({ type:'act', actorSide:1, actorSlot:slot, targetSlot:t2Idx, action:'hit', damage:dealt, crit:pkt.isCrit, snapshots:{ p1: snap(a1), p2: snap(a2) } });
            if (t2.current.hp <= 0) events.push({ type: 'death', side: 2, slot: t2Idx });
            u1.current.mana = Math.min(u1.stats.manaMax, u1.current.mana + g1.perAttack);
            t2.current.mana = Math.min(t2.stats.manaMax, t2.current.mana + g2.perHitTaken);
            if (t2.current.mana >= t2.stats.manaMax && t2.ability.kind.includes('triggerOnDamaged') && t2.current.hp > 0) {
              t2.current.mana = 0;
              const ret = Math.max(1, t2.ability.value - u1.stats.defPhys);
              applyDamage(u1, { phys: ret, mag: 0, isCrit: false });
              events.push({ type:'act', actorSide:2, actorSlot:t2Idx, targetSlot:slot, action:'retaliate', damage:ret, snapshots:{ p1: snap(a1), p2: snap(a2) } });
              if (u1.current.hp <= 0) events.push({ type: 'death', side: 1, slot });
            }
          }
        }
      }
      // P2 acts
      const u2 = a2[slot];
      const t1Idx = u2 ? selectTarget(2, slot, a2, a1) : null;
      if (u2 && u2.current.hp > 0 && t1Idx !== null) {
        const t1 = a1[t1Idx]!;
        const gU2 = u2.manaGain || { perAttack: 0, perHitTaken: 0 };
        const gT1 = t1.manaGain || { perAttack: 0, perHitTaken: 0 };
        const hasMana = u2.current.mana >= u2.stats.manaMax;
        if (hasMana && u2.ability.kind.includes('shield')) {
          u2.current.shield = (u2.current.shield || 0) + u2.ability.value;
          u2.current.mana = 0;
          events.push({ type:'act', actorSide:2, actorSlot:slot, targetSlot:t1Idx, action:'shield', damage:0, snapshots:{ p1: snap(a1), p2: snap(a2) } });
        } else if (hasMana && (u2.ability.kind.includes('manaReplace') || u2.ability.kind.includes('nuke') || u2.ability.kind.includes('fastManaNuke'))) {
          const dealt = Math.max(1, Math.floor(u2.ability.value - t1.stats.defMag));
          applyDamage(t1, { phys: 0, mag: dealt, isCrit: false });
          u2.current.mana = 0;
          events.push({ type:'act', actorSide:2, actorSlot:slot, targetSlot:t1Idx, action:'cast', damage:dealt, snapshots:{ p1: snap(a1), p2: snap(a2) } });
          if (t1.current.hp <= 0) events.push({ type: 'death', side: 1, slot: t1Idx });
        } else {
          let pkt = calcBasicDamage(u2, t1);
          if (hasMana && u2.ability.kind.includes('onHitManaAttack')) {
            pkt = { ...pkt, phys: pkt.phys + u2.ability.value };
            u2.current.mana = 0;
            const dealt = applyDamage(t1, pkt);
            events.push({ type:'act', actorSide:2, actorSlot:slot, targetSlot:t1Idx, action:'empowered', damage:dealt, crit:pkt.isCrit, snapshots:{ p1: snap(a1), p2: snap(a2) } });
            if (t1.current.hp <= 0) events.push({ type: 'death', side: 1, slot: t1Idx });
          } else {
            const dealt = applyDamage(t1, pkt);
            events.push({ type:'act', actorSide:2, actorSlot:slot, targetSlot:t1Idx, action:'hit', damage:dealt, crit:pkt.isCrit, snapshots:{ p1: snap(a1), p2: snap(a2) } });
            if (t1.current.hp <= 0) events.push({ type: 'death', side: 1, slot: t1Idx });
            u2.current.mana = Math.min(u2.stats.manaMax, u2.current.mana + gU2.perAttack);
            t1.current.mana = Math.min(t1.stats.manaMax, t1.current.mana + gT1.perHitTaken);
            if (t1.current.mana >= t1.stats.manaMax && t1.ability.kind.includes('triggerOnDamaged') && t1.current.hp > 0) {
              t1.current.mana = 0;
              const ret = Math.max(1, t1.ability.value - u2.stats.defPhys);
              applyDamage(u2, { phys: ret, mag: 0, isCrit: false });
              events.push({ type:'act', actorSide:1, actorSlot:t1Idx, targetSlot:slot, action:'retaliate', damage:ret, snapshots:{ p1: snap(a1), p2: snap(a2) } });
              if (u2.current.hp <= 0) events.push({ type: 'death', side: 2, slot });
            }
          }
        }
      }

      const p1Alive = a1.filter(u => u && u.current.hp > 0).length;
      const p2Alive = a2.filter(u => u && u.current.hp > 0).length;
      if (p1Alive === 0 || p2Alive === 0) {
        const damageToP1 = p1Alive === 0 && p2Alive > 0 ? baseLoss + p2Alive : 0;
        const damageToP2 = p2Alive === 0 && p1Alive > 0 ? baseLoss + p1Alive : 0;
        const winner: 1 | 2 | 0 = p1Alive > p2Alive ? 1 : p2Alive > p1Alive ? 2 : 0;
        const result: RoundResult = { p1Alive, p2Alive, damageToP1, damageToP2, winner, log };
        events.push({ type: 'end', result });
        return { events, result };
      }
    }
  }
  const p1Alive = a1.filter(u => u && u.current.hp > 0).length;
  const p2Alive = a2.filter(u => u && u.current.hp > 0).length;
  const winner: 1 | 2 | 0 = p1Alive > p2Alive ? 1 : p2Alive > p1Alive ? 2 : 0;
  const damageToP1 = winner === 2 ? baseLoss + p2Alive : 0;
  const damageToP2 = winner === 1 ? baseLoss + p1Alive : 0;
  log.push('Turn cap reached');
  const result: RoundResult = { p1Alive, p2Alive, damageToP1, damageToP2, winner, log };
  events.push({ type: 'end', result });
  return { events, result };
}
