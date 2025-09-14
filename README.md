AutoBattler MVP (Turn-Based, Deterministic)

Overview
- Minimal, modular, seed-reproducible auto-battler core loop.
- Stack: TypeScript + Node.js (CLI). Code and docs in English.
- Focus: deterministic turn order, clear board rules, external configuration, simple persistence.

How To Run
- Prerequisites: Node.js 18+.
- Install: `npm install`.
- Build: `npm run build`.
- Start CLI: `npm start`.
- Dev (ts-node): `npm run dev` (requires dev deps installed).

Gameplay Flow (CLI)
- Select or create account.
- Join lobby (8 players: you + 7 bots).
- Champion selection (3 options, 1 free reroll).
- Stages (3) × Rounds (3): shop → position → auto-combat.
- End: ranking, damage received, account XP added and persisted.

Configuration
- Seed and parameters: `src/config/params.json`.
  - Change `seed` to reproduce identical matches.
  - `combate.crit_multiplier`, `combate.mana_por_ataque`, `combate.mana_requerida_habilidad`.
  - `economia` costs, reroll, XP rewards, and shop level pacing.
  - `match.stages`, `match.rounds_por_stage`.
- Content: `src/config/content.json`.
  - Champions, units, and minimal synergy definitions.
  - Pool unlocks by account level.
- Shop probabilities: `src/config/probabilities.json`.

Core Loop And States
- Lobby: 8-player lobby, odd-player rounds match last eliminated ghost snapshot.
- Match: stages → rounds; at each round, shop reroll cost chain applies within stage then resets.
- Board: 3 active slots per side (mapped deterministically) from a 3×3 side board; reading order determines action order.
- Combat: deterministic alternating order by active slots: U1.s1 → U2.s1 → U1.s2 → U2.s2 → U1.s3 → U2.s3 → repeat until one side is down.
- Damage To Player: `vida_perdida = enemigos_vivos + X_base`; tie behavior via `params.daño_jugador.tie_rule`.
- Progression: account XP on placement; unlock pools every 10 levels.

RNG And Determinism
- Seeded PRNG per match for all rolls (shop, crits, ability triggers) via `src/engine/RNG.ts`.
- Provide the same seed and initial state to reproduce outcomes.

Tests
- Run: `npm test` (requires dev deps installed).
- Unit tests cover: turn order sequence; player damage formula; shop reroll cost chain; PRNG reproducibility; unit merges.
- Integration tests cover: full match (8 players); ghost snapshot matching; account progression unlocks.

Data Persistence
- Simple JSON files via `src/persistence/FileDB.ts` under `./data`.
- Files: `accounts.json`, `history.json` are created on demand.

Undocumented Parameters
- If a needed parameter is missing, it is added to `params.json` with a reasonable default and mentioned here:
  - `progression.level_curve_base`: base multiplier for level XP curve (Minecraft-inspired). Default: 10.
  - `progression.win_top3_xp`: XP for top3 placement. Default: { "1": 50, "2": 35, "3": 20 }.

Limitations (MVP)
- Minimal unit abilities and synergies; no advanced effects or animations.
- Simple economy with one currency and full refund on sell.
- Basic CLI only; no web UI in this MVP.

Next Steps
- Add simple web UI (Phaser or minimal React), retaining same engine contracts.
- Expand abilities/effects system with triggers and durations.
- Broaden content pool and rarity distribution tuning.
- Add replays and deterministic logs export.
- Add save/load of mid-match state and richer analytics.

Examples
- Change seed: edit `src/config/params.json` → `"seed": "my-seed-123"`.
- Tune damage base: `"daño_jugador": { "X_base": 3 }`.
- Alter shop rarities: edit `src/config/probabilities.json`.

# AutoBattler
