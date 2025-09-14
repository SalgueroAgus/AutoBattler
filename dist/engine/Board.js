"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeEmptyBoardSide = makeEmptyBoardSide;
exports.readingOrderIndices = readingOrderIndices;
exports.activeSlotsToBoard = activeSlotsToBoard;
exports.countAlive = countAlive;
exports.firstAliveIndex = firstAliveIndex;
function makeEmptyBoardSide() {
    return new Array(9).fill(null);
}
function readingOrderIndices() {
    return [0, 1, 2, 3, 4, 5, 6, 7, 8];
}
function activeSlotsToBoard(active) {
    // Map three active slots into the front row (indices 0,1,2) for simplicity
    const b = makeEmptyBoardSide();
    b[0] = active[0] || null;
    b[1] = active[1] || null;
    b[2] = active[2] || null;
    return b;
}
function countAlive(board) {
    return board.filter(u => u && u.stats.hp > 0).length;
}
function firstAliveIndex(board) {
    for (const i of readingOrderIndices()) {
        const u = board[i];
        if (u && u.stats.hp > 0)
            return i;
    }
    return null;
}
