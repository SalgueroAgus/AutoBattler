import Phaser from 'phaser';
import { RNG } from '../engine/rng';
import { generateStore } from '../engine/shop';

export class ShopScene extends Phaser.Scene {
  private storeTexts: Phaser.GameObjects.Text[] = [];
  private xpText!: Phaser.GameObjects.Text;
  private currentStore: any[] = [];
  private rerolls = 0;
  private xp = 0;
  private alive = false;

  constructor() { super('Shop'); }
  create() {
    this.alive = true;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.alive = false; });
    this.events.once(Phaser.Scenes.Events.DESTROY, () => { this.alive = false; });
    const ui = this.registry.get('cfg:ui');
    const econ = this.registry.get('cfg:econ');
    const shop = this.registry.get('cfg:shop');
    const units = this.registry.get('cfg:units');
    const rng: RNG = this.registry.get('rng');

    const poolIdsByRarity: Record<string, string[]> = {};
    for (const u of units.units) {
      poolIdsByRarity[u.rarity] = poolIdsByRarity[u.rarity] || [];
      poolIdsByRarity[u.rarity].push(u.id);
    }

    this.xp = 10; // starting match XP for MVP
    let shopLevel = 1;
    const roll = () => {
      this.currentStore = generateStore(shopLevel, shop, econ.prices.rarity, poolIdsByRarity, rng);
      this.refreshUI();
    };

    this.add.text(20, 20, 'Stage Shop — Click item to buy, R to reroll, B to battle', { color: ui.colors.text, fontSize: '16px' });
    this.xpText = this.add.text(20, 50, '', { color: ui.colors.ok, fontSize: '14px' });
    for (let i = 0; i < shop.visibleOptions; i++) {
      const t = this.add.text(40, 90 + i * 40, '', { color: ui.colors.accent, fontSize: '14px' })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          const it = this.currentStore[i];
          if (it && this.xp >= it.price) {
            this.xp -= it.price;
            // TODO: add to bench and handle merges
            this.add.text(400, 90 + i * 20, `Bought ${it.defId} for ${it.price}`, { color: ui.colors.ok, fontSize: '12px' });
            const bench: string[] = this.registry.get('playerBenchDefs') || [];
            bench.push(it.defId);
            this.registry.set('playerBenchDefs', bench);
            this.currentStore[i] = null;
            this.refreshUI();
          }
        });
      this.storeTexts.push(t);
    }

    this.input.keyboard!.addKey('R').on('down', () => {
      const cost = econ.reroll.base + this.rerolls * econ.reroll.increment;
      if (this.xp >= cost) { this.xp -= cost; this.rerolls++; roll(); }
    });
    this.input.keyboard!.addKey('B').once('down', () => {
      this.registry.set('playerXP', this.xp);
      this.scene.start('Battle');
    });

    roll();
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
  }
}
