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
  rarity: string;
  isChampion: boolean;
  stats: { hp: number; defPhys: number; defMag: number; atkPhys: number; atkMag: number; atkSpeed: number; crit: number; critDmg: number; manaMax: number };
  manaGain: { perAttack: number; perHitTaken: number };
  ability: { kind: string; cost: number; value: number; desc: string };
  tags: string[];
};

export type UnitsConfig = { synergies: any[]; units: UnitDef[] };

export async function loadUnitsConfig(): Promise<UnitsConfig> {
  return loadJSON(`${CONFIG_ROOT}/units.json`);
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
