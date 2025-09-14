export type Economy = {
  winXP: number;
  lossXP: number;
  survivorBonusPerUnit: number;
  winStreakBonus: number[];
  priceByRarity: Record<string, number>;
  unitLevelUpFraction: number;
};

export function rewardRound(e: Economy, won: boolean, survivors: number, streak: number): number {
  let xp = won ? e.winXP : e.lossXP;
  if (won) xp += survivors * e.survivorBonusPerUnit;
  xp += e.winStreakBonus[Math.min(streak, e.winStreakBonus.length - 1)] || 0;
  return xp;
}

export function rewardUnitLevelUp(price: number, fraction: number): number {
  return Math.floor(price * fraction);
}

export function mkEconomyFromConfig(cfg: any): Economy {
  return {
    winXP: cfg.roundRewards.win,
    lossXP: cfg.roundRewards.loss,
    survivorBonusPerUnit: cfg.roundRewards.survivorBonusPerUnit,
    winStreakBonus: cfg.roundRewards.winStreakBonus,
    priceByRarity: cfg.prices.rarity,
    unitLevelUpFraction: cfg.levelUpReward.unitLevelUpFractionOfCost
  };
}
