"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const Shop_1 = require("../src/engine/Shop");
const { params, probs, content } = Shop_1.ShopService.loadConfigs();
function mkPS() {
    const champ = content.campeones[0];
    return { user_id: 'u', campeon: champ, bench: [], board_slots_activos: [null, null, null], equipo_total: [champ], xp_match: 100, racha: 0, vida_jugador: 20, nivel_tienda: 1, costo_reroll_actual: params.economia.reroll.base, store_entries: [] };
}
(0, vitest_1.describe)('Unit merges', () => {
    (0, vitest_1.it)('1+1 -> level 2; 2+2 -> level 3', () => {
        const shop = new Shop_1.ShopService(params, probs, content);
        const ps = mkPS();
        const id = content.unidades[0].unit_id;
        shop.tryBuyUnit(ps, id);
        shop.tryBuyUnit(ps, id);
        const copy = ps.equipo_total.find(u => u.unit_id === id && u.nivel === 2);
        (0, vitest_1.expect)(copy).toBeTruthy();
        shop.tryBuyUnit(ps, id);
        shop.tryBuyUnit(ps, id);
        const copy3 = ps.equipo_total.find(u => u.unit_id === id && u.nivel === 3);
        (0, vitest_1.expect)(copy3).toBeTruthy();
    });
});
