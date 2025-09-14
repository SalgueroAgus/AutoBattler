import { PassiveSpec, UnitInstance } from './types';

export type Side = 1 | 2;

export type BattleSideState = {
  units: Array<UnitInstance | null>;
  bench?: Array<UnitInstance | null>;
};

export type BattleContext = {
  p1: BattleSideState;
  p2: BattleSideState;
  // track procs per unit/passive id for maxProcsPerBattle
  procCount: Map<string, number>;
};

function key(u: UnitInstance, p: PassiveSpec) {
  return `${u.id}:${p.id || p.trigger}`;
}

function incProc(ctx: BattleContext, u: UnitInstance, p: PassiveSpec): boolean {
  const k = key(u, p);
  const c = ctx.procCount.get(k) || 0;
  const max = p.limits?.maxProcsPerBattle ?? Infinity;
  if (c >= max) return false;
  ctx.procCount.set(k, c + 1);
  return true;
}

function matchZone(p: PassiveSpec, isOnBoard: boolean, isOnBench: boolean, isSoldPersistent: boolean): boolean {
  switch (p.effectZone) {
    case 'board': return isOnBoard;
    case 'bench': return isOnBench;
    case 'any': return isOnBoard || isOnBench;
    case 'persistent': return isOnBoard || isOnBench || isSoldPersistent;
  }
}

function recipients(ctx: BattleContext, side: Side, p: PassiveSpec, ownerSlotIndex: number): UnitInstance[] {
  const sideObj = side === 1 ? ctx.p1 : ctx.p2;
  const otherObj = side === 1 ? ctx.p2 : ctx.p1;
  const choose = (arr: Array<UnitInstance | null>) => arr.filter(Boolean) as UnitInstance[];
  const selfUnit = (sideObj.units[ownerSlotIndex] as UnitInstance | null);
  // Scope default includes board + bench unless the effectZone restricts it
  const allies = [
    ...choose(sideObj.units),
    ...(p.effectZone === 'board' ? [] : choose(sideObj.bench || []))
  ];
  // Enemies are only valid recipients for champion-owned enemy passives; otherwise ignore
  const owner = selfUnit!;
  const enemies = owner && owner.isChampion ? [
    ...choose(otherObj.units),
    ...(p.effectZone === 'board' ? [] : choose(otherObj.bench || []))
  ] : [];
  let pool: UnitInstance[] = [];
  switch (p.scope.side) {
    case 'self': pool = selfUnit ? [selfUnit] : []; break;
    case 'allies': pool = allies; break;
    case 'enemies': pool = enemies; break; // will be empty if owner not champion
    case 'all': pool = [...allies, ...enemies]; break; // enemies may be empty if not champion
  }
  if (p.scope.filterTags && p.scope.filterTags.length) {
    pool = pool.filter(u => u.tags.some(t => p.scope.filterTags!.includes(t)));
  }
  if (p.scope.side !== 'self' && p.scope.includeSelf === false && selfUnit) {
    pool = pool.filter(u => u.id !== selfUnit.id);
  }
  return pool;
}

export function applyPassiveEffectOnUnits(effect: PassiveSpec['effect'], units: UnitInstance[]) {
  for (const u of units) {
    if (effect.type === 'addStat') {
      if (effect.stat === 'hp' && typeof effect.amount === 'number') u.stats.hp += effect.amount;
      if (effect.stat === 'dmg' && typeof effect.amount === 'number') u.stats.dmg += effect.amount;
    } else if (effect.type === 'mulStat') {
      if (effect.stat === 'hp' && typeof effect.factor === 'number') u.stats.hp = Math.round(u.stats.hp * effect.factor);
      if (effect.stat === 'dmg' && typeof effect.factor === 'number') u.stats.dmg = Math.round(u.stats.dmg * effect.factor);
    }
  }
}

export function applyPassiveDamage(effect: PassiveSpec['effect'], ctx: BattleContext, side: Side, ownerSlotIndex: number) {
  if (effect.type !== 'damage') return;
  const other = side === 1 ? ctx.p2 : ctx.p1;
  const selfSide = side === 1 ? ctx.p1 : ctx.p2;
  const owner = selfSide.units[ownerSlotIndex]!;
  if (effect.target === 'self') {
    const u = selfSide.units[ownerSlotIndex];
    if (u) u.current.hp = Math.max(0, u.current.hp - (effect.amount || 0));
  } else if (effect.target === 'enemies') {
    // Only champions can affect enemies
    if (owner && owner.isChampion) {
      for (const u of other.units) if (u) u.current.hp = Math.max(0, u.current.hp - (effect.amount || 0));
    }
  } else if (effect.target === 'allies') {
    for (const u of selfSide.units) if (u) u.current.hp = Math.max(0, u.current.hp - (effect.amount || 0));
  }
}

export function fireTrigger(ctx: BattleContext, side: Side, trigger: PassiveSpec['trigger']): void {
  const sideObj = side === 1 ? ctx.p1 : ctx.p2;
  const applyList = (arr: Array<UnitInstance | null>, isBoard: boolean) => {
    for (let i = 0; i < arr.length; i++) {
      const u = arr[i];
      if (!u) continue;
      for (const p of u.passives || []) {
        if (p.trigger !== trigger) continue;
        if (!matchZone(p, isBoard, !isBoard, p.effectZone === 'persistent')) continue;
        if (!incProc(ctx, u, p)) continue;
        if (p.effect.type === 'damage') {
          applyPassiveDamage(p.effect, ctx, side, i);
        } else {
          const recips = recipients(ctx, side, p, i);
          applyPassiveEffectOnUnits(p.effect, recips);
        }
      }
    }
  };
  applyList(sideObj.units, true);
  applyList(sideObj.bench || [], false);
}

export function fireTriggerStatsOnly(ctx: BattleContext, side: Side, trigger: PassiveSpec['trigger']): void {
  const sideObj = side === 1 ? ctx.p1 : ctx.p2;
  const applyList = (arr: Array<UnitInstance | null>, isBoard: boolean) => {
    for (let i = 0; i < arr.length; i++) {
      const u = arr[i];
      if (!u) continue;
      for (const p of u.passives || []) {
        if (p.trigger !== trigger) continue;
        if (!matchZone(p, isBoard, !isBoard, p.effectZone === 'persistent')) continue;
        if (!incProc(ctx, u, p)) continue;
        if (p.effect.type === 'addStat' || p.effect.type === 'mulStat') {
          const recips = recipients(ctx, side, p, i);
          applyPassiveEffectOnUnits(p.effect, recips);
        }
      }
    }
  };
  applyList(sideObj.units, true);
  applyList(sideObj.bench || [], false);
}

export function fireTriggerDamageOnly(ctx: BattleContext, side: Side, trigger: PassiveSpec['trigger']): void {
  const sideObj = side === 1 ? ctx.p1 : ctx.p2;
  const applyList = (arr: Array<UnitInstance | null>, isBoard: boolean) => {
    for (let i = 0; i < arr.length; i++) {
      const u = arr[i];
      if (!u) continue;
      for (const p of u.passives || []) {
        if (p.trigger !== trigger) continue;
        if (!matchZone(p, isBoard, !isBoard, p.effectZone === 'persistent')) continue;
        if (!incProc(ctx, u, p)) continue;
        if (p.effect.type === 'damage') {
          applyPassiveDamage(p.effect, ctx, side, i);
        }
      }
    }
  };
  applyList(sideObj.units, true);
  applyList(sideObj.bench || [], false);
}
