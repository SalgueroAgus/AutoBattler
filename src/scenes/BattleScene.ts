import Phaser from 'phaser';
import { simulateRound } from '../engine/combat';
import { RNG } from '../engine/rng';
import { PlayerState, UnitInstance } from '../engine/types';

export class BattleScene extends Phaser.Scene {
  constructor() { super('Battle'); }
  create() {
    const ui = this.registry.get('cfg:ui');
    const game = this.registry.get('cfg:game');
    const rng: RNG = this.registry.get('rng');
    const players = this.registry.get('players') as Array<{id:string,human:boolean}>;
    const unitsCfg = this.registry.get('cfg:units') as { units: any[] };

    // Build minimal PlayerStates for P1 and P2 with 3 actives resurrected from selection/purchases (MVP: random)
    const pickUnits = (count: number) => rng.shuffle(unitsCfg.units.filter(u => !u.isChampion)).slice(0, count);
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

    const benchDefs: string[] = this.registry.get('playerBenchDefs') || [];
    const benchObjs = benchDefs
      .map(defId => unitsCfg.units.find((u: any) => u.id === defId))
      .filter(Boolean);
    const p1Units = (benchObjs.slice(0, 3).length ? benchObjs.slice(0, 3) : pickUnits(3)).map(toInstance);
    const p2Units = pickUnits(3).map(toInstance);

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
    this.add.text(20, 300, 'Press N for next, R to replay with same seed', { color: ui.colors.accent, fontSize: '14px' });
    this.input.keyboard!.addKey('N').once('down', () => this.scene.start('Results', { result }));
    this.input.keyboard!.addKey('R').once('down', () => this.scene.restart());
  }
}
