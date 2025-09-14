import { RoundResult, UnitInstance, PlayerState } from './types';
import { BattleContext, fireTrigger, fireTriggerStatsOnly, fireTriggerDamageOnly } from './passives';

function deepCloneUnits(arr: Array<UnitInstance | null>): Array<UnitInstance | null> {
  return arr.map(u => (u ? JSON.parse(JSON.stringify(u)) as UnitInstance : null));
}

function selectTarget(attacker: UnitInstance, defenders: Array<UnitInstance | null>): number | null {
  const candidates = defenders.map((u, i) => (u && u.current.hp > 0 ? i : -1)).filter(i => i >= 0);
  if (!candidates.length) return null;
  const samples = candidates.map(i => {
    const d = defenders[i]!;
    const crit = Math.random() < attacker.stats.critChance;
    const dmg = Math.max(1, Math.floor(attacker.stats.dmg * (crit ? attacker.stats.critMultiplier : 1)));
    const rem = d.current.hp - dmg;
    return { idx: i, dmg, rem, hp: d.current.hp };
  });
  const killable = samples.filter(s => s.dmg >= s.hp);
  if (killable.length) return killable.sort((a,b) => b.hp - a.hp)[0].idx;
  const best = samples.sort((a,b) => (a.rem - b.rem) || (a.hp - b.hp) || (a.idx - b.idx))[0];
  return best.idx;
}

export function simulateRound(p1: PlayerState, p2: PlayerState, baseLoss: number): RoundResult {
  // Use eventful version and return its result
  return simulateRoundWithEvents(p1, p2, baseLoss).result;
}

export type CombatEvent =
  | { type: 'act'; actorSide: 1|2; actorSlot: number; targetSlot: number; action: 'hit'|'mirror'; damage: number; crit?: boolean; snapshots: { p1: Array<{ hp: number } | null>; p2: Array<{ hp: number } | null> } }
  | { type: 'death'; side: 1|2; slot: number }
  | { type: 'pre'; deltas: { p1: Array<{ hp: number; dmg: number } | null>; p2: Array<{ hp: number; dmg: number } | null> } }
  | { type: 'end'; result: RoundResult };

function snap(units: Array<UnitInstance | null>) {
  return units.map(u => (u ? { hp: u.current.hp } : null));
}

export function simulateRoundWithEvents(p1: PlayerState, p2: PlayerState, baseLoss: number): { events: CombatEvent[]; result: RoundResult } {
  const a1 = deepCloneUnits(p1.board.active);
  const a2 = deepCloneUnits(p2.board.active);
  const b1 = deepCloneUnits(p1.board.bench);
  const b2 = deepCloneUnits(p2.board.bench);
  const ctx: BattleContext = { p1: { units: a1, bench: b1 }, p2: { units: a2, bench: b2 }, procCount: new Map() };
  const events: CombatEvent[] = [];

  // PreBattle: stats first (both sides), then damage (both sides); capture deltas
  const beforeP1 = a1.map(u => (u ? { hp: u.current.hp, dmg: u.stats.dmg } : null));
  const beforeP2 = a2.map(u => (u ? { hp: u.current.hp, dmg: u.stats.dmg } : null));
  fireTriggerStatsOnly(ctx, 1, 'preBattle');
  fireTriggerStatsOnly(ctx, 2, 'preBattle');
  fireTriggerDamageOnly(ctx, 1, 'preBattle');
  fireTriggerDamageOnly(ctx, 2, 'preBattle');
  const afterP1 = a1.map(u => (u ? { hp: u.current.hp, dmg: u.stats.dmg } : null));
  const afterP2 = a2.map(u => (u ? { hp: u.current.hp, dmg: u.stats.dmg } : null));
  const deltas = {
    p1: afterP1.map((x, i) => (x && beforeP1[i] ? { hp: x.hp - (beforeP1[i] as any).hp, dmg: x.dmg - (beforeP1[i] as any).dmg } : null)),
    p2: afterP2.map((x, i) => (x && beforeP2[i] ? { hp: x.hp - (beforeP2[i] as any).hp, dmg: x.dmg - (beforeP2[i] as any).dmg } : null))
  };
  events.push({ type: 'pre', deltas });

  const order = [0,1,2];
  let turns = 0;
  const MAX_TURNS = 200;
  while (turns++ < MAX_TURNS) {
    for (const slot of order) {
      // P1 acts
      const u1 = a1[slot];
      if (u1 && u1.current.hp > 0) {
        const tIdx = selectTarget(u1, a2);
        if (tIdx !== null) {
          const t2 = a2[tIdx]!;
          // onAttack for attacker
          fireTrigger(ctx, 1, 'onAttack', slot);
          // compute damage with crit
          const crit = Math.random() < u1.stats.critChance;
          const out = Math.max(1, Math.floor(u1.stats.dmg * (crit ? u1.stats.critMultiplier : 1)));
          const back = t2.stats.dmg; // symmetrical rule: attacker takes defender dmg
          // apply damage simultaneously
          t2.current.hp = Math.max(0, t2.current.hp - out);
          u1.current.hp = Math.max(0, u1.current.hp - back);
          // onReceivedDamage
          fireTrigger(ctx, 1, 'onReceivedDamage', slot);
          fireTrigger(ctx, 2, 'onReceivedDamage', tIdx);
          // log events
          events.push({ type: 'act', actorSide: 1, actorSlot: slot, targetSlot: tIdx, action: 'hit', damage: out, crit, snapshots: { p1: snap(a1), p2: snap(a2) } });
          events.push({ type: 'act', actorSide: 2, actorSlot: tIdx, targetSlot: slot, action: 'mirror', damage: back, snapshots: { p1: snap(a1), p2: snap(a2) } });
          // deaths and triggers
          const died1 = u1.current.hp <= 0;
          const died2 = t2.current.hp <= 0;
          if (died1) events.push({ type: 'death', side: 1, slot });
          if (died2) events.push({ type: 'death', side: 2, slot: tIdx });
          if (died1) fireTrigger(ctx, 2, 'onKill', tIdx);
          if (died2) fireTrigger(ctx, 1, 'onKill', slot);
          if (died1) fireTrigger(ctx, 1, 'onDeath', slot);
          if (died2) fireTrigger(ctx, 2, 'onDeath', tIdx);
        }
      }
      // P2 acts
      const u2 = a2[slot];
      if (u2 && u2.current.hp > 0) {
        const tIdx = selectTarget(u2, a1);
        if (tIdx !== null) {
          const t1 = a1[tIdx]!;
          fireTrigger(ctx, 2, 'onAttack', slot);
          const crit = Math.random() < u2.stats.critChance;
          const out = Math.max(1, Math.floor(u2.stats.dmg * (crit ? u2.stats.critMultiplier : 1)));
          const back = t1.stats.dmg;
          t1.current.hp = Math.max(0, t1.current.hp - out);
          u2.current.hp = Math.max(0, u2.current.hp - back);
          fireTrigger(ctx, 1, 'onReceivedDamage', tIdx);
          fireTrigger(ctx, 2, 'onReceivedDamage', slot);
          events.push({ type: 'act', actorSide: 2, actorSlot: slot, targetSlot: tIdx, action: 'hit', damage: out, crit, snapshots: { p1: snap(a1), p2: snap(a2) } });
          events.push({ type: 'act', actorSide: 1, actorSlot: tIdx, targetSlot: slot, action: 'mirror', damage: back, snapshots: { p1: snap(a1), p2: snap(a2) } });
          const died2 = u2.current.hp <= 0;
          const died1 = t1.current.hp <= 0;
          if (died1) events.push({ type: 'death', side: 1, slot: tIdx });
          if (died2) events.push({ type: 'death', side: 2, slot });
          if (died1) fireTrigger(ctx, 2, 'onKill', slot);
          if (died2) fireTrigger(ctx, 1, 'onKill', tIdx);
          if (died1) fireTrigger(ctx, 1, 'onDeath', tIdx);
          if (died2) fireTrigger(ctx, 2, 'onDeath', slot);
        }
      }

      const alive1 = a1.filter(u => u && u.current.hp > 0).length;
      const alive2 = a2.filter(u => u && u.current.hp > 0).length;
      if (alive1 === 0 || alive2 === 0) {
        const damageToP1 = alive1 === 0 && alive2 > 0 ? baseLoss + alive2 : 0;
        const damageToP2 = alive2 === 0 && alive1 > 0 ? baseLoss + alive1 : 0;
        const winner: 1 | 2 | 0 = alive1 > alive2 ? 1 : alive2 > alive1 ? 2 : 0;
        const result: RoundResult = { p1Alive: alive1, p2Alive: alive2, damageToP1, damageToP2, winner, log: [] };
        events.push({ type: 'end', result });
        return { events, result };
      }
    }
  }
  const alive1 = a1.filter(u => u && u.current.hp > 0).length;
  const alive2 = a2.filter(u => u && u.current.hp > 0).length;
  const winner: 1 | 2 | 0 = alive1 > alive2 ? 1 : alive2 > alive1 ? 2 : 0;
  const damageToP1 = winner === 2 ? baseLoss + alive2 : 0;
  const damageToP2 = winner === 1 ? baseLoss + alive1 : 0;
  const result: RoundResult = { p1Alive: alive1, p2Alive: alive2, damageToP1, damageToP2, winner, log: ['Turn cap'] };
  events.push({ type: 'end', result });
  return { events, result };
}
