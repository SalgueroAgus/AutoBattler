import Phaser from 'phaser';
import { RNG } from '../engine/rng';
import { generateStore } from '../engine/shop';
import { tryMergeAll } from '../engine/match';
import { UnitCard } from '../ui/components/UnitCard';
import { UIButton } from '../ui/components/UIButton';
import { Modal } from '../ui/components/Modal';
import { DragManager, DropKind } from '../ui/DragManager';

export class ShopScene extends Phaser.Scene {
  private xpText!: Phaser.GameObjects.Text;
  private currentStore: any[] = [];
  private rerolls = 0;
  private xp = 0;
  private drag!: DragManager;
  private storeCards: (UnitCard | null)[] = [];
  private boardCards: { active: (UnitCard | null)[]; bench: (UnitCard | null)[] } = { active: [null,null,null], bench: [null,null,null,null] };

  constructor() { super('Shop'); }
  create() {
    const ui = this.registry.get('cfg:ui');
    const econ = this.registry.get('cfg:econ');
    const shop = this.registry.get('cfg:shop');
    const units = this.registry.get('cfg:units');
    const champsCfg = this.registry.get('cfg:champs');
    const chosenChampionId: string | null = this.registry.get('playerChampion') || null;
    const chosenChampion = chosenChampionId ? champsCfg.champions.find((u: any) => u.id === chosenChampionId) : null;
    const match = this.registry.get('match');
    const rng: RNG = this.registry.get('rng');
    this.drag = new DragManager(this);

    const poolIdsByRarity: Record<string, string[]> = {};
    for (const u of units.units) {
      poolIdsByRarity[u.rarity] = poolIdsByRarity[u.rarity] || [];
      poolIdsByRarity[u.rarity].push(u.id);
    }

    this.xp = this.registry.get('playerXP') ?? 10;
    this.rerolls = 0;
    let shopLevel = match?.shopLevel || 1;
    const roll = () => {
      this.currentStore = generateStore(shopLevel, shop, econ.prices.rarity, poolIdsByRarity, rng, {
        championId: chosenChampionId || undefined,
        championRarity: chosenChampion?.rarity,
        championAllowed: shop.champion?.appearsForLeveling
      });
      renderStore();
      refreshHUD();
    };

    const stage = match?.stage ?? 0;
    const level = match?.shopLevel ?? 1;
    this.add.text(40, 40, `Stage ${stage} — Shop L${level}`, { color: ui.colors.text, fontSize: '42px', fontFamily: 'Shadows Into Light, Arial' });
    this.xpText = this.add.text(40, 96, '', { color: ui.colors.ok, fontSize: '20px' });
    const rerollBtn = new UIButton(this, 220, 96, 'Reroll', () => {
      const cost = econ.reroll.base + this.rerolls * econ.reroll.increment;
      if (this.xp >= cost) { this.xp -= cost; this.rerolls++; roll(); }
    }, 160, 48);

    // Layout
    const cardW = 360, cardH = 220, gap = 60;
    const storeX = this.scale.width / 2 + 360;
    const storeYStart = 300;
    const storeGap = cardH + gap;
    const boardX = 480;
    const boardYBase = 300;
    const boardGapY = cardH + gap;
    // Bench grid (2x2) under the board area (left side)
    const benchY1 = this.scale.height - 320;
    const benchY2 = benchY1 + cardH + 40;
    const benchX0 = boardX - (cardW/2 + gap/2);
    const benchX1 = boardX + (cardW/2 + gap/2);
    const benchPos = [ {x:benchX0,y:benchY1}, {x:benchX1,y:benchY1}, {x:benchX0,y:benchY2}, {x:benchX1,y:benchY2} ];

    // Drop zones
    const boardFrames: Phaser.GameObjects.Rectangle[] = [];
    const benchFrames: Phaser.GameObjects.Rectangle[] = [];
    for (let i = 0; i < 3; i++) {
      boardFrames.push(this.add.rectangle(boardX, boardYBase + i*boardGapY, cardW+10, cardH+10, 0x000000, 0).setStrokeStyle(2, 0x30363d).setOrigin(0.5));
      this.drag.addDropZone(boardX, boardYBase + i*boardGapY, cardW, cardH, { kind: 'board', index: i });
    }
    for (let i = 0; i < 4; i++) {
      benchFrames.push(this.add.rectangle(benchPos[i].x, benchPos[i].y, cardW+10, cardH+10, 0x000000, 0).setStrokeStyle(2, 0x30363d).setOrigin(0.5));
      this.drag.addDropZone(benchPos[i].x, benchPos[i].y, cardW, cardH, { kind: 'bench', index: i });
    }
    const shopFrame = this.add.rectangle(storeX, storeYStart + storeGap, cardW+300, cardH*3 + gap*2, 0x000000, 0).setStrokeStyle(2, 0x30363d).setOrigin(0.5);
    const shopZone = this.drag.addDropZone(storeX, storeYStart + storeGap, cardW+280, cardH*3 + gap*2, 'shop-area');
    // Labels
    this.add.text(boardX - cardW/2, boardYBase - cardH/2 - 36, 'Board', { color: ui.colors.text, fontSize: '22px' });
    this.add.text(benchPos[0].x - cardW/2, benchY1 - cardH/2 - 36, 'Bench', { color: ui.colors.text, fontSize: '22px' });
    this.add.text(storeX - (cardW+300)/2, storeYStart - 36, 'Shop (drag to Buy / drag owned to here to Sell)', { color: ui.colors.accent, fontSize: '18px' });

    // Renderers
    const defById: Record<string, any> = Object.fromEntries([...units.units, ...champsCfg.champions].map((u: any) => [u.id, u]));
    const renderStore = () => {
      this.storeCards.forEach(c => { if (!c) return; const pair = (c as any).__pricePill as any[] | undefined; c.destroy(); if (pair) pair.forEach(p => p.destroy()); });
      this.storeCards = [];
      for (let i = 0; i < shop.visibleOptions; i++) {
        const it = this.currentStore[i];
        if (!it) { this.storeCards.push(null); continue; }
        const def = defById[it.defId];
        const card = new UnitCard(this, storeX, storeYStart + i*storeGap, { name: def.name, rarity: def.rarity, tags: def.tags || [], stars: 1, hp: def.stats.hp, dmg: def.stats.dmg, passiveDesc: def.passives?.[0]?.description }, cardW, cardH, 'compact');
        card.setInteractive({ useHandCursor: true }).on('pointerup', () => { if (!(card as any).__dragging) openModalShop(i, it); });
        this.drag.makeDraggable(card, { origin: 'shop', index: i, data: it }, (payload, target) => handleDrop(payload, target), (hover) => highlightZones(hover));
        // Price pill
        const price = econ.prices.rarity[def.rarity] || 0;
        const pill = this.add.rectangle(card.x + cardW/2 - 50, card.y - cardH/2 + 18, 90, 28, 0x0f141a).setStrokeStyle(2, 0x30363d).setOrigin(0.5);
        const pillText = this.add.text(pill.x, pill.y, `${price} XP`, { color: ui.colors.text, fontSize: '16px' }).setOrigin(0.5);
        this.storeCards.push(card);
        // Group so they clean up together
        (card as any).__pricePill = [pill, pillText];
      }
    };

    const renderBoard = () => {
      // Clear prior cards
      this.boardCards.active.forEach(c => c?.destroy());
      this.boardCards.bench.forEach(c => c?.destroy());
      this.boardCards = { active: [null,null,null], bench: [null,null,null,null] };
      const board = this.registry.get('match')?.player;
      if (!board) return;
      for (let i = 0; i < 3; i++) {
        const slot = board.active[i];
        if (!slot) continue;
        const def = defById[slot.defId];
        const card = new UnitCard(this, boardX, boardYBase + i*boardGapY, { name: def.name, rarity: def.rarity, tags: def.tags || [], stars: slot.stars, hp: def.stats.hp, dmg: def.stats.dmg, passiveDesc: def.passives?.[0]?.description }, cardW, cardH, 'compact');
        card.setInteractive({ useHandCursor: true }).on('pointerup', () => { if (!(card as any).__dragging) openModalOwned('board', i); });
        this.drag.makeDraggable(card, { origin: 'board', index: i, data: { defId: slot.defId, stars: slot.stars } }, (p,t)=>handleDrop(p,t), (hover)=>highlightZones(hover));
        this.boardCards.active[i] = card;
      }
      for (let i = 0; i < 4; i++) {
        const slot = board.bench[i];
        if (!slot) continue;
        const def = defById[slot.defId];
        const card = new UnitCard(this, benchPos[i].x, benchPos[i].y, { name: def.name, rarity: def.rarity, tags: def.tags || [], stars: slot.stars, hp: def.stats.hp, dmg: def.stats.dmg, passiveDesc: def.passives?.[0]?.description }, cardW, cardH, 'compact');
        card.setInteractive({ useHandCursor: true }).on('pointerup', () => { if (!(card as any).__dragging) openModalOwned('bench', i); });
        this.drag.makeDraggable(card, { origin: 'bench', index: i, data: { defId: slot.defId, stars: slot.stars } }, (p,t)=>handleDrop(p,t), (hover)=>highlightZones(hover));
        this.boardCards.bench[i] = card;
      }
    };

    const refreshHUD = () => {
      const cost = econ.reroll.base + this.rerolls * econ.reroll.increment;
      this.xpText.setText(`XP: ${this.xp} — Next reroll cost: ${cost}`);
      (rerollBtn as any).setAlpha?.(this.xp >= cost ? 1 : 0.6);
    };

    const handleDrop = (payload: any, target: DropKind | null): boolean => {
      const econCfg = this.registry.get('cfg:econ');
      const priceByRarity = econCfg.prices.rarity;
      const m = this.registry.get('match');
      const board = m.player;
      if (!target) return false;
      // Helper to place into a slot, with replacement allowed
      const place = (area: 'bench'|'board', index: number, newSlot: any) => {
        const cur = board[area][index];
        if (cur) {
          // swap between bench and board
          if (payload.origin === 'bench' && area === 'board') {
            const tmp = board.bench[payload.index];
            board.bench[payload.index] = cur; // send replaced to bench
            board.board = board.board; // noop
          }
          if (payload.origin === 'board' && area === 'bench') {
            const tmp = board.active[payload.index];
            board.active[payload.index] = cur; // send replaced to board
          }
        }
        if (payload.origin === 'bench') board.bench[payload.index] = null;
        if (payload.origin === 'board') board.active[payload.index] = null;
        board[area][index] = newSlot;
        this.registry.set('match', m);
        renderBoard();
        return true;
      };

      if (payload.origin === 'shop') {
        // buy if dropping into bench or board (board allowed with replacement rules)
        const it = payload.data; const def = defById[it.defId];
        if (typeof target === 'object') {
          const destArea = target.kind;
          const idx = target.index;
          // Can't buy if both bench and board full and dest occupied
          if (destArea === 'bench') {
            if (this.xp < it.price) return; // insufficient XP
            // allow replacement: just overwrite
            this.xp -= it.price;
            const ok = place('bench', idx, { defId: it.defId, stars: 1 });
            this.currentStore[payload.index] = null; renderStore(); refreshHUD();
            // merges
            const merges = tryMergeAll(m, 'player');
            if (merges.length) {
              const frac = econCfg.levelUpReward.unitLevelUpFractionOfCost;
              let gain = 0;
              for (const mg of merges) { const rarity = defById[mg.defId].rarity; gain += Math.floor((priceByRarity[rarity]||0) * frac); }
              this.xp += gain; refreshHUD();
            }
            return true;
          } else if (destArea === 'board') {
            if (this.xp < it.price) return;
            this.xp -= it.price;
            const ok = place('board', idx, { defId: it.defId, stars: 1 });
            this.currentStore[payload.index] = null; renderStore(); refreshHUD();
            const merges = tryMergeAll(m, 'player');
            if (merges.length) {
              const frac = econCfg.levelUpReward.unitLevelUpFractionOfCost;
              let gain = 0; for (const mg of merges) { const rarity = defById[mg.defId].rarity; gain += Math.floor((priceByRarity[rarity]||0) * frac); }
              this.xp += gain; refreshHUD();
            }
            return true;
          }
        }
        return false;
      }
      if (target === 'shop-area') {
        // sell
        const slot = payload.origin === 'bench' ? board.bench[payload.index] : board.active[payload.index];
        if (!slot) return false;
        const rarity = defById[slot.defId].rarity; const price = priceByRarity[rarity] || 0;
        this.xp += price; // full refund per design
        if (payload.origin === 'bench') board.bench[payload.index] = null; else board.active[payload.index] = null;
        this.registry.set('match', m);
        renderBoard(); refreshHUD();
        return true;
      }
      if (typeof target === 'object') {
        // move owned unit bench<->board with replacement allowed
        const fromArea = payload.origin; const toArea = target.kind; const idx = target.index;
        const slot = fromArea === 'bench' ? board.bench[payload.index] : board.active[payload.index];
        if (!slot) return false;
        return place(toArea, idx, slot) ?? true;
      }
      return false;
    };

    // Modals
    const openModalShop = (storeIdx: number, it: any) => {
      const def = defById[it.defId];
      const m = new Modal(this, 1000, 700);
      const card = new UnitCard(this, 0, -20, { name: def.name, rarity: def.rarity, tags: def.tags || [], stars: 1, hp: def.stats.hp, dmg: def.stats.dmg, passiveDesc: def.passives?.[0]?.description }, 560, 620);
      m.add(card);
      const canBuy = this.xp >= it.price;
      const buyBtn = new UIButton(this, 200, 260, canBuy ? `Buy (${it.price})` : 'Cannot Buy', () => {
        if (!canBuy) return;
        // attempt to place to first free bench
        const board = this.registry.get('match').player;
        const idx = board.bench.findIndex((x: any) => x === null);
        if (idx === -1) return; // no space, disable anyway
        this.xp -= it.price; board.bench[idx] = { defId: it.defId, stars: 1 }; this.registry.set('match', this.registry.get('match'));
        this.currentStore[storeIdx] = null; renderStore(); renderBoard(); refreshHUD(); m.close();
      });
      if (!canBuy) (buyBtn as any).setAlpha?.(0.6);
      const closeBtn = new UIButton(this, -200, 260, 'Close', () => m.close());
      m.add([buyBtn, closeBtn]);
    };

    const openModalOwned = (origin: 'bench'|'board', idx: number) => {
      const m = this.registry.get('match');
      const slot = origin === 'bench' ? m.player.bench[idx] : m.player.active[idx];
      if (!slot) return;
      const def = defById[slot.defId];
      const modal = new Modal(this, 1000, 700);
      const card = new UnitCard(this, 0, -20, { name: def.name, rarity: def.rarity, tags: def.tags || [], stars: slot.stars, hp: def.stats.hp, dmg: def.stats.dmg, passiveDesc: def.passives?.[0]?.description }, 560, 620);
      modal.add(card);
      const price = econ.prices.rarity[def.rarity] || 0;
      const sellBtn = new UIButton(this, 200, 260, `Sell (+${price})`, () => {
        this.xp += price; if (origin === 'bench') m.player.bench[idx] = null; else m.player.active[idx] = null; this.registry.set('match', m); renderBoard(); refreshHUD(); modal.close();
      });
      const closeBtn = new UIButton(this, -200, 260, 'Close', () => modal.close());
      modal.add([sellBtn, closeBtn]);
    };

    // Controls
    this.input.keyboard!.addKey('R').on('down', () => {
      const cost = econ.reroll.base + this.rerolls * econ.reroll.increment;
      if (this.xp >= cost) { this.xp -= cost; this.rerolls++; roll(); }
    });
    // Start Battle button
    new UIButton(this, this.scale.width - 220, this.scale.height - 80, 'Start Battle', () => { this.registry.set('playerXP', this.xp); this.scene.start('Battle'); });

    // init
    roll();
    renderBoard();

    const highlightZones = (hover: any) => {
      boardFrames.forEach((r, i) => r.setStrokeStyle(2, hover && typeof hover === 'object' && hover.kind==='board' && hover.index===i ? 0x58a6ff : 0x30363d));
      benchFrames.forEach((r, i) => r.setStrokeStyle(2, hover && typeof hover === 'object' && hover.kind==='bench' && hover.index===i ? 0x58a6ff : 0x30363d));
      shopFrame.setStrokeStyle(2, hover === 'shop-area' ? 0x58a6ff : 0x30363d);
    };
  }
}
