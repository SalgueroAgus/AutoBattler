import Phaser from "phaser";
import { theme } from "../theme";

export class UIButton extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  constructor(scene: Phaser.Scene, x: number, y: number, text: string, onClick: () => void, width = 260, height = 64) {
    super(scene, x, y);
    scene.add.existing(this);
    this.bg = scene.add.rectangle(0, 0, width, height, theme.panel).setStrokeStyle(2, theme.line).setOrigin(0.5);
    this.bg.setInteractive({ useHandCursor: true })
      .on("pointerover", () => this.bg.setFillStyle(0x1f2630))
      .on("pointerout", () => this.bg.setFillStyle(theme.panel))
      .on("pointerdown", () => this.bg.setFillStyle(0x0f141a))
      .on("pointerup", () => { this.bg.setFillStyle(0x1f2630); onClick(); });
    this.label = scene.add.text(0, 0, text, { color: theme.text, fontSize: "24px", fontFamily: "Shadows Into Light, Arial" }).setOrigin(0.5);
    this.add([this.bg, this.label]);
  }
  setText(t: string) { this.label.setText(t); }
}

