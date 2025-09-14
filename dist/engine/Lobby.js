"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLobby = createLobby;
exports.pairingsForRound = pairingsForRound;
function createLobby(userId, seed) {
    const bots = Array.from({ length: 7 }, (_, i) => `bot_${i + 1}`);
    return {
        lobby_id: `lobby_${Date.now()}`,
        jugadores: [userId, ...bots],
        estado: 'creado',
        reglas_emparejamiento: 'round-robin-lite',
        seed
    };
}
function pairingsForRound(players, eliminated, lastEliminatedGhost) {
    const alive = players.filter(p => !eliminated.has(p));
    const pairs = [];
    for (let i = 0; i < alive.length; i += 2) {
        const a = alive[i];
        const b = alive[i + 1] || null;
        if (b)
            pairs.push([a, b]);
        else {
            if (lastEliminatedGhost)
                pairs.push([a, lastEliminatedGhost]);
            else
                pairs.push([a, null]);
        }
    }
    return pairs;
}
