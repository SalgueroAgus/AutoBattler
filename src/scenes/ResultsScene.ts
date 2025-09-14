import Phaser from 'phaser';

export class ResultsScene extends Phaser.Scene {
  constructor() { super('Results'); }
  create(data: any) {
    const ui = this.registry.get('cfg:ui');
    const game = this.registry.get('cfg:game');
    const result = data?.result;
    const lines = [
      'Stage Results',
      `Winner: ${result?.winner}`,
      `Damage -> P1:${result?.damageToP1} P2:${result?.damageToP2}`
    ];
    this.add.text(20, 20, lines.join('\n'), { color: ui.colors.text, fontSize: '16px' });
    this.add.text(20, 120, 'Press A to Account XP screen or S for next Shop', { color: ui.colors.accent, fontSize: '14px' });
    this.input.keyboard!.addKey('A').once('down', () => this.scene.start('Account'));
    this.input.keyboard!.addKey('S').once('down', () => this.scene.start('Shop'));
  }
}
