import Phaser from 'phaser';
import { RNG } from '../engine/rng';

export class ChampionSelectScene extends Phaser.Scene {
  constructor() { super('ChampionSelect'); }
  create() {
    const ui = this.registry.get('cfg:ui');
    const units = this.registry.get('cfg:units') as { units: any[] };
    const rng: RNG = this.registry.get('rng');

    const champs = units.units.filter(u => u.isChampion);
    const options = rng.shuffle(champs).slice(0, 3);
    this.registry.set('playerChampion', null);

    this.add.text(20, 20, 'Choose your Champion (click):', { color: ui.colors.text, fontSize: '18px' });
    options.forEach((c, i) => {
      const y = 80 + i * 60;
      const label = this.add.text(40, y, `${c.name} [${c.rarity}] — ${c.ability.desc}`, { color: ui.colors.accent, fontSize: '14px' })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.registry.set('playerChampion', c.id);
          this.scene.start('Shop');
        });
    });
  }
}

