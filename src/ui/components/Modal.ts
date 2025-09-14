import Phaser from "phaser";
import { theme } from "../theme";

export class Modal extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private panel: Phaser.GameObjects.Rectangle;
  constructor(scene: Phaser.Scene, width = 900, height = 620) {
    super(scene, scene.scale.width / 2, scene.scale.height / 2);
    scene.add.existing(this);
    this.setDepth(1000);
    this.bg = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x000000, 0.5).setInteractive();
    this.panel = scene.add.rectangle(0, 0, width, height, theme.panel).setStrokeStyle(2, theme.line).setOrigin(0.5);
    this.add([this.bg, this.panel]);
    this.alpha = 0;
    scene.tweens.add({ targets: this, alpha: 1, duration: 150 });
  }
  close() {
    this.scene.tweens.add({ targets: this, alpha: 0, duration: 120, onComplete: () => this.destroy() });
  }
}

