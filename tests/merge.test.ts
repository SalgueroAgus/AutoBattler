import { describe, it, expect } from 'vitest';
import { initMatchState, tryMergeAll } from '../src/engine/match';

describe('Merge system', () => {
  it('merges two 1-star into one 2-star', () => {
    const m = initMatchState();
    m.player.bench[0] = { defId: 'u_myst', stars: 1 } as any;
    m.player.bench[1] = { defId: 'u_myst', stars: 1 } as any;
    const merges = tryMergeAll(m, 'player');
    expect(merges.length).toBe(1);
    const countMyst = [...m.player.active, ...m.player.bench].filter(s => s && s.defId === 'u_myst');
    expect(countMyst.length).toBe(1);
    expect(countMyst[0]!.stars).toBe(2);
  });
});

