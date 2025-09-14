import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { LobbyScene } from './scenes/LobbyScene';
import { ChampionSelectScene } from './scenes/ChampionSelectScene';
import { ShopScene } from './scenes/ShopScene';
import { BattleScene } from './scenes/BattleScene';
import { ResultsScene } from './scenes/ResultsScene';
import { AccountScene } from './scenes/AccountScene';
import { loadUIConfig } from './systems/configLoader';

async function start() {
  const ui = await loadUIConfig();

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'app',
    width: ui.canvas.width,
    height: ui.canvas.height,
    backgroundColor: ui.canvas.backgroundColor,
    scene: [
      BootScene,
      LobbyScene,
      ChampionSelectScene,
      ShopScene,
      BattleScene,
      ResultsScene,
      AccountScene
    ]
  };

  new Phaser.Game(config);
}

start();

