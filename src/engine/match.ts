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

  const read = (pos: { area: 'active'|'bench'; idx: number }): Slot | null => pos.area === 'bench' ? b.bench[pos.idx] : b.active[pos.idx];
  const write = (pos: { area: 'active'|'bench'; idx: number }, val: Slot | null) => {
    if (pos.area === 'bench') b.bench[pos.idx] = val; else b.active[pos.idx] = val;
  };

  const recompute = () => {
    const map = new Map<string, Map<number, Array<{ area:'active'|'bench'; idx:number }>>>();
    for (let i = 0; i < b.active.length; i++) {
      const s = b.active[i]; if (!s) continue;
      if (!map.has(s.defId)) map.set(s.defId, new Map());
      const byStar = map.get(s.defId)!;
      if (!byStar.has(s.stars)) byStar.set(s.stars, []);
      byStar.get(s.stars)!.push({ area:'active', idx:i });
    }
    for (let i = 0; i < b.bench.length; i++) {
      const s = b.bench[i]; if (!s) continue;
      if (!map.has(s.defId)) map.set(s.defId, new Map());
      const byStar = map.get(s.defId)!;
      if (!byStar.has(s.stars)) byStar.set(s.stars, []);
      byStar.get(s.stars)!.push({ area:'bench', idx:i });
    }
    return map;
  };

  const firstEmpty = (): { area:'active'|'bench'; idx:number } | null => {
    for (let i = 0; i < b.active.length; i++) if (b.active[i] === null) return { area:'active', idx:i };
    for (let i = 0; i < b.bench.length; i++) if (b.bench[i] === null) return { area:'bench', idx:i };
    return null;
  };

  while (true) {
    const map = recompute();
    let merged = false;
    for (const [defId, byStar] of map.entries()) {
      // Try highest to lowest star so chains bubble up quickly
      const stars = Array.from(byStar.keys()).sort((a,b) => b - a);
      for (const s of stars) {
        const list = byStar.get(s)!;
        while (list.length >= 2) {
          const a = list.pop()!;
          const d = list.pop()!;
          // remove two
          write(a, null);
          write(d, null);
          // place upgraded
          const upgraded: Slot = { defId, stars: s + 1 };
          let dest = firstEmpty();
          if (!dest) dest = a; // overwrite one if full
          write(dest, upgraded);
          merges.push({ defId, fromStars: s, toStars: s + 1 });
          merged = true;
        }
      }
    }
    if (!merged) break;
  }
  return merges;
}
