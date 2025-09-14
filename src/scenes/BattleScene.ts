import Phaser from 'phaser';
import { simulateRoundWithEvents, CombatEvent } from '../engine/combat';
import { RNG } from '../engine/rng';
import { PlayerState, UnitInstance } from '../engine/types';
import { MatchState } from '../engine/match';
import { GameConfig } from '../systems/configLoader';

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
    const makeSlot = (x: number, y: number, def: any | null, stars: number) => {
      const cont = this.add.container(x, y);
      const rect = this.add.rectangle(0, 0, 120, 60, 0x223344).setStrokeStyle(2, 0x58a6ff);
      const name = this.add.text(-50, -25, def ? def.name : '—', { color: ui.colors.text, fontSize: '12px' });
      const star = this.add.text(40, -25, stars>1 ? `★${stars}` : '', { color: ui.colors.warn, fontSize: '12px' });
      const hpBg = this.add.rectangle(0, 10, 110, 8, 0x222222).setOrigin(0.5, 0.5);
      const hp = this.add.rectangle(-55, 10, 110, 8, 0x2ea043).setOrigin(0, 0.5);
      const dmgTxt = this.add.text(-50, 22, def ? `DMG ${def.stats.dmg}` : '', { color: ui.colors.accent, fontSize: '11px' });
      cont.add([rect, name, star, hpBg, hp, dmgTxt]);
      return { cont, rect, name, star, hp } as any;
    };

    const p1SlotsUI = [0,1,2].map(i => makeSlot(200, 120 + i*90, p1Defs[i], p1Slots[i]?.stars || 1));
    const p2SlotsUI = [0,1,2].map(i => makeSlot(760, 120 + i*90, p2Defs[i], p2Slots[i]?.stars || 1));

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

    const updateBars = (snap: any) => {
      for (let i = 0; i < 3; i++) {
        const s = snap.p1[i];
        const uiSlot = p1SlotsUI[i];
        if (s && uiSlot) {
          const pct = Math.max(0, Math.min(1, s.hp / (maxHP1[i] || 1)));
          uiSlot.hp.width = 110 * pct;
          // no mana bar in v2
        }
        const s2 = snap.p2[i];
        const uiSlot2 = p2SlotsUI[i];
        if (s2 && uiSlot2) {
          const pct2 = Math.max(0, Math.min(1, s2.hp / (maxHP2[i] || 1)));
          uiSlot2.hp.width = 110 * pct2;
          // no mana bar in v2
        }
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
        updateBars(ev.snapshots);
      } else if (ev.type === 'act') {
        const actorUI = ev.actorSide === 1 ? p1SlotsUI[ev.actorSlot] : p2SlotsUI[ev.actorSlot];
        const targetUI = ev.actorSide === 1 ? p2SlotsUI[ev.targetSlot] : p1SlotsUI[ev.targetSlot];
        if (actorUI) this.tweens.add({ targets: actorUI.rect, duration: timings.highlightMs, scale: 1.06, yoyo: true });
        if (targetUI && ev.damage > 0) {
          const dmgText = this.add.text(targetUI.cont.x, targetUI.cont.y - 40, `-${ev.damage}`, { color: ui.colors.bad, fontSize: '16px' }).setOrigin(0.5);
          this.tweens.add({ targets: dmgText, y: dmgText.y - 30, alpha: 0, duration: timings.floatMs, onComplete: () => dmgText.destroy() });
        }
        updateBars(ev.snapshots);
      } else if (ev.type === 'death') {
        const uiSlot = ev.side === 1 ? p1SlotsUI[ev.slot] : p2SlotsUI[ev.slot];
        if (uiSlot) this.tweens.add({ targets: uiSlot.cont, alpha: 0.25, duration: 200 });
      } else if (ev.type === 'end') {
        this.time.delayedCall(timings.actionMs, () => {
          this.add.text(20, 20, `Battle Result: winner=${ev.result.winner}`, { color: ui.colors.text, fontSize: '14px' });
          this.add.text(20, 300, 'Press N for results, R to replay', { color: ui.colors.accent, fontSize: '14px' });
          this.input.keyboard!.addKey('N').once('down', () => this.scene.start('Results', { result: ev.result }));
          this.input.keyboard!.addKey('R').once('down', () => this.scene.restart());
        });
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
