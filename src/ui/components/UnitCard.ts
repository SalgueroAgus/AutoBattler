import Phaser from "phaser";
import { rarityColors, theme } from "../theme";

export type UnitCardData = {
  name: string;
  rarity: string;
  tags: string[];
  stars: number;
  hp: number;
  dmg: number;
  passiveDesc?: string;
};

export class UnitCard extends Phaser.GameObjects.Container {
  private frame: Phaser.GameObjects.Rectangle;
  private stripe: Phaser.GameObjects.Rectangle;
  private nameText: Phaser.GameObjects.Text;
  private tagsText: Phaser.GameObjects.Text;
  private starsText: Phaser.GameObjects.Text;
  private hpText: Phaser.GameObjects.Text;
  private dmgText: Phaser.GameObjects.Text;
  private hpBadge?: Phaser.GameObjects.Rectangle;
  private dmgBadge?: Phaser.GameObjects.Rectangle;
  private passiveBox: Phaser.GameObjects.Rectangle;
  private passiveText: Phaser.GameObjects.Text;
  private art?: Phaser.GameObjects.Rectangle;
  private artInitial?: Phaser.GameObjects.Text;
  private widthPx: number;
  private heightPx: number;
  private variant: 'normal' | 'compact';

  constructor(scene: Phaser.Scene, x: number, y: number, data: UnitCardData, width = 420, height = 600, variant: 'normal' | 'compact' = 'normal') {
    super(scene, x, y);
    scene.add.existing(this);
    this.variant = variant;
    // Default sizes by variant if caller passed defaults
    if (variant === 'normal' && width === 420 && height === 600) { this.widthPx = 520; this.heightPx = 620; }
    else if (variant === 'compact' && width === 420 && height === 600) { this.widthPx = 360; this.heightPx = 220; }
    else { this.widthPx = width; this.heightPx = height; }

    const w = this.widthPx, h = this.heightPx;
    const nameSize = this.variant === 'normal' ? 32 : 22;
    const tagSize = this.variant === 'normal' ? 18 : 12;
    const statSize = this.variant === 'normal' ? 24 : 24;
    const passiveSize = this.variant === 'normal' ? 18 : 14;
    const stripeH = this.variant === 'normal' ? 24 : 18;
    const artH = this.variant === 'normal' ? 260 : 0; // compact: no art
    const passiveH = this.variant === 'normal' ? 180 : 0; // compact: no passive box

    this.frame = scene.add.rectangle(0, 0, w, h, theme.panel).setStrokeStyle(3, theme.line).setOrigin(0.5);
    this.stripe = scene.add.rectangle(0, -h/2 + 12, w, stripeH, rarityColors[data.rarity] || theme.line).setOrigin(0.5, 0);
    this.nameText = scene.add.text(-w/2 + 16, -h/2 + 16 + stripeH, data.name, { color: theme.text, fontSize: `${nameSize}px`, fontFamily: "Shadows Into Light, Arial" }).setOrigin(0, 0);
    this.tagsText = scene.add.text(-w/2 + 16, -h/2 + 16 + stripeH + nameSize + 6, data.tags.join("  ·  "), { color: theme.accent, fontSize: `${tagSize}px` }).setOrigin(0, 0);
    if (artH > 0) {
      this.art = scene.add.rectangle(0, -50, w - 32, artH, 0x0b2238).setStrokeStyle(2, theme.line).setOrigin(0.5);
      const initial = (data.name?.[0] || '?').toUpperCase();
      this.artInitial = scene.add.text(0, this.art.y, initial, { color: theme.text, fontSize: '120px', fontFamily: 'Shadows Into Light, Arial' }).setOrigin(0.5);
    }
    this.starsText = scene.add.text(w/2 - 16, -h/2 + 20, data.stars > 1 ? `★${data.stars}` : "", { color: theme.warn, fontSize: this.variant === 'normal' ? "22px" : "18px" }).setOrigin(1, 0);

    const statsY = this.variant === 'normal'
      ? 120
      : (h/2 - 24); // bottom area for compact
    // Badges (backing) to make stats obvious
    const badgeW = this.variant === 'normal' ? 120 : 110;
    const badgeH = this.variant === 'normal' ? 36 : 32;
    this.hpBadge = scene.add.rectangle(-w/2 + badgeW/2 + 16, statsY, badgeW, badgeH, 0x0f2a16).setStrokeStyle(2, theme.line).setOrigin(0.5);
    this.dmgBadge = scene.add.rectangle(w/2 - badgeW/2 - 16, statsY, badgeW, badgeH, 0x2a0f12).setStrokeStyle(2, theme.line).setOrigin(0.5);
    this.hpText = scene.add.text(this.hpBadge.x, statsY, `${data.hp}`, { color: theme.ok, fontSize: `${statSize}px`, fontStyle: 'bold' }).setOrigin(0.5);
    this.dmgText = scene.add.text(this.dmgBadge.x, statsY, `${data.dmg}`, { color: theme.bad, fontSize: `${statSize}px`, fontStyle: 'bold' }).setOrigin(0.5);

    if (passiveH > 0) {
      this.passiveBox = scene.add.rectangle(0, h/2 - passiveH/2 - 20, w - 32, passiveH, 0x10161d).setStrokeStyle(2, theme.line).setOrigin(0.5);
      this.passiveText = scene.add.text(-w/2 + 24, this.passiveBox.y - passiveH/2 + 10, data.passiveDesc || "", { color: theme.text, fontSize: `${passiveSize}px`, wordWrap: { width: w - 48 } }).setOrigin(0, 0);
    } else {
      // placeholders to keep references
      this.passiveBox = scene.add.rectangle(0, 0, 1, 1, 0, 0).setVisible(false) as any;
      this.passiveText = scene.add.text(0, 0, '', {}).setVisible(false) as any;
    }

    const children: Phaser.GameObjects.GameObject[] = [this.frame, this.stripe, this.nameText, this.tagsText, this.starsText, this.hpBadge!, this.dmgBadge!, this.hpText, this.dmgText, this.passiveBox, this.passiveText];
    if (this.art) children.splice(5, 0, this.art);
    if (this.artInitial) children.splice(6, 0, this.artInitial);
    this.add(children);
    this.setSize(w, h);
  }

  setSelected(sel: boolean) { this.frame.setStrokeStyle(3, sel ? 0xffffff : theme.line); }
  setStars(n: number) { this.starsText.setText(n > 1 ? `★${n}` : ""); }
  setStats(hp: number, dmg: number) { this.hpText.setText(`${hp}`); this.dmgText.setText(`${dmg}`); }
  flashDamage(amount: number, kind: 'out' | 'mirror') {
    const color = kind === 'mirror' ? '#f85149' : '#f85149';
    const offset = this.variant === 'normal' ? this.heightPx/2 + 30 : this.heightPx/2 + 10;
    const size = this.variant === 'normal' ? '28px' : '22px';
    const txt = this.scene.add.text(this.x, this.y - offset, `-${amount}`, { color, fontSize: size }).setOrigin(0.5);
    this.scene.tweens.add({ targets: txt, y: txt.y - 40, alpha: 0, duration: 600, onComplete: () => txt.destroy() });
  }
}
