import Phaser from 'phaser';
import { loadAccountConfig, loadEconomyConfig, loadGameConfig, loadShopConfig, loadUIConfig, loadUnitsConfig } from '../systems/configLoader';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {}
  async create() {
    // Load all configs upfront
    const [ui, game, econ, shop, units, account] = await Promise.all([
      loadUIConfig(), loadGameConfig(), loadEconomyConfig(), loadShopConfig(), loadUnitsConfig(), loadAccountConfig()
    ]);

    this.registry.set('cfg:ui', ui);
    this.registry.set('cfg:game', game);
    this.registry.set('cfg:econ', econ);
    this.registry.set('cfg:shop', shop);
    this.registry.set('cfg:units', units);
    this.registry.set('cfg:account', account);

    this.scene.start('Lobby');
  }
}

