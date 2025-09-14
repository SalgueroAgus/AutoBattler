import Phaser from 'phaser';
import { RNG } from '../engine/rng';
import { MatchState, placeChampion } from '../engine/match';

export class ChampionSelectScene extends Phaser.Scene {
  constructor() { super('ChampionSelect'); }
  create() {
    const ui = this.registry.get('cfg:ui');
    const champsCfg = this.registry.get('cfg:champs') as { champions: any[] };
    const rng: RNG = this.registry.get('rng');

    const champs = champsCfg.champions;
    const options = rng.shuffle(champs).slice(0, 3);
    this.registry.set('playerChampion', null);

    this.add.text(20, 20, 'Choose your Champion (click):', { color: ui.colors.text, fontSize: '18px' });
    options.forEach((c, i) => {
      const y = 80 + i * 60;
      const firstPassive = c.passives?.[0]?.description || '';
      const label = this.add.text(40, y, `${c.name} [${c.rarity}] — ${firstPassive}`, { color: ui.colors.accent, fontSize: '14px' })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.registry.set('playerChampion', c.id);
          // Enemy champion is a different random one
          const enemyChoices = champs.filter((cc: any) => cc.id !== c.id);
          const enemyChampion = rng.pick(enemyChoices);
          this.registry.set('enemyChampion', enemyChampion.id);

          const match: MatchState = this.registry.get('match');
          match.stage = 1; // Stage 1 is champion vs champion only
          match.shopLevel = 1;
          match.rerollCountThisStage = 0;
          placeChampion(match, 'player', c.id);
          placeChampion(match, 'enemy', enemyChampion.id);
          this.registry.set('match', match);

          // Go straight to Battle (no shop in stage 1)
          this.scene.start('Battle');
        });
    });
  }
}
