import { describe, it, expect } from 'vitest';
import { simulateRound } from '../src/engine/combat';
import { PlayerState, UnitInstance } from '../src/engine/types';

function mkUnit(id: string, dmg: number, hp: number): UnitInstance {
  return {
    id,
    defId: id,
    name: id,
    rarity: 'COMMON',
    level: 1,
    stars: 1,
    stats: { hp, dmg, critChance: 0, critMultiplier: 1.5 },
    tags: [],
    isChampion: false,
    passives: [],
    current: { hp }
  };
}

function mkState(id: string, units: UnitInstance[]): PlayerState {
  return {
    userId: id,
    hp: 20,
    xp: 0,
    winStreak: 0,
    shopLevel: 1,
    rerollCountThisStage: 0,
    board: { active: [units[0] || null, units[1] || null, units[2] || null], bench: [null, null, null, null], championId: '' },
    store: [],
    killsThisStage: 0,
    drainedHPThisStage: 0,
    damageThisStage: 0
  };
}

describe('Combat basics', () => {
  it('ends when one side has no actives; damage = base + remaining', () => {
    const p1 = mkState('P1', [mkUnit('A', 10, 1)]);
    const p2 = mkState('P2', [mkUnit('B', 1, 100)]);
    const res = simulateRound(p1, p2, 1);
    expect(res.winner).toBe(2);
    expect(res.damageToP1).toBe(2);
    expect(res.damageToP2).toBe(0);
  });
});

