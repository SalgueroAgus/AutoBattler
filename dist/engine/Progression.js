"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressionService = void 0;
class ProgressionService {
    constructor(params) {
        this.params = params;
    }
    accountGainXP(account, placement) {
        if (placement <= 3) {
            const award = this.params.progression.win_top3_xp[String(placement)] || 0;
            account.xp_account += award;
        }
        const before = account.nivel_cuenta;
        account.nivel_cuenta = this.levelFromXP(account.xp_account);
        if (account.nivel_cuenta !== before && account.nivel_cuenta % 10 === 0) {
            // Hook: unlock pools on multiples of 10
            // Actual unlock application is handled at load-time from content.json by the CLI
        }
    }
    levelFromXP(xp) {
        // Simple Minecraft-inspired cubic-ish curve approximation: base * level^2
        const base = this.params.progression.level_curve_base;
        let lvl = 1;
        while (xp >= base * lvl * lvl)
            lvl++;
        return Math.max(1, lvl);
    }
}
exports.ProgressionService = ProgressionService;
