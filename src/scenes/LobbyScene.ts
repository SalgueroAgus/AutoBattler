import Phaser from 'phaser';
import { RNG } from '../engine/rng';
import { UIButton } from '../ui/components/UIButton';
import { initMatchState } from '../engine/match';

export class LobbyScene extends Phaser.Scene {
  constructor() { super('Lobby'); }
  create() {
    const ui = this.registry.get('cfg:ui');
    const game = this.registry.get('cfg:game');

    const seed = game.rng.allowExternalSeed && (window as any).AUTO_SEED ? (window as any).AUTO_SEED : game.rng.defaultSeed;
    const rng = new RNG(seed);
    this.registry.set('rng', rng);

    // Create 8 players: 1 human + 7 AIs
    const players = Array.from({ length: 8 }, (_, i) => ({ id: `P${i+1}`, human: i === 0 }));
    this.registry.set('players', players);

    // Init match state
    const match = initMatchState();
    this.registry.set('match', match);

    const { width, height } = this.scale;
    this.add.text(width/2, height/2 - 200, 'Lobby — 8 Players', { color: ui.colors.text, fontSize: '64px', fontFamily: 'Shadows Into Light, Arial' }).setOrigin(0.5);
    this.add.text(width/2, height/2 - 140, 'Seeded match; local human + 7 AI', { color: ui.colors.accent, fontSize: '20px' }).setOrigin(0.5);
    new UIButton(this, width/2, height/2, 'Enter Champion Select', () => this.scene.start('ChampionSelect'));
    new UIButton(this, width/2, height/2 + 100, 'Back to Main Menu', () => this.scene.start('MainMenu'));
  }
}
