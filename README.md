AutoBattler MVP (TypeScript + Phaser)

Overview
- Modular, deterministic core with seedable RNG for testing.
- Minimal web UI: Lobby → Champion Select → Shop → Battle → Results → Account.
- All tunables live in external JSON under `public/CONFIG`.
- Tests cover RNG, shop determinism, and basic combat.

Quick Start
- Install deps: `npm install`
- Dev server: `npm run dev` then open the printed URL.
- Run tests: `npm test`

Project Structure
- `src/engine`: Deterministic core (rng, types, combat, shop, economy).
- `src/scenes`: Phaser scenes implementing minimal UI flow.
- `public/CONFIG`: All configuration files editable without recompiling.
- `tests`: Vitest unit tests.

Config Files (public/CONFIG)
- `game.json`: stages, rounds, HP, base loss damage, RNG seed policy, battle constants.
- `economy.json`: round rewards, reroll cost scheme, prices by rarity, level-up rewards.
- `shop.json`: shop levels, rarity list, probability tables by level, champion rules.
- `units.json`: units and champions with stats, abilities, tags, synergy definitions.
- `account.json`: account progression rules and placement rewards.
- `ui.json`: canvas size, grid, and colors.

Determinism
- Tests and simulation use a seedable PRNG (`src/engine/rng.ts`).
- BattleScene temporarily overrides `Math.random` with the seeded RNG for crit rolls.
- Toggle determinism and choose seed via `public/CONFIG/game.json`. For ad-hoc testing, set `window.AUTO_SEED = 42` in DevTools before entering Lobby.

Gameplay Notes (MVP)
- Lobby: fixed 8 players; one human, rest AI placeholders.
- Team: Champion + 5 units total; up to 3 actives (MVP currently auto-picks 3).
- Shop: 3 options per refresh; reroll cost = base + increment per consecutive reroll; resets per stage. Prices by rarity.
- Combat: alternating slots P1/P2 for slots 1..3; abilities implement simple mana behaviors; round ends when one side has no actives; player damage = 1 + remaining enemy actives.
- Economy: XP rewards on win/loss, survivors, and streaks (see economy.json). Level-up and stage top-damage rewards are scaffolded; hook up in a later pass.
- Account: simple localStorage persistence; Minecraft-like curve placeholder in config.

Open Parameters (DEFAULT_DRAFT)
- Rarity probabilities and prices are placeholder values intended for balancing. Adjust in `shop.json` and `economy.json`.
- Unit stats and abilities in `units.json` are minimal examples to exercise the loop.

Running Examples
- From Lobby, click to enter Champion Select.
- Click a Champion, then in Shop press `B` to simulate a battle.
- In Battle, press `N` for Results; then `S` to return to Shop or `A` for Account.

Testing
- `npm test` runs Vitest in Node environment.
- Tests: `tests/rng.test.ts`, `tests/shop.test.ts`, `tests/combat.test.ts`.

Docs
- High-level design: `GameOverviewDoc.md`.
- This README and config files document mechanics and tunables.

