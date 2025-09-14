Antes de construir, necesito confirmar parámetros clave para que todo quede en /CONFIG y el core loop sea 100% determinista. Propongo mínimos razonables pero no asumiré nada hasta tu OK.
Clarifying questions (please confirm or edit):
Core structure
* Stages: number of stages per match: 10  and rounds per stage: 2.
* Turn order: strictly alternating P1/P2 slots [1..3] left→right, top→bottom as en doc. OK? YES
* Determinism: use per‑match seed, no wall‑clock usage. Persist seed in match state. OK? DETERMINISM IS JUST FOR TESTING PORPOUSES
Player stats
* Starting HP: initial player health: 20.
* Player damage on round loss: 1 + NUMBER OF ENEMY UNITS ALIVE ON BOARD, NOT BENCH.
* Tie rule: doc says winner = higher total damage in round; if equal damage, draw or both take damage? THERE SHOULD BE NO TIE DURING FIGHING IF TWO UNITS HAVE EQUAL DAMAGE, AND ONE HIT KILLS THEM, THEY BOTH DIE, THE ‘DEFIENDING UNIT’ ATACKS WHEN RECIVING DAMAGE.
Economy (match‑wide XP)
* Round rewards: XP on win, on loss, bonus per own surviving unit on win, win‑streak bonus. CORRECT
* Buy/Sell costs: unit purchase cost per rarity; selling returns 100% XP (per doc) — confirm. CORRECT
* Reroll: base cost and +increment per consecutive reroll (doc: 1 +1 each). Confirm numbers. CORRECT 1 BASE + 1 PER RERROL, RESETS ON STAGE CHANGE
* XP from kills/level ups: do we add XP on unit level‑ups or kills for MVP? If yes, specify value or skip.ADD HALF XP COST AS REWARD FOR UNIT LVL UP , ALSO PLAYER THAT MOST DAMAGE DID ON THE STAGE TAKES: SHOP LEVEL + ENEMY UNITS KILLED BY PLAYER ON STAGE + DRAINED HP FROM ENEMY PLAYER AS XP REWARD
Shop
* Visible options: 3 per refresh (per doc). Confirm. YES
* Rarities: 5 tiers names and base costs per tier. YES
* Shop levels: starting level, level‑up cadence (e.g., every N rounds or post‑stage), max level.
* Probabilities: rarity distribution per shop level (table).
* Champion in shop: allowed to appear for leveling only; confirm probability treatment (same rarity table or guaranteed slot chance?). CORRECT
Team and board
* Team size: Champion + 5 units; bench size 4; max 3 active. Confirm. CORRECT
* Merge rules: auto merge L2 = 2 copies; L3 = 2×L2 (4 copies). Confirm. CORRECT
* Repositioning: only outside combat; drag & drop; no cost. Confirm. CORRECT
* Bench synergies: bench contributes to synergies on board. Confirm. CORRECT
Combat
* Basic action set: basic attack each turn; abilities fire only when mana full or trigger condition. For MVP, choose “replaces attack when full mana”. OK? FOR MVP IMPLEMENT ONE PJ FOR EACH TYPE OF MANA ABILITY (ONLY MANA, TRIGGER, MANA AND ATTACK, ETC)
* Targeting: default target = nearest opposing active by reading order; if no actives, hit player HP? Or the round ends immediately when one side has no actives? YES, AND IF NO ACTIVES, END ROUND, PLAYER HP LOSS FORMULA IS THE SAME  HP - (1 + AMOUNT OF REMAINING ENEMY PLAYERS)
* Damage calc: Physical = ATK - DEF (min 1), Magic = ATK_MAG - DEF_MAG (min 1), Crit = chance with multiplier. OK? CORRECT
* Mana: gain per basic attack dealt and taken; cost per ability. Provide numbers or disable mana for MVP. BASE MANA 100, MANA GAIN VARIES BY UNIT MAX 2.5S TO HAVE FULL MANA, SO IN THAT TIME WE CAN HAVE ALL VARIATIONS TO FILL MANA TO 100 WITH AUTO ATTACKS, CREATE UNITS FOR SOME OF THESE CASES (FAST, NORMAL, SLOW)
* Units: propose 6 total (including 2 Champions) to keep scope tight. Is that acceptable? If yes:
    * Provide base stats per unit. GENERATE YOURSELF
    * Provide 1 simple ability per unit (e.g., single‑target nuke, shield, heal self). GENERATE YOUSERLF
    * Provide synergy tags and 2 thresholds with effects (simple buffs). GENERATE YOUSELF
* Art/UI: text/colored rectangles only, no assets. OK? YES
Progression (account‑wide)
* XP per placement: XP for top‑X placement and win. Provide values.MINECRAFT CURVE FOR EVERY XP CURVE IN GAME 
* Unlock cadence: keep “every 10 levels unlocks a new pool” (per doc). For MVP, we’ll stub 2 account levels: L1 and L11. OK? YES
* Persistence: localStorage JSON is acceptable for MVP? Or filesystem save on backend? YES, IS OK JSON
Lobby/Matchmaking
* Fixed 8 players; for MVP, simulate 8 with AI except the local human; use “ghost of last eliminated” when odd. OK? YES
* Matchmaking order: “all‑play-all without repeats” as doc. Confirm. YES
External config layout (proposal)
* /CONFIG/game.json: match seed, stages, rounds, timings, RNG policy, damage, HP.
* /CONFIG/economy.json: rewards, reroll costs, prices, streaks.
* /CONFIG/shop.json: levels, rarity probabilities, pool sizes, champion rules.
* /CONFIG/units.json: unit/champion definitions, stats, abilities, synergies.
* /CONFIG/account.json: progression formula, unlock thresholds, initial account.
* /CONFIG/ui.json: layout grid sizes, colors, scene timings.Confirm these files and we’ll wire everything to load from them at boot. No hardcoded constants in logic. YES
Tech
* Stack: TypeScript + Phaser 3 + Vite dev server, Vitest for tests. OK? YES 
* Scaffolding: you requested npx @phaserjs/create-game@latest. I can run it (requires network/installs). Approve?YES
* If network is restricted, I’ll scaffold minimal Vite + Phaser manually with pinned versions.YES


