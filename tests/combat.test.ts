import { describe, it, expect } from 'vitest';
import { simulateRound } from '../src/engine/combat';
import { PlayerState, UnitInstance } from '../src/engine/types';

function mkUnit(name: string, atkPhys: number, hp: number): UnitInstance {
  return {
    id: name,
    defId: name,
    name,
    rarity: 'COMMON' as any,
    level: 1,
    stars: 1,
    stats: { hp, defPhys: 0, defMag: 0, atkPhys, atkMag: 0, atkSpeed: 1, crit: 0, critDmg: 1.5, manaMax: 100 },
    ability: { kind: 'none', cost: 100, value: 0, desc: '' },
    tags: [],
    isChampion: false,
    current: { hp, mana: 0 }
  };
}

function mkState(id: string, actives: UnitInstance[]): PlayerState {
  return {
    userId: id, hp: 20, xp: 0, winStreak: 0, shopLevel: 1, rerollCountThisStage: 0,
    board: { active: [actives[0]||null, actives[1]||null, actives[2]||null], bench: [null,null,null,null], championId: '' },
    store: [], killsThisStage: 0, drainedHPThisStage: 0, damageThisStage: 0
  };
}

describe('Combat basics', () => {
  it('ends when one side has no actives; damage = base + remaining', () => {
    const p1 = mkState('P1', [mkUnit('A', 10, 1), null as any, null as any]);
    const p2 = mkState('P2', [mkUnit('B', 1, 100), null as any, null as any]);
    const res = simulateRound(p1, p2, 1);
    expect(res.winner).toBe(2);
    expect(res.damageToP1).toBeGreaterThan(0);
    expect(res.damageToP2).toBe(0);
  });
});

