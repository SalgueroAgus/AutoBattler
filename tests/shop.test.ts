import { describe, it, expect } from 'vitest';
import { RNG } from '../src/engine/rng';
import { generateStore } from '../src/engine/shop';

describe('Shop generation', () => {
  it('generates the configured number of entries deterministically', () => {
    const cfg = {
      visibleOptions: 3,
      levels: { start: 1, max: 5, levelUpOnStageEndEvery: 2 },
      rarities: ['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY'],
      probabilities: { '1': { COMMON: 100 } }
    } as any;
    const prices = { COMMON: 3 } as any;
    const pool = { COMMON: ['a','b','c'] } as any;
    const rng = new RNG(42);
    const s1 = generateStore(1, cfg, prices, pool, rng);
    const rng2 = new RNG(42);
    const s2 = generateStore(1, cfg, prices, pool, rng2);
    expect(s1).toEqual(s2);
    expect(s1.length).toBe(3);
  });
});

