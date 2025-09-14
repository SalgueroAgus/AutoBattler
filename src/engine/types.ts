export type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export type UnitStats = {
  hp: number;
  dmg: number;
  critChance: number; // hidden
  critMultiplier: number; // hidden
};

export type PassiveTrigger = 'preBattle' | 'onAttack' | 'onReceivedDamage' | 'onKill' | 'onDeath' | 'onPurchase' | 'onSold' | 'onLevelUp';
export type PassiveEffectZone = 'board' | 'bench' | 'any' | 'persistent';
export type PassiveScopeSide = 'self' | 'allies' | 'enemies' | 'all';
export type PassiveStackingMode = 'add' | 'multiply';

export type PassiveEffect =
  | { type: 'addStat'; stat: 'hp' | 'dmg'; amount: number }
  | { type: 'mulStat'; stat: 'hp' | 'dmg'; factor: number }
  | { type: 'damage'; amount: number; target: 'allies' | 'enemies' | 'self' };

export type PassiveSpec = {
  id?: string;
  description?: string;
  trigger: PassiveTrigger;
  effectZone: PassiveEffectZone; // where it must be to apply
  scope: { side: PassiveScopeSide; filterTags?: string[]; includeSelf?: boolean };
  stacking?: { mode: PassiveStackingMode; maxStacks?: number };
  effect: PassiveEffect;
  limits?: { maxProcsPerBattle?: number };
};

export type UnitInstance = {
  id: string; defId: string; name: string; rarity: Rarity; level: number; stars: number;
  stats: UnitStats; tags: string[]; isChampion: boolean;
  passives: PassiveSpec[];
  current: { hp: number };
};

export type PlayerBoard = {
  active: Array<UnitInstance | null>; // length 3
  bench: Array<UnitInstance | null>; // length 4
  championId: string;
};

export type PlayerState = {
  userId: string;
  hp: number;
  xp: number;
  winStreak: number;
  shopLevel: number;
  rerollCountThisStage: number;
  board: PlayerBoard;
  store: StoreEntry[];
  killsThisStage: number;
  drainedHPThisStage: number;
  damageThisStage: number;
};

export type StoreEntry = { defId: string; rarity: Rarity; price: number };

export type RoundResult = {
  p1Alive: number; p2Alive: number; damageToP1: number; damageToP2: number; winner: 1 | 2 | 0; log: string[];
};
