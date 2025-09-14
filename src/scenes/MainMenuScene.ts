import Phaser from "phaser";
import { UIButton } from "../ui/components/UIButton";

export class MainMenuScene extends Phaser.Scene {
  constructor() { super('MainMenu'); }
  create() {
    const { width, height } = this.scale;
    const title = this.add.text(width/2, height/2 - 200, 'AutoBattler', { color: '#e6edf3', fontSize: '64px', fontFamily: 'Shadows Into Light, Arial' }).setOrigin(0.5);
    new UIButton(this, width/2, height/2, 'New Game', () => this.scene.start('Lobby'));
    new UIButton(this, width/2, height/2 + 100, 'Reload Page', () => window.location.reload());
  }
}

