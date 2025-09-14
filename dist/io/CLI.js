"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* Minimal CLI using Node readline for deterministic MVP. */
const readline_1 = __importDefault(require("readline"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const FileDB_1 = require("../persistence/FileDB");
const Lobby_1 = require("../engine/Lobby");
const RNG_1 = require("../engine/RNG");
const Match_1 = require("../engine/Match");
const Shop_1 = require("../engine/Shop");
function loadParams() {
    return JSON.parse(fs_1.default.readFileSync(path_1.default.resolve('src/config/params.json'), 'utf-8'));
}
function loadContent() {
    return JSON.parse(fs_1.default.readFileSync(path_1.default.resolve('src/config/content.json'), 'utf-8'));
}
async function prompt(question, rl) {
    return new Promise(resolve => rl.question(question, resolve));
}
function ensureAccountPools(content, level) {
    const keys = Object.keys(content.pools_por_nivel_cuenta || {}).map(k => Number(k)).sort((a, b) => a - b);
    let best = keys[0] || 1;
    for (const k of keys)
        if (level >= k)
            best = k;
    const entry = content.pools_por_nivel_cuenta[String(best)];
    return { pj: (entry === null || entry === void 0 ? void 0 : entry.pj) || [], campeones: (entry === null || entry === void 0 ? void 0 : entry.campeones) || [] };
}
function clone(x) { return JSON.parse(JSON.stringify(x)); }
async function main() {
    const params = loadParams();
    const content = loadContent();
    const rng = new RNG_1.RNG(params.seed);
    const accounts = new FileDB_1.FileDB('accounts.json', { accounts: [] });
    const rl = readline_1.default.createInterface({ input: process.stdin, output: process.stdout });
    // Account selection or creation
    console.log('=== AutoBattler MVP ===');
    const list = accounts.get().accounts;
    if (list.length === 0) {
        console.log('No accounts found. Creating a new one...');
        const id = 'user_1';
        const acc = { account_id: id, nivel_cuenta: 1, xp_account: 0, desbloqueos: [], pools_desbloqueadas: { pj: [], campeones: [] }, campeones_desbloqueados: [] };
        accounts.set(d => { d.accounts.push(acc); });
    }
    const refreshed = accounts.get().accounts;
    console.log('Accounts:');
    refreshed.forEach((a, i) => console.log(`${i + 1}) ${a.account_id} (lvl ${a.nivel_cuenta})`));
    const choice = await prompt('Select account number: ', rl);
    const idx = Math.max(0, Math.min(refreshed.length - 1, (parseInt(choice) || 1) - 1));
    const account = refreshed[idx];
    const pools = ensureAccountPools(content, account.nivel_cuenta);
    // Champion selection
    const champs = content.campeones.filter((c) => pools.campeones.includes(c.unit_id));
    const champOptions = [rng.pick(champs), rng.pick(champs), rng.pick(champs)];
    console.log('Choose your Champion:');
    champOptions.forEach((c, i) => console.log(`${i + 1}) ${c.nombre} (${c.unit_id})`));
    const champChoice = await prompt('Your pick (1-3), or r to reroll once: ', rl);
    let chosen = champOptions[(parseInt(champChoice) || 1) - 1];
    if (champChoice.toLowerCase() === 'r') {
        const newOpts = [rng.pick(champs), rng.pick(champs), rng.pick(champs)];
        console.log('Reroll:');
        newOpts.forEach((c, i) => console.log(`${i + 1}) ${c.nombre} (${c.unit_id})`));
        const rc = await prompt('Your pick (1-3): ', rl);
        chosen = newOpts[(parseInt(rc) || 1) - 1];
    }
    console.log(`Selected: ${chosen.nombre}`);
    // Build lobby and player states
    const lobby = (0, Lobby_1.createLobby)(account.account_id, params.seed);
    const me = new Match_1.MatchEngine(params, content).createInitialPlayerState(account.account_id, chosen);
    const playerStates = new Map();
    playerStates.set(account.account_id, me);
    const champPool = champs;
    for (const bot of lobby.jugadores.filter(j => j !== account.account_id)) {
        const c = rng.pick(champPool);
        const ps = new Match_1.MatchEngine(params, content).createInitialPlayerState(bot, c);
        playerStates.set(bot, ps);
    }
    // Initial placement: fill active slots with champ + first units if any
    for (const ps of playerStates.values()) {
        ps.board_slots_activos[0] = ps.campeon;
    }
    // Initialize shop entries and simulate basic buying for bots and an auto simple buy for player
    const shop = new Shop_1.ShopService(params, Shop_1.ShopService.loadConfigs().probs, content);
    const poolsByUser = new Map();
    for (const uid of lobby.jugadores)
        poolsByUser.set(uid, { pj: pools.pj });
    for (const uid of lobby.jugadores) {
        const ps = playerStates.get(uid);
        ps.store_entries = shop.rollThreeEntriesFor(ps, rng, { pj: pools.pj });
    }
    // Simple pre-match phase: auto-buy first affordable unit once, bots only
    for (const uid of lobby.jugadores) {
        const ps = playerStates.get(uid);
        if (uid.startsWith('bot_')) {
            for (const id of ps.store_entries) {
                if (shop.tryBuyUnit(ps, id))
                    break;
            }
        }
        else {
            // player: auto buy first entry if affordable to keep flow minimal
            for (const id of ps.store_entries) {
                if (shop.tryBuyUnit(ps, id))
                    break;
            }
        }
        // Re-seat active slots up to 3
        const actives = [ps.campeon, ...ps.bench].slice(0, 3);
        ps.board_slots_activos = [actives[0] || null, actives[1] || null, actives[2] || null];
    }
    // Run full match
    const engine = new Match_1.MatchEngine(params, content);
    const { ranking } = engine.runFullMatch(lobby.jugadores, playerStates, poolsByUser);
    console.log('=== Match Finished ===');
    console.log('Ranking (top first):');
    ranking.forEach((uid, i) => console.log(`${i + 1}. ${uid}`));
    // Account XP for top3
    const place = ranking.indexOf(account.account_id) + 1;
    const added = place <= 3 ? params.progression.win_top3_xp[String(place)] || 0 : 0;
    account.xp_account += added;
    // Simple level update (mirror ProgressionService)
    const base = params.progression.level_curve_base;
    let lvl = 1;
    while (account.xp_account >= base * lvl * lvl)
        lvl++;
    account.nivel_cuenta = Math.max(1, lvl);
    accounts.set(d => { const i = d.accounts.findIndex(a => a.account_id === account.account_id); if (i >= 0)
        d.accounts[i] = account; });
    console.log(`Your placement: ${place}. Account +XP: ${added}. New level: ${account.nivel_cuenta}`);
    rl.close();
}
main().catch(err => { console.error(err); process.exit(1); });
