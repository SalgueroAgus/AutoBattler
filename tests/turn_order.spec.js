"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const Combat_1 = require("../src/engine/Combat");
const RNG_1 = require("../src/engine/RNG");
const params = {
    seed: 's',
    player: { vida_inicial: 20 },
    daño_jugador: { X_base: 2, tie_rule: 'ambos_daño_base' },
    economia: { xp_por_victoria: 5, xp_por_derrota: 3, bonus_por_unidad_viva: 1, bonus_racha_victorias: [0, 1, 2, 3], costo_compra_por_rareza: { C: 2, R: 3, SR: 4, E: 5, L: 6 }, reroll: { base: 1, incremento_por_cadena: 1 } },
    tienda: { niveles_por_rounds: [0, 3, 6] },
    match: { stages: 1, rounds_por_stage: 1 },
    combate: { crit_multiplier: 1.5, mana_por_ataque: 10, mana_requerida_habilidad: 30 },
    progression: { level_curve_base: 10, win_top3_xp: { '1': 50, '2': 35, '3': 20 } }
};
function mkUnit(id) {
    return { unit_id: id, nombre: id, stats: { hp: 5, def_fis: 0, def_mag: 0, atk_fis: 1, vel_atk: 1, atk_mag: 0, crit: 0, crit_dmg: 1.5, mana: 0 }, estrella: 1, nivel: 1 };
}
function mkPS(id) {
    const champ = mkUnit('c');
    return { user_id: id, campeon: champ, bench: [], board_slots_activos: [mkUnit('a'), mkUnit('b'), mkUnit('c')], equipo_total: [champ], xp_match: 0, racha: 0, vida_jugador: 20, nivel_tienda: 1, costo_reroll_actual: 1, store_entries: [] };
}
(0, vitest_1.describe)('Turn order sequence', () => {
    (0, vitest_1.it)('alternates U1.s1→U2.s1→U1.s2→U2.s2→U1.s3→U2.s3', () => {
        const eng = new Combat_1.CombatEngine(params);
        const rng = new RNG_1.RNG('t');
        const p1 = mkPS('p1');
        const p2 = mkPS('p2');
        const res = eng.runRound(p1, p2, rng);
        // collect first 6 turns actor slots by side order pattern
        const seq = res.turns.slice(0, 6).map(t => `${t.actor_user_id}:${t.actor_slot}`);
        (0, vitest_1.expect)(seq).toEqual(['p1:0', 'p2:0', 'p1:1', 'p2:1', 'p1:2', 'p2:2']);
    });
});
