"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CombatEngine = void 0;
const Board_1 = require("./Board");
const Damage_1 = require("../systems/Damage");
class CombatEngine {
    constructor(params) {
        this.params = params;
    }
    runRound(p1, p2, rng) {
        const board1 = (0, Board_1.activeSlotsToBoard)(p1.board_slots_activos);
        const board2 = (0, Board_1.activeSlotsToBoard)(p2.board_slots_activos);
        const ctx = { critMultiplier: this.params.combate.crit_multiplier };
        const turns = [];
        let step = 0;
        const order = [0, 0, 1, 1, 2, 2]; // slot pattern, alternate sides
        const side = ['p1', 'p2', 'p1', 'p2', 'p1', 'p2'];
        const maxTurns = 200; // safety cap
        while ((0, Board_1.countAlive)(board1) > 0 && (0, Board_1.countAlive)(board2) > 0 && step < maxTurns) {
            const idx = step % order.length;
            const slot = order[idx];
            const actorSide = side[idx];
            const actorBoard = actorSide === 'p1' ? board1 : board2;
            const enemyBoard = actorSide === 'p1' ? board2 : board1;
            const actor = actorBoard[slot];
            if (actor && actor.stats.hp > 0) {
                // pick first alive enemy by reading order
                const targetIndex = this.findFirstAlive(enemyBoard);
                if (targetIndex !== null) {
                    const target = enemyBoard[targetIndex];
                    const usedAbility = this.tryAbility(actor, target, rng, turns, actorSide, slot);
                    if (!usedAbility) {
                        const dmg = (0, Damage_1.computeBasicAttackDamage)(actor, target, ctx, rng);
                        // Estocada small bonus
                        if (actor.habilidad === 'Estocada' && rng.nextFloat() < 0.2) {
                            dmg.amount += 1;
                        }
                        (0, Damage_1.applyDamage)(target, dmg);
                        // Pirotecnia: gain mana when receiving damage
                        if (target.habilidad === 'Pirotecnia') {
                            target.stats.mana += 10;
                        }
                        // mana gain on attack
                        actor.stats.mana += this.params.combate.mana_por_ataque;
                        turns.push({
                            actor_user_id: actorSide === 'p1' ? p1.user_id : p2.user_id,
                            actor_slot: slot,
                            accion: 'ataque',
                            objetivo: { user_id: actorSide === 'p1' ? p2.user_id : p1.user_id, slot: targetIndex },
                            resultado_daño_y_efectos: `-${dmg.amount} ${dmg.crit ? 'CRIT ' : ''}${dmg.type}`
                        });
                    }
                }
            }
            step++;
        }
        const p1Alive = (0, Board_1.countAlive)(board1);
        const p2Alive = (0, Board_1.countAlive)(board2);
        const winner = p1Alive === p2Alive ? 'tie' : p1Alive > p2Alive ? 'p1' : 'p2';
        return { turns, winner, p1Alive, p2Alive };
    }
    findFirstAlive(board) {
        for (let i = 0; i < board.length; i++) {
            const u = board[i];
            if (u && u.stats.hp > 0)
                return i;
        }
        return null;
    }
    tryAbility(actor, target, rng, turns, actorSide, slot) {
        // Minimal ability handling for MVP
        if (actor.habilidad === 'Descarga' && actor.stats.mana >= this.params.combate.mana_requerida_habilidad) {
            // Magic bolt: 4 magic damage, consumes mana
            const dmgAmount = 4;
            target.stats.hp = Math.max(0, target.stats.hp - dmgAmount);
            actor.stats.mana = 0;
            turns.push({
                actor_user_id: actorSide,
                actor_slot: slot,
                accion: 'habilidad',
                objetivo: { user_id: actorSide === 'p1' ? 'p2' : 'p1', slot: -1 },
                resultado_daño_y_efectos: `Descarga -${dmgAmount} mag`
            });
            return true;
        }
        return false;
    }
}
exports.CombatEngine = CombatEngine;
