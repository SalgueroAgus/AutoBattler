import Phaser from 'phaser';
import { simulateRound } from '../engine/combat';
import { RNG } from '../engine/rng';
import { PlayerState, UnitInstance } from '../engine/types';
import { MatchState } from '../engine/match';
import { GameConfig } from '../systems/configLoader';

export class BattleScene extends Phaser.Scene {
  constructor() { super('Battle'); }
  create() {
    const ui = this.registry.get('cfg:ui');
    const game: GameConfig = this.registry.get('cfg:game');
    const rng: RNG = this.registry.get('rng');
    const players = this.registry.get('players') as Array<{id:string,human:boolean}>;
    const unitsCfg = this.registry.get('cfg:units') as { units: any[] };
    const defById: Record<string, any> = Object.fromEntries(unitsCfg.units.map((u: any) => [u.id, u]));
    const match: MatchState = this.registry.get('match');

    // Build minimal PlayerStates for P1 and P2 with 3 actives resurrected from selection/purchases (MVP: random)
    const pickUnits = (count: number) => rng.shuffle(unitsCfg.units.filter((u: any) => !u.isChampion)).slice(0, count);
    const toInstance = (def: any): UnitInstance => ({
      id: `${def.id}-${Math.floor(rng.next()*1e6)}`,
      defId: def.id,
      name: def.name,
      rarity: def.rarity,
      level: 1,
      stars: 1,
      stats: { ...def.stats },
      ability: { ...def.ability },
      tags: def.tags.slice(),
      isChampion: def.isChampion,
      manaGain: { ...def.manaGain },
      current: { hp: def.stats.hp, mana: 0 }
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
    const applyStars = (u: UnitInstance, stars: number) => {
      if (stars > 1) {
        const mult = starMults[String(stars)] || 1;
        u.stats = {
          ...u.stats,
          hp: Math.round(u.stats.hp * mult),
          atkPhys: Math.round(u.stats.atkPhys * mult),
          atkMag: Math.round(u.stats.atkMag * mult),
          defPhys: Math.round(u.stats.defPhys * mult),
          defMag: Math.round(u.stats.defMag * mult)
        };
        u.current.hp = u.stats.hp;
        u.stars = stars;
      }
      return u;
    };

    const p1Units = p1Defs.map((d, i) => d ? applyStars(toInstance(d), p1Slots[i]!.stars) : null).filter(Boolean) as UnitInstance[];
    const p2Units = p2Defs.map((d, i) => d ? applyStars(toInstance(d), p2Slots[i] ? p2Slots[i]!.stars : 1) : null).filter(Boolean) as UnitInstance[];

    const mkPlayer = (id: string, actives: UnitInstance[]): PlayerState => ({
      userId: id, hp: game.initialPlayerHP, xp: 0, winStreak: 0, shopLevel: 1, rerollCountThisStage: 0,
      board: { active: [actives[0]||null, actives[1]||null, actives[2]||null], bench: [null,null,null,null], championId: '' },
      store: [], killsThisStage: 0, drainedHPThisStage: 0, damageThisStage: 0
    });

    // Swap in deterministic RNG for Math.random during combat
    const origRandom = Math.random;
    Math.random = () => rng.next();
    const result = simulateRound(mkPlayer(players[0].id, p1Units), mkPlayer(players[1].id, p2Units), game.playerLossBaseDamage);
    Math.random = origRandom;

    const lines = [
      `Battle Result: winner=${result.winner}, p1Alive=${result.p1Alive}, p2Alive=${result.p2Alive}`,
      `Damage -> P1:${result.damageToP1} P2:${result.damageToP2}`
    ].concat(result.log.slice(0, 12));

    this.add.text(20, 20, lines.join('\n'), { color: ui.colors.text, fontSize: '14px' });
    this.add.text(20, 300, 'Press N for results, R to replay with same seed', { color: ui.colors.accent, fontSize: '14px' });
    this.input.keyboard!.addKey('N').once('down', () => this.scene.start('Results', { result }));
    this.input.keyboard!.addKey('R').once('down', () => this.scene.restart());
  }
}
