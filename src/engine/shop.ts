import { RNG } from './rng';
import { StoreEntry } from './types';

type ShopConfig = {
  visibleOptions: number;
  levels: { start: number; max: number; levelUpOnStageEndEvery: number };
  rarities: string[];
  probabilities: Record<string, Record<string, number>>;
};

export function rollRarity(shopLevel: number, cfg: ShopConfig, rng: RNG): string {
  const table = cfg.probabilities[String(shopLevel)];
  const entries = Object.entries(table);
  const total = entries.reduce((a, [, v]) => a + v, 0);
  let r = rng.next() * total;
  for (const [rarity, weight] of entries) {
    if ((r -= weight) <= 0) return rarity;
  }
  return entries[entries.length - 1][0];
}

export function generateStore(
  shopLevel: number,
  cfg: ShopConfig,
  priceByRarity: Record<string, number>,
  poolIdsByRarity: Record<string, string[]>,
  rng: RNG,
  opts?: { championId?: string; championRarity?: string; championAllowed?: boolean }
): StoreEntry[] {
  const out: StoreEntry[] = [];
  for (let i = 0; i < cfg.visibleOptions; i++) {
    const rarity = rollRarity(shopLevel, cfg, rng);
    let defId: string | undefined;
    // Only allow the player's chosen champion, and only when rarity matches
    if (opts?.championAllowed && opts?.championId && opts?.championRarity === rarity) {
      defId = opts.championId;
    } else {
      const pool = poolIdsByRarity[rarity] || [];
      if (pool.length) defId = rng.pick(pool);
      else {
        const all = Object.values(poolIdsByRarity).flat();
        defId = all.length ? rng.pick(all) : undefined;
      }
    }
    if (!defId) continue;
    out.push({ defId, rarity: rarity as any, price: priceByRarity[rarity] || 3 });
  }
  return out;
}
