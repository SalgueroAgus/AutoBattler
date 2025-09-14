/* Minimal CLI using Node readline for deterministic MVP. */
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { Account, ParamsConfig, PlayerState } from '../models/Types';
import { FileDB } from '../persistence/FileDB';
import { createLobby } from '../engine/Lobby';
import { RNG } from '../engine/RNG';
import { MatchEngine } from '../engine/Match';
import { ShopService } from '../engine/Shop';

type AccountsDB = { accounts: Account[] };

function loadParams(): ParamsConfig {
  return JSON.parse(fs.readFileSync(path.resolve('src/config/params.json'), 'utf-8')) as ParamsConfig;
}
function loadContent(): any {
  return JSON.parse(fs.readFileSync(path.resolve('src/config/content.json'), 'utf-8'));
}

async function prompt(question: string, rl: readline.Interface): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve));
}

function ensureAccountPools(content: any, level: number) {
  const keys = Object.keys(content.pools_por_nivel_cuenta || {}).map(k => Number(k)).sort((a,b)=>a-b);
  let best = keys[0] || 1;
  for (const k of keys) if (level >= k) best = k;
  const entry = content.pools_por_nivel_cuenta[String(best)];
  return { pj: entry?.pj || [], campeones: entry?.campeones || [] };
}

function clone<T>(x: T): T { return JSON.parse(JSON.stringify(x)); }

async function main() {
  const params = loadParams();
  const content = loadContent();
  const rng = new RNG(params.seed);
  const accounts = new FileDB<AccountsDB>('accounts.json', { accounts: [] });
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  // Account selection or creation
  console.log('=== AutoBattler MVP ===');
  const list = accounts.get().accounts;
  if (list.length === 0) {
    console.log('No accounts found. Creating a new one...');
    const id = 'user_1';
    const acc: Account = { account_id: id, nivel_cuenta: 1, xp_account: 0, desbloqueos: [], pools_desbloqueadas: { pj: [], campeones: [] }, campeones_desbloqueados: [] };
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
  const champs: any[] = content.campeones.filter((c: any) => pools.campeones.includes(c.unit_id));
  const champOptions: any[] = [rng.pick<any>(champs), rng.pick<any>(champs), rng.pick<any>(champs)];
  console.log('Choose your Champion:');
  champOptions.forEach((c: any, i: number) => console.log(`${i + 1}) ${c.nombre} (${c.unit_id})`));
  const champChoice = await prompt('Your pick (1-3), or r to reroll once: ', rl);
  let chosen: any = champOptions[(parseInt(champChoice) || 1) - 1];
  if (champChoice.toLowerCase() === 'r') {
    const newOpts: any[] = [rng.pick<any>(champs), rng.pick<any>(champs), rng.pick<any>(champs)];
    console.log('Reroll:'); newOpts.forEach((c: any, i: number) => console.log(`${i + 1}) ${c.nombre} (${c.unit_id})`));
    const rc = await prompt('Your pick (1-3): ', rl);
    chosen = newOpts[(parseInt(rc) || 1) - 1];
  }
  console.log(`Selected: ${chosen.nombre}`);

  // Build lobby and player states
  const lobby = createLobby(account.account_id, params.seed);
  const me: PlayerState = new MatchEngine(params, content).createInitialPlayerState(account.account_id, chosen);
  const playerStates = new Map<string, PlayerState>();
  playerStates.set(account.account_id, me);
  const champPool = champs;
  for (const bot of lobby.jugadores.filter(j => j !== account.account_id)) {
    const c = rng.pick(champPool);
    const ps = new MatchEngine(params, content).createInitialPlayerState(bot, c);
    playerStates.set(bot, ps);
  }
  // Initial placement: fill active slots with champ + first units if any
  for (const ps of playerStates.values()) {
    ps.board_slots_activos[0] = ps.campeon;
  }

  // Initialize shop entries
  const shop = new ShopService(params, ShopService.loadConfigs().probs, content);
  const poolsByUser = new Map<string, { pj: string[] }>();
  for (const uid of lobby.jugadores) poolsByUser.set(uid, { pj: pools.pj });
  for (const uid of lobby.jugadores) {
    const ps = playerStates.get(uid)!;
    ps.store_entries = shop.rollThreeEntriesFor(ps, rng, { pj: pools.pj });
  }

  // Preparation phase (Stage 1): show player store and auto-buy first affordable to keep flow minimal
  const meState = playerStates.get(account.account_id)!;
  console.log('--- Preparation (Stage 1) ---');
  console.log(`Your XP: ${meState.xp_match}. Reroll cost: ${meState.costo_reroll_actual}`);
  const nameOf = (id: string) => (content.unidades.find((u:any)=>u.unit_id===id)?.nombre || id);
  console.log('Store (3):');
  meState.store_entries.forEach((id, i) => console.log(`  ${i+1}) ${nameOf(id)} (${id})`));
  let bought = false;
  for (const id of meState.store_entries) { if (shop.tryBuyUnit(meState, id)) { console.log(`Auto-bought: ${nameOf(id)} (${id})`); bought = true; break; } }
  if (!bought) console.log('Auto-buy skipped (insufficient XP or capacity).');
  // Re-seat active slots up to 3 for all players
  for (const uid of lobby.jugadores) {
    const ps = playerStates.get(uid)!;
    // Re-seat active slots up to 3
    const actives = [ps.campeon, ...ps.bench].slice(0, 3);
    ps.board_slots_activos = [actives[0] || null, actives[1] || null, actives[2] || null];
  }

  // Run full match
  const engine = new MatchEngine(params, content);
  const { ranking } = engine.runFullMatch(lobby.jugadores, playerStates, poolsByUser, ({ stage, roundInStage, globalRoundIndex, results }) => {
    console.log(`--- Stage ${stage} | Round ${roundInStage} (Global ${globalRoundIndex}) ---`);
    for (const pr of results) {
      console.log(`Pair: ${pr.a} vs ${pr.b} => winner: ${pr.winner}, alive: ${pr.p1Alive}-${pr.p2Alive}`);
      // Print concise turn logs
      pr.turns.slice(0, 12).forEach((t, idx) => {
        const tgt = t.objetivo ? `${t.objetivo.user_id}@${t.objetivo.slot}` : '-';
        console.log(`  #${idx+1} ${t.actor_user_id}.s${t.actor_slot+1} ${t.accion} -> ${tgt} ${t.resultado_daño_y_efectos}`);
      });
      if (pr.turns.length > 12) console.log(`  ... (${pr.turns.length - 12} more turns)`);
    }
  });

  console.log('=== Match Finished ===');
  console.log('Ranking (top first):');
  ranking.forEach((uid, i) => console.log(`${i + 1}. ${uid}`));

  // Account XP for top3
  const place = ranking.indexOf(account.account_id) + 1;
  const added = place <= 3 ? params.progression.win_top3_xp[String(place)] || 0 : 0;
  account.xp_account += added;
  // Simple level update (mirror ProgressionService)
  const base = params.progression.level_curve_base;
  let lvl = 1; while (account.xp_account >= base * lvl * lvl) lvl++;
  account.nivel_cuenta = Math.max(1, lvl);
  accounts.set(d => { const i = d.accounts.findIndex(a => a.account_id === account.account_id); if (i>=0) d.accounts[i] = account; });
  console.log(`Your placement: ${place}. Account +XP: ${added}. New level: ${account.nivel_cuenta}`);

  rl.close();
}

main().catch(err => { console.error(err); process.exit(1); });
