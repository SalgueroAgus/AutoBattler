import Phaser from "phaser";

export type DropKind = 'shop-area' | { kind: 'bench'; index: number } | { kind: 'board'; index: number };

export type DragPayload = {
  origin: 'shop' | 'bench' | 'board';
  index: number; // index in origin row if applicable
  data: any; // defId, price, etc.
};

export class DragManager {
  private scene: Phaser.Scene;
  private drops: { zone: Phaser.GameObjects.Zone; kind: DropKind }[] = [];
  constructor(scene: Phaser.Scene) { this.scene = scene; }

  addDropZone(x: number, y: number, w: number, h: number, kind: DropKind) {
    const z = this.scene.add.zone(x, y, w, h).setRectangleDropZone(w, h).setOrigin(0.5);
    this.drops.push({ zone: z, kind });
    return z;
  }

  makeDraggable(
    container: Phaser.GameObjects.Container | Phaser.GameObjects.Sprite,
    payload: DragPayload,
    onDrop: (payload: DragPayload, target: DropKind | null) => boolean,
    onHover?: (target: DropKind | null) => void
  ) {
    container.setInteractive({ draggable: true, useHandCursor: true });
    const startPos = new Phaser.Math.Vector2(container.x, container.y);
    this.scene.input.setDraggable(container);
    (container as any).__dragging = false;
    container.on('dragstart', () => { startPos.set(container.x, container.y); container.setDepth(2000); (container as any).__dragging = true; });
    container.on('drag', (_p: any, x: number, y: number) => {
      container.x = x; container.y = y;
      const ptr = this.scene.input.activePointer;
      const hit = this.drops.find(d => Phaser.Geom.Rectangle.Contains(d.zone.getBounds(), ptr.worldX, ptr.worldY));
      if (onHover) onHover(hit ? hit.kind : null);
    });
    container.on('dragend', (_p: any) => {
      const ptr = this.scene.input.activePointer;
      const hit = this.drops.find(d => Phaser.Geom.Rectangle.Contains(d.zone.getBounds(), ptr.worldX, ptr.worldY));
      const accepted = onDrop(payload, hit ? hit.kind : null);
      (container as any).__dragging = false;
      if (!accepted) {
        this.scene.tweens.add({ targets: container, x: startPos.x, y: startPos.y, duration: 150, onComplete: () => container.setDepth(0) });
      } else {
        // Drop accepted: hand control to caller (scene will re-render / destroy). Reset depth only.
        container.setDepth(0);
      }
    });
  }
}
