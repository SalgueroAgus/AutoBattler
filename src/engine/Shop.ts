import fs from 'fs';
import path from 'path';
import { ParamsConfig, ProbabilitiesConfig, Rarity, Unit, PlayerState } from '../models/Types';
import { RNG } from './RNG';

interface ContentData {
  campeones: any[];
  unidades: any[];
}

export class ShopService {
  private params: ParamsConfig;
  private probs: ProbabilitiesConfig;
  private content: ContentData;

  constructor(params: ParamsConfig, probs: ProbabilitiesConfig, content: ContentData) {
    this.params = params;
    this.probs = probs;
    this.content = content;
  }

  static loadConfigs(): { params: ParamsConfig; probs: ProbabilitiesConfig; content: ContentData } {
    const params = JSON.parse(fs.readFileSync(path.resolve('src/config/params.json'), 'utf-8')) as ParamsConfig;
    const probs = JSON.parse(fs.readFileSync(path.resolve('src/config/probabilities.json'), 'utf-8')) as ProbabilitiesConfig;
    const content = JSON.parse(fs.readFileSync(path.resolve('src/config/content.json'), 'utf-8')) as ContentData;
    return { params, probs, content };
  }

  rollThreeEntriesFor(player: PlayerState, rng: RNG, accountPools: { pj: string[] }): string[] {
    const rarity = this.pickRarity(player.nivel_tienda, player.campeon, rng);
    const pool = this.content.unidades.filter(u => accountPools.pj.includes(u.unit_id));
    const byRarity = pool.filter(u => (u.rareza as Rarity) === rarity);
    const picks: string[] = [];
    for (let i = 0; i < 3; i++) {
      const unit = rng.pick(byRarity.length ? byRarity : pool);
      picks.push(unit.unit_id);
    }
    return picks;
  }

  private pickRarity(nivelTienda: number, champion: Unit, rng: RNG): Rarity {
    const table = this.probs[String(Math.max(1, Math.min(5, nivelTienda)))] as Record<Rarity, number>;
    const bias = champion.unit_id === 'champ_arcanist' ? 0.1 : 0; // +10% chance to shift upward
    const weights: { item: Rarity; weight: number }[] = [
      { item: 'C', weight: Math.max(0, (table['C'] || 0) - bias) },
      { item: 'R', weight: (table['R'] || 0) + bias * 0.6 },
      { item: 'SR', weight: (table['SR'] || 0) + bias * 0.3 },
      { item: 'E', weight: (table['E'] || 0) + bias * 0.09 },
      { item: 'L', weight: (table['L'] || 0) + bias * 0.01 }
    ];
    return rng.pickWeighted(weights);
  }

  rerollCostFor(player: PlayerState): number {
    const base = this.params.economia.reroll.base;
    const inc = this.params.economia.reroll.incremento_por_cadena;
    return base + inc * Math.max(0, player.costo_reroll_actual - base);
  }

  applyReroll(player: PlayerState, rng: RNG, accountPools: { pj: string[] }): void {
    const cost = player.costo_reroll_actual;
    if (player.xp_match < cost) return; // cannot afford
    player.xp_match -= cost;
    player.costo_reroll_actual += this.params.economia.reroll.incremento_por_cadena;
    player.store_entries = this.rollThreeEntriesFor(player, rng, accountPools);
  }

  resetRerollChain(player: PlayerState): void {
    player.costo_reroll_actual = this.params.economia.reroll.base;
  }

  tryBuyUnit(player: PlayerState, unitId: string): boolean {
    const unit = this.content.unidades.find(u => u.unit_id === unitId);
    if (!unit) return false;
    const rarity = unit.rareza as Rarity;
    const cost = this.params.economia.costo_compra_por_rareza[rarity];
    if (player.xp_match < cost) return false;
    // capacity: team total up to 6, bench 4
    if (player.equipo_total.length >= 6 || player.bench.length >= 4) return false;
    player.xp_match -= cost;
    const copy: Unit = JSON.parse(JSON.stringify(unit));
    player.bench.push(copy);
    player.equipo_total.push(copy);
    this.tryMerge(player, unitId);
    return true;
  }

  sellUnit(player: PlayerState, unitIndexInBench: number): boolean {
    if (unitIndexInBench < 0 || unitIndexInBench >= player.bench.length) return false;
    const unit = player.bench.splice(unitIndexInBench, 1)[0];
    const idxTeam = player.equipo_total.findIndex(u => u === unit);
    if (idxTeam >= 0) player.equipo_total.splice(idxTeam, 1);
    const rarity = (unit.rareza || 'C') as Rarity;
    const refund = this.params.economia.costo_compra_por_rareza[rarity]; // 100% refund
    player.xp_match += refund;
    return true;
  }

  private tryMerge(player: PlayerState, unitId: string) {
    // Merge rules: 1+1 = lvl2; 2+2 = lvl3 (4 copies base)
    const same = player.equipo_total.filter(u => u.unit_id === unitId);
    if (same.length >= 2) {
      // upgrade first
      same[0].nivel = 2; same[0].estrella = 2;
      // remove one copy
      const rem = same[1];
      const idx = player.equipo_total.indexOf(rem);
      if (idx >= 0) player.equipo_total.splice(idx, 1);
      const bidx = player.bench.indexOf(rem as any);
      if (bidx >= 0) player.bench.splice(bidx, 1);
    }
    const same2 = player.equipo_total.filter(u => u.unit_id === unitId && u.nivel >= 2);
    if (same2.length >= 2) {
      same2[0].nivel = 3; same2[0].estrella = 3;
      const rem = same2[1];
      const idx = player.equipo_total.indexOf(rem);
      if (idx >= 0) player.equipo_total.splice(idx, 1);
      const bidx = player.bench.indexOf(rem as any);
      if (bidx >= 0) player.bench.splice(bidx, 1);
    }
  }
}

