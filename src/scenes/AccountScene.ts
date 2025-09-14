import Phaser from 'phaser';

function loadAccount(): { level: number; xp: number } {
  const raw = localStorage.getItem('account');
  return raw ? JSON.parse(raw) : { level: 1, xp: 0 };
}

function saveAccount(acc: { level: number; xp: number }) {
  localStorage.setItem('account', JSON.stringify(acc));
}

export class AccountScene extends Phaser.Scene {
  constructor() { super('Account'); }
  create() {
    const ui = this.registry.get('cfg:ui');
    const accountCfg = this.registry.get('cfg:account');
    const acc = loadAccount();

    // MVP: add small XP to show persistence
    acc.xp += 10;
    if (acc.xp >= 100) { acc.level += 1; acc.xp -= 100; }
    saveAccount(acc);

    const txt = [
      'Account Progression',
      `Level: ${acc.level}`,
      `XP: ${acc.xp}`,
      `Unlock every ${accountCfg.unlockEveryLevels} levels`
    ].join('\n');
    this.add.text(20, 20, txt, { color: ui.colors.text, fontSize: '16px' });
    this.add.text(20, 140, 'Press L to return to Lobby', { color: ui.colors.accent, fontSize: '14px' });
    this.input.keyboard!.addKey('L').on('down', () => this.scene.start('Lobby'));
  }
}

