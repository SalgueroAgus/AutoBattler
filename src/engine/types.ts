export type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export type UnitStats = {
  hp: number; defPhys: number; defMag: number; atkPhys: number; atkMag: number; atkSpeed: number; crit: number; critDmg: number; manaMax: number;
};

export type Ability = { kind: string; cost: number; value: number; desc: string };

export type UnitInstance = {
  id: string; defId: string; name: string; rarity: Rarity; level: number; stars: number;
  stats: UnitStats; ability: Ability; tags: string[]; isChampion: boolean;
  manaGain: { perAttack: number; perHitTaken: number };
  current: { hp: number; mana: number };
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
