import { Match, ParamsConfig, PlayerState, Round } from '../models/Types';
import { RNG } from './RNG';
import { CombatEngine } from './Combat';
import { ShopService } from './Shop';
import { pairingsForRound } from './Lobby';

interface ContentData { campeones: any[]; unidades: any[]; sinergias?: any[]; pools_por_nivel_cuenta?: any }

export class MatchEngine {
  private rng: RNG;
  private combat: CombatEngine;
  private shop: ShopService;
  constructor(private params: ParamsConfig, private content: ContentData) {
    this.rng = new RNG(params.seed);
    this.combat = new CombatEngine(params);
    this.shop = new ShopService(params, ShopService.loadConfigs().probs, content);
  }

  createInitialPlayerState(user_id: string, champion: any): PlayerState {
    return {
      user_id,
      campeon: JSON.parse(JSON.stringify(champion)),
      bench: [],
      board_slots_activos: [null, null, null],
      equipo_total: [JSON.parse(JSON.stringify(champion))],
      xp_match: 10,
      racha: 0,
      vida_jugador: this.params.player.vida_inicial,
      nivel_tienda: 1,
      costo_reroll_actual: this.params.economia.reroll.base,
      store_entries: []
    };
  }

  runFullMatch(
    lobbyPlayers: string[],
    playerStates: Map<string, PlayerState>,
    accountPoolsByUser: Map<string, { pj: string[] }>,
    onRound?: (info: { stage: number; roundInStage: number; globalRoundIndex: number; results: { a: string; b: string; winner: 'p1'|'p2'|'tie'; p1Alive: number; p2Alive: number; turns: import('./Combat').RoundResult['turns'] }[] }) => void
  ): { ranking: string[]; rounds: Round[] } {
    const eliminated = new Set<string>();
    let lastEliminated: string | null = null;
    const roundsLog: Round[] = [];
    const totalStages = this.params.match.stages;
    const roundsPerStage = this.params.match.rounds_por_stage;
    let globalRoundIndex = 1;
    for (let stage = 1; stage <= totalStages; stage++) {
      // Reset reroll chains at stage start
      for (const ps of playerStates.values()) ps.costo_reroll_actual = this.params.economia.reroll.base;

      for (let r = 1; r <= roundsPerStage; r++) {
        const pairs = pairingsForRound(lobbyPlayers, eliminated, lastEliminated);
        const round: Round = {
          index: globalRoundIndex,
          estado: 'en_curso',
          daño_causado_por_jugador: {},
          unidades_vivas_por_jugador: {},
          resultado_por_jugador: {},
          recompensa_round: null
        };
        const pairResults: { a: string; b: string; winner: 'p1'|'p2'|'tie'; p1Alive: number; p2Alive: number; turns: import('./Combat').RoundResult['turns'] }[] = [];
        for (const [a, b] of pairs) {
          const aState = playerStates.get(a)!;
          const bState = b ? playerStates.get(b)! : null;
          if (!bState) {
            // bye round, no combat
            round.resultado_por_jugador[a] = 'win';
            continue;
          }
          const bId = b as string;
          const result = this.combat.runRound(aState, bState, this.rng);
          round.unidades_vivas_por_jugador[a] = result.p1Alive;
          round.unidades_vivas_por_jugador[bId] = result.p2Alive;
          pairResults.push({ a, b: bId, winner: result.winner, p1Alive: result.p1Alive, p2Alive: result.p2Alive, turns: result.turns });
          if (result.winner === 'p1') {
            round.resultado_por_jugador[a] = 'win';
            round.resultado_por_jugador[bId] = 'lose';
          } else if (result.winner === 'p2') {
            round.resultado_por_jugador[a] = 'lose';
            round.resultado_por_jugador[bId] = 'win';
          } else {
            round.resultado_por_jugador[a] = 'tie';
            round.resultado_por_jugador[bId] = 'tie';
          }
          // player damage
          const base = this.params.daño_jugador.X_base;
          if (result.winner === 'p1') {
            bState.vida_jugador -= base + result.p1Alive;
            aState.racha += 1; bState.racha = 0;
            if (bState.vida_jugador <= 0 && !eliminated.has(bId)) { eliminated.add(bId); lastEliminated = bId; }
          } else if (result.winner === 'p2') {
            aState.vida_jugador -= base + result.p2Alive;
            bState.racha += 1; aState.racha = 0;
            if (aState.vida_jugador <= 0 && !eliminated.has(a)) { eliminated.add(a); lastEliminated = a; }
          } else {
            if (this.params.daño_jugador.tie_rule === 'ambos_daño_base') {
              aState.vida_jugador -= base; bState.vida_jugador -= base;
            }
          }
        }
        roundsLog.push(round);
        if (onRound) onRound({ stage, roundInStage: r, globalRoundIndex, results: pairResults });
        // Shop round reward: add small xp and reset store
        for (const uid of lobbyPlayers) {
          const ps = playerStates.get(uid)!;
          ps.xp_match += this.params.economia.xp_por_derrota; // flat income per round for MVP
          ps.nivel_tienda = Math.min(5, 1 + Math.floor((globalRoundIndex) / 3));
          // reroll store automatically for bots; player can handle via CLI
          const pools = accountPoolsByUser.get(uid)!;
          ps.store_entries = this.shop.rollThreeEntriesFor(ps, this.rng, pools);
        }
        globalRoundIndex++;
      }
    }
    // Ranking by vida (descending)
    const aliveSorted = [...playerStates.values()].sort((a, b) => b.vida_jugador - a.vida_jugador).map(p => p.user_id);
    return { ranking: aliveSorted, rounds: roundsLog };
  }
}
