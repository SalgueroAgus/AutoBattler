export type Slot = { defId: string; stars: number };
export type BoardState = {
  active: Array<Slot | null>; // length 3
  bench: Array<Slot | null>;  // length 4
  championId: string | null;
};

export type MatchState = {
  stage: number;
  shopLevel: number;
  rerollCountThisStage: number;
  player: BoardState;
  enemy: BoardState;
};

export function initMatchState(): MatchState {
  return {
    stage: 0,
    shopLevel: 1,
    rerollCountThisStage: 0,
    player: { active: [null, null, null], bench: [null, null, null, null], championId: null },
    enemy: { active: [null, null, null], bench: [null, null, null, null], championId: null }
  };
}

export function placeChampion(ms: MatchState, side: 'player'|'enemy', defId: string) {
  const b = ms[side];
  b.championId = defId;
  b.active[0] = { defId, stars: 1 }; // occupy first slot by default
}

export function nextStage(ms: MatchState, shopCfg: { levels: { max: number; levelUpOnStageEndEvery: number } }) {
  ms.stage += 1;
  ms.rerollCountThisStage = 0;
  // Level up shop after completing a stage if cadence matches
  if (ms.stage > 1 && (ms.stage % shopCfg.levels.levelUpOnStageEndEvery === 0)) {
    ms.shopLevel = Math.min(ms.shopLevel + 1, shopCfg.levels.max);
  }
}

export function addUnitToBench(ms: MatchState, side: 'player'|'enemy', defId: string): boolean {
  const b = ms[side];
  const idx = b.bench.findIndex(x => x === null);
  if (idx === -1) return false;
  b.bench[idx] = { defId, stars: 1 };
  return true;
}

export function tryMergeAll(ms: MatchState, side: 'player'|'enemy'): Array<{ defId: string; fromStars: number; toStars: number }> {
  const b = ms[side];
  const merges: Array<{ defId: string; fromStars: number; toStars: number }> = [];
  const gather = (stars: number) => {
    const ids: Record<string, number[]> = {};
    const push = (slot: Slot | null, index: number, area: 'active'|'bench') => {
      if (!slot || slot.stars !== stars) return;
      ids[slot.defId] = ids[slot.defId] || [];
      ids[slot.defId].push(area === 'active' ? index : index + 100); // bench indices offset
    };
    b.active.forEach((s, i) => push(s, i, 'active'));
    b.bench.forEach((s, i) => push(s, i, 'bench'));
    return ids;
  };
  // merge stars=1 to 2, then 2 to 3
  for (const s of [1,2]) {
    const ids = gather(s);
    for (const [defId, indices] of Object.entries(ids)) {
      while (indices.length >= 2) {
        const a = indices.pop()!;
        const d = indices.pop()!;
        const read = (pos: number): Slot | null => pos >= 100 ? b.bench[pos-100] : b.active[pos];
        const write = (pos: number, val: Slot | null) => { if (pos >= 100) b.bench[pos-100] = val; else b.active[pos] = val; };
        // remove two
        write(a, null);
        write(d, null);
        // place upgraded in first empty bench slot (prefer active first position)
        const upgraded: Slot = { defId, stars: s + 1 };
        let placed = false;
        for (let i = 0; i < b.active.length; i++) if (b.active[i] === null) { b.active[i] = upgraded; placed = true; break; }
        if (!placed) {
          for (let i = 0; i < b.bench.length; i++) if (b.bench[i] === null) { b.bench[i] = upgraded; placed = true; break; }
        }
        if (!placed) {
          // fallback: overwrite one of the removed positions
          write(a, upgraded);
        }
        merges.push({ defId, fromStars: s, toStars: s + 1 });
      }
    }
  }
  return merges;
}
