import Phaser from 'phaser';
import { nextStage } from '../engine/match';
import { mkEconomyFromConfig, rewardRound } from '../engine/economy';

export class ResultsScene extends Phaser.Scene {
  constructor() { super('Results'); }
  create(data: any) {
    const ui = this.registry.get('cfg:ui');
    const game = this.registry.get('cfg:game');
    const shop = this.registry.get('cfg:shop');
    const econCfg = this.registry.get('cfg:econ');
    const result = data?.result;
    const lines = [
      'Stage Results',
      `Winner: ${result?.winner}`,
      `Damage -> P1:${result?.damageToP1} P2:${result?.damageToP2}`
    ];
    this.add.text(20, 20, lines.join('\n'), { color: ui.colors.text, fontSize: '16px' });
    this.add.text(20, 120, 'Press A to Account XP screen or S for next Shop', { color: ui.colors.accent, fontSize: '14px' });
    this.input.keyboard!.addKey('A').once('down', () => this.scene.start('Account'));
    this.input.keyboard!.addKey('S').once('down', () => {
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
      // Delay one tick to avoid re-entrancy issues during input callback
      this.time.delayedCall(0, () => this.scene.start('Shop'));
    });
  }
}
