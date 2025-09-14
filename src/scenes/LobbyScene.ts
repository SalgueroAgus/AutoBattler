import Phaser from 'phaser';
import { RNG } from '../engine/rng';

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

    const txt = this.add.text(20, 20, 'Lobby (8 players)\nClick to continue', { color: ui.colors.text, fontSize: '16px' });
    this.input.once('pointerdown', () => this.scene.start('ChampionSelect'));
  }
}

