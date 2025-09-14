"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateAndApplySynergies = evaluateAndApplySynergies;
// Minimal synergy evaluator: applies simple stat bumps based on tags and counts.
function evaluateAndApplySynergies(alliedUnits, benchUnits, definitions) {
    const all = [...alliedUnits, ...benchUnits].filter(Boolean);
    const tagCounts = new Map();
    for (const u of all) {
        for (const t of u.etiquetas_sinergia || []) {
            tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
        }
    }
    for (const def of definitions || []) {
        const tag = def.tag;
        const count = tagCounts.get(tag) || 0;
        const thresholds = def.umbrales || [];
        let tier = -1;
        for (let i = 0; i < thresholds.length; i++)
            if (count >= thresholds[i])
                tier = i;
        if (tier >= 0) {
            // Only handle a few simple effects encoded as "+X stat"
            const effect = def.efectos_por_umbral[tier];
            if (effect["+1 atk_mag"]) {
                alliedUnits.forEach(u => (u.stats.atk_mag += 1));
            }
            if (effect["+2 atk_mag"]) {
                alliedUnits.forEach(u => (u.stats.atk_mag += 2));
            }
            if (effect["+1 def_fis"]) {
                alliedUnits.forEach(u => (u.stats.def_fis += 1));
            }
        }
    }
}
