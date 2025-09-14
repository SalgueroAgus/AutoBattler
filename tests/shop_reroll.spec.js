"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const Shop_1 = require("../src/engine/Shop");
const RNG_1 = require("../src/engine/RNG");
const { params, probs, content } = Shop_1.ShopService.loadConfigs();
function mkPS() {
    const champ = content.campeones[0];
    return { user_id: 'u', campeon: champ, bench: [], board_slots_activos: [null, null, null], equipo_total: [champ], xp_match: 10, racha: 0, vida_jugador: 20, nivel_tienda: 1, costo_reroll_actual: params.economia.reroll.base, store_entries: [] };
}
(0, vitest_1.describe)('Shop reroll cost chain', () => {
    (0, vitest_1.it)('increments per reroll and resets per stage', () => {
        const shop = new Shop_1.ShopService(params, probs, content);
        const rng = new RNG_1.RNG('seed');
        const ps = mkPS();
        const cost1 = ps.costo_reroll_actual;
        shop.applyReroll(ps, rng, { pj: content.unidades.map((u) => u.unit_id) });
        const cost2 = ps.costo_reroll_actual;
        (0, vitest_1.expect)(cost2).toBeGreaterThan(cost1);
        shop.resetRerollChain(ps);
        (0, vitest_1.expect)(ps.costo_reroll_actual).toEqual(params.economia.reroll.base);
    });
});
