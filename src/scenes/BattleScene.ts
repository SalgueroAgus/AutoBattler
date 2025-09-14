import Phaser from 'phaser';
import { simulateRoundWithEvents, CombatEvent } from '../engine/combat';
import { RNG } from '../engine/rng';
import { PlayerState, UnitInstance } from '../engine/types';
import { MatchState } from '../engine/match';
import { GameConfig } from '../systems/configLoader';
import { UnitCard } from '../ui/components/UnitCard';

export class BattleScene extends Phaser.Scene {
  constructor() { super('Battle'); }
  create() {
    const ui = this.registry.get('cfg:ui');
    const game: GameConfig = this.registry.get('cfg:game');
    const timings = ui.battle || { actionMs: 550, highlightMs: 200, floatMs: 700 };
    const rng: RNG = this.registry.get('rng');
    const players = this.registry.get('players') as Array<{id:string,human:boolean}>;
    const unitsCfg = this.registry.get('cfg:units') as { units: any[] };
    const champsCfg = this.registry.get('cfg:champs') as { champions: any[] };
    const defById: Record<string, any> = Object.fromEntries([...unitsCfg.units, ...champsCfg.champions].map((u: any) => [u.id, u]));
    const match: MatchState = this.registry.get('match');

    // Build minimal PlayerStates for P1 and P2 with 3 actives resurrected from selection/purchases (MVP: random)
    const pickUnits = (count: number) => rng.shuffle(unitsCfg.units).slice(0, count);
    const toInstance = (def: any): UnitInstance => ({
      id: `${def.id}-${Math.floor(rng.next()*1e6)}`,
      defId: def.id,
      name: def.name,
      rarity: def.rarity,
      level: 1,
      stars: 1,
      stats: { ...def.stats },
      tags: def.tags.slice(),
      isChampion: !!def.isChampion,
      passives: def.passives ? def.passives.slice() : [],
      current: { hp: def.stats.hp }
    });

    // Build from match board
    const p1Slots = (match?.player?.active || []);
    const p2Slots = (match?.enemy?.active || []);
    const p1Defs = p1Slots.map(s => s ? defById[s.defId] : null);
    const p2Defs = p2Slots.map(s => s ? defById[s.defId] : null);
    // For stages > 1, if enemy has empty actives, fill with randoms for demo
    if (match && match.stage > 1) {
      for (let i = 0; i < 3; i++) {
        if (!p2Defs[i]) p2Defs[i] = pickUnits(1)[0];
      }
    }
    const starMults = game.merge.starMultipliers || { '2': 1.5, '3': 2.25 };
    const starMultiplier = (stars: number) => {
      if (stars <= 1) return 1;
      const preset = starMults[String(stars)];
      if (preset) return preset;
      const base = starMults['2'] || 1.5;
      return Math.pow(base, stars - 1);
    };
    const applyStars = (u: UnitInstance, stars: number) => {
      if (stars > 1) {
        const mult = starMultiplier(stars);
        u.stats = { ...u.stats, hp: Math.round(u.stats.hp * mult), dmg: Math.round(u.stats.dmg * mult) };
        u.current.hp = u.stats.hp;
        u.stars = stars;
      }
      return u;
    };

    const p1ActiveInst = p1Defs.map((d, i) => d ? applyStars(toInstance(d), p1Slots[i]!.stars) : null);
    const p2ActiveInst = p2Defs.map((d, i) => d ? applyStars(toInstance(d), p2Slots[i] ? p2Slots[i]!.stars : 1) : null);
    const p1BenchSlots = (match?.player?.bench || []);
    const p2BenchSlots = (match?.enemy?.bench || []);
    const p1BenchDefs = p1BenchSlots.map(s => s ? defById[s.defId] : null);
    const p2BenchDefs = p2BenchSlots.map(s => s ? defById[s.defId] : null);
    const p1BenchInst = p1BenchDefs.map((d, i) => d ? applyStars(toInstance(d), p1BenchSlots[i]!.stars) : null);
    const p2BenchInst = p2BenchDefs.map((d, i) => d ? applyStars(toInstance(d), p2BenchSlots[i]!.stars) : null);

    const mkPlayer = (id: string, actives: UnitInstance[]): PlayerState => ({
      userId: id, hp: game.initialPlayerHP, xp: 0, winStreak: 0, shopLevel: 1, rerollCountThisStage: 0,
      board: { active: [actives[0]||null, actives[1]||null, actives[2]||null], bench: [null,null,null,null], championId: '' },
      store: [], killsThisStage: 0, drainedHPThisStage: 0, damageThisStage: 0
    });

    // Visual layout helpers
    const makeCard = (x: number, y: number, def: any | null, stars: number) => {
      if (!def) return null as any;
      const c = new UnitCard(this, x, y, { name: def.name, rarity: def.rarity, tags: def.tags || [], stars, hp: def.stats.hp, dmg: def.stats.dmg, passiveDesc: def.passives?.[0]?.description }, 360, 220, 'compact');
      return c;
    };

    // Top/Bottom layout (enemy top, player bottom)
    const rowGap = 80;
    const cardW = 360;
    const colGap = cardW + rowGap;
    const cx = this.scale.width / 2;
    const yTop = 280;
    const yBottom = this.scale.height - 280;
    const xPositions = [cx - colGap, cx, cx + colGap];
    const p2SlotsUI = [0,1,2].map(i => makeCard(xPositions[i], yTop, p2Defs[i], p2Slots[i]?.stars || 1));
    const p1SlotsUI = [0,1,2].map(i => makeCard(xPositions[i], yBottom, p1Defs[i], p1Slots[i]?.stars || 1));

    const maxHP1 = [0,1,2].map(i => {
      const s = p1Slots[i];
      const d = s ? p1Defs[i] : null;
      if (!d) return 1;
      const mult = s ? starMultiplier(s.stars) : 1;
      return Math.round(d.stats.hp * mult);
    });
    const maxHP2 = [0,1,2].map(i => {
      const s = p2Slots[i];
      const d = s ? p2Defs[i] : null;
      if (!d) return 1;
      const mult = s ? starMultiplier(s.stars) : 1;
      return Math.round(d.stats.hp * mult);
    });

    // Track current DMG for dynamic updates
    const p1CurDmg = [0,1,2].map(i => p1Defs[i] ? Math.round(p1Defs[i]!.stats.dmg * (p1Slots[i] ? (p1Slots[i]!.stars > 1 ? starMultiplier(p1Slots[i]!.stars) : 1) : 1)) : 0);
    const p2CurDmg = [0,1,2].map(i => p2Defs[i] ? Math.round(p2Defs[i]!.stats.dmg * (p2Slots[i] ? (p2Slots[i]!.stars > 1 ? starMultiplier(p2Slots[i]!.stars) : 1) : 1)) : 0);

    const updateBars = (snap: any) => {
      for (let i = 0; i < 3; i++) {
        const s = snap.p1[i];
        const uiSlot = p1SlotsUI[i];
        if (s && uiSlot) uiSlot.setStats(Math.max(0, Math.floor(s.hp)), p1CurDmg[i] || 0);
        const s2 = snap.p2[i];
        const uiSlot2 = p2SlotsUI[i];
        if (s2 && uiSlot2) uiSlot2.setStats(Math.max(0, Math.floor(s2.hp)), p2CurDmg[i] || 0);
      }
    };

    // Deterministic event simulation
    const origRandom = Math.random;
    Math.random = () => rng.next();
    const { events, result } = simulateRoundWithEvents(
      { ...mkPlayer(players[0].id, []), board: { active: p1ActiveInst as any, bench: p1BenchInst as any, championId: '' }, store: [], killsThisStage: 0, drainedHPThisStage: 0, damageThisStage: 0 },
      { ...mkPlayer(players[1].id, []), board: { active: p2ActiveInst as any, bench: p2BenchInst as any, championId: '' }, store: [], killsThisStage: 0, drainedHPThisStage: 0, damageThisStage: 0 },
      game.playerLossBaseDamage
    );
    Math.random = origRandom;

    // Timeline animation
    let idx = 0;
    const doEvent = () => {
      if (idx >= events.length) return;
      const ev = events[idx++] as CombatEvent;
      if (ev.type === 'pre') {
        // Show chips for HP/DMG deltas
        const d = ev.deltas;
        const show = (arr: any[], uiSlots: any[], color: number, label: (x:any)=>string) => {
          for (let i = 0; i < 3; i++) {
            const delta = arr[i];
            const ui = uiSlots[i];
            if (!delta || !ui) continue;
            if (delta.hp !== 0) {
              const txt = this.add.text(ui.x, ui.y - 300, `${delta.hp > 0 ? '+' : ''}${delta.hp} HP`, { color: '#2ea043', fontSize: '18px' }).setOrigin(0.5);
              this.tweens.add({ targets: txt, y: txt.y - 20, alpha: 0, duration: timings.floatMs, onComplete: () => txt.destroy() });
            }
            if (delta.dmg !== 0) {
              const txt = this.add.text(ui.x, ui.y - 260, `${delta.dmg > 0 ? '+' : ''}${delta.dmg} DMG`, { color: '#58a6ff', fontSize: '18px' }).setOrigin(0.5);
              this.tweens.add({ targets: txt, y: txt.y - 18, alpha: 0, duration: timings.floatMs, onComplete: () => txt.destroy() });
            }
          }
        };
        show(d.p1, p1SlotsUI, 0x2ea043, (x)=>'');
        show(d.p2, p2SlotsUI, 0x2ea043, (x)=>'');
        // Apply DMG changes to current values
        for (let i = 0; i < 3; i++) {
          if (d.p1[i]) p1CurDmg[i] += d.p1[i]!.dmg || 0;
          if (d.p2[i]) p2CurDmg[i] += d.p2[i]!.dmg || 0;
        }
        // Stats will update on next event snapshots
      } else if (ev.type === 'act') {
        const actorUI = ev.actorSide === 1 ? p1SlotsUI[ev.actorSlot] : p2SlotsUI[ev.actorSlot];
        const targetUI = ev.actorSide === 1 ? p2SlotsUI[ev.targetSlot] : p1SlotsUI[ev.targetSlot];
        if (actorUI) this.tweens.add({ targets: actorUI, duration: timings.highlightMs, scale: 1.02, yoyo: true });
        if (targetUI && ev.damage > 0) {
          if (ev.action === 'mirror') {
            actorUI?.flashDamage(ev.damage, 'mirror');
          } else {
            targetUI?.flashDamage(ev.damage, 'out');
          }
        }
        updateBars(ev.snapshots);
      } else if (ev.type === 'death') {
        const uiSlot = ev.side === 1 ? p1SlotsUI[ev.slot] : p2SlotsUI[ev.slot];
        if (uiSlot) this.tweens.add({ targets: uiSlot, alpha: 0.25, duration: 200 });
      } else if (ev.type === 'end') {
        // Auto-advance: show short transition message and go to Results
        const overlay = this.add.container(this.scale.width/2, this.scale.height/2).setDepth(5000);
        const panel = this.add.rectangle(0, 0, 520, 140, 0x161b22).setStrokeStyle(2, 0x30363d).setOrigin(0.5);
        const msg = this.add.text(0, -20, `Round finished — winner=${ev.result.winner}`, { color: ui.colors.text, fontSize: '24px' }).setOrigin(0.5);
        const wait = this.add.text(0, 24, `Moving to results...`, { color: ui.colors.accent, fontSize: '18px' }).setOrigin(0.5);
        overlay.add([panel, msg, wait]);
        this.time.delayedCall(Math.max(700, timings.actionMs), () => this.scene.start('Results', { result: ev.result }));
        return; // stop scheduling further events
      }
      this.time.delayedCall(timings.actionMs, doEvent);
    };
    // Initialize bars at first snapshot if available
    const firstSnap = (events.find(e => e.type === 'act') as any)?.snapshots;
    if (firstSnap) updateBars(firstSnap);
    this.time.delayedCall(timings.actionMs, doEvent);
  }
}
