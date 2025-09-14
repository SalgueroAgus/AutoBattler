import { Lobby } from '../models/Types';

export function createLobby(userId: string, seed: string): Lobby {
  const bots = Array.from({ length: 7 }, (_, i) => `bot_${i + 1}`);
  return {
    lobby_id: `lobby_${Date.now()}`,
    jugadores: [userId, ...bots],
    estado: 'creado',
    reglas_emparejamiento: 'round-robin-lite',
    seed
  };
}

export function pairingsForRound(players: string[], eliminated: Set<string>, lastEliminatedGhost: string | null): [string, string | null][] {
  const alive = players.filter(p => !eliminated.has(p));
  const pairs: [string, string | null][] = [];
  for (let i = 0; i < alive.length; i += 2) {
    const a = alive[i];
    const b = alive[i + 1] || null;
    if (b) pairs.push([a, b]);
    else {
      if (lastEliminatedGhost) pairs.push([a, lastEliminatedGhost]);
      else pairs.push([a, null]);
    }
  }
  return pairs;
}

