import Phaser from 'phaser';
import { RNG } from '../engine/rng';
import { generateStore } from '../engine/shop';
import { tryMergeAll } from '../engine/match';

export class ShopScene extends Phaser.Scene {
  private storeTexts: Phaser.GameObjects.Text[] = [];
  private xpText!: Phaser.GameObjects.Text;
  private currentStore: any[] = [];
  private rerolls = 0;
  private xp = 0;
  private alive = false;
  private boardTexts: { active: Phaser.GameObjects.Text[]; bench: Phaser.GameObjects.Text[] } = { active: [], bench: [] };

  constructor() { super('Shop'); }
  create() {
    this.alive = true;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.alive = false; });
    this.events.once(Phaser.Scenes.Events.DESTROY, () => { this.alive = false; });
    // Reset any stale references from previous visits
    this.storeTexts = [];
    this.boardTexts = { active: [], bench: [] };
    this.currentStore = [];
    const ui = this.registry.get('cfg:ui');
    const econ = this.registry.get('cfg:econ');
    const shop = this.registry.get('cfg:shop');
    const units = this.registry.get('cfg:units');
    const champsCfg = this.registry.get('cfg:champs');
    const chosenChampionId: string | null = this.registry.get('playerChampion') || null;
    const chosenChampion = chosenChampionId ? champsCfg.champions.find((u: any) => u.id === chosenChampionId) : null;
    const match = this.registry.get('match');
    const rng: RNG = this.registry.get('rng');

    const poolIdsByRarity: Record<string, string[]> = {};
    for (const u of units.units) {
      if (u.isChampion) continue; // exclude all champions from the general pool
      poolIdsByRarity[u.rarity] = poolIdsByRarity[u.rarity] || [];
      poolIdsByRarity[u.rarity].push(u.id);
    }

    this.xp = this.registry.get('playerXP') ?? 10; // carry across stages
    this.rerolls = 0; // reset per stage
    let shopLevel = match?.shopLevel || 1;
    const roll = () => {
      this.currentStore = generateStore(
        shopLevel,
        shop,
        econ.prices.rarity,
        poolIdsByRarity,
        rng,
        {
          championId: chosenChampionId || undefined,
          championRarity: chosenChampion?.rarity,
          championAllowed: shop.champion?.appearsForLeveling
        }
      );
      this.refreshUI();
    };

    const stage = match?.stage ?? 0;
    const level = match?.shopLevel ?? 1;
    this.add.text(20, 20, `Stage ${stage} — Shop L${level} — Click to buy, R reroll, B battle`, { color: ui.colors.text, fontSize: '16px' });
    this.xpText = this.add.text(20, 50, '', { color: ui.colors.ok, fontSize: '14px' });
    // Board UI
    this.add.text(20, 80, 'Board (click to move):', { color: ui.colors.text, fontSize: '14px' });
    for (let i = 0; i < 3; i++) {
      const t = this.add.text(40, 100 + i * 20, '', { color: ui.colors.accent, fontSize: '13px' })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.moveActiveToBench(i));
      this.boardTexts.active.push(t);
    }
    this.add.text(20, 170, 'Bench:', { color: ui.colors.text, fontSize: '14px' });
    for (let i = 0; i < 4; i++) {
      const t = this.add.text(40, 190 + i * 20, '', { color: ui.colors.accent, fontSize: '13px' })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.moveBenchToActive(i));
      this.boardTexts.bench.push(t);
    }
    for (let i = 0; i < shop.visibleOptions; i++) {
      const t = this.add.text(400, 90 + i * 40, '', { color: ui.colors.accent, fontSize: '14px' })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          const it = this.currentStore[i];
          const match = this.registry.get('match');
          const board = match?.player;
          if (!board) return;
          const benchIdx = board.bench.findIndex((x: any) => x === null);
          if (it && this.xp >= it.price && benchIdx !== -1) {
            this.xp -= it.price;
            // Add to bench (stars=1) and try merge
            board.bench[benchIdx] = { defId: it.defId, stars: 1 };
            match.player = board;
            this.registry.set('match', match);
            // Defer merges: run once per purchase
            this.time.delayedCall(0, () => {
              const m = this.registry.get('match');
              const econ = this.registry.get('cfg:econ');
              const units = this.registry.get('cfg:units');
              const priceByRarity = econ.prices.rarity;
              const defById: Record<string, any> = Object.fromEntries(units.units.map((u: any) => [u.id, u]));
              const merges = tryMergeAll(m, 'player');
              if (merges.length) {
                const frac = econ.levelUpReward.unitLevelUpFractionOfCost;
                let gain = 0;
                for (const mg of merges) {
                  const rarity = defById[mg.defId].rarity;
                  const price = priceByRarity[rarity] || 0;
                  gain += Math.floor(price * frac);
                }
                const prev = this.registry.get('playerXP') ?? 0;
                this.registry.set('playerXP', prev + gain);
                this.add.text(680, 60, `Merge reward +${gain} XP`, { color: ui.colors.ok, fontSize: '12px' });
              }
              this.registry.set('match', m);
              this.refreshBoardUI();
            });
            this.add.text(680, 90 + i * 20, `Bought ${it.defId} for ${it.price}`, { color: ui.colors.ok, fontSize: '12px' });
            this.currentStore[i] = null;
            this.refreshUI();
          }
        });
      this.storeTexts.push(t);
    }

    this.input.keyboard!.addKey('R').on('down', () => {
      const cost = econ.reroll.base + this.rerolls * econ.reroll.increment;
      if (this.xp >= cost) {
        this.xp -= cost;
        this.rerolls++;
        const match = this.registry.get('match');
        if (match) { match.rerollCountThisStage = this.rerolls; this.registry.set('match', match); }
        roll();
      }
    });
    this.input.keyboard!.addKey('B').once('down', () => {
      this.registry.set('playerXP', this.xp);
      this.scene.start('Battle');
    });

    roll();
    this.refreshBoardUI();
  }

  private refreshUI() {
    if (!this.alive) return;
    const econ = this.registry.get('cfg:econ');
    if (this.xpText && this.xpText.active) {
      this.xpText.setText(`XP: ${this.xp} — Next reroll cost: ${econ.reroll.base + this.rerolls * econ.reroll.increment}`);
    }
    this.currentStore.forEach((it, i) => {
      const textObj = this.storeTexts[i];
      if (!textObj || !textObj.active) return;
      textObj.setText(it ? `${i+1}) ${it.defId} [${it.rarity}] — ${it.price} XP` : `${i+1}) —`);
    });
    this.refreshBoardUI();
  }

  private refreshBoardUI() {
    if (!this.alive) return;
    const match = this.registry.get('match');
    const board = match?.player;
    if (!board) return;
    for (let i = 0; i < 3; i++) {
      const t = this.boardTexts.active[i];
      const slot = board.active[i];
      const text = slot ? `${slot.defId}${slot.stars>1 ? ` ★${slot.stars}`:''}` : '—';
      if (t && t.active) t.setText(`Active ${i+1}: ${text}`);
    }
    for (let i = 0; i < 4; i++) {
      const t = this.boardTexts.bench[i];
      const slot = board.bench[i];
      const text = slot ? `${slot.defId}${slot.stars>1 ? ` ★${slot.stars}`:''}` : '—';
      if (t && t.active) t.setText(`Bench ${i+1}: ${text}`);
    }
  }

  private moveActiveToBench(activeIdx: number) {
    const match = this.registry.get('match');
    const board = match?.player;
    if (!board) return;
    const slot = board.active[activeIdx];
    if (!slot) return;
    const benchIdx = board.bench.findIndex((x: any) => x === null);
    if (benchIdx === -1) return; // bench full
    board.bench[benchIdx] = slot;
    board.active[activeIdx] = null;
    this.registry.set('match', match);
    this.refreshBoardUI();
  }

  private moveBenchToActive(benchIdx: number) {
    const match = this.registry.get('match');
    const board = match?.player;
    if (!board) return;
    const slot = board.bench[benchIdx];
    if (!slot) return;
    const actIdx = board.active.findIndex((x: any) => x === null);
    if (actIdx === -1) return; // no free active slot
    board.active[actIdx] = slot;
    board.bench[benchIdx] = null;
    this.registry.set('match', match);
    this.refreshBoardUI();
  }
}
