import Phaser from 'phaser';
import { RNG } from '../engine/rng';
import { MatchState, placeChampion } from '../engine/match';
import { UnitCard } from '../ui/components/UnitCard';
import { UIButton } from '../ui/components/UIButton';
import { Modal } from '../ui/components/Modal';

export class ChampionSelectScene extends Phaser.Scene {
  constructor() { super('ChampionSelect'); }
  create() {
    const ui = this.registry.get('cfg:ui');
    const champsCfg = this.registry.get('cfg:champs') as { champions: any[] };
    const rng: RNG = this.registry.get('rng');

    const champs = champsCfg.champions;
    let options = rng.shuffle(champs).slice(0, 3);
    this.registry.set('playerChampion', null);

    this.add.text(60, 40, 'Choose your Champion', { color: ui.colors.text, fontSize: '42px', fontFamily: 'Shadows Into Light, Arial' });
    const rowY = this.scale.height / 2;
    const startX = this.scale.width / 2 - 480;
    const cards: UnitCard[] = [];
    const render = () => {
      cards.forEach(c => c.destroy());
      cards.length = 0;
      options.forEach((c: any, i: number) => {
        const card = new UnitCard(this, startX + i * 480, rowY, {
          name: c.name, rarity: c.rarity, tags: c.tags || [], stars: 1, hp: c.stats.hp, dmg: c.stats.dmg, passiveDesc: c.passives?.[0]?.description
        }, 520, 620, 'normal');
        card.setInteractive({ useHandCursor: true }).on('pointerdown', () => openModal(c));
        cards.push(card);
      });
    };
    const openModal = (c: any) => {
      const m = new Modal(this, 1000, 700);
      const detail = new UnitCard(this, 0, -20, { name: c.name, rarity: c.rarity, tags: c.tags || [], stars: 1, hp: c.stats.hp, dmg: c.stats.dmg, passiveDesc: c.passives?.[0]?.description }, 560, 620, 'normal');
      m.add(detail);
      const selectBtn = new UIButton(this, 200, 230, 'Select', () => {
        this.registry.set('playerChampion', c.id);
        const enemyChoices = champs.filter((cc: any) => cc.id !== c.id);
        const enemyChampion = rng.pick(enemyChoices);
        this.registry.set('enemyChampion', enemyChampion.id);
        const match: MatchState = this.registry.get('match');
        match.stage = 1;
        match.shopLevel = 1;
        match.rerollCountThisStage = 0;
        placeChampion(match, 'player', c.id);
        placeChampion(match, 'enemy', enemyChampion.id);
        this.registry.set('match', match);
        m.close();
        this.scene.start('Battle');
      });
      const closeBtn = new UIButton(this, -200, 230, 'Close', () => m.close());
      m.add([selectBtn, closeBtn]);
    };
    render();
    new UIButton(this, this.scale.width - 200, this.scale.height - 80, 'Reroll (free)', () => { options = rng.shuffle(champs).slice(0, 3); render(); });
  }
}
