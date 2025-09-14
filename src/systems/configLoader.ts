export async function loadJSON<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  return res.json();
}

export const CONFIG_ROOT = '/CONFIG';

export type UIConfig = {
  canvas: { width: number; height: number; backgroundColor: string };
  grid: { cols: number; rows: number; cell: { w: number; h: number }; padding: number };
  colors: Record<string, string>;
  battle?: { actionMs: number; highlightMs: number; floatMs: number };
};

export async function loadUIConfig(): Promise<UIConfig> {
  return loadJSON(`${CONFIG_ROOT}/ui.json`);
}

export type GameConfig = {
  deterministic: boolean;
  stages: number;
  roundsPerStage: number;
  initialPlayerHP: number;
  playerLossBaseDamage: number;
  rng: { defaultSeed: number; allowExternalSeed: boolean };
  turnOrder: string;
  battle: { critMultiplier: number; minDamage: number; endRoundWhenNoActives: boolean };
  merge: { starMultipliers: Record<string, number> };
};

export async function loadGameConfig(): Promise<GameConfig> {
  return loadJSON(`${CONFIG_ROOT}/game.json`);
}

export type EconomyConfig = {
  reroll: { base: number; increment: number };
  roundRewards: { win: number; loss: number; survivorBonusPerUnit: number; winStreakBonus: number[] };
  prices: { rarity: Record<string, number> };
  levelUpReward: { unitLevelUpFractionOfCost: number };
  stageTopDamageReward: { formula: string };
};

export async function loadEconomyConfig(): Promise<EconomyConfig> {
  return loadJSON(`${CONFIG_ROOT}/economy.json`);
}

export type ShopConfig = {
  visibleOptions: number;
  levels: { start: number; max: number; levelUpOnStageEndEvery: number };
  rarities: string[];
  probabilities: Record<string, Record<string, number>>;
  champion: { appearsForLeveling: boolean; usesSameRarityTable: boolean };
};

export async function loadShopConfig(): Promise<ShopConfig> {
  return loadJSON(`${CONFIG_ROOT}/shop.json`);
}

export type UnitDef = {
  id: string;
  name: string;
  description?: string;
  rarity: string;
  isChampion: boolean;
  stats: { hp: number; dmg: number; critChance: number; critMultiplier: number };
  tags: string[];
  passives: Array<{
    id?: string;
    description?: string;
    trigger: string;
    effectZone: 'board' | 'bench' | 'any' | 'persistent';
    scope: { side: 'self' | 'allies' | 'enemies' | 'all'; filterTags?: string[]; includeSelf?: boolean };
    stacking?: { mode: 'add' | 'multiply'; maxStacks?: number };
    effect: { type: 'addStat' | 'mulStat' | 'damage'; stat?: 'hp' | 'dmg'; amount?: number; factor?: number; target?: 'allies' | 'enemies' | 'self' };
    limits?: { maxProcsPerBattle?: number };
  }>;
};

export type UnitsConfig = { units: UnitDef[] };

export async function loadUnitsConfig(): Promise<UnitsConfig> {
  return loadJSON(`${CONFIG_ROOT}/units.json`);
}

export type ChampionDef = Omit<UnitDef, 'isChampion'> & { isChampion: true };
export type ChampionsConfig = { champions: ChampionDef[] };

export async function loadChampionsConfig(): Promise<ChampionsConfig> {
  return loadJSON(`${CONFIG_ROOT}/champions.json`);
}

export type AccountConfig = {
  initial: { level: number; xp: number };
  unlockEveryLevels: number;
  minecraftCurve: boolean;
  levelXPFormula: string;
  placementRewards: Record<string, number>;
};

export async function loadAccountConfig(): Promise<AccountConfig> {
  return loadJSON(`${CONFIG_ROOT}/account.json`);
}
