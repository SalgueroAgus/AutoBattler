"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const RNG_1 = require("../src/engine/RNG");
(0, vitest_1.describe)('RNG reproducibility', () => {
    (0, vitest_1.it)('produces same sequence for same seed', () => {
        const a = new RNG_1.RNG('seed-42');
        const b = new RNG_1.RNG('seed-42');
        const seqA = Array.from({ length: 10 }, () => a.next());
        const seqB = Array.from({ length: 10 }, () => b.next());
        (0, vitest_1.expect)(seqA).toEqual(seqB);
    });
});
