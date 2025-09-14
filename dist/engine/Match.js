"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchEngine = void 0;
const RNG_1 = require("./RNG");
const Combat_1 = require("./Combat");
const Shop_1 = require("./Shop");
const Lobby_1 = require("./Lobby");
class MatchEngine {
    constructor(params, content) {
        this.params = params;
        this.content = content;
        this.rng = new RNG_1.RNG(params.seed);
        this.combat = new Combat_1.CombatEngine(params);
        this.shop = new Shop_1.ShopService(params, Shop_1.ShopService.loadConfigs().probs, content);
    }
    createInitialPlayerState(user_id, champion) {
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
    runFullMatch(lobbyPlayers, playerStates, accountPoolsByUser) {
        const eliminated = new Set();
        let lastEliminated = null;
        const roundsLog = [];
        const totalStages = this.params.match.stages;
        const roundsPerStage = this.params.match.rounds_por_stage;
        let globalRoundIndex = 1;
        for (let stage = 1; stage <= totalStages; stage++) {
            // Reset reroll chains at stage start
            for (const ps of playerStates.values())
                ps.costo_reroll_actual = this.params.economia.reroll.base;
            for (let r = 1; r <= roundsPerStage; r++) {
                const pairs = (0, Lobby_1.pairingsForRound)(lobbyPlayers, eliminated, lastEliminated);
                const round = {
                    index: globalRoundIndex,
                    estado: 'en_curso',
                    daño_causado_por_jugador: {},
                    unidades_vivas_por_jugador: {},
                    resultado_por_jugador: {},
                    recompensa_round: null
                };
                for (const [a, b] of pairs) {
                    const aState = playerStates.get(a);
                    const bState = b ? playerStates.get(b) : null;
                    if (!bState) {
                        // bye round, no combat
                        round.resultado_por_jugador[a] = 'win';
                        continue;
                    }
                    const bId = b;
                    const result = this.combat.runRound(aState, bState, this.rng);
                    round.unidades_vivas_por_jugador[a] = result.p1Alive;
                    round.unidades_vivas_por_jugador[bId] = result.p2Alive;
                    if (result.winner === 'p1') {
                        round.resultado_por_jugador[a] = 'win';
                        round.resultado_por_jugador[bId] = 'lose';
                    }
                    else if (result.winner === 'p2') {
                        round.resultado_por_jugador[a] = 'lose';
                        round.resultado_por_jugador[bId] = 'win';
                    }
                    else {
                        round.resultado_por_jugador[a] = 'tie';
                        round.resultado_por_jugador[bId] = 'tie';
                    }
                    // player damage
                    const base = this.params.daño_jugador.X_base;
                    if (result.winner === 'p1') {
                        bState.vida_jugador -= base + result.p1Alive;
                        aState.racha += 1;
                        bState.racha = 0;
                        if (bState.vida_jugador <= 0 && !eliminated.has(bId)) {
                            eliminated.add(bId);
                            lastEliminated = bId;
                        }
                    }
                    else if (result.winner === 'p2') {
                        aState.vida_jugador -= base + result.p2Alive;
                        bState.racha += 1;
                        aState.racha = 0;
                        if (aState.vida_jugador <= 0 && !eliminated.has(a)) {
                            eliminated.add(a);
                            lastEliminated = a;
                        }
                    }
                    else {
                        if (this.params.daño_jugador.tie_rule === 'ambos_daño_base') {
                            aState.vida_jugador -= base;
                            bState.vida_jugador -= base;
                        }
                    }
                }
                roundsLog.push(round);
                // Shop round reward: add small xp and reset store
                for (const uid of lobbyPlayers) {
                    const ps = playerStates.get(uid);
                    ps.xp_match += this.params.economia.xp_por_derrota; // flat income per round for MVP
                    ps.nivel_tienda = Math.min(5, 1 + Math.floor((globalRoundIndex) / 3));
                    // reroll store automatically for bots; player can handle via CLI
                    const pools = accountPoolsByUser.get(uid);
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
exports.MatchEngine = MatchEngine;
