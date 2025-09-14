import Phaser from 'phaser';
import { nextStage } from '../engine/match';
import { mkEconomyFromConfig, rewardRound } from '../engine/economy';
import { UIButton } from '../ui/components/UIButton';

export class ResultsScene extends Phaser.Scene {
  constructor() { super('Results'); }
  create(data: any) {
    const ui = this.registry.get('cfg:ui');
    const game = this.registry.get('cfg:game');
    const shop = this.registry.get('cfg:shop');
    const econCfg = this.registry.get('cfg:econ');
    const result = data?.result;
    const { width, height } = this.scale;
    this.add.text(width/2, 140, 'Stage Results', { color: ui.colors.text, fontSize: '64px', fontFamily: 'Shadows Into Light, Arial' }).setOrigin(0.5);
    const panel = this.add.rectangle(width/2, height/2 - 40, 720, 200, 0x161b22).setStrokeStyle(2, 0x30363d);
    const summary = `Winner: ${result?.winner}\nDamage → P1: ${result?.damageToP1}    P2: ${result?.damageToP2}`;
    this.add.text(width/2, height/2 - 40, summary, { color: ui.colors.text, fontSize: '24px' }).setOrigin(0.5);

    const toAccount = () => this.scene.start('Account');
    const toShop = () => {
      const match = this.registry.get('match');
      // Apply economy rewards to player XP
      const econ = mkEconomyFromConfig(econCfg);
      const won = result?.winner === 1;
      const survivors = won ? (result?.p1Alive ?? 0) : 0;
      const streak = this.registry.get('playerWinStreak') ?? 0;
      const gained = rewardRound(econ, won, survivors, streak);
      const prevXP = this.registry.get('playerXP') ?? 0;
      const newXP = prevXP + gained;
      this.registry.set('playerXP', newXP);
      this.registry.set('playerWinStreak', won ? streak + 1 : 0);
      nextStage(match, shop);
      this.registry.set('match', match);
      this.time.delayedCall(0, () => this.scene.start('Shop'));
    };

    new UIButton(this, width/2 - 180, height/2 + 140, 'Account', toAccount);
    new UIButton(this, width/2 + 180, height/2 + 140, 'Next Shop', toShop);

    this.input.keyboard!.addKey('A').once('down', toAccount);
    this.input.keyboard!.addKey('S').once('down', toShop);
  }
}
