"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const Shop_1 = require("../src/engine/Shop");
const Match_1 = require("../src/engine/Match");
const { params, content } = Shop_1.ShopService.loadConfigs();
(0, vitest_1.describe)('Full match integration', () => {
    (0, vitest_1.it)('runs a complete match with 8 players', () => {
        const engine = new Match_1.MatchEngine(params, content);
        const players = Array.from({ length: 8 }, (_, i) => i === 0 ? 'user' : `bot_${i}`);
        const map = new Map();
        const champs = content.campeones;
        for (const id of players) {
            const champ = champs[(Math.random() * champs.length) | 0];
            const ps = engine.createInitialPlayerState(id, champ);
            ps.board_slots_activos[0] = ps.campeon;
            map.set(id, ps);
        }
        const pools = new Map();
        for (const id of players)
            pools.set(id, { pj: content.unidades.map((u) => u.unit_id) });
        const res = engine.runFullMatch(players, map, pools);
        (0, vitest_1.expect)(res.ranking.length).toBe(8);
    });
});
